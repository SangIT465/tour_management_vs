import { BookingStatus } from '../../../common/enums/index.js';
import { Booking } from '../entities/booking.entity.js';
import { Passenger } from '../entities/passenger.entity.js';
import { BookingMailService } from './booking-mail.service.js';
import { renderBookingMailFallback, renderEmailTemplate } from '../templates/booking-mail.template.js';

function bookingFixture(overrides: Partial<Booking> = {}): Booking {
  return Object.assign(new Booking(), {
    id: 'booking-1',
    code: 'BK260001',
    scheduleId: 'schedule-1',
    customerId: 'customer-1',
    contactName: 'Nguyễn Văn A',
    contactPhone: '0900000000',
    contactEmail: 'a@example.test',
    subtotal: 2_000_000,
    discount: 0,
    total: 2_000_000,
    status: BookingStatus.PENDING_PAYMENT,
    seatCount: 2,
    expiresAt: new Date('2026-11-10T10:00:00Z'),
    confirmedAt: null,
    note: null,
    ...overrides,
  });
}

function passengerFixture(): Passenger {
  return Object.assign(new Passenger(), {
    id: 'passenger-1',
    bookingId: 'booking-1',
    fullName: 'Nguyễn Văn A',
    dob: '1990-01-01',
    type: 'ADULT',
    unitPrice: 1_000_000,
  });
}

function setup(template: { subject: string; bodyHtml: string; active: boolean } | null) {
  const enqueued: any[] = [];
  const mail = { enqueue: vi.fn(async (_manager: any, input: any) => { enqueued.push(input); }) };
  const templates = { findByCode: vi.fn(async () => template) };
  const service = new BookingMailService(mail as any, templates as any);
  const manager = { getRepository: () => ({ find: vi.fn(async () => [passengerFixture()]) }) };
  const schedule = {
    id: 'schedule-1',
    startDate: '2026-12-20',
    endDate: '2026-12-22',
    meetingPoint: 'Nhà hát Thành phố',
    tour: { name: 'Đà Lạt 3N2Đ' },
  };
  return { service, mail, templates, manager, schedule, enqueued };
}

describe('renderEmailTemplate', () => {
  it('escapes double-brace variables and keeps triple-brace HTML raw', () => {
    const html = renderEmailTemplate('<p>{{name}}</p>{{{list}}}', {
      name: '<script>alert(1)</script>',
      list: '<ul><li>A</li></ul>',
    });
    // `{{...}}` phải escape để dữ liệu khách nhập không chèn được thẻ;
    // `{{{...}}}` giữ nguyên vì đó là HTML do hệ thống dựng.
    expect(html).not.toContain('<script>');
    expect(html).toContain('alert(1)');
    expect(html).toContain('<ul><li>A</li></ul>');
  });

  it('renders missing variables as empty strings', () => {
    expect(renderEmailTemplate('A{{missing}}B', {})).toBe('AB');
  });

  it('escapes customer-supplied fields in the built-in fallback', () => {
    const html = renderBookingMailFallback({
      code: 'BK1',
      status: 'Chờ thanh toán',
      contactName: '<img src=x onerror=alert(1)>',
      contactEmail: 'a@example.test',
      contactPhone: '0900',
      seatCount: 1,
      subtotal: 1000,
      discount: 0,
      total: 1000,
      tourName: '<b>Tour</b>',
      startDate: '2026-12-20',
      endDate: '2026-12-22',
      meetingPoint: null,
      expiresAt: null,
      confirmedAt: null,
      note: null,
      passengers: [],
      headline: 'Đơn đặt tour đã được ghi nhận',
      intro: 'Xin chào <img src=x onerror=alert(1)>',
      outro: 'Cảm ơn',
    });

    // Dữ liệu khách nhập phải được escape: không có thẻ thật nào lọt vào HTML.
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>Tour</b>');
    // Dựng ký tự `&` bằng fromCharCode để chuỗi kỳ vọng không bị hiểu nhầm là thẻ thật.
    const amp = String.fromCharCode(38);
    expect(html).toContain(`${amp}lt;img src=x onerror=alert(1)${amp}gt;`);
    expect(html).toContain(`${amp}lt;b${amp}gt;Tour${amp}lt;/b${amp}gt;`);
  });
});

describe('BookingMailService', () => {
  it('enqueues a created email with a stable deduplication key', async () => {
    const { service, manager, schedule, enqueued } = setup(null);
    await service.enqueue(manager as any, bookingFixture(), 'created', {
      schedule: schedule as any,
      passengers: [passengerFixture()],
    });

    expect(enqueued).toHaveLength(1);
    expect(enqueued[0].deduplicationKey).toBe('booking-created:booking-1');
    expect(enqueued[0].recipient).toBe('a@example.test');
    expect(enqueued[0].subject).toContain('BK260001');
    expect(enqueued[0].html).toContain('Đà Lạt 3N2Đ');
    expect(enqueued[0].text).toContain('BK260001');
    expect(enqueued[0].attachmentName).toBeNull();
  });

  it('uses the BOOKING_CONFIRMED template from the database when active', async () => {
    const { service, manager, schedule, enqueued } = setup({
      subject: 'Xác nhận {{bookingCode}}',
      bodyHtml: '<p>{{contactName}} – {{total}}</p>',
      active: true,
    });
    await service.enqueue(manager as any, bookingFixture({ status: BookingStatus.CONFIRMED }), 'confirmed', {
      schedule: schedule as any,
      passengers: [passengerFixture()],
    });

    expect(enqueued[0].subject).toBe('Xác nhận BK260001');
    // `Intl.NumberFormat('vi-VN')` dùng NBSP (U+00A0) giữa số và ký hiệu tiền tệ.
    expect(enqueued[0].html.replace(/\u00a0/g, ' ')).toBe('<p>Nguyễn Văn A – 2.000.000 ₫</p>');
  });

  it('falls back to the built-in template when the stored template is inactive', async () => {
    const { service, manager, schedule, enqueued } = setup({
      subject: 'Không dùng {{bookingCode}}',
      bodyHtml: '<p>inactive</p>',
      active: false,
    });
    await service.enqueue(manager as any, bookingFixture(), 'created', {
      schedule: schedule as any,
      passengers: [passengerFixture()],
    });

    expect(enqueued[0].subject).not.toContain('Không dùng');
    expect(enqueued[0].html).toContain('Đơn đặt tour đã được ghi nhận');
  });

  it('prefers BOOKING_CREATED over BOOKING_CONFIRMED for the created event', async () => {
    const mail = { enqueue: vi.fn(async () => undefined) };
    const templates = {
      findByCode: vi.fn(async (code: string) =>
        code === 'BOOKING_CREATED'
          ? { subject: 'Tạo đơn {{bookingCode}}', bodyHtml: '<p>created</p>', active: true }
          : { subject: 'Xác nhận {{bookingCode}}', bodyHtml: '<p>confirmed</p>', active: true },
      ),
    };
    const service = new BookingMailService(mail as any, templates as any);
    const manager = { getRepository: () => ({ find: vi.fn(async () => []) }) };

    await service.enqueue(manager as any, bookingFixture(), 'created', {
      schedule: { startDate: '2026-12-20', endDate: '2026-12-22', tour: { name: 'Tour' } } as any,
      passengers: [],
    });

    expect(templates.findByCode).toHaveBeenCalledWith('BOOKING_CREATED');
    expect(mail.enqueue).toHaveBeenCalledTimes(1);
  });
});
