import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { jsonTransformer } from '../../../common/transformers/money.transformer.js';
import { Booking } from './booking.entity.js';

export type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

/** Dữ liệu chụp tại thời điểm xuất hóa đơn – không đổi dù khách sửa thông tin sau. */
export type InvoiceSnapshot = {
  bookingCode?: string;
  promotionCode?: string | null;
  seller?: { name: string; address: string; email: string; phone: string };
  payment?: { id: string; method: string; reference: string; paidAt: string; amount: number };
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tourName: string;
  startDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  total: number;
};

/**
 * `invoices` – hóa đơn, 1-1 với booking.
 * Số hóa đơn dùng UUID; khóa booking và unique index bảo đảm mỗi đơn một hóa đơn.
 */
@Entity('invoices')
@Index('uq_invoices_booking', ['bookingId'], { unique: true })
@Index('uq_invoices_number', ['number'], { unique: true })
export class Invoice extends BaseEntity {
  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  bookingId: string;

  @OneToOne(() => Booking, (b) => b.invoice, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column({ type: 'varchar', length: 30 })
  number: string;

  @Column({ name: 'issued_at', type: 'datetime', precision: 3 })
  issuedAt: Date;

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl?: string | null;

  @Column({ type: 'json', transformer: jsonTransformer })
  snapshot: InvoiceSnapshot;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}
