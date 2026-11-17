import { BeforeInsert, BeforeUpdate, Column, Entity, Index, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import {
  PromotionChannelScope,
  PromotionCustomerScope,
  PromotionKind,
  PromotionStatus,
  PromotionType,
} from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { PromotionAssignment } from './promotion-assignment.entity.js';
import { PromotionRedemption } from './promotion-redemption.entity.js';
import { PromotionScope } from './promotion-scope.entity.js';

/**
 * `promotions` – mã giảm giá / chiến dịch khuyến mãi.
 *
 * `value` khai báo `decimal(14,2)` (không phải `numeric(14,0)` như các cột tiền khác)
 * vì với `type = PERCENT`, `value` có thể là `12.5` (%). Vì vậy dùng
 * `moneyTransformer` – nó chỉ ép string → number, vẫn giữ đủ phần thập phân.
 *
 * Kiểm tra nghiệp vụ ở service (không dùng `@Check` vì TypeORM không sinh CHECK trên MySQL):
 * - `valid_to > valid_from`
 * - `used_count <= usage_limit` khi `usage_limit` khác null
 * - nếu `type = PERCENT` thì `value <= 100`
 * - `budget_used <= budget_cap` khi `budget_cap` khác null
 *
 * `active` (boolean) là cột cũ, vẫn được giữ để tương thích API/dữ liệu. Từ nay
 * `status` là nguồn sự thật: chỉ `ACTIVE` mới được áp mã. `active` được service
 * đồng bộ theo `status` để mọi truy vấn cũ (`WHERE active = true`) không trả về
 * mã đã tạm dừng.
 */
@Entity('promotions')
@Index('uq_promotions_code', ['code'], { unique: true })
@Index('idx_promotions_validity', ['active', 'validFrom', 'validTo'])
@Index('idx_promotions_status', ['status', 'validFrom', 'validTo'])
export class Promotion extends BaseEntity {
  /** Luôn lưu chữ IN HOA để so khớp không phân biệt hoa/thường. */
  @Column({ type: 'varchar', length: 40 })
  code: string;

  /** Tên chiến dịch hiển thị cho khách, vd "Ưu đãi hè 2026". */
  @Column({ type: 'varchar', length: 150, nullable: true })
  name?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'varchar', length: 20 })
  type: PromotionType;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: moneyTransformer })
  value: number;

  /** Trần giảm khi `type = PERCENT`. */
  @Column({ name: 'max_discount', type: 'decimal', precision: 14, scale: 0, nullable: true, transformer: moneyTransformer })
  maxDiscount?: number | null;

  @Column({ name: 'min_order', type: 'decimal', precision: 14, scale: 0, default: 0, transformer: moneyTransformer })
  minOrder: number;

  /** null = không giới hạn. */
  @Column({ name: 'usage_limit', type: 'int', unsigned: true, nullable: true })
  usageLimit?: number | null;

  @Column({ name: 'used_count', type: 'int', unsigned: true, default: 0 })
  usedCount: number;

  @Column({ name: 'per_user_limit', type: 'int', unsigned: true, default: 1 })
  perUserLimit: number;

  @Column({ name: 'valid_from', type: 'datetime', precision: 3 })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'datetime', precision: 3 })
  validTo: Date;

  /** Cột cũ – service đồng bộ theo `status` để truy vấn cũ vẫn đúng. */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 20, default: PromotionStatus.ACTIVE })
  status: PromotionStatus;

  @Column({ type: 'varchar', length: 20, default: PromotionKind.PUBLIC })
  kind: PromotionKind;

  /** Trần tổng tiền giảm của cả chiến dịch. null = không giới hạn. */
  @Column({ name: 'budget_cap', type: 'decimal', precision: 14, scale: 0, nullable: true, transformer: moneyTransformer })
  budgetCap?: number | null;

  @Column({ name: 'budget_used', type: 'decimal', precision: 14, scale: 0, default: 0, transformer: moneyTransformer })
  budgetUsed: number;

  /** Trần số lượt mỗi ngày. null = không giới hạn. */
  @Column({ name: 'daily_limit', type: 'int', unsigned: true, nullable: true })
  dailyLimit?: number | null;

  @Column({ name: 'daily_used', type: 'int', unsigned: true, default: 0 })
  dailyUsed: number;

  /** Ngày (theo giờ VN) mà `daily_used` đang đếm; sang ngày mới thì reset. */
  @Column({ name: 'daily_date', type: 'date', nullable: true })
  dailyDate?: string | null;

  @Column({ name: 'channel_scope', type: 'varchar', length: 20, default: PromotionChannelScope.ALL })
  channelScope: PromotionChannelScope;

  @Column({ name: 'customer_scope', type: 'varchar', length: 20, default: PromotionCustomerScope.ALL })
  customerScope: PromotionCustomerScope;

  /** Cho phép cộng dồn với mã khác? */
  @Column({ type: 'boolean', default: false })
  stackable: boolean;

  /** Mã cùng `exclusiveGroup` không được dùng chung một đơn. */
  @Column({ name: 'exclusive_group', type: 'varchar', length: 40, nullable: true })
  exclusiveGroup?: string | null;

  /** Số lớn hơn được ưu tiên chọn trước khi phải loại bớt vì loại trừ. */
  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'terms_text', type: 'text', nullable: true })
  termsText?: string | null;

  @OneToMany(() => PromotionScope, (scope) => scope.promotion)
  scopes?: Relation<PromotionScope[]>;

  @OneToMany(() => PromotionAssignment, (assignment) => assignment.promotion)
  assignments?: Relation<PromotionAssignment[]>;

  @OneToMany(() => PromotionRedemption, (redemption) => redemption.promotion)
  redemptions?: Relation<PromotionRedemption[]>;

  @BeforeInsert()
  @BeforeUpdate()
  protected normalize(): void {
    this.id ??= uuidv4();
    this.code = this.code.trim().toUpperCase();
    // `active` là cột cũ: giữ đồng bộ để truy vấn `WHERE active = true` không
    // trả về mã đã tạm dừng/kết thúc.
    this.active = this.status === PromotionStatus.ACTIVE;
  }

  /**
   * Tính số tiền được giảm cho một đơn hàng.
   * Trả 0 nếu mã không đủ điều kiện (service vẫn nên báo lỗi cụ thể cho người dùng).
   *
   * Giữ lại để tương thích: `DiscountEngine` gọi hàm này sau khi đã kiểm tra
   * phạm vi/kênh/ngân sách, nên logic tính tiền chỉ tồn tại ở một chỗ.
   */
  calculateDiscount(subtotal: number, now: Date = new Date()): number {
    if (!this.isUsable(subtotal, now)) return 0;

    let discount =
      this.type === PromotionType.PERCENT
        ? Math.round((subtotal * this.value) / 100)
        : Math.round(this.value);

    if (this.maxDiscount != null) discount = Math.min(discount, this.maxDiscount);
    return Math.min(discount, subtotal);
  }

  isUsable(subtotal: number, now: Date = new Date()): boolean {
    const outOfQuota = this.usageLimit != null && this.usedCount >= this.usageLimit;
    const outOfBudget = this.budgetCap != null && this.budgetUsed >= this.budgetCap;
    const outOfDaily = this.dailyLimit != null && this.dailyUsed >= this.dailyLimit;
    return (
      this.status === PromotionStatus.ACTIVE &&
      !outOfQuota &&
      !outOfBudget &&
      !outOfDaily &&
      subtotal >= this.minOrder &&
      now >= this.validFrom &&
      now <= this.validTo
    );
  }
}
