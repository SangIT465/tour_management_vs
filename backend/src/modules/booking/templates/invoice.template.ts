import type { Invoice } from '../entities/invoice.entity.js';

const ESCAPES: Record<string, string> = { '&': '\u0026amp;', '<': '\u0026lt;', '>': '\u0026gt;', '"': '\u0026quot;', "'": '\u0026#39;' };

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ESCAPES[character]!);
}
const amount = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const date = (value: string | Date) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const day = (value?: string) => (value ? value.slice(0, 10).split('-').reverse().join('/') : '—');
const methods: Record<string, string> = { OFFICE: 'Tiền mặt tại quầy', BANK_TRANSFER: 'Chuyển khoản ngân hàng', VNPAY: 'VNPay', MOMO: 'MoMo', NO_CHARGE: 'Không thu tiền (ưu đãi toàn phần)' };

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readGroup(n: number, padded: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];
  if (h > 0 || padded) parts.push(`${DIGITS[h]} trăm`);
  if (t > 1) {
    parts.push(`${DIGITS[t]} mươi`);
    if (u === 1) parts.push('mốt');
    else if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGITS[u]!);
  } else if (t === 1) {
    parts.push('mười');
    if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGITS[u]!);
  } else if (u > 0) {
    if (h > 0 || padded) parts.push('lẻ');
    parts.push(DIGITS[u]!);
  }
  return parts.join(' ');
}

/** Reads a VND amount in Vietnamese words, e.g. 1.250.000 → "Một triệu hai trăm năm mươi nghìn đồng chẵn." */
export function amountInWords(value: number): string {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (n === 0) return 'Không đồng.';
  const groups: number[] = [];
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]!;
    if (group === 0) continue;
    const text = readGroup(group, i < groups.length - 1);
    words.push(UNITS[i] ? `${text} ${UNITS[i]}` : text);
  }
  const sentence = `${words.join(' ')} đồng chẵn.`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Self-contained A4 document shared by email and the authenticated print view. */
export function renderInvoice(invoice: Pick<Invoice, 'number' | 'issuedAt' | 'snapshot'>): string {
  const s = invoice.snapshot;
  const e = escapeHtml;
  // Historical invoices may contain a negative discount line. Render it once in totals.
  const lines = s.lines.filter(line => line.amount >= 0);
  const seller = s.seller;
  const taxCode = (seller as unknown as { taxCode?: string } | undefined)?.taxCode;
  const hasDiscount = Number(s.discount) > 0;
  const [dd, mm, yyyy] = new Date(invoice.issuedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).split('/');
  const method = s.payment ? (methods[s.payment.method] ?? s.payment.method) : '';
  const sellerInfo = [
    seller?.address ? `<p>Địa chỉ: ${e(seller.address)}</p>` : '',
    taxCode ? `<p>Mã số thuế: ${e(taxCode)}</p>` : '',
    seller?.phone ? `<p>Điện thoại: ${e(seller.phone)}</p>` : '',
    seller?.email ? `<p>Email: ${e(seller.email)}</p>` : ''
  ].join('');
  const row = (label: string, value: string) => `<div class="field"><span class="label">${label}:</span><span class="value">${value}</span></div>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hóa đơn ${e(invoice.number)}</title>
<style>
@page{size:A4;margin:15mm}
*{box-sizing:border-box}
html,body{margin:0}
body{background:#e6e6e6;color:#000;font:15px/1.5 "Times New Roman",Times,"Liberation Serif",serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
p{margin:0}
.invoice{width:100%;max-width:794px;margin:24px auto;padding:48px 52px;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.18)}
.seller{padding-bottom:12px;border-bottom:2px solid #000}
.seller .name{font-size:17px;font-weight:700;text-transform:uppercase}
.seller p{font-size:14px;overflow-wrap:anywhere}
.title{margin:22px 0 18px;text-align:center}
.title h1{margin:0;font-size:25px;font-weight:700;letter-spacing:.04em}
.title .date{margin-top:4px;font-style:italic}
.title .number{margin-top:2px}
.info{margin-bottom:16px}
.field{display:flex;gap:6px;padding:2px 0}
.field .label{flex:0 0 190px}
.field .value{flex:1;min-width:0;font-weight:700;overflow-wrap:anywhere}
.field .value.normal{font-weight:400}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14.5px}
th,td{border:1px solid #000;padding:7px 8px;vertical-align:top}
thead th{background:#ededed;font-weight:700;text-align:center}
.stt{width:46px;text-align:center}
.qty{width:70px;text-align:center}
.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
tfoot td{font-weight:400}
tfoot .label{text-align:right}
tfoot .grand td{font-weight:700;font-size:15.5px;background:#ededed}
.unit-note{margin:0 0 4px;text-align:right;font-style:italic;font-size:13px}
.words{margin-top:12px}
.words strong{font-style:italic}
.signs{display:flex;gap:24px;margin-top:28px;text-align:center}
.signs>div{flex:1}
.signs strong{display:block}
.signs em{display:block;font-size:13px}
.signs .space{height:96px}
.note{margin-top:20px;padding-top:10px;border-top:1px solid #000;font-size:12.5px;font-style:italic;line-height:1.55}
@media print{
html,body{background:#fff}
body{font-size:12pt}
.invoice{width:auto;max-width:none;margin:0;padding:0;box-shadow:none}
.table-wrap{overflow:visible}
table{font-size:11.5pt}
thead{display:table-header-group}
tr,.signs,.words,.note{break-inside:avoid}
}
@media(max-width:640px){
.invoice{margin:0;padding:24px 16px}
.field{flex-direction:column;gap:0}
.field .label{flex:none}
.signs{flex-direction:column}
}
</style></head>
<body><article class="invoice">
<header class="seller"><p class="name">${e(seller?.name ?? 'TourGo')}</p>${sellerInfo}</header>
<div class="title"><h1>HÓA ĐƠN THANH TOÁN</h1><p class="date">Ngày ${e(dd)} tháng ${e(mm)} năm ${e(yyyy)}</p><p class="number">Số: <strong>${e(invoice.number)}</strong></p></div>
<section class="info">
${row('Họ tên người mua hàng', e(s.customerName))}
${row('Email', e(s.customerEmail))}
${row('Điện thoại', e(s.customerPhone))}
${row('Tên tour', e(s.tourName))}
${row('Ngày khởi hành', e(day(s.startDate)))}
${s.bookingCode ? row('Mã đặt tour', e(s.bookingCode)) : ''}
${s.payment ? row('Hình thức thanh toán', e(method)) : ''}
${s.payment ? row('Mã giao dịch', e(s.payment.reference)) : ''}
${s.payment ? row('Thời điểm thanh toán', e(date(s.payment.paidAt))) : ''}
</section>
<p class="unit-note">Đơn vị tính: VNĐ</p>
<div class="table-wrap"><table>
<thead><tr><th class="stt">STT</th><th>Tên hàng hóa, dịch vụ</th><th class="qty">Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
<tbody>${lines.map((line, index) => `<tr><td class="stt">${index + 1}</td><td>${e(line.description)}</td><td class="qty">${e(line.quantity)}</td><td class="num">${e(amount(line.unitPrice))}</td><td class="num">${e(amount(line.amount))}</td></tr>`).join('')}</tbody>
<tfoot>
<tr><td colspan="4" class="label">Cộng tiền hàng:</td><td class="num">${e(amount(s.subtotal))}</td></tr>
${hasDiscount ? `<tr><td colspan="4" class="label">Giảm giá${s.promotionCode ? ` (${e(s.promotionCode)})` : ''}:</td><td class="num">−${e(amount(s.discount))}</td></tr>` : ''}
<tr class="grand"><td colspan="4" class="label">Tổng cộng thanh toán:</td><td class="num">${e(amount(s.total))}</td></tr>
</tfoot></table></div>
<p class="words">Số tiền viết bằng chữ: <strong>${e(amountInWords(s.total))}</strong></p>
<section class="signs">
<div><strong>Người mua hàng</strong><em>(Ký, ghi rõ họ tên)</em><div class="space"></div></div>
<div><strong>Người bán hàng</strong><em>(Ký, đóng dấu, ghi rõ họ tên)</em><div class="space"></div></div>
</section>
<footer class="note">Cảm ơn quý khách đã đặt tour. Thanh toán đã được ghi nhận; trạng thái xác nhận chuyến đi được cập nhật trong đơn đặt tour.<br>Đây là chứng từ thanh toán dịch vụ, không thay thế hóa đơn điện tử theo quy định. Khoản hoàn tiền (nếu có) được theo dõi riêng trong lịch sử giao dịch.</footer>
</article></body></html>`;
}