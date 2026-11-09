import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, Card, Title, Copy, Row, Field, Button, Message, LoadState, LoginRequired, layout } from '../../components/ui';
import BirthDateField from '../../components/birth-date-field';
import PromotionPicker from '../../components/promotion-picker';
import { useSession } from '../../context/session';
import { useResource } from '../../hooks/use-resource';
import { api } from '../../lib/api';
import { date, isValidBirthday, money, ticketNames } from '../../lib/format';
import type { Booking, Passenger, Quote, Schedule, TourDetail } from '../../lib/types';

export default function BookingScreen() {
  const { id, scheduleId } = useLocalSearchParams<{ id: string; scheduleId: string }>();
  return <LoginRequired next={`/booking/${id}?scheduleId=${encodeURIComponent(scheduleId ?? '')}`}><BookingForm id={id} scheduleId={scheduleId} /></LoginRequired>;
}
function BookingForm({ id, scheduleId }: { id: string; scheduleId: string }) {
  const { user } = useSession();
  const schedules = useResource<Schedule[]>(`/schedules/tour/${id}`);
  const tour = useResource<TourDetail>(`/tours/${id}`);
  const selected = schedules.data?.find(item => item.id === scheduleId);
  const [contactName, setContactName] = useState(user?.fullName ?? '');
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [note, setNote] = useState('');
  const [passengers, setPassengers] = useState<Passenger[]>([{ fullName: user?.fullName ?? '', dob: '' }]);
  const [promotionCode, setPromotionCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  function passenger(index: number, changes: Partial<Passenger>) { setPassengers(values => values.map((value, at) => at === index ? { ...value, ...changes } : value)); setQuote(null); }
  async function submit(create: boolean) {
    if (lock.current || !selected) return;
    if (passengers.some(value => value.fullName.trim().length < 2 || !isValidBirthday(value.dob))) { setError('Nhập họ tên và ngày sinh hợp lệ cho từng hành khách (từ năm 1900, không sau hôm nay).'); return; }
    if (contactName.trim().length < 2 || !/^(0\d{9}|\+84\d{9})$/.test(contactPhone.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) { setError('Kiểm tra họ tên, số điện thoại Việt Nam và email liên hệ.'); return; }
    if (create && (!quote || !quote.canBook)) return;
    lock.current = true; setBusy(true); setError('');
    const body = { scheduleId, passengers: passengers.map(value => ({ fullName: value.fullName.trim(), dob: value.dob })), ...(promotionCode.trim() ? { promotionCode: promotionCode.trim() } : {}) };
    try {
      if (create) {
        const booking = await api.request<Booking>('/bookings', { method: 'POST', body: { ...body, contactName: contactName.trim(), contactPhone: contactPhone.trim(), contactEmail: contactEmail.trim(), ...(note.trim() ? { note: note.trim() } : {}) } });
        router.replace({ pathname: '/payment/[id]', params: { id: booking.id } });
      } else setQuote(await api.request<Quote>('/bookings/quote', { method: 'POST', body }));
    } catch (failure) { setQuote(null); setError(failure instanceof Error ? failure.message : 'Không xử lý được đơn đặt tour.'); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!selected) return <Screen><LoadState loading={schedules.loading} error={schedules.error} retry={schedules.refresh} empty={!schedules.loading && !schedules.error ? 'Lịch này không còn mở bán. Vui lòng chọn lịch khởi hành khác.' : undefined} /><Button title="Chọn lịch khác" outline onPress={() => router.replace({ pathname: '/tours/[id]', params: { id } })} /></Screen>;
  return <Screen><Heading title="Hoàn tất đặt tour" subtitle={tour.data?.name || selected.tourName} /><Card><Row label="Khởi hành" value={date(selected.startDate)} /><Row label="Kết thúc" value={date(selected.endDate)} /><Copy muted>{selected.meetingPoint || 'Điểm đón đang cập nhật'}</Copy></Card>
    <Card><Title>Thông tin liên hệ</Title><Field label="Họ và tên" value={contactName} onChangeText={setContactName} autoCapitalize="words" autoComplete="name" maxLength={150} editable={!busy} /><Field label="Số điện thoại" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={20} editable={!busy} /><Field label="Email nhận xác nhận và hóa đơn" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoComplete="email" maxLength={191} editable={!busy} /></Card>
    {passengers.map((value, index) => <Card key={index}><View style={layout.spread}><Title>Hành khách {index + 1}</Title>{passengers.length > 1 && <Button title="Xóa" small outline disabled={busy} onPress={() => { setPassengers(values => values.filter((_, at) => at !== index)); setQuote(null); }} />}</View><Field label="Họ tên theo giấy tờ tùy thân" value={value.fullName} onChangeText={fullName => passenger(index, { fullName })} autoCapitalize="words" maxLength={150} editable={!busy} /><BirthDateField value={value.dob} disabled={busy} onChange={dob => passenger(index, { dob })} /></Card>)}
    <Button title="+ Thêm hành khách" outline disabled={busy || passengers.length >= 30} onPress={() => { setPassengers(values => [...values, { fullName: '', dob: '' }]); setQuote(null); }} />
    <Card><Title>Ưu đãi & ghi chú</Title><PromotionPicker code={promotionCode} subtotal={quote?.subtotal} disabled={busy} onSelect={value => { setPromotionCode(value); setQuote(null); }} /><Field label="Mã giảm giá (tùy chọn)" value={promotionCode} onChangeText={value => { setPromotionCode(value.toUpperCase()); setQuote(null); }} autoCapitalize="characters" maxLength={40} editable={!busy} /><Button title="Áp dụng / Xem báo giá" outline busy={busy} onPress={() => { void submit(false); }} />{!!promotionCode && <Button title="Gỡ mã" small outline disabled={busy} onPress={() => { setPromotionCode(''); setQuote(null); }} />}<Field label="Ghi chú cho chuyến đi" value={note} onChangeText={setNote} multiline maxLength={1000} editable={!busy} /></Card>
    <Message text={error} error />
    {quote && <Card><Title>Báo giá của bạn</Title>{quote.lines.map(line => <Row key={line.type} label={`${ticketNames[line.type] ?? line.type} × ${line.quantity}`} value={money(line.amount)} />)}<Row label="Tạm tính" value={money(quote.subtotal)} /><Row label={`Giảm giá ${quote.promotionCode ?? ''}`} value={`−${money(quote.discount)}`} /><Row label="Tổng thanh toán" value={money(quote.total)} strong /><Message text={!quote.canBook ? 'Không đủ chỗ cho số hành khách đã chọn.' : 'Báo giá chưa giữ chỗ. Giá và chỗ sẽ được kiểm tra lại khi tạo đơn.'} error={!quote.canBook} /><Button title="Xác nhận đặt tour" disabled={!quote.canBook} busy={busy} onPress={() => { void submit(true); }} /></Card>}
    <Copy muted>Loại vé và giá được hệ thống tính theo ngày sinh, lịch khởi hành. Tạo đơn chưa đồng nghĩa đã thanh toán.</Copy>
  </Screen>;
}
