import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from 'typeorm';
import { In } from 'typeorm';
import { uuidv4 } from '../../../common/entities/base.entity.js';
import { BookingStatus, PaymentStatus } from '../../../common/enums/index.js';
import { Payment } from '../../payment/entities/payment.entity.js';
import { Booking } from '../entities/booking.entity.js';
import { Invoice, type InvoiceLine } from '../entities/invoice.entity.js';

/** Called inside the payment transaction, or a transaction locking the booking. */
@Injectable()
export class InvoiceService {
  constructor(private readonly config: ConfigService) {}

  async issue(bookingId: string, manager: EntityManager): Promise<Invoice> {
    const locked = await manager.getRepository(Booking).findOne({
      where: { id: bookingId }, lock: { mode: 'pessimistic_write' },
    });
    if (!locked) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    const existing = await manager.getRepository(Invoice).findOne({ where: { bookingId } });
    if (existing) return existing;
    if ([BookingStatus.CANCELLED, BookingStatus.REJECTED, BookingStatus.EXPIRED].includes(locked.status)) {
      throw new ConflictException('Không phát hành hóa đơn cho đơn đã đóng');
    }
    const payment = await manager.getRepository(Payment).findOne({
      where: { bookingId, status: In([PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED]) },
      order: { paidAt: 'ASC' },
    });
    if (!payment?.paidAt || payment.amount < locked.total) {
      throw new ConflictException('Chỉ phát hành hóa đơn khi đã nhận đủ thanh toán');
    }
    const booking = await manager.getRepository(Booking).findOneOrFail({
      where: { id: bookingId }, relations: { passengers: true, schedule: { tour: true }, promotion: true },
    });
    const grouped = new Map<string, InvoiceLine>();
    const labels: Record<string, string> = { ADULT: 'Vé người lớn', CHILD: 'Vé trẻ em', INFANT: 'Vé em bé' };
    for (const passenger of booking.passengers ?? []) {
      const key = `${passenger.type}:${passenger.unitPrice}`;
      const line = grouped.get(key) ?? { description: labels[passenger.type] ?? passenger.type, quantity: 0, unitPrice: passenger.unitPrice, amount: 0 };
      line.quantity += 1;
      line.amount = line.quantity * line.unitPrice;
      grouped.set(key, line);
    }
    const issuedAt = new Date();
    const year = issuedAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' });
    return manager.save(Invoice, manager.create(Invoice, {
      id: uuidv4(), bookingId, number: `INV${year}-${uuidv4().replaceAll('-', '').slice(0, 20).toUpperCase()}`,
      issuedAt, pdfUrl: null,
      snapshot: {
        bookingCode: booking.code, promotionCode: booking.promotion?.code ?? null,
        seller: {
          name: this.config.get<string>('INVOICE_SELLER_NAME', 'TourGo'),
          address: this.config.get<string>('INVOICE_SELLER_ADDRESS', ''),
          email: this.config.get<string>('INVOICE_SELLER_EMAIL', ''),
          phone: this.config.get<string>('INVOICE_SELLER_PHONE', ''),
        },
        payment: { id: payment.id, method: payment.method, reference: payment.gatewayTxnNo ?? payment.gatewayTxnRef ?? payment.id, paidAt: payment.paidAt.toISOString(), amount: payment.amount },
        customerName: booking.contactName, customerEmail: booking.contactEmail, customerPhone: booking.contactPhone,
        tourName: booking.schedule?.tour?.name ?? '', startDate: booking.schedule?.startDate ?? '',
        lines: [...grouped.values()], subtotal: booking.subtotal, discount: booking.discount, total: booking.total,
      },
    }));
  }
}
