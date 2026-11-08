import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { PaymentReceipts1794099600000 } from '../src/database/migrations/1794099600000-PaymentReceipts.js';
import { BookingStatus, PaymentMethod, RoleName, ScheduleStatus, TourStatus, UserStatus } from '../src/common/enums/index.js';
import { User } from '../src/modules/users/entities/user.entity.js';
import { Role } from '../src/modules/users/entities/role.entity.js';
import { Permission } from '../src/modules/users/entities/permission.entity.js';
import { CancelPolicy } from '../src/modules/catalog/entities/cancel-policy.entity.js';
import { Tour } from '../src/modules/catalog/entities/tour.entity.js';
import { DepartureSchedule } from '../src/modules/schedule/entities/departure-schedule.entity.js';
import { Promotion } from '../src/modules/promotion/entities/promotion.entity.js';
import { Booking } from '../src/modules/booking/entities/booking.entity.js';
import { Invoice } from '../src/modules/booking/entities/invoice.entity.js';
import { Payment } from '../src/modules/payment/entities/payment.entity.js';
import { Refund } from '../src/modules/payment/entities/refund.entity.js';
import { MailMessage } from '../src/modules/mail/entities/mail-message.entity.js';
import { MailTransportService } from '../src/modules/mail/mail-transport.service.js';
import { MailOutboxService } from '../src/modules/mail/mail-outbox.service.js';

/** Uses a randomly named, isolated MySQL database. Never sends mail to real addresses. */
describe('Checkout integration (MySQL)', () => {
  const database = `tour_checkout_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  let source: DataSource;
  let admin: DataSource;
  let app: INestApplication;
  let customer: User;
  let token: string;
  let otherToken: string;
  let staffToken: string;
  let schedules: DepartureSchedule[];
  let paidBookingId: string;
  const transport = { enabled: true, send: vi.fn().mockResolvedValue(undefined) };
  const passengers = [{ fullName: 'Customer Test', dob: '1990-01-01' }];

  beforeAll(async () => {
    const connection = {
      type: 'mysql' as const, host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root', password: process.env.DB_PASSWORD ?? '',
      timezone: '+07:00', charset: 'utf8mb4',
    };
    admin = new DataSource(connection);
    await admin.initialize();
    if (!/^tour_checkout_test_[a-f0-9]{12}$/.test(database) || database === process.env.DB_DATABASE) throw new Error('Unsafe test database');
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    source = new DataSource({ ...connection, database, entities: ALL_ENTITIES, synchronize: true, migrations: [PaymentReceipts1794099600000] });
    await source.initialize();
    // Verify the additive upgrade from the previous schema, on this scratch database only.
    await source.query('DROP TABLE mail_messages');
    await source.query('CREATE INDEX idx_test_promotion ON bookings (promotion_id)');
    await source.query('DROP INDEX idx_bookings_promotion_customer ON bookings');
    expect(await source.runMigrations({ transaction: 'each' })).toHaveLength(1);
    expect(await source.runMigrations({ transaction: 'each' })).toHaveLength(0);

    const permissions = await source.getRepository(Permission).save(['booking:create', 'booking:read', 'booking:confirm', 'booking:cancel', 'promotion:manage', 'payment:read'].map(code => source.getRepository(Permission).create({ code })));
    const customerRole = await source.getRepository(Role).save({ id: randomUUID(), name: RoleName.CUSTOMER, permissions: permissions.filter(permission => permission.code === 'booking:create') });
    const staffRole = await source.getRepository(Role).save({ id: randomUUID(), name: RoleName.ADMIN, permissions });
    const users = source.getRepository(User);
    customer = await users.save(users.create({ email: 'customer@example.test', fullName: 'Customer Test', status: UserStatus.ACTIVE, roles: [customerRole] }));
    const other = await users.save(users.create({ email: 'other@example.test', fullName: 'Other Test', status: UserStatus.ACTIVE, roles: [customerRole] }));
    const staff = await users.save(users.create({ email: 'staff@example.test', fullName: 'Staff Test', status: UserStatus.ACTIVE, roles: [staffRole] }));
    const policy = await source.getRepository(CancelPolicy).save({ id: randomUUID(), name: 'Test policy', rules: [] });
    const tour = await source.getRepository(Tour).save({ id: randomUUID(), code: 'TEST-TOUR', slug: 'test-tour', name: 'Checkout Tour', durationDays: 2, durationNights: 1, cancelPolicyId: policy.id, status: TourStatus.PUBLISHED });
    const startDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 31 * 86_400_000).toISOString().slice(0, 10);
    schedules = await source.getRepository(DepartureSchedule).save([1, 2].map(() => source.getRepository(DepartureSchedule).create({ tourId: tour.id, startDate, endDate, priceAdult: 1_000_000, priceChild: 500_000, priceInfant: 0, maxSeats: 100, soldSeats: 0, status: ScheduleStatus.OPEN })));

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource).useValue(source)
      .overrideProvider(MailTransportService).useValue(transport).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    for (const job of app.get(SchedulerRegistry).getCronJobs().values()) await job.stop();
    const jwt = app.get(JwtService);
    token = jwt.sign({ sub: customer.id, email: customer.email, roles: [RoleName.CUSTOMER] });
    otherToken = jwt.sign({ sub: other.id, email: other.email, roles: [RoleName.CUSTOMER] });
    staffToken = jwt.sign({ sub: staff.id, email: staff.email, roles: [RoleName.ADMIN] });
  });

  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) await source.destroy();
    if (admin?.isInitialized) {
      if (!/^tour_checkout_test_[a-f0-9]{12}$/.test(database) || database === process.env.DB_DATABASE) throw new Error('Unsafe test cleanup');
      await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
      await admin.destroy();
    }
  });

  async function promotion(code: string, values = {}) {
    const response = await request(app.getHttpServer()).post('/api/promotions').auth(staffToken, { type: 'bearer' }).send({
      code, type: 'PERCENT', value: 10, minOrder: 0, maxDiscount: 100_000, perUserLimit: 1,
      validFrom: new Date(Date.now() - 60_000).toISOString(), validTo: new Date(Date.now() + 86_400_000).toISOString(), ...values,
    }).expect(201);
    return response.body;
  }
  function book(code?: string, index = 0, auth = token) {
    return request(app.getHttpServer()).post('/api/bookings').auth(auth, { type: 'bearer' }).send({
      scheduleId: schedules[index].id, passengers, contactName: 'Customer Test', contactEmail: 'customer@example.test', contactPhone: '0901234567', ...(code ? { promotionCode: code } : {}),
    });
  }
  async function createPayment(bookingId: string, method = PaymentMethod.VNPAY, auth = token) {
    return (await request(app.getHttpServer()).post('/api/payments').auth(auth, { type: 'bearer' }).send({ bookingId, method }).expect(201)).body;
  }
  async function gateway(txnRef: string) {
    return request(app.getHttpServer()).get(`/api/payments/mock-gateway/pay/${txnRef}`).expect(200);
  }

  it('applies the server price, blocks customer invoice creation before payment, and checks code ownership limits', async () => {
    await promotion('SAVE10');
    const quote = await request(app.getHttpServer()).post('/api/bookings/quote').auth(token, { type: 'bearer' }).send({ scheduleId: schedules[0].id, passengers, promotionCode: 'save10' }).expect(201);
    expect(quote.body).toMatchObject({ discount: 100_000, total: 900_000 });
    const booking = (await book('SAVE10').expect(201)).body;
    paidBookingId = booking.id;
    expect(booking).toMatchObject({ discount: 100_000, total: 900_000, promotionCode: 'SAVE10' });
    await request(app.getHttpServer()).get(`/api/bookings/${booking.id}/invoice/document`).auth(token, { type: 'bearer' }).expect(404);
    await request(app.getHttpServer()).post(`/api/bookings/${booking.id}/invoice`).auth(staffToken, { type: 'bearer' }).expect(409);
    await book('SAVE10').expect(400);
    await request(app.getHttpServer()).post('/api/bookings/counter').auth(token, { type: 'bearer' }).send({ scheduleId: schedules[0].id, passengers, contactName: 'Customer Test', contactEmail: 'customer@example.test', contactPhone: '0901234567' }).expect(403);
  });

  it('atomically creates the paid invoice and one email, protects privacy, and retries delivery', async () => {
    const payment = await createPayment(paidBookingId);
    expect((await gateway(payment.gatewayTxnRef)).body.result).toBe('PROCESSED');
    const detail = await request(app.getHttpServer()).get(`/api/bookings/${paidBookingId}`).auth(token, { type: 'bearer' }).expect(200);
    expect(detail.body.status).toBe(BookingStatus.PENDING_CONFIRMATION);
    expect(detail.body.invoice.snapshot).toMatchObject({ discount: 100_000, total: 900_000, payment: { method: 'VNPAY' } });
    expect(await source.getRepository(Invoice).countBy({ bookingId: paidBookingId })).toBe(1);
    await gateway(payment.gatewayTxnRef);
    expect(await source.getRepository(MailMessage).count()).toBe(1);
    await request(app.getHttpServer()).get(`/api/bookings/${paidBookingId}/invoice/document`).expect(401);
    await request(app.getHttpServer()).get(`/api/bookings/${paidBookingId}/invoice/document`).auth(otherToken, { type: 'bearer' }).expect(403);
    const document = await request(app.getHttpServer()).get(`/api/bookings/${paidBookingId}/invoice/document`).auth(token, { type: 'bearer' }).expect(200);
    expect(document.body.html).toContain('900.000');
    expect(document.headers['cache-control']).toBe('private, no-store');

    transport.send.mockRejectedValueOnce(new Error('SMTP offline'));
    await app.get(MailOutboxService).processPending();
    const mail = await source.getRepository(MailMessage).findOneByOrFail({ deduplicationKey: `payment-receipt:${payment.id}` });
    expect(mail.status).toBe('PENDING'); expect(mail.sentAt).toBeNull();
    await source.getRepository(MailMessage).update(mail.id, { nextAttemptAt: new Date(Date.now() - 1000) });
    await app.get(MailOutboxService).processPending();
    expect((await source.getRepository(MailMessage).findOneByOrFail({ id: mail.id })).status).toBe('SENT');
    const summary = await request(app.getHttpServer()).get(`/api/payments/booking/${paidBookingId}`).auth(token, { type: 'bearer' }).expect(200);
    expect(summary.body.receiptEmail.status).toBe('SENT');
  });

  it('enforces per-user limits across different schedules under concurrent requests', async () => {
    await promotion('ONCE');
    const responses = await Promise.all([book('ONCE', 0), book('ONCE', 1)]);
    expect(responses.map(response => response.status).sort((left, right) => left - right)).toEqual([201, 400]);
    expect((await source.getRepository(Promotion).findOneByOrFail({ code: 'ONCE' })).usedCount).toBe(1);
  });

  it('enforces the global quota across different customers under concurrent requests', async () => {
    await promotion('LIMIT1', { usageLimit: 1 });
    const responses = await Promise.all([book('LIMIT1', 0), book('LIMIT1', 1, otherToken)]);
    expect(responses.map(response => response.status).sort((left, right) => left - right)).toEqual([201, 400]);
    expect((await source.getRepository(Promotion).findOneByOrFail({ code: 'LIMIT1' })).usedCount).toBe(1);
  });

  it('releases a reserved code when an unpaid booking is cancelled', async () => {
    await promotion('REUSE');
    const booking = (await book('REUSE').expect(201)).body;
    await request(app.getHttpServer()).patch(`/api/bookings/${booking.id}/cancel`).auth(staffToken, { type: 'bearer' }).send({ reason: 'Integration cancellation' }).expect(200);
    expect((await source.getRepository(Promotion).findOneByOrFail({ code: 'REUSE' })).usedCount).toBe(0);
    await book('REUSE').expect(201);
  });

  it('supports a fully discounted order without asking the customer to transfer money', async () => {
    await promotion('FREE100', { value: 100, maxDiscount: null });
    const booking = (await book('FREE100').expect(201)).body;
    expect(booking.total).toBe(0);
    const payment = await createPayment(booking.id, PaymentMethod.NO_CHARGE);
    expect(payment).toMatchObject({ amount: 0, status: 'SUCCESS' });
    expect(await source.getRepository(Invoice).countBy({ bookingId: booking.id })).toBe(1);
    expect(await source.getRepository(MailMessage).countBy({ deduplicationKey: `payment-receipt:${payment.id}` })).toBe(1);
  });

  it('issues receipts for approved transfers and cash, and queues refunds for duplicate online charges', async () => {
    const bankBooking = (await book().expect(201)).body;
    const bank = await createPayment(bankBooking.id, PaymentMethod.BANK_TRANSFER);
    await request(app.getHttpServer()).post(`/api/payments/${bank.id}/proof`).auth(token, { type: 'bearer' }).send({ proofUrl: 'https://example.test/proof.jpg' }).expect(201);
    await request(app.getHttpServer()).patch(`/api/payments/${bank.id}/proof/approve`).auth(staffToken, { type: 'bearer' }).expect(200);
    expect(await source.getRepository(Invoice).countBy({ bookingId: bankBooking.id })).toBe(1);
    const cashBooking = (await book().expect(201)).body;
    await createPayment(cashBooking.id, PaymentMethod.OFFICE, staffToken);
    expect(await source.getRepository(Invoice).countBy({ bookingId: cashBooking.id })).toBe(1);

    const duplicateBooking = (await book().expect(201)).body;
    const first = await createPayment(duplicateBooking.id, PaymentMethod.VNPAY);
    const second = await createPayment(duplicateBooking.id, PaymentMethod.MOMO);
    await gateway(first.gatewayTxnRef);
    expect((await gateway(second.gatewayTxnRef)).body.result).toBe('LATE');
    expect(await source.getRepository(Refund).countBy({ paymentId: second.id })).toBe(1);
    expect(await source.getRepository(MailMessage).countBy({ deduplicationKey: `payment-receipt:${second.id}` })).toBe(0);
    const summary = await request(app.getHttpServer()).get(`/api/payments/booking/${duplicateBooking.id}`).auth(token, { type: 'bearer' }).expect(200);
    expect(summary.body.receiptEmail.status).toBe('PENDING');
    expect(await source.getRepository(Payment).countBy({ bookingId: duplicateBooking.id })).toBe(2);
    expect(await source.getRepository(Booking).countBy({ customerId: customer.id })).toBeGreaterThan(0);
  });

  it('rolls payment and invoice back if the outbox cannot be written, then safely retries', async () => {
    const booking = (await book().expect(201)).body;
    const payment = await createPayment(booking.id);
    const enqueue = vi.spyOn(app.get(MailOutboxService), 'enqueue').mockRejectedValueOnce(new Error('Simulated outbox failure'));
    try {
      await request(app.getHttpServer()).get(`/api/payments/mock-gateway/pay/${payment.gatewayTxnRef}`).expect(500);
    } finally { enqueue.mockRestore(); }
    expect((await source.getRepository(Payment).findOneByOrFail({ id: payment.id })).status).toBe('PENDING');
    expect((await source.getRepository(Booking).findOneByOrFail({ id: booking.id })).status).toBe('PENDING_PAYMENT');
    expect(await source.getRepository(Invoice).countBy({ bookingId: booking.id })).toBe(0);
    await gateway(payment.gatewayTxnRef);
    expect(await source.getRepository(Invoice).countBy({ bookingId: booking.id })).toBe(1);
    expect(await source.getRepository(MailMessage).countBy({ deduplicationKey: `payment-receipt:${payment.id}` })).toBe(1);
  });

  it('handles two simultaneous gateway confirmations without issuing duplicate receipts', async () => {
    const booking = (await book().expect(201)).body;
    const first = await createPayment(booking.id, PaymentMethod.VNPAY);
    const second = await createPayment(booking.id, PaymentMethod.MOMO);
    const results = await Promise.all([gateway(first.gatewayTxnRef), gateway(second.gatewayTxnRef)]);
    expect(results.map(result => String(result.body.result)).sort((left, right) => left.localeCompare(right))).toEqual(['LATE', 'PROCESSED']);
    expect(await source.getRepository(Invoice).countBy({ bookingId: booking.id })).toBe(1);
    const emails = await source.getRepository(MailMessage).find();
    expect(emails.filter(message => [`payment-receipt:${first.id}`, `payment-receipt:${second.id}`].includes(message.deduplicationKey))).toHaveLength(1);
  });

  it('edits limits and activation without losing reservations and preserves coupon history', async () => {
    const code = await promotion('ADMINEDIT');
    const booking = (await book('ADMINEDIT').expect(201)).body;
    const updated = await request(app.getHttpServer()).patch(`/api/promotions/${code.id}`).auth(staffToken, { type: 'bearer' }).send({ maxDiscount: null, usageLimit: 5, perUserLimit: 2 }).expect(200);
    expect(updated.body).toMatchObject({ maxDiscount: null, usageLimit: 5, perUserLimit: 2, usedCount: 1 });
    const disabled = await request(app.getHttpServer()).patch(`/api/promotions/${code.id}/active?active=false`).auth(staffToken, { type: 'bearer' }).expect(200);
    expect(disabled.body).toMatchObject({ active: false, usedCount: 1 });
    await request(app.getHttpServer()).delete(`/api/promotions/${code.id}`).auth(staffToken, { type: 'bearer' }).expect(409);
    await request(app.getHttpServer()).patch(`/api/bookings/${booking.id}/cancel`).auth(staffToken, { type: 'bearer' }).send({ reason: 'Integration cancellation' }).expect(200);
    await request(app.getHttpServer()).delete(`/api/promotions/${code.id}`).auth(staffToken, { type: 'bearer' }).expect(409);
  });
});
