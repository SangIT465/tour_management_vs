import { ConfigService } from '@nestjs/config';
import { InvoiceService } from './invoice.service.js';
import { Booking } from '../entities/booking.entity.js';
import { Payment } from '../../payment/entities/payment.entity.js';
import { BookingStatus, PaymentMethod, PaymentStatus } from '../../../common/enums/index.js';
import { renderInvoice } from '../templates/invoice.template.js';

function fixture() {
  const booking = {
    id: 'booking', code: 'BK260001', status: BookingStatus.PENDING_CONFIRMATION,
    contactName: '<script>alert(1)</script>', contactEmail: 'customer@example.test', contactPhone: '0901234567',
    subtotal: 2_000_000, discount: 200_000, total: 1_800_000,
    passengers: [{ type: 'ADULT', unitPrice: 1_000_000 }, { type: 'ADULT', unitPrice: 1_000_000 }],
    schedule: { tour: { name: 'Tour <Đà Nẵng>' }, startDate: '2026-12-01' }, promotion: { code: 'SUMMER' },
  };
  const payment = { id: 'payment', status: PaymentStatus.SUCCESS, method: PaymentMethod.BANK_TRANSFER, amount: 1_800_000, paidAt: new Date(), gatewayTxnNo: 'TXN123' };
  const invoices = { findOne: vi.fn().mockResolvedValue(null) };
  const manager = {
    getRepository: (entity: any) => entity === Booking ? { findOne: vi.fn().mockResolvedValue(booking), findOneOrFail: vi.fn().mockResolvedValue(booking) } : entity === Payment ? { findOne: vi.fn().mockResolvedValue(payment) } : invoices,
    create: (_: any, input: any) => input, save: vi.fn(async (_: any, input: any) => input),
  };
  return { service: new InvoiceService(new ConfigService()), booking, payment, manager, invoices };
}

describe('Paid invoices', () => {
  it('issues immediately after payment, groups ticket lines and freezes order data', async () => {
    const { service, manager, booking } = fixture();
    const invoice = await service.issue('booking', manager as any);
    expect(invoice.number).toMatch(/^INV\d{4}-[A-F0-9]{20}$/);
    expect(invoice.number.length).toBeLessThanOrEqual(30);
    expect(invoice.snapshot).toMatchObject({ total: 1_800_000, discount: 200_000, bookingCode: 'BK260001', payment: { reference: 'TXN123' }, lines: [{ quantity: 2, unitPrice: 1_000_000, amount: 2_000_000 }] });
    booking.contactName = 'Changed'; booking.passengers[0].unitPrice = 9;
    expect(invoice.snapshot.customerName).toContain('<script>');
    expect(invoice.snapshot.lines[0].unitPrice).toBe(1_000_000);
  });

  it('returns the original invoice on repeated requests', async () => {
    const { service, manager, invoices } = fixture();
    invoices.findOne.mockResolvedValue({ number: 'ORIGINAL', snapshot: { total: 123 } });
    expect(await service.issue('booking', manager as any)).toMatchObject({ number: 'ORIGINAL' });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('does not infer payment from CONFIRMED booking status', async () => {
    const { service, manager, booking, payment } = fixture();
    booking.status = BookingStatus.CONFIRMED; payment.paidAt = null as any;
    await expect(service.issue('booking', manager as any)).rejects.toThrow(/thanh toán/);
  });

  it('rejects an underpayment or a closed booking', async () => {
    const { service, manager, booking, payment } = fixture();
    payment.amount = 1;
    await expect(service.issue('booking', manager as any)).rejects.toThrow(/thanh toán/);
    booking.status = BookingStatus.CANCELLED;
    await expect(service.issue('booking', manager as any)).rejects.toThrow(/đóng/);
  });

  it('escapes untrusted content and renders a self-contained printable receipt', async () => {
    const { service, manager } = fixture();
    const invoice = await service.issue('booking', manager as any);
    const html = renderInvoice(invoice);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Tour &lt;Đà Nẵng&gt;');
    expect(html).toContain('@page{size:A4');
    expect(html).toContain('TXN123');
    expect(html).not.toMatch(/<(script|img|link)\b/i);
    expect(html).toContain('1.800.000');
  });

  it('keeps historical discount lines out of ticket rows to avoid subtracting twice', async () => {
    const { service, manager } = fixture();
    const invoice = await service.issue('booking', manager as any);
    invoice.snapshot.lines.push({ description: 'Legacy discount line', quantity: 1, unitPrice: -200_000, amount: -200_000 });
    expect(renderInvoice(invoice)).not.toContain('Legacy discount line');
  });
});
