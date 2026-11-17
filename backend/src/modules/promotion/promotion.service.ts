import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { In, Not } from 'typeorm';
import {
  BookingChannel,
  BookingStatus,
  PromotionKind,
  PromotionRedemptionStatus,
  PromotionScopeType,
  PromotionStatus,
  PromotionType,
} from '../../common/enums/index.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { Category } from '../catalog/entities/category.entity.js';
import { Destination } from '../catalog/entities/destination.entity.js';
import { Tour } from '../catalog/entities/tour.entity.js';
import { TourDestination } from '../catalog/entities/tour-destination.entity.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import type {
  AssignPromotionDto,
  BestOfferDto,
  CreatePromotionDto,
  QueryPromotionsDto,
  QueryRedemptionsDto,
  ReplacePromotionScopesDto,
  UpdatePromotionDto,
  ValidatePromotionDto,
} from './dto/promotion.dto.js';
import { BookingDiscount } from './entities/booking-discount.entity.js';
import { PromotionAssignment } from './entities/promotion-assignment.entity.js';
import { PromotionRedemption } from './entities/promotion-redemption.entity.js';
import { PromotionScope } from './entities/promotion-scope.entity.js';
import { Promotion } from './entities/promotion.entity.js';
import type { DiscountContext, PromotionCandidate } from './services/discount-engine.js';
import { evaluatePromotion, selectDiscounts } from './services/discount-engine.js';
import type {
  AvailablePromotionView,
  BestOfferView,
  PromotionQuoteView,
  PromotionScopeView,
  PromotionStatsView,
  PromotionView,
  RedemptionView,
} from './types/promotion.types.js';

/** Trạng thái đơn **không** tính là "đã dùng mã" khi đếm hạn mức mỗi khách. */
const RELEASED_BOOKING_STATUSES = [
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
  BookingStatus.EXPIRED,
];

/** Số mã tối đa nạp vào engine cho một lần gợi ý – chặn query bùng nổ. */
const MAX_CANDIDATES = 200;

/**
 * Quản lý mã khuyến mãi.
 *
 * Service này là nơi **duy nhất** kiểm tra ràng buộc nghiệp vụ của promotion
 * (entity chỉ có `isUsable` / `calculateDiscount` để dùng chung, không tự validate).
 *
 * Từ bản mở rộng, mọi quyết định "mã có dùng được không" đi qua
 * [`discount-engine.ts`](./services/discount-engine.ts) – hàm thuần, trả về
 * *lý do* thay vì ném lỗi. Nhờ vậy `validate`, `quote`, `create`, `best-for-cart`
 * dùng chung một logic và FE hiển thị được vì sao mã bị loại.
 *
 * Sổ cái `promotion_redemptions` là nguồn sự thật của lượt dùng; `promotions.used_count`
 * chỉ là counter đọc nhanh, được cập nhật trong cùng transaction với booking.
 *
 * BookingService kiểm tra mã trong transaction READ COMMITTED, khóa dòng mã
 * trước khi kiểm tra giới hạn từng khách và giữ lượt sử dụng.
 */
@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(@InjectRepository(Promotion) private readonly promotionRepo: Repository<Promotion>) { }

  // ===== truy vấn =====

  /**
   * Danh sách ưu đãi cho khách đang đăng nhập.
   *
   * Khi truyền `subtotal` **và** `scheduleId`, mỗi mã được engine chấm điểm để
   * trả `estimatedDiscount` / `rejectedReason`; ngược lại chỉ liệt kê (không đoán
   * số tiền vì chưa biết đơn hàng cụ thể).
   */
  async available(
    customerId: string,
    options: { subtotal?: number; scheduleId?: string; channel?: BookingChannel } = {},
  ): Promise<AvailablePromotionView[]> {
    const now = new Date();
    const today = this.todayInVietnam(now);

    const promotions = await this.promotionRepo.createQueryBuilder('promotion')
      .where('promotion.active = :active', { active: true })
      .andWhere('promotion.validFrom <= :now AND promotion.validTo >= :now', { now })
      .andWhere('(promotion.usageLimit IS NULL OR promotion.usedCount < promotion.usageLimit)')
      .andWhere('(promotion.budgetCap IS NULL OR promotion.budgetUsed < promotion.budgetCap)')
      .andWhere(
        '(promotion.dailyLimit IS NULL OR promotion.dailyDate <> :today OR promotion.dailyUsed < promotion.dailyLimit)',
        { today },
      )
      .andWhere(qb => {
        const usage = qb.subQuery().select('COUNT(*)').from(Booking, 'customerBooking')
          .where('customerBooking.promotionId = promotion.id')
          .andWhere('customerBooking.customerId = :customerId')
          .andWhere('customerBooking.status NOT IN (:...releasedStatuses)')
          .getQuery();
        return `${usage} < promotion.perUserLimit`;
      })
      .setParameters({ customerId, releasedStatuses: RELEASED_BOOKING_STATUSES })
      .orderBy('promotion.validTo', 'ASC').addOrderBy('promotion.code', 'ASC')
      .take(50).getMany();

    const canEstimate = options.subtotal !== undefined && options.scheduleId !== undefined;
    const context = canEstimate
      ? await this.buildContext({
        subtotal: options.subtotal as number,
        scheduleId: options.scheduleId as string,
        customerId,
        channel: options.channel ?? BookingChannel.ONLINE,
        now,
      })
      : null;

    const candidates = await this.loadCandidatesFor(promotions, customerId);

    return promotions.map((promotion) => {
      const candidate = candidates.get(promotion.id);
      let estimatedDiscount = 0;
      let rejectedReason: string | null = null;

      if (context && candidate) {
        const result = evaluatePromotion(candidate, context);
        if (result.ok) estimatedDiscount = result.discount;
        else rejectedReason = result.reason;
      }

      return {
        code: promotion.code,
        name: promotion.name ?? null,
        description: promotion.description ?? null,
        imageUrl: promotion.imageUrl ?? null,
        type: promotion.type,
        value: promotion.value,
        maxDiscount: promotion.maxDiscount ?? null,
        minOrder: promotion.minOrder,
        perUserLimit: promotion.perUserLimit,
        validFrom: promotion.validFrom,
        validTo: promotion.validTo,
        assigned: candidate?.assigned ?? false,
        estimatedDiscount,
        rejectedReason,
      };
    });
  }

  /**
   * Ưu đãi công khai cho trang chủ / landing (không cần đăng nhập).
   * Chỉ trả mã `kind = PUBLIC` còn hiệu lực – không lộ voucher cá nhân.
   */
  async publicList(limit = 12): Promise<AvailablePromotionView[]> {
    const now = new Date();
    const today = this.todayInVietnam(now);
    const promotions = await this.promotionRepo.createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('promotion.kind = :kind', { kind: PromotionKind.PUBLIC })
      .andWhere('promotion.validFrom <= :now AND promotion.validTo >= :now', { now })
      .andWhere('(promotion.usageLimit IS NULL OR promotion.usedCount < promotion.usageLimit)')
      .andWhere('(promotion.budgetCap IS NULL OR promotion.budgetUsed < promotion.budgetCap)')
      .andWhere(
        '(promotion.dailyLimit IS NULL OR promotion.dailyDate <> :today OR promotion.dailyUsed < promotion.dailyLimit)',
        { today },
      )
      .orderBy('promotion.priority', 'DESC')
      .addOrderBy('promotion.validTo', 'ASC')
      .take(Math.min(50, Math.max(1, limit)))
      .getMany();

    return promotions.map((promotion) => ({
      code: promotion.code,
      name: promotion.name ?? null,
      description: promotion.description ?? null,
      imageUrl: promotion.imageUrl ?? null,
      type: promotion.type,
      value: promotion.value,
      maxDiscount: promotion.maxDiscount ?? null,
      minOrder: promotion.minOrder,
      perUserLimit: promotion.perUserLimit,
      validFrom: promotion.validFrom,
      validTo: promotion.validTo,
      assigned: false,
      estimatedDiscount: 0,
      rejectedReason: null,
    }));
  }

  /**
   * Ví voucher của một khách: mã công khai + mã được cấp riêng (PERSONAL/GIFT).
   * `assigned = true` cho biết khách đã được cấp mã đó.
   */
  async myVouchers(customerId: string): Promise<AvailablePromotionView[]> {
    const now = new Date();
    const today = this.todayInVietnam(now);

    const assignedRows = await this.promotionRepo.manager.getRepository(PromotionAssignment)
      .find({ where: { customerId } });
    const assignedIds = assignedRows.map((row) => row.promotionId);

    // Mã công khai ai cũng thấy; mã cá nhân/quà chỉ hiện khi có dòng assignment.
    const promotions = await this.promotionRepo.createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('promotion.validFrom <= :now AND promotion.validTo >= :now', { now })
      .andWhere('(promotion.usageLimit IS NULL OR promotion.usedCount < promotion.usageLimit)')
      .andWhere('(promotion.budgetCap IS NULL OR promotion.budgetUsed < promotion.budgetCap)')
      .andWhere(
        '(promotion.dailyLimit IS NULL OR promotion.dailyDate <> :today OR promotion.dailyUsed < promotion.dailyLimit)',
        { today },
      )
      .andWhere(
        assignedIds.length > 0
          ? '(promotion.kind = :publicKind OR promotion.id IN (:...assignedIds))'
          : 'promotion.kind = :publicKind',
        { publicKind: PromotionKind.PUBLIC, assignedIds: assignedIds.length > 0 ? assignedIds : ['-'] },
      )
      .orderBy('promotion.validTo', 'ASC')
      .take(100)
      .getMany();

    const candidates = await this.loadCandidatesFor(promotions, customerId);

    return promotions.map((promotion) => ({
      code: promotion.code,
      name: promotion.name ?? null,
      description: promotion.description ?? null,
      imageUrl: promotion.imageUrl ?? null,
      type: promotion.type,
      value: promotion.value,
      maxDiscount: promotion.maxDiscount ?? null,
      minOrder: promotion.minOrder,
      perUserLimit: promotion.perUserLimit,
      validFrom: promotion.validFrom,
      validTo: promotion.validTo,
      assigned: candidates.get(promotion.id)?.assigned ?? false,
      estimatedDiscount: 0,
      rejectedReason: null,
    }));
  }

  async paginate(query: QueryPromotionsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const now = new Date();
    const today = this.todayInVietnam(now);

    const qb = this.promotionRepo.createQueryBuilder('promotion');

    if (query.search) {
      const kw = `%${query.search.trim().toUpperCase()}%`;
      qb.andWhere('(promotion.code LIKE :kw OR UPPER(promotion.name) LIKE :kw)', { kw });
    }
    if (query.active !== undefined) qb.andWhere('promotion.active = :active', { active: query.active });
    if (query.status) qb.andWhere('promotion.status = :status', { status: query.status });
    if (query.type) qb.andWhere('promotion.type = :type', { type: query.type });
    if (query.kind) qb.andWhere('promotion.kind = :kind', { kind: query.kind });
    if (query.usableOnly) {
      qb.andWhere('promotion.active = :active', { active: true })
        .andWhere('promotion.validFrom <= :now', { now })
        .andWhere('promotion.validTo >= :now', { now })
        .andWhere('(promotion.usageLimit IS NULL OR promotion.usedCount < promotion.usageLimit)')
        .andWhere('(promotion.budgetCap IS NULL OR promotion.budgetUsed < promotion.budgetCap)')
        .andWhere(
          '(promotion.dailyLimit IS NULL OR promotion.dailyDate <> :today OR promotion.dailyUsed < promotion.dailyLimit)',
          { today },
        );
    }

    qb.orderBy('promotion.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [promotions, total] = await qb.getManyAndCount();
    const scopes = await this.attachScopes(promotions);
    return {
      items: promotions.map((promotion) => this.toView(promotion, now, scopes.get(promotion.id) ?? [])),
      total,
      page,
      limit,
    };
  }

  async getById(id: string): Promise<PromotionView> {
    const promotion = await this.getOrFail(id);
    const scopes = await this.attachScopes([promotion]);
    return this.toView(promotion, new Date(), scopes.get(promotion.id) ?? []);
  }

  async getOrFail(id: string): Promise<Promotion> {
    const promotion = await this.promotionRepo.findOne({ where: { id } });
    if (!promotion) throw new NotFoundException('Không tìm thấy mã khuyến mãi');
    return promotion;
  }

  async getByCode(code: string): Promise<PromotionView> {
    const normalized = this.normalizeCode(code);
    const promotion = await this.promotionRepo.findOne({ where: { code: normalized } });
    if (!promotion) throw new NotFoundException(`Không tìm thấy mã khuyến mãi ${normalized}`);
    const scopes = await this.attachScopes([promotion]);
    return this.toView(promotion, new Date(), scopes.get(promotion.id) ?? []);
  }

  /**
   * Áp thử mã cho một tạm tính – dùng cho nút "Áp dụng" ở trang thanh toán.
   * Không đụng tới `usedCount`, chỉ tính toán.
   *
   * Khi client gửi kèm `scheduleId`, engine kiểm tra thêm phạm vi tour/danh mục/
   * điểm đến/lịch và kênh bán; nếu không, giữ đường kiểm tra nhanh cũ.
   */
  async validate(dto: ValidatePromotionDto, customerId: string): Promise<PromotionQuoteView> {
    if (dto.scheduleId) {
      const { promotion, discount } = await this.evaluateForBooking({
        code: dto.code,
        subtotal: dto.subtotal,
        scheduleId: dto.scheduleId,
        customerId,
        channel: BookingChannel.ONLINE,
      });
      return {
        code: promotion.code,
        subtotal: dto.subtotal,
        discount,
        total: dto.subtotal - discount,
        type: promotion.type,
        value: promotion.value,
      };
    }

    const promotion = await this.findUsableOrFail(dto.code, dto.subtotal, undefined, customerId);
    const discount = promotion.calculateDiscount(dto.subtotal);
    return {
      code: promotion.code,
      subtotal: dto.subtotal,
      discount,
      total: dto.subtotal - discount,
      type: promotion.type,
      value: promotion.value,
    };
  }

  /**
   * Gợi ý tổ hợp mã tốt nhất cho giỏ hàng.
   *
   * Trả cả danh sách `rejected` kèm lý do để FE giải thích cho khách vì sao mã
   * họ nhập không dùng được cùng mã khác.
   */
  async bestOffer(dto: BestOfferDto, customerId: string): Promise<BestOfferView> {
    const now = new Date();
    const context = await this.buildContext({
      subtotal: dto.subtotal,
      scheduleId: dto.scheduleId,
      customerId,
      channel: dto.channel ?? BookingChannel.ONLINE,
      now,
    });

    const promotions = await this.loadActivePromotions(now);
    const candidates = await this.loadCandidatesFor(promotions, customerId);
    const evaluation = selectDiscounts(
      promotions.map((promotion) => candidates.get(promotion.id)).filter((c): c is PromotionCandidate => Boolean(c)),
      context,
      { maxCodes: 3 },
    );

    return {
      subtotal: dto.subtotal,
      totalDiscount: evaluation.totalDiscount,
      total: dto.subtotal - evaluation.totalDiscount,
      applied: evaluation.applied.map((item) => ({ code: item.code, discount: item.discount })),
      rejected: evaluation.rejected,
    };
  }

  // ===== phạm vi áp dụng =====

  async listScopes(id: string): Promise<PromotionScopeView[]> {
    await this.getOrFail(id);
    const rows = await this.promotionRepo.manager.getRepository(PromotionScope)
      .find({ where: { promotionId: id } });
    return rows.map((row) => ({ scopeType: row.scopeType, scopeId: row.scopeId }));
  }

  /**
   * Thay **toàn bộ** phạm vi của một mã. Mảng rỗng = áp toàn hệ thống.
   *
   * `scope_id` không có FK (đa hình) nên phải tự kiểm id tồn tại trước khi ghi –
   * nếu không, một mã có thể trỏ tới tour đã bị xóa cứng và không bao giờ khớp.
   */
  async replaceScopes(id: string, dto: ReplacePromotionScopesDto): Promise<PromotionScopeView[]> {
    const unique = new Map<string, PromotionScopeView>();
    for (const scope of dto.scopes) {
      unique.set(`${scope.scopeType}:${scope.scopeId}`, { scopeType: scope.scopeType, scopeId: scope.scopeId });
    }
    const scopes = [...unique.values()];

    await this.promotionRepo.manager.transaction(async (manager) => {
      const promotion = await manager.getRepository(Promotion)
        .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!promotion) throw new NotFoundException('Không tìm thấy mã khuyến mãi');

      await this.assertScopesExist(scopes, manager);

      const repo = manager.getRepository(PromotionScope);
      await repo.delete({ promotionId: id });
      if (scopes.length > 0) {
        await repo.save(scopes.map((scope) => repo.create({
          promotionId: id,
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
        })));
      }
    });

    this.logger.log(`Cập nhật ${scopes.length} phạm vi cho mã ${id}`);
    return scopes;
  }

  // ===== cấp mã riêng =====

  async listAssignments(id: string): Promise<{ customerId: string; assignedAt: Date; usedAt: Date | null; bookingId: string | null }[]> {
    await this.getOrFail(id);
    const rows = await this.promotionRepo.manager.getRepository(PromotionAssignment)
      .find({ where: { promotionId: id }, order: { assignedAt: 'DESC' }, take: 500 });
    return rows.map((row) => ({
      customerId: row.customerId,
      assignedAt: row.assignedAt,
      usedAt: row.usedAt ?? null,
      bookingId: row.bookingId ?? null,
    }));
  }

  /**
   * Cấp mã cho danh sách khách. Bỏ qua khách đã có để gọi lại nhiều lần không lỗi.
   * Chỉ áp cho mã `PERSONAL` / `GIFT` – mã công khai không cần cấp.
   */
  async assignToCustomers(id: string, dto: AssignPromotionDto): Promise<{ assigned: number; skipped: number }> {
    const promotion = await this.getOrFail(id);
    if (promotion.kind === PromotionKind.PUBLIC) {
      throw new BadRequestException(
        `Mã ${promotion.code} là mã công khai – đổi kind sang PERSONAL hoặc GIFT trước khi cấp riêng`,
      );
    }

    const customerIds = [...new Set(dto.customerIds)];
    if (customerIds.length === 0) return { assigned: 0, skipped: 0 };

    const repo = this.promotionRepo.manager.getRepository(PromotionAssignment);
    const existing = await repo.find({ where: { promotionId: id, customerId: In(customerIds) } });
    const existingIds = new Set(existing.map((row) => row.customerId));
    const fresh = customerIds.filter((customerId) => !existingIds.has(customerId));

    if (fresh.length > 0) {
      await repo.save(fresh.map((customerId) => repo.create({ promotionId: id, customerId })));
    }

    this.logger.log(`Cấp mã ${promotion.code} cho ${fresh.length} khách (bỏ qua ${existingIds.size})`);
    return { assigned: fresh.length, skipped: existingIds.size };
  }

  // ===== sổ cái & thống kê =====

  async paginateRedemptions(id: string, query: QueryRedemptionsDto) {
    const promotion = await this.getOrFail(id);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const repo = this.promotionRepo.manager.getRepository(PromotionRedemption);
    const [rows, total] = await repo.findAndCount({
      where: { promotionId: id, ...(query.status ? { status: query.status } : {}) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const bookingIds = [...new Set(rows.map((row) => row.bookingId))];
    const bookings = bookingIds.length
      ? await this.promotionRepo.manager.getRepository(Booking).find({ where: { id: In(bookingIds) } })
      : [];
    const bookingCodes = new Map(bookings.map((booking) => [booking.id, booking.code]));

    const items: RedemptionView[] = rows.map((row) => ({
      id: row.id,
      promotionId: row.promotionId,
      code: promotion.code,
      bookingId: row.bookingId,
      bookingCode: bookingCodes.get(row.bookingId) ?? null,
      customerId: row.customerId,
      discountAmount: row.discountAmount,
      subtotalAtUse: row.subtotalAtUse,
      status: row.status,
      reservedAt: row.reservedAt,
      confirmedAt: row.confirmedAt ?? null,
      releasedAt: row.releasedAt ?? null,
      releaseReason: row.releaseReason ?? null,
    }));

    return { items, total, page, limit };
  }

  /** Thống kê hiệu quả chiến dịch – đọc từ sổ cái, không đoán từ counter. */
  async stats(id: string): Promise<PromotionStatsView> {
    const promotion = await this.getOrFail(id);
    const repo = this.promotionRepo.manager.getRepository(PromotionRedemption);

    const byStatus = await repo.createQueryBuilder('redemption')
      .select('redemption.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(redemption.discountAmount), 0)', 'discount')
      .addSelect('COALESCE(SUM(redemption.subtotalAtUse), 0)', 'subtotal')
      .where('redemption.promotionId = :id', { id })
      .groupBy('redemption.status')
      .getRawMany<{ status: PromotionRedemptionStatus; count: string; discount: string; subtotal: string }>();

    const confirmed = byStatus.find((row) => row.status === PromotionRedemptionStatus.CONFIRMED);
    const reserved = byStatus.find((row) => row.status === PromotionRedemptionStatus.RESERVED);
    const released = byStatus.find((row) => row.status === PromotionRedemptionStatus.RELEASED);

    const totalDiscount = Number(confirmed?.discount ?? 0);
    const totalSubtotal = Number(confirmed?.subtotal ?? 0);

    const aggregate = await repo.createQueryBuilder('redemption')
      .select('COUNT(DISTINCT redemption.customerId)', 'customers')
      .addSelect('MAX(redemption.createdAt)', 'lastUsedAt')
      .where('redemption.promotionId = :id', { id })
      .andWhere('redemption.status <> :released', { released: PromotionRedemptionStatus.RELEASED })
      .getRawOne<{ customers: string; lastUsedAt: string | null }>();

    const remainingUses = promotion.usageLimit == null
      ? null
      : Math.max(promotion.usageLimit - promotion.usedCount, 0);

    return {
      promotionId: promotion.id,
      code: promotion.code,
      name: promotion.name ?? null,
      status: promotion.status,
      usageLimit: promotion.usageLimit ?? null,
      usedCount: promotion.usedCount,
      remainingUses,
      budgetCap: promotion.budgetCap ?? null,
      budgetUsed: promotion.budgetUsed,
      confirmedCount: Number(confirmed?.count ?? 0),
      reservedCount: Number(reserved?.count ?? 0),
      releasedCount: Number(released?.count ?? 0),
      totalDiscount,
      totalSubtotal,
      discountRate: totalSubtotal > 0 ? Math.round((totalDiscount / totalSubtotal) * 10_000) / 100 : 0,
      uniqueCustomers: Number(aggregate?.customers ?? 0),
      lastUsedAt: aggregate?.lastUsedAt ? new Date(aggregate.lastUsedAt) : null,
    };
  }

  // ===== ghi =====

  async create(dto: CreatePromotionDto): Promise<PromotionView> {
    const code = this.normalizeCode(dto.code);
    await this.assertCodeAvailable(code);

    const status = dto.status ?? (dto.active === false ? PromotionStatus.PAUSED : PromotionStatus.ACTIVE);

    this.assertBusinessRules({
      type: dto.type,
      value: dto.value,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      usageLimit: dto.usageLimit ?? null,
      perUserLimit: dto.perUserLimit ?? 1,
      maxDiscount: dto.maxDiscount ?? null,
      budgetCap: dto.budgetCap ?? null,
      budgetUsed: 0,
      dailyLimit: dto.dailyLimit ?? null,
    });

    const promotion = await this.promotionRepo.save(
      this.promotionRepo.create({
        code,
        name: dto.name ?? null,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        type: dto.type,
        value: dto.value,
        maxDiscount: dto.maxDiscount ?? null,
        minOrder: dto.minOrder ?? 0,
        usageLimit: dto.usageLimit ?? null,
        usedCount: 0,
        perUserLimit: dto.perUserLimit ?? 1,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        active: status === PromotionStatus.ACTIVE,
        status,
        kind: dto.kind ?? PromotionKind.PUBLIC,
        budgetCap: dto.budgetCap ?? null,
        budgetUsed: 0,
        dailyLimit: dto.dailyLimit ?? null,
        dailyUsed: 0,
        dailyDate: null,
        channelScope: dto.channelScope,
        customerScope: dto.customerScope,
        stackable: dto.stackable ?? false,
        exclusiveGroup: dto.exclusiveGroup ?? null,
        priority: dto.priority ?? 0,
        termsText: dto.termsText ?? null,
      }),
    );

    this.logger.log(`Tạo mã khuyến mãi ${promotion.code}`);
    return this.toView(promotion);
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<PromotionView> {
    return this.withLockedPromotion(id, async (promotion, repo) => {
      if (dto.usageLimit != null && dto.usageLimit < promotion.usedCount) {
        throw new BadRequestException('Tổng lượt tối đa không được nhỏ hơn số lượt đã sử dụng');
      }

      if (dto.code !== undefined) {
        const code = this.normalizeCode(dto.code);
        if (code !== promotion.code) {
          await this.assertCodeAvailable(code, id);
          promotion.code = code;
        }
      }

      this.assertBusinessRules({
        type: dto.type ?? promotion.type,
        value: dto.value ?? promotion.value,
        validFrom: dto.validFrom ?? promotion.validFrom.toISOString(),
        validTo: dto.validTo ?? promotion.validTo.toISOString(),
        usageLimit: dto.usageLimit === undefined ? (promotion.usageLimit ?? null) : dto.usageLimit,
        perUserLimit: dto.perUserLimit ?? promotion.perUserLimit,
        maxDiscount: dto.maxDiscount === undefined ? (promotion.maxDiscount ?? null) : dto.maxDiscount,
        budgetCap: dto.budgetCap === undefined ? (promotion.budgetCap ?? null) : dto.budgetCap,
        budgetUsed: promotion.budgetUsed,
        dailyLimit: dto.dailyLimit === undefined ? (promotion.dailyLimit ?? null) : dto.dailyLimit,
      });

      if (dto.name !== undefined) promotion.name = dto.name;
      if (dto.description !== undefined) promotion.description = dto.description;
      if (dto.imageUrl !== undefined) promotion.imageUrl = dto.imageUrl;
      if (dto.type !== undefined) promotion.type = dto.type;
      if (dto.value !== undefined) promotion.value = dto.value;
      if (dto.maxDiscount !== undefined) promotion.maxDiscount = dto.maxDiscount;
      if (dto.minOrder !== undefined) promotion.minOrder = dto.minOrder;
      if (dto.usageLimit !== undefined) promotion.usageLimit = dto.usageLimit;
      if (dto.perUserLimit !== undefined) promotion.perUserLimit = dto.perUserLimit;
      if (dto.validFrom !== undefined) promotion.validFrom = new Date(dto.validFrom);
      if (dto.validTo !== undefined) promotion.validTo = new Date(dto.validTo);
      if (dto.kind !== undefined) promotion.kind = dto.kind;
      if (dto.budgetCap !== undefined) promotion.budgetCap = dto.budgetCap;
      if (dto.dailyLimit !== undefined) promotion.dailyLimit = dto.dailyLimit;
      if (dto.channelScope !== undefined) promotion.channelScope = dto.channelScope;
      if (dto.customerScope !== undefined) promotion.customerScope = dto.customerScope;
      if (dto.stackable !== undefined) promotion.stackable = dto.stackable;
      if (dto.exclusiveGroup !== undefined) promotion.exclusiveGroup = dto.exclusiveGroup;
      if (dto.priority !== undefined) promotion.priority = dto.priority;
      if (dto.termsText !== undefined) promotion.termsText = dto.termsText;

      // `status` là nguồn sự thật; `active` chỉ là cột cũ được đồng bộ trong `normalize()`.
      if (dto.status !== undefined) promotion.status = dto.status;
      else if (dto.active !== undefined) {
        promotion.status = dto.active ? PromotionStatus.ACTIVE : PromotionStatus.PAUSED;
      }

      const saved = await repo.save(promotion);
      const scopes = await this.attachScopes([saved]);
      return this.toView(saved, new Date(), scopes.get(saved.id) ?? []);
    });
  }

  /** Bật/tắt nhanh – không cần gửi cả body. */
  async setActive(id: string, active: boolean): Promise<PromotionView> {
    return this.withLockedPromotion(id, async (promotion, repo) => {
      promotion.status = active ? PromotionStatus.ACTIVE : PromotionStatus.PAUSED;
      promotion.active = active;
      const saved = await repo.save(promotion);
      const scopes = await this.attachScopes([saved]);
      return this.toView(saved, new Date(), scopes.get(saved.id) ?? []);
    });
  }

  /**
   * Xóa mã. Chỉ cho xóa khi chưa ai dùng (`usedCount = 0`) để không làm hỏng
   * liên kết `bookings.promotion_id` với dữ liệu lịch sử; mã đã dùng thì tắt `active`.
   */
  async remove(id: string): Promise<void> {
    await this.withLockedPromotion(id, async (promotion, repo) => {
      const hasHistory = await repo.manager.getRepository(Booking).existsBy({ promotionId: id });
      const hasLedger = await repo.manager.getRepository(PromotionRedemption).existsBy({ promotionId: id });
      if (promotion.usedCount > 0 || hasHistory || hasLedger) {
        throw new ConflictException(
          `Mã ${promotion.code} đã gắn với đơn đặt tour – hãy tắt (active = false) thay vì xóa`,
        );
      }
      await repo.remove(promotion);
      this.logger.log(`Xóa mã khuyến mãi ${promotion.code}`);
    });
  }

  /**
   * Chuyển các mã đã quá `validTo` sang `EXPIRED`.
   * Gọi từ cron `MaintenanceService`; trả về số dòng đã đổi.
   */
  async expireOutdated(now: Date = new Date()): Promise<number> {
    const result = await this.promotionRepo.createQueryBuilder()
      .update(Promotion)
      .set({ status: PromotionStatus.EXPIRED, active: false })
      .where('status IN (:...statuses)', { statuses: [PromotionStatus.ACTIVE, PromotionStatus.SCHEDULED] })
      .andWhere('validTo < :now', { now })
      .execute();
    return result.affected ?? 0;
  }

  // ===== dùng cho module booking =====

  /**
   * Lấy mã còn hợp lệ với `subtotal`; ném 400 kèm lý do cụ thể để FE hiển thị.
   * Đọc trong transaction truyền vào (nếu có) để giữ khóa đọc nhất quán.
   *
   * Đây là đường kiểm tra **nhanh** (không cần lịch khởi hành). Khi đã biết
   * `scheduleId`, dùng `evaluateForBooking()` để xét thêm phạm vi/kênh/ngân sách.
   */
  async findUsableOrFail(code: string, subtotal: number, manager?: EntityManager, customerId?: string): Promise<Promotion> {
    const repo = manager ? manager.getRepository(Promotion) : this.promotionRepo;
    const normalized = this.normalizeCode(code);
    // Serialize reservations of the same code, including the per-customer limit.
    const promotion = await repo.findOne({
      where: { code: normalized },
      ...(manager ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });

    if (!promotion) throw new BadRequestException(`Mã khuyến mãi ${normalized} không tồn tại`);
    if (!promotion.active) throw new BadRequestException(`Mã khuyến mãi ${normalized} đang bị tắt`);
    if (promotion.usedCount >= (promotion.usageLimit ?? Number.MAX_SAFE_INTEGER)) {
      throw new BadRequestException(`Mã khuyến mãi ${normalized} đã hết lượt sử dụng`);
    }
    if (promotion.budgetCap != null && promotion.budgetUsed >= promotion.budgetCap) {
      throw new BadRequestException(`Mã khuyến mãi ${normalized} đã dùng hết ngân sách chiến dịch`);
    }
    if (promotion.dailyLimit != null && promotion.dailyDate === this.todayInVietnam()
      && promotion.dailyUsed >= promotion.dailyLimit) {
      throw new BadRequestException(`Mã khuyến mãi ${normalized} đã đạt giới hạn lượt hôm nay`);
    }

    const now = new Date();
    if (now < promotion.validFrom) throw new BadRequestException(`Mã khuyến mãi ${normalized} chưa có hiệu lực`);
    if (now > promotion.validTo) throw new BadRequestException(`Mã khuyến mãi ${normalized} đã hết hạn`);
    if (subtotal < promotion.minOrder) {
      throw new BadRequestException(
        `Mã khuyến mãi ${normalized} yêu cầu đơn tối thiểu ${promotion.minOrder.toLocaleString('vi-VN')}đ`,
      );
    }

    if (customerId) {
      // Booking creation uses READ COMMITTED; the promotion lock serializes reservations.
      const bookings = (manager ?? this.promotionRepo.manager).getRepository(Booking)
        .createQueryBuilder('booking')
        .where('booking.promotionId = :promotionId', { promotionId: promotion.id })
        .andWhere('booking.customerId = :customerId', { customerId })
        .andWhere('booking.status NOT IN (:...released)', { released: RELEASED_BOOKING_STATUSES });
      const used = await bookings.getCount();
      if (used >= promotion.perUserLimit) {
        throw new BadRequestException(`Bạn đã dùng hết ${promotion.perUserLimit} lượt của mã ${normalized}`);
      }
    }

    return promotion;
  }

  /**
   * Kiểm tra mã cho một đơn **đã biết lịch khởi hành** – dùng engine nên xét được
   * phạm vi tour/danh mục/điểm đến/lịch, kênh bán, khách mới, ngân sách, hạn mức ngày.
   *
   * Trả `{ promotion, discount }`; ném 400 kèm lý do đọc được nếu không dùng được.
   */
  async evaluateForBooking(input: {
    code: string;
    subtotal: number;
    scheduleId: string;
    customerId: string;
    channel: BookingChannel;
    manager?: EntityManager;
  }): Promise<{ promotion: Promotion; discount: number }> {
    const manager = input.manager ?? this.promotionRepo.manager;
    const repo = manager.getRepository(Promotion);
    const normalized = this.normalizeCode(input.code);

    const promotion = await repo.findOne({
      where: { code: normalized },
      ...(input.manager ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!promotion) throw new BadRequestException(`Mã khuyến mãi ${normalized} không tồn tại`);

    const context = await this.buildContext({
      subtotal: input.subtotal,
      scheduleId: input.scheduleId,
      customerId: input.customerId,
      channel: input.channel,
      manager,
    });
    const candidate = await this.loadCandidate(promotion, input.customerId, manager);
    const result = evaluatePromotion(candidate, context);
    if (!result.ok) throw new BadRequestException(result.reason);

    return { promotion, discount: result.discount };
  }

  /**
   * Tăng `usedCount` / `budgetUsed` / `dailyUsed` khi booking được tạo thành công.
   * Gọi **trong** transaction tạo booking.
   *
   * Câu UPDATE có điều kiện nên hai request đồng thời không vượt trần lượt, trần
   * ngân sách hay trần ngày. `detail` (nếu có) ghi thêm một dòng sổ cái `RESERVED`.
   */
  async reserveForBooking(
    promotionId: string,
    manager: EntityManager,
    detail?: { bookingId: string; customerId: string; discountAmount: number; subtotalAtUse: number },
  ): Promise<void> {
    const amount = Math.max(0, Math.round(detail?.discountAmount ?? 0));
    // `today` do server sinh theo `YYYY-MM-DD` nên nội suy thẳng vào SQL là an toàn;
    // tránh `setParameter` vì TypeORM không bind tham số bên trong biểu thức `set()`.
    const today = this.todayInVietnam();

    const result = await manager
      .createQueryBuilder()
      .update(Promotion)
      .set({
        usedCount: () => 'used_count + 1',
        budgetUsed: () => `budget_used + ${amount}`,
        dailyUsed: () => `CASE WHEN daily_date = '${today}' THEN daily_used + 1 ELSE 1 END`,
        dailyDate: () => `'${today}'`,
      })
      .where('id = :id', { id: promotionId })
      .andWhere('(usage_limit IS NULL OR used_count < usage_limit)')
      .andWhere('(budget_cap IS NULL OR budget_used + :amount <= budget_cap)', { amount })
      .andWhere(`(daily_limit IS NULL OR daily_date <> '${today}' OR daily_used < daily_limit)`)
      .execute();

    // `affected = 0` nghĩa là vừa hết lượt/ngân sách do request khác dùng trước → chặn luôn.
    if (!result.affected) {
      throw new ConflictException('Mã khuyến mãi vừa hết lượt sử dụng – vui lòng bỏ mã và đặt lại');
    }

    if (detail) {
      const repo = manager.getRepository(PromotionRedemption);
      await repo.save(repo.create({
        promotionId,
        bookingId: detail.bookingId,
        customerId: detail.customerId,
        discountAmount: amount,
        subtotalAtUse: Math.max(0, Math.round(detail.subtotalAtUse)),
        status: PromotionRedemptionStatus.RESERVED,
        reservedAt: new Date(),
      }));
    }
  }

  /** Giảm `usedCount` khi booking bị hủy / hết hạn / từ chối. */
  async releaseForBooking(
    promotionId: string,
    manager: EntityManager,
    detail?: { bookingId: string; discountAmount: number; reason?: string },
  ): Promise<void> {
    const amount = Math.max(0, Math.round(detail?.discountAmount ?? 0));
    const today = this.todayInVietnam();

    await manager
      .createQueryBuilder()
      .update(Promotion)
      .set({
        usedCount: () => 'GREATEST(used_count - 1, 0)',
        budgetUsed: () => `GREATEST(budget_used - ${amount}, 0)`,
        dailyUsed: () => `CASE WHEN daily_date = '${today}' THEN GREATEST(daily_used - 1, 0) ELSE daily_used END`,
      })
      .where('id = :id', { id: promotionId })
      .execute();

    if (detail?.bookingId) {
      await this.releaseRedemptions(manager, detail.bookingId, detail.reason ?? 'MANUAL');
    }
  }

  /**
   * Chốt sổ cái khi đơn đã thanh toán: `RESERVED → CONFIRMED`.
   * Gọi từ `PaymentService.onPaymentSucceeded()` trong cùng transaction.
   */
  async confirmRedemption(bookingId: string, manager: EntityManager): Promise<number> {
    const result = await manager.getRepository(PromotionRedemption).update(
      { bookingId, status: PromotionRedemptionStatus.RESERVED },
      { status: PromotionRedemptionStatus.CONFIRMED, confirmedAt: new Date() },
    );
    return result.affected ?? 0;
  }

  /** Đánh dấu các lượt của một đơn là `RELEASED` (đơn hủy / hết hạn / bị từ chối). */
  async releaseRedemptions(manager: EntityManager, bookingId: string, reason: string): Promise<number> {
    const result = await manager.getRepository(PromotionRedemption).update(
      { bookingId, status: PromotionRedemptionStatus.RESERVED },
      { status: PromotionRedemptionStatus.RELEASED, releasedAt: new Date(), releaseReason: reason },
    );
    return result.affected ?? 0;
  }

  /**
   * Ghi chi tiết từng dòng giảm giá của đơn (`booking_discounts`).
   * `bookings.discount` vẫn là tổng – bảng này chỉ thêm chi tiết để tra cứu.
   */
  async recordBookingDiscounts(
    manager: EntityManager,
    bookingId: string,
    lines: { promotion: Promotion; discount: number }[],
  ): Promise<void> {
    if (lines.length === 0) return;
    const repo = manager.getRepository(BookingDiscount);
    await repo.save(lines.map((line) => repo.create({
      bookingId,
      promotionId: line.promotion.id,
      codeSnapshot: line.promotion.code,
      typeSnapshot: line.promotion.type,
      valueSnapshot: line.promotion.value,
      discountAmount: Math.max(0, Math.round(line.discount)),
      exclusiveGroup: line.promotion.exclusiveGroup ?? null,
    })));
  }

  // ===== nội bộ =====

  /** Admin edits share the reservation lock so usedCount cannot be overwritten by stale reads. */
  private async withLockedPromotion<T>(id: string, work: (promotion: Promotion, repo: Repository<Promotion>) => Promise<T>): Promise<T> {
    return this.promotionRepo.manager.transaction(async manager => {
      const repo = manager.getRepository(Promotion);
      const promotion = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!promotion) throw new NotFoundException('Không tìm thấy mã khuyến mãi');
      return work(promotion, repo);
    });
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  /** Ngày theo giờ VN (`YYYY-MM-DD`) – dùng cho cột `daily_date`. */
  private todayInVietnam(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  }

  private async assertCodeAvailable(code: string, exceptId?: string): Promise<void> {
    const existing = await this.promotionRepo.findOne({ where: { code } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Mã khuyến mãi ${code} đã tồn tại`);
    }
  }

  /** Kiểm tra `scope_id` có thật trong bảng tương ứng (không có FK đa hình). */
  private async assertScopesExist(scopes: PromotionScopeView[], manager: EntityManager): Promise<void> {
    const grouped = new Map<PromotionScopeType, string[]>();
    for (const scope of scopes) {
      const list = grouped.get(scope.scopeType) ?? [];
      list.push(scope.scopeId);
      grouped.set(scope.scopeType, list);
    }

    for (const [scopeType, ids] of grouped) {
      const entity = this.scopeEntityFor(scopeType);
      const found = await manager.getRepository(entity).find({ where: { id: In(ids) } as never });
      const foundIds = new Set(found.map((row) => (row as { id: string }).id));
      const missing = ids.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Không tìm thấy ${scopeType} với id: ${missing.join(', ')}`,
        );
      }
    }
  }

  private scopeEntityFor(scopeType: PromotionScopeType) {
    switch (scopeType) {
      case PromotionScopeType.TOUR:
        return Tour;
      case PromotionScopeType.CATEGORY:
        return Category;
      case PromotionScopeType.DESTINATION:
        return Destination;
      case PromotionScopeType.SCHEDULE:
        return DepartureSchedule;
      default:
        throw new BadRequestException(`Loại phạm vi không hợp lệ: ${scopeType}`);
    }
  }

  /** Ràng buộc mà MySQL không sinh được bằng CHECK (xem comment trong `Promotion`). */
  private assertBusinessRules(input: {
    type: PromotionType;
    value: number;
    validFrom: string;
    validTo: string;
    usageLimit: number | null;
    perUserLimit: number;
    maxDiscount: number | null;
    budgetCap: number | null;
    budgetUsed: number;
    dailyLimit: number | null;
  }): void {
    if (input.type === PromotionType.PERCENT && input.value > 100) {
      throw new BadRequestException('Mã giảm giá theo phần trăm không được vượt quá 100%');
    }
    if (input.type === PromotionType.FIXED && input.value <= 0) {
      throw new BadRequestException('Mã giảm giá theo số tiền phải có giá trị lớn hơn 0');
    }
    if (new Date(input.validTo).getTime() <= new Date(input.validFrom).getTime()) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (input.usageLimit !== null && input.usageLimit < 1) {
      throw new BadRequestException('Giới hạn lượt dùng phải từ 1 trở lên (hoặc bỏ trống = không giới hạn)');
    }
    if (input.perUserLimit < 1) {
      throw new BadRequestException('Giới hạn lượt dùng mỗi người phải từ 1 trở lên');
    }
    if (input.maxDiscount !== null && input.maxDiscount < 0) {
      throw new BadRequestException('Trần giảm giá không được âm');
    }
    if (input.budgetCap !== null && input.budgetCap < 0) {
      throw new BadRequestException('Ngân sách chiến dịch không được âm');
    }
    if (input.budgetCap !== null && input.budgetCap < input.budgetUsed) {
      throw new BadRequestException('Ngân sách chiến dịch không được nhỏ hơn số tiền đã giảm');
    }
    if (input.dailyLimit !== null && input.dailyLimit < 1) {
      throw new BadRequestException('Giới hạn lượt mỗi ngày phải từ 1 trở lên (hoặc bỏ trống = không giới hạn)');
    }
  }

  /** Nạp phạm vi cho một lô mã (1 query) – tránh N+1 khi phân trang. */
  private async attachScopes(promotions: Promotion[]): Promise<Map<string, PromotionScopeView[]>> {
    const map = new Map<string, PromotionScopeView[]>();
    if (promotions.length === 0) return map;

    const rows = await this.promotionRepo.manager.getRepository(PromotionScope)
      .find({ where: { promotionId: In(promotions.map((promotion) => promotion.id)) } });

    for (const row of rows) {
      const list = map.get(row.promotionId) ?? [];
      list.push({ scopeType: row.scopeType, scopeId: row.scopeId });
      map.set(row.promotionId, list);
    }
    return map;
  }

  /** Các mã đang thật sự dùng được (status/validity/hạn mức) – đầu vào của engine. */
  private async loadActivePromotions(now: Date): Promise<Promotion[]> {
    const today = this.todayInVietnam(now);
    return this.promotionRepo.createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('promotion.validFrom <= :now AND promotion.validTo >= :now', { now })
      .andWhere('(promotion.usageLimit IS NULL OR promotion.usedCount < promotion.usageLimit)')
      .andWhere('(promotion.budgetCap IS NULL OR promotion.budgetUsed < promotion.budgetCap)')
      .andWhere(
        '(promotion.dailyLimit IS NULL OR promotion.dailyDate <> :today OR promotion.dailyUsed < promotion.dailyLimit)',
        { today },
      )
      .orderBy('promotion.priority', 'DESC')
      .take(MAX_CANDIDATES)
      .getMany();
  }

  /** Nạp phạm vi + assignment + số lượt đã dùng của khách cho một lô mã. */
  private async loadCandidatesFor(
    promotions: Promotion[],
    customerId: string,
    manager?: EntityManager,
  ): Promise<Map<string, PromotionCandidate>> {
    const map = new Map<string, PromotionCandidate>();
    if (promotions.length === 0) return map;

    const db = manager ?? this.promotionRepo.manager;
    const ids = promotions.map((promotion) => promotion.id);

    const [scopeRows, assignmentRows, usageRows] = await Promise.all([
      db.getRepository(PromotionScope).find({ where: { promotionId: In(ids) } }),
      db.getRepository(PromotionAssignment).find({ where: { promotionId: In(ids), customerId } }),
      db.getRepository(PromotionRedemption)
        .createQueryBuilder('redemption')
        .select('redemption.promotionId', 'promotionId')
        .addSelect('COUNT(*)', 'count')
        .where('redemption.promotionId IN (:...ids)', { ids })
        .andWhere('redemption.customerId = :customerId', { customerId })
        .andWhere('redemption.status <> :released', { released: PromotionRedemptionStatus.RELEASED })
        .groupBy('redemption.promotionId')
        .getRawMany<{ promotionId: string; count: string }>(),
    ]);

    const scopesByPromotion = new Map<string, { scopeType: PromotionScopeType; scopeId: string }[]>();
    for (const row of scopeRows) {
      const list = scopesByPromotion.get(row.promotionId) ?? [];
      list.push({ scopeType: row.scopeType, scopeId: row.scopeId });
      scopesByPromotion.set(row.promotionId, list);
    }

    const assignedIds = new Set(assignmentRows.map((row) => row.promotionId));
    const usageByPromotion = new Map(usageRows.map((row) => [row.promotionId, Number(row.count)]));

    for (const promotion of promotions) {
      map.set(promotion.id, {
        promotion,
        scopes: scopesByPromotion.get(promotion.id) ?? [],
        assigned: assignedIds.has(promotion.id),
        perUserUsed: usageByPromotion.get(promotion.id) ?? 0,
      });
    }
    return map;
  }

  private async loadCandidate(
    promotion: Promotion,
    customerId: string,
    manager: EntityManager,
  ): Promise<PromotionCandidate> {
    const map = await this.loadCandidatesFor([promotion], customerId, manager);
    return map.get(promotion.id) as PromotionCandidate;
  }

  /**
   * Dựng `DiscountContext` từ lịch khởi hành: tour, danh mục, điểm đến, kênh bán
   * và việc khách đã có đơn nào chưa (cho `customerScope = NEW_CUSTOMER`).
   */
  private async buildContext(input: {
    subtotal: number;
    scheduleId: string;
    customerId: string;
    channel: BookingChannel;
    manager?: EntityManager;
    now?: Date;
  }): Promise<DiscountContext> {
    const db = input.manager ?? this.promotionRepo.manager;

    const schedule = await db.getRepository(DepartureSchedule)
      .findOne({ where: { id: input.scheduleId } });
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');

    const tour = await db.getRepository(Tour)
      .findOne({ where: { id: schedule.tourId }, relations: { categories: true } });
    const destinationLinks = await db.getRepository(TourDestination)
      .find({ where: { tourId: schedule.tourId } });

    const previousBookings = await db.getRepository(Booking).count({
      where: {
        customerId: input.customerId,
        status: Not(In(RELEASED_BOOKING_STATUSES)),
      },
    });

    return {
      subtotal: input.subtotal,
      tourId: schedule.tourId,
      categoryIds: (tour?.categories ?? []).map((category) => category.id),
      destinationIds: destinationLinks.map((link) => link.destinationId),
      scheduleId: schedule.id,
      customerId: input.customerId,
      isFirstBooking: previousBookings === 0,
      channel: input.channel,
      now: input.now ?? new Date(),
    };
  }

  private toView(promotion: Promotion, now: Date = new Date(), scopes: PromotionScopeView[] = []): PromotionView {
    const remainingUses =
      promotion.usageLimit === null || promotion.usageLimit === undefined
        ? null
        : Math.max(promotion.usageLimit - promotion.usedCount, 0);

    const status = promotion.status ?? (promotion.active ? PromotionStatus.ACTIVE : PromotionStatus.PAUSED);
    const usable =
      status === PromotionStatus.ACTIVE &&
      (remainingUses === null || remainingUses > 0) &&
      (promotion.budgetCap == null || promotion.budgetUsed < promotion.budgetCap) &&
      (promotion.dailyLimit == null || promotion.dailyUsed < promotion.dailyLimit) &&
      now >= promotion.validFrom &&
      now <= promotion.validTo;

    return {
      id: promotion.id,
      code: promotion.code,
      name: promotion.name ?? null,
      description: promotion.description ?? null,
      imageUrl: promotion.imageUrl ?? null,
      type: promotion.type,
      value: promotion.value,
      maxDiscount: promotion.maxDiscount ?? null,
      minOrder: promotion.minOrder,
      usageLimit: promotion.usageLimit ?? null,
      usedCount: promotion.usedCount,
      remainingUses,
      perUserLimit: promotion.perUserLimit,
      validFrom: promotion.validFrom,
      validTo: promotion.validTo,
      active: promotion.active,
      status,
      kind: promotion.kind,
      budgetCap: promotion.budgetCap ?? null,
      budgetUsed: promotion.budgetUsed,
      dailyLimit: promotion.dailyLimit ?? null,
      dailyUsed: promotion.dailyUsed,
      channelScope: promotion.channelScope,
      customerScope: promotion.customerScope,
      stackable: promotion.stackable,
      exclusiveGroup: promotion.exclusiveGroup ?? null,
      priority: promotion.priority,
      termsText: promotion.termsText ?? null,
      scopes,
      usable,
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
    };
  }
}
