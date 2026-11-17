import type {
  PromotionChannelScope,
  PromotionCustomerScope,
  PromotionKind,
  PromotionRedemptionStatus,
  PromotionScopeType,
  PromotionStatus,
  PromotionType,
} from '../../../common/enums/index.js';

/** Một dòng phạm vi áp dụng trả về cho client. */
export interface PromotionScopeView {
  scopeType: PromotionScopeType;
  scopeId: string;
}

/** Bản hiển thị của mã khuyến mãi trả về cho client. */
export interface PromotionView {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  type: PromotionType;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  usageLimit: number | null;
  usedCount: number;
  /** Số lượt còn lại, `null` khi không giới hạn. */
  remainingUses: number | null;
  perUserLimit: number;
  validFrom: Date;
  validTo: Date;
  active: boolean;
  status: PromotionStatus;
  kind: PromotionKind;
  budgetCap: number | null;
  budgetUsed: number;
  dailyLimit: number | null;
  dailyUsed: number;
  channelScope: PromotionChannelScope;
  customerScope: PromotionCustomerScope;
  stackable: boolean;
  exclusiveGroup: string | null;
  priority: number;
  termsText: string | null;
  scopes: PromotionScopeView[];
  /** Mã còn dùng được ở thời điểm hiện tại? (không xét `perUserLimit`). */
  usable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Kết quả áp thử mã: cho FE hiển thị đúng số tiền sẽ được giảm. */
export interface PromotionQuoteView {
  code: string;
  subtotal: number;
  discount: number;
  total: number;
  type: PromotionType;
  value: number;
}

/**
 * Mã hiển thị cho khách trong danh sách ưu đãi.
 *
 * Thêm `estimatedDiscount` và `rejectedReason` so với bản cũ: trước đây FE phải
 * tự đoán vì sao mã không dùng được, và không biết mã nào tiết kiệm nhất.
 */
export interface AvailablePromotionView {
  code: string;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  type: PromotionType;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  perUserLimit: number;
  validFrom: Date;
  validTo: Date;
  /** Khách hiện tại đã được cấp riêng mã này? (chỉ có ý nghĩa với PERSONAL/GIFT) */
  assigned: boolean;
  /** Số tiền sẽ giảm với `subtotal` hiện tại; 0 khi không đủ điều kiện. */
  estimatedDiscount: number;
  /** Lý do không dùng được, `null` khi dùng được. */
  rejectedReason: string | null;
}

/** Kết quả gợi ý mã tốt nhất cho giỏ hàng. */
export interface BestOfferView {
  subtotal: number;
  totalDiscount: number;
  total: number;
  applied: { code: string; discount: number }[];
  rejected: { code: string; reason: string }[];
}

/** Một lượt dùng mã trong sổ cái, trả cho admin. */
export interface RedemptionView {
  id: string;
  promotionId: string;
  code: string;
  bookingId: string;
  bookingCode: string | null;
  customerId: string;
  discountAmount: number;
  subtotalAtUse: number;
  status: PromotionRedemptionStatus;
  reservedAt: Date;
  confirmedAt: Date | null;
  releasedAt: Date | null;
  releaseReason: string | null;
}

/** Thống kê hiệu quả một mã. */
export interface PromotionStatsView {
  promotionId: string;
  code: string;
  name: string | null;
  status: PromotionStatus;
  usageLimit: number | null;
  usedCount: number;
  remainingUses: number | null;
  budgetCap: number | null;
  budgetUsed: number;
  /** Số lượt đã thanh toán (CONFIRMED). */
  confirmedCount: number;
  /** Số lượt đang giữ chỗ (RESERVED). */
  reservedCount: number;
  /** Số lượt đã hoàn (RELEASED). */
  releasedCount: number;
  /** Tổng tiền đã giảm cho các lượt CONFIRMED. */
  totalDiscount: number;
  /** Tổng tạm tính của các đơn đã dùng mã (CONFIRMED) – mẫu số của tỉ lệ giảm. */
  totalSubtotal: number;
  /** `totalDiscount / totalSubtotal`, làm tròn 2 chữ số. */
  discountRate: number;
  /** Số khách khác nhau đã dùng mã. */
  uniqueCustomers: number;
  /** Ngày tạo lượt dùng gần nhất. */
  lastUsedAt: Date | null;
}
