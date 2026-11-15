import {
  BookingChannel,
  PromotionChannelScope,
  PromotionCustomerScope,
  PromotionKind,
  PromotionScopeType,
  PromotionStatus,
  PromotionType,
} from '../../../common/enums/index.js';
import { Promotion } from '../entities/promotion.entity.js';
import type { DiscountContext, PromotionCandidate } from './discount-engine.js';
import { evaluatePromotion, selectDiscounts } from './discount-engine.js';

const NOW = new Date('2026-06-15T03:00:00.000Z');

/**
 * `new Promotion()` không chạy default của DB, nên fixture phải khai báo **đủ**
 * mọi cột mà engine đọc – thiếu `status` sẽ khiến mã bị coi là không ACTIVE.
 */
function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return Object.assign(new Promotion(), {
    id: 'promo-1',
    code: 'SUMMER',
    type: PromotionType.PERCENT,
    value: 10,
    maxDiscount: 200_000,
    minOrder: 1_000_000,
    usageLimit: null,
    usedCount: 0,
    perUserLimit: 1,
    validFrom: new Date('2026-06-01T00:00:00.000Z'),
    validTo: new Date('2026-06-30T00:00:00.000Z'),
    active: true,
    status: PromotionStatus.ACTIVE,
    kind: PromotionKind.PUBLIC,
    budgetCap: null,
    budgetUsed: 0,
    dailyLimit: null,
    dailyUsed: 0,
    dailyDate: null,
    channelScope: PromotionChannelScope.ALL,
    customerScope: PromotionCustomerScope.ALL,
    stackable: false,
    exclusiveGroup: null,
    priority: 0,
    ...overrides,
  });
}

function candidate(overrides: Partial<PromotionCandidate> = {}): PromotionCandidate {
  return {
    promotion: promotion(),
    scopes: [],
    assigned: false,
    perUserUsed: 0,
    ...overrides,
  };
}

function context(overrides: Partial<DiscountContext> = {}): DiscountContext {
  return {
    subtotal: 3_000_000,
    tourId: 'tour-1',
    categoryIds: ['cat-beach'],
    destinationIds: ['dest-danang'],
    scheduleId: 'schedule-1',
    customerId: 'customer-1',
    isFirstBooking: false,
    channel: BookingChannel.ONLINE,
    now: NOW,
    ...overrides,
  };
}

describe('evaluatePromotion', () => {
  it('tính giảm theo % và cắt theo trần maxDiscount', () => {
    const result = evaluatePromotion(candidate(), context());
    expect(result).toEqual({ ok: true, discount: 200_000 });
  });

  it('tính giảm theo số tiền cố định', () => {
    const result = evaluatePromotion(
      candidate({ promotion: promotion({ type: PromotionType.FIXED, value: 350_000, maxDiscount: null }) }),
      context(),
    );
    expect(result).toEqual({ ok: true, discount: 350_000 });
  });

  it('không giảm quá tạm tính của đơn', () => {
    const result = evaluatePromotion(
      candidate({ promotion: promotion({ type: PromotionType.FIXED, value: 5_000_000, maxDiscount: null }) }),
      context({ subtotal: 1_200_000 }),
    );
    expect(result).toEqual({ ok: true, discount: 1_200_000 });
  });

  it.each([
    ['mã đang tạm dừng', { status: PromotionStatus.PAUSED }, /trạng thái/],
    ['mã đã kết thúc', { status: PromotionStatus.EXPIRED }, /trạng thái/],
    ['chưa tới ngày hiệu lực', { validFrom: new Date('2026-07-01T00:00:00.000Z') }, /chưa có hiệu lực/],
    ['đã quá ngày kết thúc', { validTo: new Date('2026-06-01T00:00:00.000Z') }, /đã hết hạn/],
    ['hết tổng lượt', { usageLimit: 10, usedCount: 10 }, /hết lượt/],
    ['hết ngân sách', { budgetCap: 1_000_000, budgetUsed: 1_000_000 }, /ngân sách/],
    ['hết lượt hôm nay', { dailyLimit: 5, dailyUsed: 5 }, /giới hạn lượt hôm nay/],
    ['dưới đơn tối thiểu', { minOrder: 5_000_000 }, /đơn tối thiểu/],
  ])('loại mã khi %s', (_label, overrides, reason) => {
    const result = evaluatePromotion(candidate({ promotion: promotion(overrides) }), context());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it('loại mã khi khách đã dùng hết hạn mức cá nhân', () => {
    const result = evaluatePromotion(candidate({ perUserUsed: 1 }), context());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/lượt/);
  });

  it('chặn mã chỉ dành cho kênh ONLINE khi đơn tại quầy', () => {
    const result = evaluatePromotion(
      candidate({ promotion: promotion({ channelScope: PromotionChannelScope.ONLINE }) }),
      context({ channel: BookingChannel.COUNTER }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/kênh ONLINE/);
  });

  it('cho phép mã ONLINE khi đơn online', () => {
    const result = evaluatePromotion(
      candidate({ promotion: promotion({ channelScope: PromotionChannelScope.ONLINE }) }),
      context({ channel: BookingChannel.ONLINE }),
    );
    expect(result.ok).toBe(true);
  });

  it('chặn mã khách mới khi khách đã từng đặt', () => {
    const result = evaluatePromotion(
      candidate({ promotion: promotion({ customerScope: PromotionCustomerScope.NEW_CUSTOMER }) }),
      context({ isFirstBooking: false }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/lần đầu/);
  });

  it('cho phép mã khách mới với đơn đầu tiên', () => {
    const result = evaluatePromotion(
      candidate({ promotion: promotion({ customerScope: PromotionCustomerScope.NEW_CUSTOMER }) }),
      context({ isFirstBooking: true }),
    );
    expect(result.ok).toBe(true);
  });

  it('chặn mã PERSONAL khi khách chưa được cấp', () => {
    const result = evaluatePromotion(
      candidate({ promotion: promotion({ kind: PromotionKind.PERSONAL }), assigned: false }),
      context(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/không dành cho tài khoản/);
  });

  it('cho phép mã PERSONAL khi đã được cấp', () => {
    const result = evaluatePromotion(
      candidate({ promotion: promotion({ kind: PromotionKind.PERSONAL }), assigned: true }),
      context(),
    );
    expect(result.ok).toBe(true);
  });

  it('không có dòng scope nghĩa là áp toàn hệ thống', () => {
    expect(evaluatePromotion(candidate({ scopes: [] }), context()).ok).toBe(true);
  });

  it.each([
    ['TOUR khớp', PromotionScopeType.TOUR, 'tour-1', true],
    ['TOUR không khớp', PromotionScopeType.TOUR, 'tour-2', false],
    ['SCHEDULE khớp', PromotionScopeType.SCHEDULE, 'schedule-1', true],
    ['SCHEDULE không khớp', PromotionScopeType.SCHEDULE, 'schedule-9', false],
    ['CATEGORY khớp', PromotionScopeType.CATEGORY, 'cat-beach', true],
    ['CATEGORY không khớp', PromotionScopeType.CATEGORY, 'cat-mountain', false],
    ['DESTINATION khớp', PromotionScopeType.DESTINATION, 'dest-danang', true],
    ['DESTINATION không khớp', PromotionScopeType.DESTINATION, 'dest-hue', false],
  ])('xét phạm vi %s', (_label, scopeType, scopeId, expected) => {
    const result = evaluatePromotion(candidate({ scopes: [{ scopeType, scopeId }] }), context());
    expect(result.ok).toBe(expected);
  });

  it('chỉ cần một dòng scope khớp là đủ', () => {
    const result = evaluatePromotion(
      candidate({
        scopes: [
          { scopeType: PromotionScopeType.TOUR, scopeId: 'tour-2' },
          { scopeType: PromotionScopeType.CATEGORY, scopeId: 'cat-beach' },
        ],
      }),
      context(),
    );
    expect(result.ok).toBe(true);
  });
});

describe('selectDiscounts', () => {
  it('mặc định chỉ chọn một mã (giữ hành vi cũ)', () => {
    const evaluation = selectDiscounts(
      [
        candidate({ promotion: promotion({ id: 'a', code: 'A', value: 5, maxDiscount: null }) }),
        candidate({ promotion: promotion({ id: 'b', code: 'B', value: 10, maxDiscount: null }) }),
      ],
      context(),
    );
    expect(evaluation.applied).toHaveLength(1);
    expect(evaluation.applied[0].code).toBe('B');
    expect(evaluation.totalDiscount).toBe(300_000);
    // Mã không `stackable` dừng vòng lặp ngay ⇒ mã còn lại không bị xét, không có lý do loại.
    expect(evaluation.rejected).toHaveLength(0);
  });

  it('báo lý do khi vượt số mã tối đa cho phép', () => {
    const evaluation = selectDiscounts(
      [
        candidate({ promotion: promotion({ id: 'a', code: 'A', value: 10, maxDiscount: null, stackable: true }) }),
        candidate({ promotion: promotion({ id: 'b', code: 'B', value: 5, maxDiscount: null, stackable: true }) }),
      ],
      context(),
      { maxCodes: 1 },
    );
    expect(evaluation.applied.map((item) => item.code)).toEqual(['A']);
    expect(evaluation.rejected).toHaveLength(1);
    expect(evaluation.rejected[0].reason).toMatch(/tối đa/);
  });

  it('ưu tiên mã có priority cao hơn dù giảm ít tiền hơn', () => {
    const evaluation = selectDiscounts(
      [
        candidate({ promotion: promotion({ id: 'a', code: 'BIG', value: 20, maxDiscount: null }) }),
        candidate({ promotion: promotion({ id: 'b', code: 'VIP', value: 5, maxDiscount: null, priority: 10 }) }),
      ],
      context(),
    );
    expect(evaluation.applied[0].code).toBe('VIP');
  });

  it('cộng dồn nhiều mã khi bật stackable và tăng maxCodes', () => {
    const evaluation = selectDiscounts(
      [
        candidate({ promotion: promotion({ id: 'a', code: 'A', value: 5, maxDiscount: null, stackable: true }) }),
        candidate({ promotion: promotion({ id: 'b', code: 'B', value: 5, maxDiscount: null, stackable: true }) }),
      ],
      context(),
      { maxCodes: 3 },
    );
    expect(evaluation.applied.map((item) => item.code)).toEqual(['A', 'B']);
    expect(evaluation.totalDiscount).toBe(300_000);
  });

  it('mã không stackable dừng việc cộng dồn', () => {
    const evaluation = selectDiscounts(
      [
        candidate({ promotion: promotion({ id: 'a', code: 'A', value: 10, maxDiscount: null, stackable: false }) }),
        candidate({ promotion: promotion({ id: 'b', code: 'B', value: 5, maxDiscount: null, stackable: true }) }),
      ],
      context(),
      { maxCodes: 3 },
    );
    expect(evaluation.applied.map((item) => item.code)).toEqual(['A']);
  });

  it('không dùng chung hai mã cùng exclusiveGroup', () => {
    const evaluation = selectDiscounts(
      [
        candidate({
          promotion: promotion({ id: 'a', code: 'A', value: 10, maxDiscount: null, stackable: true, exclusiveGroup: 'TOUR' }),
        }),
        candidate({
          promotion: promotion({ id: 'b', code: 'B', value: 5, maxDiscount: null, stackable: true, exclusiveGroup: 'TOUR' }),
        }),
      ],
      context(),
      { maxCodes: 3 },
    );
    expect(evaluation.applied.map((item) => item.code)).toEqual(['A']);
    expect(evaluation.rejected.some((item) => /nhóm ưu đãi/.test(item.reason))).toBe(true);
  });

  it('tôn trọng trần tổng giảm của đơn', () => {
    const evaluation = selectDiscounts(
      [
        candidate({ promotion: promotion({ id: 'a', code: 'A', value: 10, maxDiscount: null, stackable: true }) }),
        candidate({ promotion: promotion({ id: 'b', code: 'B', value: 10, maxDiscount: null, stackable: true }) }),
      ],
      context(),
      { maxCodes: 3, maxTotalDiscount: 400_000 },
    );
    expect(evaluation.totalDiscount).toBe(400_000);
    expect(evaluation.applied[1].discount).toBe(100_000);
  });

  it('không bao giờ giảm quá tạm tính', () => {
    const evaluation = selectDiscounts(
      [
        candidate({ promotion: promotion({ id: 'a', code: 'A', type: PromotionType.FIXED, value: 2_000_000, maxDiscount: null, stackable: true }) }),
        candidate({ promotion: promotion({ id: 'b', code: 'B', type: PromotionType.FIXED, value: 2_000_000, maxDiscount: null, stackable: true }) }),
      ],
      context({ subtotal: 3_000_000 }),
      { maxCodes: 3 },
    );
    expect(evaluation.totalDiscount).toBe(3_000_000);
  });

  it('ghi lý do cho mọi mã bị loại', () => {
    const evaluation = selectDiscounts(
      [
        candidate({ promotion: promotion({ id: 'a', code: 'OFF', status: PromotionStatus.PAUSED }) }),
        candidate({ promotion: promotion({ id: 'b', code: 'LOW', minOrder: 9_000_000 }) }),
      ],
      context(),
    );
    expect(evaluation.applied).toHaveLength(0);
    expect(evaluation.rejected.map((item) => item.code)).toEqual(['OFF', 'LOW']);
    expect(evaluation.rejected.every((item) => item.reason.length > 0)).toBe(true);
  });
});
