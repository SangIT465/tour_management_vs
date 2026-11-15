import { Injectable, Logger } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { BookingStatus } from '../../../common/enums/index.js';
import { MailOutboxService } from '../../mail/mail-outbox.service.js';
import { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import { EmailTemplateService } from '../../system/email-template.service.js';
import type { EmailTemplate } from '../../system/entities/email-template.entity.js';
import type { Booking } from '../entities/booking.entity.js';
import { Passenger } from '../entities/passenger.entity.js';
import {
  bookingMailText,
  bookingMailVariables,
  renderBookingMailFallback,
  renderEmailTemplate,
  type BookingMailContext,
} from '../templates/booking-mail.template.js';

/** Sự kiện nghiệp vụ cần gửi mail cho khách. */
export type BookingMailEvent = 'created' | 'confirmed';

/** Nhãn tiếng Việt của trạng thái booking, dùng cho biến `{{status}}` trong mẫu. */
const STATUS_LABELS: Record<string, string> = {
  [BookingStatus.PENDING_PAYMENT]: 'Chờ thanh toán',
  [BookingStatus.PENDING_CONFIRMATION]: 'Chờ xác nhận',
  [BookingStatus.CONFIRMED]: 'Đã xác nhận',
  [BookingStatus.CANCEL_REQUESTED]: 'Đang yêu cầu hủy',
  [BookingStatus.CANCELLED]: 'Đã hủy',
  [BookingStatus.REJECTED]: 'Bị từ chối',
  [BookingStatus.EXPIRED]: 'Hết hạn thanh toán',
  [BookingStatus.COMPLETED]: 'Đã hoàn thành',
};

/**
 * Mã mẫu ưu tiên cho từng sự kiện.
 *
 * `BOOKING_CONFIRMED` là mẫu chuẩn (đã có trong `email_templates`). Khi tạo đơn
 * ta ưu tiên `BOOKING_CREATED` nếu quản trị viên đã tạo mẫu riêng, còn không thì
 * dùng chung `BOOKING_CONFIRMED` – nội dung khác nhau qua biến `{{headline}}`,
 * `{{intro}}`, `{{outro}}`.
 */
const TEMPLATE_CODES: Record<BookingMailEvent, string[]> = {
  created: ['BOOKING_CREATED', 'BOOKING_CONFIRMED'],
  confirmed: ['BOOKING_CONFIRMED'],
};

const DEFAULT_SUBJECTS: Record<BookingMailEvent, (context: BookingMailContext) => string> = {
  created: (context) => `Đã ghi nhận đơn ${context.code} – ${context.tourName}`,
  confirmed: (context) => `Đơn ${context.code} đã được xác nhận – ${context.tourName}`,
};

/**
 * Gửi email đơn đặt tour qua **transactional outbox**.
 *
 * Vì sao không gửi SMTP trực tiếp: `mail_messages` được ghi trong cùng
 * transaction với booking, nên nếu transaction rollback thì email cũng không
 * tồn tại; worker `MailOutboxService` gửi nền và retry khi SMTP lỗi.
 *
 * Nội dung lấy từ bảng `email_templates` (mã `BOOKING_CONFIRMED`), có bản dựng
 * sẵn dự phòng để luồng đặt tour không phụ thuộc vào việc seed mẫu.
 */
@Injectable()
export class BookingMailService {
  private readonly logger = new Logger(BookingMailService.name);

  constructor(
    private readonly mail: MailOutboxService,
    private readonly templates: EmailTemplateService,
  ) { }

  /**
   * Đẩy email vào outbox trong transaction hiện tại.
   *
   * `preloaded` cho phép tái dùng dữ liệu đã nạp sẵn (lịch có `tour`, danh sách
   * hành khách) để không phát sinh truy vấn thừa bên trong transaction.
   */
  async enqueue(
    manager: EntityManager,
    booking: Booking,
    event: BookingMailEvent,
    preloaded: { schedule?: DepartureSchedule; passengers?: Passenger[] } = {},
  ): Promise<void> {
    const context = await this.buildContext(manager, booking, event, preloaded);
    const template = await this.resolveTemplate(event);
    const variables = bookingMailVariables(context);

    const subject = template
      ? renderEmailTemplate(template.subject, variables)
      : DEFAULT_SUBJECTS[event](context);
    const html = template
      ? renderEmailTemplate(template.bodyHtml, variables)
      : renderBookingMailFallback(context);

    await this.mail.enqueue(manager, {
      deduplicationKey: `booking-${event}:${booking.id}`,
      recipient: booking.contactEmail,
      subject,
      html,
      text: bookingMailText(context),
      attachmentName: null,
    });

    this.logger.log(`Đã xếp email "${event}" cho đơn ${booking.code} tới ${booking.contactEmail}`);
  }

  // ===== nội bộ =====

  /** Lấy mẫu đang bật đầu tiên trong danh sách ưu tiên; `null` nếu không có. */
  private async resolveTemplate(event: BookingMailEvent): Promise<EmailTemplate | null> {
    for (const code of TEMPLATE_CODES[event]) {
      const template = await this.templates.findByCode(code);
      if (template?.active) return template;
    }
    return null;
  }

  private async buildContext(
    manager: EntityManager,
    booking: Booking,
    event: BookingMailEvent,
    preloaded: { schedule?: DepartureSchedule; passengers?: Passenger[] },
  ): Promise<BookingMailContext> {
    const schedule = preloaded.schedule ?? (await this.loadSchedule(manager, booking.scheduleId));
    const passengers =
      preloaded.passengers ??
      (await manager.getRepository(Passenger).find({
        where: { bookingId: booking.id },
        order: { createdAt: 'ASC' },
      }));

    return {
      code: booking.code,
      status: STATUS_LABELS[booking.status] ?? booking.status,
      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      contactPhone: booking.contactPhone,
      seatCount: booking.seatCount,
      subtotal: booking.subtotal,
      discount: booking.discount,
      total: booking.total,
      tourName: schedule?.tour?.name ?? 'Tour',
      startDate: schedule?.startDate ?? '',
      endDate: schedule?.endDate ?? '',
      meetingPoint: schedule?.meetingPoint ?? null,
      expiresAt: booking.expiresAt ?? null,
      confirmedAt: booking.confirmedAt ?? null,
      note: booking.note ?? null,
      passengers: passengers.map((passenger) => ({
        fullName: passenger.fullName,
        type: passenger.type,
        unitPrice: passenger.unitPrice,
      })),
      ...this.copyFor(event, booking),
    };
  }

  /** Câu chữ khác nhau giữa "đã ghi nhận đơn" và "đơn đã được xác nhận". */
  private copyFor(
    event: BookingMailEvent,
    booking: Booking,
  ): Pick<BookingMailContext, 'headline' | 'intro' | 'outro'> {
    if (event === 'confirmed') {
      return {
        headline: 'Đơn đặt tour đã được xác nhận',
        intro: `Xin chào ${booking.contactName}, đơn đặt tour ${booking.code} của bạn đã được xác nhận. Vui lòng có mặt đúng giờ tại điểm hẹn.`,
        outro: 'Cảm ơn bạn đã tin tưởng TourGo. Chúc bạn có một chuyến đi thật vui vẻ!',
      };
    }
    return {
      headline: 'Đơn đặt tour đã được ghi nhận',
      intro: `Xin chào ${booking.contactName}, TourGo đã ghi nhận đơn đặt tour ${booking.code} của bạn.`,
      outro: booking.expiresAt
        ? 'Vui lòng hoàn tất thanh toán trước hạn để giữ chỗ. Sau thời hạn này, đơn sẽ tự động hết hạn.'
        : 'Nhân viên TourGo sẽ liên hệ xác nhận đơn trong thời gian sớm nhất.',
    };
  }

  private async loadSchedule(
    manager: EntityManager,
    scheduleId: string,
  ): Promise<DepartureSchedule | null> {
    return manager.getRepository(DepartureSchedule).findOne({
      where: { id: scheduleId },
      relations: { tour: true },
    });
  }
}
