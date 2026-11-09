import React, { useState } from 'react';
import { router } from 'expo-router';
import { Screen, Heading, Card, Title, Copy, Button, Message, LoadState, LoginRequired, Badge } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { api } from '../../lib/api';
import { dateTime } from '../../lib/format';
import type { Notice, Page } from '../../lib/types';

export default function Notifications() { return <LoginRequired next="/notifications"><NotificationList /></LoginRequired>; }
function NotificationList() {
  const [page, setPage] = useState(1);
  const resource = useResource<Page<Notice>>(`/notifications?page=${page}&limit=15`);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function read(item?: Notice) {
    if (busy) return;
    setBusy(true); setError('');
    try { await api.request(item ? `/notifications/${item.id}/read` : '/notifications/read-all', { method: 'PATCH' }); resource.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không cập nhật được thông báo.'); }
    finally { setBusy(false); }
  }
  return <Screen refresh={resource.refresh} refreshing={resource.loading && !!resource.data}><Heading title="Thông tin hành trình" subtitle="Theo dõi cập nhật đơn đặt tour và thông báo từ TourGo." /><Button title="Đánh dấu tất cả đã đọc" outline busy={busy} onPress={() => { void read(); }} /><Message text={error} error /><LoadState loading={resource.loading && !resource.data} error={resource.error} retry={resource.refresh} empty={!resource.loading && !resource.error && !resource.data?.items.length ? 'Chưa có thông báo mới.' : undefined} />{resource.data?.items.map(item => <Card key={item.id}>{!item.readAt && <Badge>Chưa đọc</Badge>}<Title>{item.title}</Title><Copy>{item.body}</Copy><Copy muted>{dateTime(item.createdAt)}</Copy>{!!item.payload?.bookingId && <Button title="Xem đơn đặt tour" outline onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: item.payload!.bookingId! } })} />}{!item.readAt && <Button title="Đã đọc" small outline disabled={busy} onPress={() => { void read(item); }} />}</Card>)}{page > 1 && <Button title="Trang trước" outline onPress={() => setPage(value => value - 1)} />}{resource.data && page * 15 < resource.data.total && <Button title="Trang sau" outline onPress={() => setPage(value => value + 1)} />}</Screen>;
}
