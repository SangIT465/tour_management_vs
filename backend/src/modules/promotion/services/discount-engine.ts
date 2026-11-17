import {
  BookingChannel,
  PromotionChannelScope,
  PromotionCustomerScope,
  PromotionKind,
  PromotionScopeType,
  PromotionStatus,
} from '../../../common/enums/index.js';
import type { Promotion } from '../entities/promotion.entity.js';

/**
 * Engine tính giảm giá – **thuần**, không phụ thuộc TypeORM/DB.
 *
 * Vì sao tách khỏi `PromotionService`:
 * - Trước đây điều kiện "mã có dùng được không" nằm rải ở `findUsableOrFail`
 *   (ném exception) và `Promotion.isUsable` (trả boolean), nên không thể trả
 *   về *lý do* cho FE hiển thị, cũng không thể xét phạm vi/kênh/ngân sách.
 * - Engine nhận dữ liệu đã nạp sẵn và trả kết quả có cấu trúc, nhờ vậy:
 *   `quote`, `create`, `validate`, `best-for-cart` dùng **cùng một logic**,
 *   và test được bằng object thuần, không cần mock repository.
 *
 * Nguyên tắc: engine **không** ghi DB, **không** ném exception. Nơi gọi quyết
 * định biến `rejected` thành lỗi 400 hay chỉ hiển thị gợi ý.
 */

/** Dữ liệu đơn hàng cần để xét một mã. */
export interface DiscountContext {
  subtotal: number;
  tourId: string;
  categoryIds: string[];
  destinationIds: string[];
  scheduleId: string;
  customerId: string;
  /** Khách chưa có đơn nào trước đơn này (dùng cho `customerScope = NEW_CUSTOMER`). */
  isFirstBooking: boolean;
  channel: BookingChannel;
  now: Date;
}

/** Một mã kèm dữ liệu phụ đã nạp từ DB. */
export interface PromotionCandidate {
  promotion: Promotion;
  /** Các dòng `promotion_scopes` của mã. Rỗng = áp toàn hệ thống. */
  scopes: { scopeType: PromotionScopeType; scopeId: string }[];
  /** Khách hiện tại có assignment cho mã này? (chỉ cần với `kind = PERSONAL | GIFT`) */
  assigned: boolean;
  /** Số lượt khách này đã dùng mã (đếm trên sổ cái, không tính đơn đã hủy). */
  perUserUsed: number;
}

/** Một dòng giảm giá được chọn. */
export interface AppliedDiscount {
  promotion: Promotion;
  code: string;
  discount: number;
  exclusiveGroup: string | null;
}

/** Một mã bị loại kèm lý do đọc được. */
export interface RejectedDiscount {
  code: string;
  reason: string;
}

export interface DiscountEvaluation {
  applied: AppliedDiscount[];
  rejected: RejectedDiscount[];
  totalDiscount: number;
}

export interface EvaluateOptions {
  /** Trần tổng giảm của một đơn (cấu hình hệ thống). null = không giới hạn. */
  maxTotalDiscount?: number | null;
  /** Số mã tối đa được cộng dồn. Mặc định 1 để giữ hành vi cũ. */
  maxCodes?: number;
}

const DEFAULT_MAX_CODES = 1;

/**
 * Xét một mã với một đơn hàng.
 * Trả `{ ok: true, discount }` hoặc `{ ok: false, reason }` – không ném lỗi.
 */
export function evaluatePromotion(
  candidate: PromotionCandidate,
  context: DiscountContext,
): { ok: true; discount: number } | { ok: false; reason: string } {
  const { promotion } = candidate;

  if (promotion.status !== PromotionStatus.ACTIVE) {
    return { ok: false, reason: `Mã ${promotion.code} đang ở trạng thái ${promotion.status}` };
  }
  if (context.now < promotion.validFrom) {
    return { ok: false, reason: `Mã ${promotion.code} chưa có hiệu lực` };
  }
  if (context.now > promotion.validTo) {
    return { ok: false, reason: `Mã ${promotion.code} đã hết hạn` };
  }
  if (promotion.usageLimit != null && promotion.usedCount >= promotion.usageLimit) {
    return { ok: false, reason: `Mã ${promotion.code} đã hết lượt sử dụng` };
  }
  if (promotion.budgetCap != null && promotion.budgetUsed >= promotion.budgetCap) {
    return { ok: false, reason: `Mã ${promotion.code} đã dùng hết ngân sách chiến dịch` };
  }
  if (promotion.dailyLimit != null && promotion.dailyUsed >= promotion.dailyLimit) {
    return { ok: false, reason: `Mã ${promotion.code} đã đạt giới hạn lượt hôm nay` };
  }
  if (context.subtotal < promotion.minOrder) {
    return {
      ok: false,
      reason: `Mã ${promotion.code} yêu cầu đơn tối thiểu ${promotion.minOrder.toLocaleString('vi-VN')}đ`,
    };
  }
  if (candidate.perUserUsed >= promotion.perUserLimit) {
    return { ok: false, reason: `Bạn đã dùng hết ${promotion.perUserLimit} lượt của mã ${promotion.code}` };
  }

  // Kênh bán: mã chỉ dành cho online không áp được cho đơn tại quầy và ngược lại.
  if (promotion.channelScope !== PromotionChannelScope.ALL) {
    const required = promotion.channelScope === PromotionChannelScope.ONLINE
      ? BookingChannel.ONLINE
      : BookingChannel.COUNTER;
    if (context.channel !== required) {
      return { ok: false, reason: `Mã ${promotion.code} chỉ áp dụng cho kênh ${required}` };
    }
  }

  // Nhóm khách: ưu đãi khách mới chỉ dành cho đơn đầu tiên.
  if (promotion.customerScope === PromotionCustomerScope.NEW_CUSTOMER && !context.isFirstBooking) {
    return { ok: false, reason: `Mã ${promotion.code} chỉ dành cho khách đặt lần đầu` };
  }

  // Mã cá nhân/quà tặng phải được cấp riêng cho đúng khách.
  if (promotion.kind !== PromotionKind.PUBLIC && !candidate.assigned) {
    return { ok: false, reason: `Mã ${promotion.code} không dành cho tài khoản của bạn` };
  }

  // Phạm vi: không có dòng scope = toàn hệ thống.
  if (candidate.scopes.length > 0 && !matchesScope(candidate.scopes, context)) {
    return { ok: false, reason: `Mã ${promotion.code} không áp dụng cho tour/lịch này` };
  }

  const discount = promotion.calculateDiscount(context.subtotal, context.now);
  if (discount <= 0) {
    return { ok: false, reason: `Mã ${promotion.code} không tạo ra khoản giảm nào cho đơn này` };
  }
  return { ok: true, discount };
}

/** Mã có ít nhất một dòng scope khớp với đơn? */
function matchesScope(
  scopes: { scopeType: PromotionScopeType; scopeId: string }[],
  context: DiscountContext,
): boolean {
  return scopes.some((scope) => {
    switch (scope.scopeType) {
      case PromotionScopeType.TOUR:
        return scope.scopeId === context.tourId;
      case PromotionScopeType.SCHEDULE:
        return scope.scopeId === context.scheduleId;
      case PromotionScopeType.CATEGORY:
        return context.categoryIds.includes(scope.scopeId);
      case PromotionScopeType.DESTINATION:
        return context.destinationIds.includes(scope.scopeId);
      default:
        return false;
    }
  });
}

/**
 * Chọn tổ hợp mã tốt nhất cho một đơn.
 *
 * Thứ tự: `priority` giảm dần, rồi tới số tiền giảm thực tế giảm dần. Cách này
 * cho admin quyền "ép" một chiến dịch chiến lược lên trước, đồng thời vẫn tối ưu
 * tiền cho khách khi các mã ngang nhau.
 *
 * Quy tắc cộng dồn:
 * - Mã `stackable = false` **không** đi cùng mã khác: nếu được chọn thì dừng.
 * - Hai mã cùng `exclusiveGroup` không đi cùng nhau.
 * - Tổng giảm không vượt `subtotal` và không vượt `maxTotalDiscount`.
 */
export function selectDiscounts(
  candidates: PromotionCandidate[],
  context: DiscountContext,
  options: EvaluateOptions = {},
): DiscountEvaluation {
  const maxCodes = Math.max(1, options.maxCodes ?? DEFAULT_MAX_CODES);
  const rejected: RejectedDiscount[] = [];
  const eligible: { candidate: PromotionCandidate; discount: number }[] = [];

  for (const candidate of candidates) {
    const result = evaluatePromotion(candidate, context);
    if (result.ok) eligible.push({ candidate, discount: result.discount });
    else rejected.push({ code: candidate.promotion.code, reason: result.reason });
  }

  eligible.sort((a, b) => {
    const byPriority = (b.candidate.promotion.priority ?? 0) - (a.candidate.promotion.priority ?? 0);
    if (byPriority !== 0) return byPriority;
    return b.discount - a.discount;
  });

  const applied: AppliedDiscount[] = [];
  const usedGroups = new Set<string>();
  let totalDiscount = 0;
  const cap = options.maxTotalDiscount ?? null;

  for (const { candidate, discount } of eligible) {
    if (applied.length >= maxCodes) {
      rejected.push({ code: candidate.promotion.code, reason: 'Chỉ được dùng tối đa số mã cho phép trên một đơn' });
      continue;
    }
    const group = candidate.promotion.exclusiveGroup ?? null;
    if (group && usedGroups.has(group)) {
      rejected.push({ code: candidate.promotion.code, reason: `Không dùng chung nhóm ưu đãi "${group}"` });
      continue;
    }

    const remaining = Math.max(0, context.subtotal - totalDiscount);
    const room = cap == null ? remaining : Math.max(0, Math.min(remaining, cap - totalDiscount));
    if (room <= 0) {
      rejected.push({ code: candidate.promotion.code, reason: 'Đơn đã đạt mức giảm tối đa' });
      continue;
    }

    const actual = Math.min(discount, room);
    applied.push({
      promotion: candidate.promotion,
      code: candidate.promotion.code,
      discount: actual,
      exclusiveGroup: group,
    });
    totalDiscount += actual;
    if (group) usedGroups.add(group);

    // Mã không cộng dồn: dừng ngay sau khi chọn được nó.
    if (!candidate.promotion.stackable) break;
  }

  return { applied, rejected, totalDiscount };
}
