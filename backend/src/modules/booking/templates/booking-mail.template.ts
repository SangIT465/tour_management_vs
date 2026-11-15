
import { escapeHtml } from './invoice.template.js';

/**
 * Nội dung email đơn đặt tour.
 *
 * Tách khỏi service để test được phần render thuần (không DB, không SMTP) và để
 * `BookingMailService` chỉ lo việc tra mẫu + đẩy vào outbox.
 */
export interface BookingMailPassenger {
  fullName: string;
  type: string;
  unitPrice: number;
}

export interface BookingMailContext {
  code: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  seatCount: number;
  subtotal: number;
  discount: number;
  total: number;
  tourName: string;
  startDate: string;
  endDate: string;
  meetingPoint: string | null;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  note: string | null;
  passengers: BookingMailPassenger[];
  /** Tiêu đề ngắn mô tả sự kiện, vd "Đơn đặt tour đã được ghi nhận". */
  headline: string;
  /** Câu mở đầu tuỳ sự kiện (tạo đơn / xác nhận đơn). */
  intro: string;
  /** Câu kết tuỳ sự kiện. */
  outro: string;
}

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

/** `2026-12-20` → `20/12/2026` (không dùng `Date` để tránh lệch múi giờ). */
const day = (value: string) => value.slice(0, 10).split('-').reverse().join('/');

const moment = (value: Date) =>
  new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const typeLabels: Record<string, string> = {
  ADULT: 'Người lớn',
  CHILD: 'Trẻ em',
  INFANT: 'Em bé',
};

/**
 * Render mẫu `{{bien}}` / `{{{bien}}}` lấy từ bảng `email_templates`.
 *
 * - `{{bien}}` được **escape HTML** (mặc định an toàn cho dữ liệu khách nhập).
 * - `{{{bien}}}` chèn nguyên văn, chỉ dùng cho biến do hệ thống dựng sẵn như
 *   `passengerList`.
 * - Biến không tồn tại → chuỗi rỗng, không để lộ placeholder ra email.
 *
 * Cố ý không kéo `handlebars` vào: dự án chưa cài package đó và nhu cầu chỉ là
 * nội suy biến phẳng, không cần block/partial.
 */
export function renderEmailTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(
    /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}/g,
    (_match: string, rawKey: string | undefined, escapedKey: string | undefined) => {
      const key = rawKey ?? escapedKey ?? '';
      const value = variables[key];
      const text = value === null || value === undefined ? '' : String(value);
      return rawKey ? text : escapeHtml(text);
    },
  );
}

/** Bảng biến dùng chung cho cả mẫu trong DB và bản dựng mặc định. */
export function bookingMailVariables(context: BookingMailContext): Record<string, string> {
  const items = context.passengers.map(
    (passenger) =>
      `<li style="margin:2px 0">${escapeHtml(passenger.fullName)} – ${escapeHtml(
        typeLabels[passenger.type] ?? passenger.type,
      )} – ${escapeHtml(money(passenger.unitPrice))}</li>`,
  );

  return {
    headline: context.headline,
    intro: context.intro,
    outro: context.outro,
    bookingCode: context.code,
    status: context.status,
    contactName: context.contactName,
    contactEmail: context.contactEmail,
    contactPhone: context.contactPhone,
    seatCount: String(context.seatCount),
    subtotal: money(context.subtotal),
    discount: money(context.discount),
    total: money(context.total),
    tourName: context.tourName,
    startDate: day(context.startDate),
    endDate: day(context.endDate),
    meetingPoint: context.meetingPoint ?? 'Sẽ thông báo sau',
    expiresAt: context.expiresAt ? moment(context.expiresAt) : '',
    confirmedAt: context.confirmedAt ? moment(context.confirmedAt) : '',
    note: context.note ?? '',
    passengerNames: context.passengers.map((passenger) => passenger.fullName).join(', '),
    passengerList: items.length
      ? `<ul style="margin:0;padding-left:18px">${items.join('')}</ul>`
      : '<p style="margin:0;color:#586b78">Chưa có thông tin hành khách.</p>',
  };
}

/**
 * Bản HTML mặc định khi bảng `email_templates` chưa có `BOOKING_CONFIRMED`
 * hoặc mẫu đang tắt. Nhờ vậy luồng đặt tour không phụ thuộc vào việc seed.
 */
export function renderBookingMailFallback(context: BookingMailContext): string {
  const v = bookingMailVariables(context);
  // Mọi biến đều escape ở đây: `intro`/`outro` chứa tên khách, `tourName` và
  // `meetingPoint` do quản trị viên nhập. Không chèn HTML dựng sẵn của biến nào.
  const e = escapeHtml;
  const sans = `'Segoe UI',Arial,Helvetica,sans-serif`;
  const serif = `Georgia,'Times New Roman',serif`;
  const cell = 'padding:11px 12px;border-bottom:1px solid #dde4ec;vertical-align:top';
  const head = 'padding:10px 12px;background:#0e2a47;color:#ffffff;font-size:12px;font-weight:600;text-align:left';
  const info = (label: string, value: string) =>
    `<tr><td style="padding:9px 0;width:36%;vertical-align:top;border-bottom:1px solid #e6ebf1;color:#66768a">${label}</td><td style="padding:9px 0;vertical-align:top;border-bottom:1px solid #e6ebf1;color:#0e2a47;font-weight:bold">${value}</td></tr>`;
  const passengerRows = context.passengers
    .map(
      (passenger, index) =>
        `<tr><td style="${cell};width:44px;text-align:center;color:#66768a">${index + 1}</td><td style="${cell}">${e(passenger.fullName)}</td><td style="${cell}">${e(typeLabels[passenger.type] ?? passenger.type)}</td><td style="${cell};text-align:right;white-space:nowrap">${e(money(passenger.unitPrice))}</td></tr>`,
    )
    .join('');
  const sum = (label: string, value: string) =>
    `<tr><td colspan="3" style="padding:8px 12px;text-align:right;color:#66768a">${label}</td><td style="padding:8px 12px;text-align:right;white-space:nowrap">${value}</td></tr>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(v.headline)}</title></head>
<body style="margin:0;padding:0;background:#e8edf2;color:#1b2733;font:15px/1.6 ${sans}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf2"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-collapse:separate;border-radius:10px;overflow:hidden">
<tr><td style="background:#0e2a47;border-bottom:4px solid #087f8c;padding:30px 36px 28px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:40px;height:40px;background:#ffffff;border-radius:9px;text-align:center;vertical-align:middle;color:#0e2a47;font:bold 21px ${serif}">T</td>
<td style="padding-left:12px;color:#ffffff;font-size:17px;font-weight:bold;vertical-align:middle">TourGo</td>
</tr></table>
<h1 style="margin:22px 0 0;color:#ffffff;font:bold 25px/1.3 ${serif}">${e(v.headline)}</h1>
</td></tr>
<tr><td style="padding:28px 36px 8px;font-family:${sans}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;border:1px solid #dde4ec;border-radius:8px"><tr>
<td style="padding:16px 20px;vertical-align:top"><p style="margin:0;font-size:12.5px;color:#66768a">Mã đặt tour</p><p style="margin:2px 0 0;color:#0e2a47;font:bold 24px/1.25 ${serif}">${e(v.bookingCode)}</p></td>
<td style="padding:16px 20px;vertical-align:top;text-align:right"><p style="margin:0;font-size:12.5px;color:#66768a">Tổng thanh toán</p><p style="margin:2px 0 0;color:#087f8c;font:bold 24px/1.25 ${serif}">${e(v.total)}</p></td>
</tr></table>
<p style="margin:22px 0 18px">${e(v.intro)}</p>
<p style="margin:0 0 4px;color:#087f8c;font-size:13px;font-weight:bold">Thông tin chuyến đi</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px">
${info('Tên tour', e(v.tourName))}
${info('Thời gian', `${e(v.startDate)} – ${e(v.endDate)}`)}
${info('Điểm hẹn', e(v.meetingPoint))}
${info('Số chỗ', e(v.seatCount))}
${info('Người đặt', e(v.contactName))}
${info('Điện thoại', e(v.contactPhone))}
${v.expiresAt ? info('Hạn thanh toán', e(v.expiresAt)) : ''}
${v.confirmedAt ? info('Xác nhận lúc', e(v.confirmedAt)) : ''}
${v.note ? info('Ghi chú', e(v.note)) : ''}
</table>
<p style="margin:0 0 8px;color:#087f8c;font-size:13px;font-weight:bold">Danh sách hành khách</p>
${
  context.passengers.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px"><thead><tr><th style="${head};text-align:center">STT</th><th style="${head}">Họ và tên</th><th style="${head}">Loại</th><th style="${head};text-align:right">Đơn giá</th></tr></thead><tbody>${passengerRows}</tbody><tfoot>${sum('Cộng tiền hàng', e(v.subtotal))}${context.discount > 0 ? sum('Giảm giá', `−${e(v.discount)}`) : ''}<tr><td colspan="3" style="padding:13px 12px;background:#0e2a47;color:#ffffff;font-weight:bold;text-align:right;border-radius:0 0 0 8px">Tổng thanh toán</td><td style="padding:13px 12px;background:#0e2a47;color:#ffffff;font:bold 17px ${serif};text-align:right;white-space:nowrap;border-radius:0 0 8px 0">${e(v.total)}</td></tr></tfoot></table>`
    : `<p style="margin:0;font-style:italic;color:#66768a">Chưa có thông tin hành khách.</p>`
}
<p style="margin:26px 0 0">${e(v.outro)}</p>
<p style="margin:16px 0 28px">Trân trọng,<br><strong style="color:#0e2a47">Đội ngũ TourGo</strong></p>
</td></tr>
<tr><td style="padding:16px 36px;background:#f4f7fa;border-top:1px solid #dde4ec;color:#66768a;font:12px/1.6 ${sans}">Email được gửi tự động tới ${e(v.contactEmail)}. Nếu cần hỗ trợ, vui lòng phản hồi email này.</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Bản text thuần cho client không đọc HTML (và để tránh bị đánh dấu spam). */
export function bookingMailText(context: BookingMailContext): string {
  const lines = [
    context.headline,
    '',
    context.intro,
    '',
    `Mã đơn: ${context.code}`,
    `Tour: ${context.tourName}`,
    `Khởi hành: ${day(context.startDate)} – ${day(context.endDate)}`,
    `Điểm hẹn: ${context.meetingPoint ?? 'Sẽ thông báo sau'}`,
    `Số chỗ: ${context.seatCount}`,
    `Tổng tiền: ${money(context.total)}`,
  ];
  if (context.passengers.length) {
    lines.push('', 'Hành khách:');
    for (const passenger of context.passengers) {
      lines.push(
        `- ${passenger.fullName} (${typeLabels[passenger.type] ?? passenger.type}) – ${money(passenger.unitPrice)}`,
      );
    }
  }
  if (context.expiresAt) lines.push('', `Hạn thanh toán: ${moment(context.expiresAt)}`);
  if (context.confirmedAt) lines.push('', `Xác nhận lúc: ${moment(context.confirmedAt)}`);
  lines.push('', context.outro);
  return lines.join('\n');
}