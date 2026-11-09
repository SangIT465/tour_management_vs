import React, { useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, Card, Title, Copy, Row, Button, Field, Chips, Message, LoadState, LoginRequired, Badge, layout } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { useSession } from '../../context/session';
import { api } from '../../lib/api';
import { openInvoice } from '../../lib/invoice';
import { methodNames, money, statusNames } from '../../lib/format';
import type { Booking, Payment, Payments, PublicInfo } from '../../lib/types';

export default function PaymentScreen() { const { id } = useLocalSearchParams<{ id: string }>(); return <LoginRequired next={`/payment/${id}`}><PaymentContent id={id} /></LoginRequired>; }
function PaymentContent({ id }: { id: string }) {
  const summary = useResource<Payments>(`/payments/booking/${id}`);
  const booking = useResource<Booking>(`/bookings/${id}`);
  const info = useResource<PublicInfo>('/system/settings/public-info');
  const { user } = useSession();
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const item = summary.data;
  const bank = info.data?.bank;
  const canPay = !!item && item.bookingStatus === 'PENDING_PAYMENT' && !summary.error;
  const paid = item?.payments.some(payment => payment.status === 'SUCCESS') && item.outstanding <= 0 && item.refundedTotal === 0;
  const refresh = () => { summary.refresh(); booking.refresh(); };
  async function act(work: () => Promise<unknown>, message = '') {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(message); refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không xử lý được giao dịch.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function simulate(payment: Payment) {
    const work = () => { void act(() => api.request(`/payments/mock-gateway/pay/${encodeURIComponent(payment.gatewayTxnRef ?? '')}`), 'Đã xử lý giao dịch giả lập.'); };
    if (Platform.OS === 'web') { if (globalThis.confirm('Giao dịch GIẢ LẬP, không thu tiền thật. Tiếp tục?')) work(); }
    else Alert.alert('Thanh toán giả lập', 'Giao dịch này không thu tiền thật. Tiếp tục?', [{ text: 'Quay lại', style: 'cancel' }, { text: 'Tiếp tục', onPress: work }]);
  }
  return <Screen refresh={refresh} refreshing={summary.loading && !!item}><Heading title="Thanh toán đơn đặt tour" subtitle={booking.data?.tourName ?? item?.bookingCode} /><LoadState loading={summary.loading && !item} error={summary.error} retry={refresh} /><Message text={error} error /><Message text={notice} />
    {item && <><Card><Badge>{statusNames[item.bookingStatus] ?? item.bookingStatus}</Badge><Row label="Mã đặt tour" value={item.bookingCode} /><Row label="Tổng tiền" value={money(item.total)} strong /><Row label="Đã nhận" value={money(item.paidTotal)} /><Row label="Đã hoàn" value={money(item.refundedTotal)} /><Row label="Còn phải trả" value={money(item.outstanding)} strong />{paid && <Message text="Hệ thống đã ghi nhận thanh toán. Việc xác nhận chuyến đi vẫn được cập nhật riêng trong đơn của bạn." />}<Button title="Xem chi tiết đơn" outline onPress={() => router.push({ pathname: '/bookings/[id]', params: { id } })} /></Card>
      {item.receiptEmail && <Card><Title>Email xác nhận thanh toán</Title><Copy>{({ SENT: 'Đã gửi email. Kiểm tra cả thư mục Spam / Thư rác.', PENDING: 'Email đang chờ được gửi.', SENDING: 'Hệ thống đang gửi email.', FAILED: 'Chưa gửi được email. Vui lòng liên hệ hỗ trợ.' } as Record<string, string>)[item.receiptEmail.status] ?? 'Đang cập nhật trạng thái email.'}</Copy><Copy muted>{booking.data?.contactEmail}</Copy></Card>}
      {booking.data?.invoice && <Card><Title>Hóa đơn đã phát hành</Title><Copy muted>{booking.data.invoice.number}</Copy><Button title="In hóa đơn" busy={busy} onPress={() => { void act(() => openInvoice(id, false)); }} /><Button title="Lưu / Chia sẻ PDF" outline busy={busy} onPress={() => { void act(() => openInvoice(id, true)); }} /></Card>}
      {canPay && <Card><Title>{item.total === 0 ? 'Xác nhận đơn miễn phí' : 'Phương thức thanh toán'}</Title>{item.total === 0 ? <Copy>Chi phí đã được giảm toàn bộ. Xác nhận để nhận hóa đơn và email, không cần chuyển tiền.</Copy> : <><Chips items={[{ label: 'Chuyển khoản', value: 'BANK_TRANSFER' }, { label: 'VNPay', value: 'VNPAY' }, { label: 'MoMo', value: 'MOMO' }]} value={method} onChange={value => { if (!busy) setMethod(value); }} /><Message text={method === 'BANK_TRANSFER' ? 'Chuyển khoản và gửi chứng từ; nhân viên sẽ đối chiếu trước khi ghi nhận thanh toán.' : 'VNPay / MoMo hiện là cổng GIẢ LẬP phục vụ đồ án, không thu tiền thật.'} /></>}<Button title={item.total === 0 ? 'Xác nhận đơn miễn phí' : 'Tạo giao dịch thanh toán'} busy={busy} onPress={() => { void act(() => api.request('/payments', { method: 'POST', body: { bookingId: id, method: item.total === 0 ? 'NO_CHARGE' : method } }), 'Đã tạo giao dịch. Xem hướng dẫn bên dưới.'); }} /></Card>}
      {canPay && item.total > 0 && <Card><Title>Thông tin chuyển khoản</Title>{info.loading ? <Copy muted>Đang tải thông tin ngân hàng...</Copy> : bank?.bankName && bank.accountName && bank.accountNumber ? <><Row label="Ngân hàng" value={bank.bankName} /><Row label="Chủ tài khoản" value={bank.accountName} /><Row label="Số tài khoản" value={bank.accountNumber} /><Row label="Nội dung chuyển khoản" value={item.bookingCode} /><Copy muted>Kiểm tra thông tin với CSKH trước khi chuyển tiền.</Copy></> : <Message text="Chưa có đầy đủ thông tin ngân hàng. Vui lòng liên hệ hỗ trợ trước khi chuyển tiền." />}</Card>}
      <Title>Lịch sử giao dịch</Title>{!item.payments.length && <Card><Copy muted>Chưa có giao dịch.</Copy></Card>}
      {item.payments.map(payment => <Card key={payment.id}><Title>{methodNames[payment.method] ?? payment.method}</Title><Badge>{statusNames[payment.status] ?? payment.status}</Badge><Row label="Số tiền" value={money(payment.amount)} /><Copy muted>Mã giao dịch: {payment.gatewayTxnRef ?? payment.id}</Copy>{!!payment.proofNote && <Copy>{payment.proofNote}</Copy>}{payment.status === 'PROOF_SUBMITTED' && <Message text="Chứng từ đang chờ đối chiếu. Không chuyển thêm tiền cho giao dịch này." />}
        {canPay && payment.status === 'PENDING' && ['VNPAY', 'MOMO'].includes(payment.method) && <Button title="Thanh toán giả lập" disabled={busy || !payment.gatewayTxnRef} onPress={() => simulate(payment)} />}
        {canPay && payment.status === 'PENDING' && payment.method === 'BANK_TRANSFER' && <ProofForm disabled={busy} canUpload={!!user?.permissions.includes('file:upload')} onSubmit={(proofUrl, proofNote) => act(() => api.request(`/payments/${payment.id}/proof`, { method: 'POST', body: { proofUrl, ...(proofNote ? { proofNote } : {}) } }), 'Đã gửi chứng từ. Vui lòng chờ nhân viên đối chiếu.')} />}
      </Card>)}<Button title="Liên hệ hỗ trợ" outline onPress={() => router.push('/support')} />
    </>}
  </Screen>;
}
function ProofForm({ disabled, canUpload, onSubmit }: { disabled: boolean; canUpload: boolean; onSubmit: (url: string, note: string) => Promise<void> }) {
  const [proofUrl, setProofUrl] = useState('');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  async function pick() {
    if (uploading || disabled) return;
    setUploading(true); setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền chọn ảnh để tải chứng từ thanh toán.');
      const selected = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: false });
      if (selected.canceled) return;
      const asset = selected.assets[0];
      const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
      const context = ImageManipulator.manipulate(asset.uri);
      if (asset.width > 1600) context.resize({ width: 1600 });
      const image = await context.renderAsync();
      const jpeg = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
      const body = new FormData();
      if (Platform.OS === 'web') body.append('file', await (await fetch(jpeg.uri)).blob(), 'chung-tu.jpg');
      else body.append('file', { uri: jpeg.uri, name: 'chung-tu.jpg', type: 'image/jpeg' } as unknown as Blob);
      const uploaded = await api.request<{ path: string }>('/uploads?folder=receipts', { method: 'POST', body });
      setProofUrl(uploaded.path);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không tải được ảnh chứng từ.'); }
    finally { setUploading(false); }
  }
  return <View style={layout.gap}>{canUpload && <Button title={uploading ? 'Đang tải ảnh...' : 'Chọn ảnh chứng từ từ điện thoại'} outline disabled={disabled} busy={uploading} onPress={() => { void pick(); }} />}<Field label="Đường dẫn chứng từ" value={proofUrl} onChangeText={setProofUrl} editable={!disabled && !uploading} placeholder="https://... hoặc ảnh vừa tải" maxLength={2048} /><Field label="Ghi chú chuyển khoản" value={note} onChangeText={setNote} multiline maxLength={1000} editable={!disabled && !uploading} /><Message text={error} error /><Button title="Gửi chứng từ chuyển khoản" disabled={disabled || uploading || !proofUrl.trim()} onPress={() => { void onSubmit(proofUrl.trim(), note.trim()); }} /></View>;
}
