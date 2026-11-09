import React, { useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, Card, Title, Copy, Row, Field, Button, LoadState, LoginRequired, Badge, Message, layout } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { api } from '../../lib/api';
import { openInvoice } from '../../lib/invoice';
import { date, dateTime, money, statusNames, ticketNames } from '../../lib/format';
import type { Booking, Payments } from '../../lib/types';

export default function BookingDetailScreen() { const { id } = useLocalSearchParams<{ id: string }>(); return <LoginRequired next={`/bookings/${id}`}><BookingDetail id={id} /></LoginRequired>; }
function BookingDetail({ id }: { id: string }) {
  const booking = useResource<Booking>(`/bookings/${id}`);
  const payments = useResource<Payments>(`/payments/booking/${id}`);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function action(work: () => Promise<unknown>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await work(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không xử lý được yêu cầu.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function cancel() {
    if (reason.trim().length < 5) { setError('Vui lòng nhập lý do hủy ít nhất 5 ký tự.'); return; }
    const run = () => { void action(async () => { await api.request(`/bookings/${id}/cancel-request`, { method: 'POST', body: { reason: reason.trim() } }); setCancelOpen(false); setNotice('Đã gửi yêu cầu hủy. Phí hủy được lưu theo chính sách tại thời điểm yêu cầu.'); booking.refresh(); }); };
    if (Platform.OS === 'web') { if (globalThis.confirm('Gửi yêu cầu hủy đơn đặt tour này?')) run(); }
    else Alert.alert('Yêu cầu hủy tour', 'Bạn muốn gửi yêu cầu hủy đơn này?', [{ text: 'Quay lại', style: 'cancel' }, { text: 'Gửi yêu cầu', style: 'destructive', onPress: run }]);
  }
  const item = booking.data;
  return <Screen refresh={() => { booking.refresh(); payments.refresh(); }} refreshing={booking.loading && !!item}><LoadState loading={booking.loading && !item} error={booking.error} retry={booking.refresh} /><Message text={error} error /><Message text={notice} />
    {item && <><Heading title={item.tourName} subtitle={`Mã đặt tour: ${item.code}`} /><Badge>{statusNames[item.status] ?? item.status}</Badge><Card><Title>Thông tin hành trình</Title><Row label="Ngày đi" value={date(item.startDate)} /><Row label="Ngày về" value={date(item.endDate)} /><Row label="Hành khách" value={item.passengerCount} /><Row label="Ngày đặt" value={dateTime(item.createdAt)} />{!!item.expiresAt && <Row label="Hạn thanh toán" value={dateTime(item.expiresAt)} />}</Card>
      <Card><Title>Thông tin liên hệ</Title><Row label="Họ và tên" value={item.contactName} /><Row label="Điện thoại" value={item.contactPhone} /><Row label="Email" value={item.contactEmail} />{!!item.note && <Copy>{item.note}</Copy>}</Card>
      <Card><Title>Hành khách</Title>{item.passengers.map((passenger, index) => <View key={index} style={layout.gap}><Copy>{index + 1}. {passenger.fullName}</Copy><Copy muted>{date(passenger.dob)} · {ticketNames[passenger.type ?? 'ADULT'] ?? passenger.type} · {money(passenger.unitPrice)}</Copy></View>)}</Card>
      <Card><Title>Chi phí đặt tour</Title><Row label="Tạm tính" value={money(item.subtotal)} /><Row label={`Giảm giá ${item.promotionCode ?? ''}`} value={`−${money(item.discount)}`} /><Row label="Tổng tiền" value={money(item.total)} strong />{payments.data && <><Row label="Đã nhận" value={money(payments.data.paidTotal)} /><Row label="Đã hoàn" value={money(payments.data.refundedTotal)} /><Row label="Còn phải trả" value={money(payments.data.outstanding)} /></>}<Button title="Thanh toán & chứng từ" onPress={() => router.push({ pathname: '/payment/[id]', params: { id } })} /></Card>
      {item.invoice && <Card><Title>Hóa đơn {item.invoice.number}</Title><Copy muted>Phát hành: {dateTime(item.invoice.issuedAt)}</Copy><Button title="In hóa đơn" busy={busy} onPress={() => { void action(() => openInvoice(id, false)); }} /><Button title="Lưu / Chia sẻ PDF" outline busy={busy} onPress={() => { void action(() => openInvoice(id, true)); }} /></Card>}
      {['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED'].includes(item.status) && <Card><Button title={cancelOpen ? 'Đóng yêu cầu hủy' : 'Yêu cầu hủy tour'} outline disabled={busy} onPress={() => setCancelOpen(value => !value)} />{cancelOpen && <><Field label="Lý do hủy" multiline value={reason} onChangeText={setReason} maxLength={1000} editable={!busy} /><Copy muted>Gửi yêu cầu không đồng nghĩa đã hủy hoặc đã hoàn tiền. Nhân viên sẽ xem xét theo chính sách.</Copy><Button title="Gửi yêu cầu hủy" danger busy={busy} onPress={cancel} /></>}</Card>}
      {item.cancelRequests?.map(request => <Card key={request.id}><Title>Yêu cầu hủy · {request.status === 'PENDING' ? 'Chờ xử lý' : request.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}</Title><Copy>{request.reason}</Copy><Row label="Phí hủy" value={money(request.feeAmount)} /><Row label="Hoàn theo chính sách" value={money(request.refundAmount)} />{!!request.rejectReason && <Copy>{request.rejectReason}</Copy>}</Card>)}
      {item.status === 'COMPLETED' && <Button title="Đánh giá chuyến đi" outline onPress={() => router.push({ pathname: '/review/[id]', params: { id } })} />}<Button title="Liên hệ hỗ trợ" outline onPress={() => router.push('/support')} />
    </>}
  </Screen>;
}
