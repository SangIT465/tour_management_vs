import type { Invoice } from '../entities/invoice.entity.js';

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const date = (value: string | Date) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const methods: Record<string, string> = { OFFICE: 'Tiền mặt tại quầy', BANK_TRANSFER: 'Chuyển khoản ngân hàng', VNPAY: 'VNPay', MOMO: 'MoMo', NO_CHARGE: 'Không thu tiền (ưu đãi toàn phần)' };

/** Self-contained A4 document shared by email and the authenticated print view. */
export function renderInvoice(invoice: Pick<Invoice, 'number' | 'issuedAt' | 'snapshot'>): string {
  const s = invoice.snapshot;
  const e = escapeHtml;
  // Historical invoices may contain a negative discount line. Render it once in totals.
  const lines = s.lines.filter(line => line.amount >= 0);
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hóa đơn ${e(invoice.number)}</title>
<style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#172b38;font:14px/1.6 Arial,sans-serif}.invoice{max-width:800px;margin:24px auto;padding:40px;background:white}header{border-bottom:3px solid #087f8c;padding-bottom:20px}h1{font-size:25px;margin:12px 0;color:#086b77}h2{font-size:17px;margin:24px 0 8px}p{margin:4px 0}.muted,footer{color:#586b78;font-size:12px}.paid{color:#087f50;font-weight:bold}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:12px 8px;border-bottom:1px solid #dce5eb;text-align:left}th{background:#edf7f8}.amount{text-align:right;white-space:nowrap}.totals{margin-left:auto;max-width:340px}.totals p{display:flex;justify-content:space-between;gap:20px;padding:6px 0}.grand{font-size:19px;border-top:2px solid #087f8c}footer{margin-top:32px;border-top:1px solid #dce5eb;padding-top:16px;overflow-wrap:anywhere}tr{break-inside:avoid}@media print{body{background:white}.invoice{padding:0;margin:0;max-width:none}thead{display:table-header-group}}@media(max-width:600px){.invoice{padding:18px;margin:0}th,td{padding:8px 4px;font-size:12px}}</style></head>
<body><article class="invoice"><header><strong>${e(s.seller?.name ?? 'TourGo')}</strong>${s.seller?.address ? `<p>${e(s.seller.address)}</p>` : ''}<p>${e([s.seller?.phone, s.seller?.email].filter(Boolean).join(' · '))}</p><h1>HÓA ĐƠN THANH TOÁN</h1><p>Số hóa đơn: <strong>${e(invoice.number)}</strong></p><p>Ngày phát hành: ${e(date(invoice.issuedAt))}</p><p class="paid">ĐÃ THANH TOÁN${s.payment ? ` · ${e(methods[s.payment.method] ?? s.payment.method)}` : ''}</p></header>
<h2>Thông tin khách hàng</h2><p><strong>${e(s.customerName)}</strong></p><p>Email: ${e(s.customerEmail)} · Điện thoại: ${e(s.customerPhone)}</p>
<h2>Thông tin đặt tour</h2>${s.bookingCode ? `<p>Mã đặt tour: <strong>${e(s.bookingCode)}</strong></p>` : ''}<p>${e(s.tourName)}</p><p>Khởi hành: ${e(s.startDate.slice(0, 10).split('-').reverse().join('/'))}</p>
<table><thead><tr><th>Nội dung</th><th>Số lượng</th><th class="amount">Đơn giá</th><th class="amount">Thành tiền</th></tr></thead><tbody>${lines.map(line => `<tr><td>${e(line.description)}</td><td>${e(line.quantity)}</td><td class="amount">${e(money(line.unitPrice))}</td><td class="amount">${e(money(line.amount))}</td></tr>`).join('')}</tbody></table>
<div class="totals"><p><span>Tạm tính</span><strong>${e(money(s.subtotal))}</strong></p><p><span>Giảm giá ${e(s.promotionCode ?? '')}</span><strong>−${e(money(s.discount))}</strong></p><p class="grand"><span>Tổng thanh toán</span><strong>${e(money(s.total))}</strong></p></div>
${s.payment ? `<p class="muted">Giao dịch: ${e(s.payment.reference)}<br>Thanh toán lúc: ${e(date(s.payment.paidAt))}</p>` : ''}
<footer>Cảm ơn quý khách đã đặt tour. Thanh toán đã được ghi nhận; trạng thái xác nhận chuyến đi được cập nhật trong đơn đặt tour.<br>Đây là chứng từ thanh toán dịch vụ, không thay thế hóa đơn điện tử theo quy định. Khoản hoàn tiền (nếu có) được theo dõi riêng trong lịch sử giao dịch.</footer></article></body></html>`;
}
