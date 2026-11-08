import { BadRequestException, ConflictException } from '@nestjs/common';
import { PromotionService } from './promotion.service.js';
import { Promotion } from './entities/promotion.entity.js';
import { PromotionType } from '../../common/enums/index.js';

function fixture(overrides = {}, uses = 0) {
  const promotion = Object.assign(new Promotion(), {
    id: 'promotion', code: 'SUMMER', type: PromotionType.PERCENT, value: 10, minOrder: 1_000_000,
    maxDiscount: 200_000, usageLimit: 10, usedCount: 0, perUserLimit: 1, active: true,
    validFrom: new Date(Date.now() - 60_000), validTo: new Date(Date.now() + 60_000), ...overrides,
  });
  const query = { where: vi.fn().mockReturnThis(), andWhere: vi.fn().mockReturnThis(), getCount: vi.fn().mockResolvedValue(uses) };
  const manager = { getRepository: vi.fn(() => ({ createQueryBuilder: () => query })) };
  const repo = { findOne: vi.fn().mockResolvedValue(promotion), manager };
  return { service: new PromotionService(repo as any), promotion, repo, query };
}

describe('Promotion eligibility', () => {
  it('normalizes the code, caps the discount, and does not consume a preview', async () => {
    const { service, repo, promotion } = fixture();
    const result = await service.validate({ code: ' summer ', subtotal: 3_000_000 }, 'customer');
    expect(result).toMatchObject({ code: 'SUMMER', discount: 200_000, total: 2_800_000 });
    expect(repo.findOne).toHaveBeenCalledWith({ where: { code: 'SUMMER' } });
    expect(promotion.usedCount).toBe(0);
  });

  it.each([
    { active: false }, { usedCount: 10 }, { validFrom: new Date(Date.now() + 120_000) },
    { validTo: new Date(Date.now() - 120_000) }, { minOrder: 5_000_000 },
  ])('rejects an ineligible code: %j', async overrides => {
    const { service } = fixture(overrides);
    await expect(service.validate({ code: 'SUMMER', subtotal: 2_000_000 }, 'customer')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks per-customer quota on preview and actual booking', async () => {
    const { service, repo } = fixture({}, 1);
    await expect(service.validate({ code: 'SUMMER', subtotal: 2_000_000 }, 'customer')).rejects.toThrow(/lượt/);
    const manager = { getRepository: vi.fn(() => ({ ...repo, createQueryBuilder: repo.manager.getRepository().createQueryBuilder })) };
    await expect(service.findUsableOrFail('SUMMER', 2_000_000, manager as any, 'customer')).rejects.toThrow(/lượt/);
    expect(repo.findOne).toHaveBeenLastCalledWith({ where: { code: 'SUMMER' }, lock: { mode: 'pessimistic_write' } });
  });

  it('never discounts more than the order total', async () => {
    const { service } = fixture({ type: PromotionType.FIXED, value: 5_000_000, maxDiscount: null });
    expect(await service.validate({ code: 'SUMMER', subtotal: 1_000_000 }, 'customer')).toMatchObject({ total: 0, discount: 1_000_000 });
  });

  it('rejects the booking if the final reservation loses the quota race', async () => {
    const { service } = fixture();
    const builder = { update: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), andWhere: vi.fn().mockReturnThis(), execute: vi.fn().mockResolvedValue({ affected: 0 }) };
    await expect(service.reserveForBooking('promotion', { createQueryBuilder: () => builder } as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
