export const money = (value: number | null | undefined) => value == null ? 'Đang cập nhật' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export const date = (value: string | null | undefined) => value ? value.slice(0, 10).split('-').reverse().join('/') : 'Đang cập nhật';
export const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const statusNames: Record<string, string> = { PENDING_PAYMENT: 'Chờ thanh toán', PENDING_CONFIRMATION: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', CANCEL_REQUESTED: 'Đang yêu cầu hủy', CANCELLED: 'Đã hủy', REJECTED: 'Đã từ chối', EXPIRED: 'Hết hạn', COMPLETED: 'Đã hoàn thành', PENDING: 'Đang chờ', PROOF_SUBMITTED: 'Chờ duyệt chứng từ', SUCCESS: 'Thành công', FAILED: 'Thất bại', REFUNDED: 'Đã hoàn tiền', PARTIALLY_REFUNDED: 'Đã hoàn một phần' };
export const methodNames: Record<string, string> = { BANK_TRANSFER: 'Chuyển khoản ngân hàng', VNPAY: 'VNPay (giả lập)', MOMO: 'MoMo (giả lập)', OFFICE: 'Tiền mặt tại quầy', NO_CHARGE: 'Không thu tiền' };
export const ticketNames: Record<string, string> = { ADULT: 'Người lớn', CHILD: 'Trẻ em', INFANT: 'Em bé' };
export function query(values: Record<string, string | number | undefined>) { return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value !== undefined).map(([key, value]) => [key, String(value)])).toString(); }
export function isValidDate(value: string): boolean { const parsed = new Date(`${value}T12:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; }
export function localDate(value = new Date()): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
export function isValidBirthday(value: string, today = localDate()): boolean { return isValidDate(value) && value >= '1900-01-01' && value <= today; }
/** Tự chèn dấu "/" khi khách gõ ngày sinh theo kiểu Việt Nam: 20051990 → 20/05/1990. */
export function maskDisplayDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}
/** Đọc chuỗi dd/mm/yyyy thành ISO yyyy-mm-dd; trả '' khi chưa đủ ngày hoặc ngày không tồn tại. */
export function parseDisplayDate(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (digits.length !== 8) return '';
  const iso = `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  return isValidDate(iso) ? iso : '';
}
export function safeNext(value: string | string[] | undefined): string { const candidate = Array.isArray(value) ? value[0] : value; return candidate && /^\/(tours|bookings|booking|payment|favorites|notifications|account|support|review)(\/|\?|$)/.test(candidate) && !candidate.includes('\\') ? candidate : '/(tabs)'; }
