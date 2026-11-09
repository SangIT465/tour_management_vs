import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, Card, Title, Copy, Field, Button, Chips, Message, LoadState, LoginRequired } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { api } from '../../lib/api';
import type { Booking, Page } from '../../lib/types';

export default function ReviewScreen() { const { id } = useLocalSearchParams<{ id: string }>(); return <LoginRequired next={`/review/${id}`}><Review id={id} /></LoginRequired>; }
function Review({ id }: { id: string }) {
  const booking = useResource<Booking>(`/bookings/${id}`);
  const reviews = useResource<Page<{ id: string; bookingId: string; rating: number; comment: string | null; status: string }>>('/reviews/me?limit=100');
  const existing = reviews.data?.items.find(item => item.bookingId === id);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy || booking.data?.status !== 'COMPLETED') return;
    setBusy(true); setError('');
    try { await api.request('/reviews', { method: 'POST', body: { bookingId: id, rating: Number(rating), ...(comment.trim() ? { comment: comment.trim() } : {}) } }); setNotice('Đã gửi đánh giá. Đánh giá sẽ hiển thị sau khi được duyệt.'); reviews.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không gửi được đánh giá.'); }
    finally { setBusy(false); }
  }
  return <Screen><Heading title="Chia sẻ trải nghiệm của bạn" subtitle={booking.data?.tourName} /><LoadState loading={booking.loading || reviews.loading} error={booking.error || reviews.error} retry={() => { booking.refresh(); reviews.refresh(); }} /><Message text={error} error /><Message text={notice} />{booking.data?.status !== 'COMPLETED' ? <Message text="Bạn có thể đánh giá sau khi chuyến đi hoàn thành." /> : existing ? <Card><Title>Đánh giá đã gửi · {existing.rating} sao</Title><Copy>{existing.comment || 'Không có nhận xét bổ sung.'}</Copy><Copy muted>{{ PENDING: 'Đang chờ duyệt', VISIBLE: 'Đã công khai', HIDDEN: 'Đã ẩn' }[existing.status] ?? existing.status}</Copy></Card> : !reviews.loading && !reviews.error && <Card><Title>Bạn hài lòng thế nào?</Title><Chips items={[1, 2, 3, 4, 5].map(value => ({ label: `${value} ★`, value: String(value) }))} value={rating} onChange={setRating} /><Field label="Nhận xét chuyến đi (tùy chọn)" value={comment} onChangeText={setComment} multiline maxLength={2000} editable={!busy} /><Button title="Gửi đánh giá" busy={busy} onPress={() => { void submit(); }} /></Card>}<Button title="Về đơn đặt tour" outline onPress={() => router.replace({ pathname: '/bookings/[id]', params: { id } })} /></Screen>;
}
