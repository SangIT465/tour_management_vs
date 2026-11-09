import React, { useId, useState } from 'react';
import { useApi } from '../hooks.js';
import { money } from '../utils.js';
import { Icon } from './UI.jsx';

const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const expiry = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PromotionPicker({ selectedCode, subtotal, disabled, onSelect }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const regionId = useId();
  const { data, loading, error } = useApi(open ? '/promotions/available' : null, revision);
  return <div className="promotion-picker">
    <button type="button" className="promotion-picker-toggle" disabled={disabled} aria-expanded={open} aria-controls={regionId} onClick={() => setOpen(value => !value)}><Icon name="ticket" size={19} /><span>{open ? 'Ẩn mã ưu đãi' : 'Chọn mã ưu đãi'}<small>Xem mức giảm và điều kiện áp dụng</small></span><Icon name={open ? 'close' : 'arrow'} size={17} /></button>
    {open && <div id={regionId} className="promotion-picker-content" aria-label="Danh sách mã ưu đãi">
      <div className="promotion-picker-heading"><strong>Ưu đãi cho hành trình của bạn</strong><span>{data?.length ?? 0} mã</span></div>
      <p className="promotion-picker-note">Mỗi đơn dùng một mã. Mức giảm chính xác được xác nhận khi bấm Áp dụng hoặc xem báo giá.</p>
      {loading && <p role="status" className="promotion-picker-note">Đang tải mã ưu đãi...</p>}
      {error && <div className="notice error" role="alert"><p>{error}</p><button type="button" className="text-button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}
      {!loading && !error && data?.length === 0 && <p className="promotion-picker-note">Hiện chưa có mã còn hiệu lực hoặc bạn đã dùng hết lượt. Bạn vẫn có thể nhập mã được cung cấp riêng.</p>}
      <div className="promotion-grid">{data?.map(promotion => {
        const shortfall = Number.isFinite(subtotal) ? Math.max(0, promotion.minOrder - subtotal) : null;
        const selected = selectedCode.trim().toUpperCase() === promotion.code;
        return <article className={`promotion-voucher ${shortfall > 0 ? 'promotion-voucher-unavailable' : ''} ${selected ? 'promotion-voucher-selected' : ''}`} key={promotion.code}>
          <div className="promotion-voucher-heading"><span className="promotion-voucher-icon"><Icon name="ticket" size={23} /></span><div><strong>{promotion.type === 'PERCENT' ? `Giảm ${percent.format(promotion.value)}%` : `Giảm ${money(promotion.value)}`}</strong><code>{promotion.code}</code></div></div>
          <p>Đơn từ <strong>{money(promotion.minOrder)}</strong>{promotion.maxDiscount != null && <> · Giảm tối đa <strong>{money(promotion.maxDiscount)}</strong></>}</p>
          <small>Tối đa {promotion.perUserLimit} lượt / khách · Hết hạn {expiry.format(new Date(promotion.validTo))}</small>
          {shortfall > 0 && <p className="promotion-shortfall">Cần thêm {money(shortfall)} để sử dụng</p>}
          <button type="button" className="btn outline small" aria-label={`Chọn mã ${promotion.code}`} aria-pressed={selected} disabled={disabled || shortfall > 0} onClick={() => { onSelect(promotion.code); setOpen(false); }}>{selected ? 'Đã chọn' : 'Chọn mã'}<Icon name={selected ? 'check' : 'arrow'} size={15} /></button>
        </article>;
      })}</div>
    </div>}
  </div>;
}
