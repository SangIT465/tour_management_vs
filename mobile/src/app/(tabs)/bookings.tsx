import React, { useState } from 'react';
import { router } from 'expo-router';
import { Screen, Heading, Card, Title, Copy, Row, Button, LoadState, LoginRequired, Badge, Chips } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { date, money, statusNames } from '../../lib/format';
import type { Booking, Page } from '../../lib/types';

export default function Bookings() { return <LoginRequired next="/bookings"><BookingList /></LoginRequired>; }
function BookingList() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const resource = useResource<Page<Booking>>(`/bookings/me?page=${page}&limit=10${status ? `&status=${status}` : ''}`);
  return <Screen refresh={resource.refresh} refreshing={resource.loading && !!resource.data}><Heading title="Những chuyến đi của bạn" subtitle="Đơn đặt trên web và điện thoại đều hiển thị tại đây." /><Chips value={status} onChange={value => { setStatus(value); setPage(1); }} items={[{ label: 'Tất cả', value: '' }, { label: 'Chờ thanh toán', value: 'PENDING_PAYMENT' }, { label: 'Đã xác nhận', value: 'CONFIRMED' }, { label: 'Hoàn thành', value: 'COMPLETED' }]} /><LoadState loading={resource.loading && !resource.data} error={resource.error} retry={resource.refresh} empty={!resource.loading && !resource.error && !resource.data?.items.length ? 'Chưa có đơn đặt tour trong mục này.' : undefined} />
    {resource.data?.items.map(item => <Card key={item.id}><Badge>{statusNames[item.status] ?? item.status}</Badge><Title>{item.tourName}</Title><Copy muted>{item.code} · {date(item.startDate)} – {date(item.endDate)}</Copy><Row label="Số hành khách" value={item.passengerCount} /><Row label="Tổng thanh toán" value={money(item.total)} strong /><Button title="Xem đơn đặt tour" outline onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: item.id } })} />{item.status === 'PENDING_PAYMENT' && <Button title="Tiếp tục thanh toán" onPress={() => router.push({ pathname: '/payment/[id]', params: { id: item.id } })} />}</Card>)}
    {page > 1 && <Button title="Trang trước" outline disabled={resource.loading} onPress={() => setPage(value => value - 1)} />}{resource.data && page * 10 < resource.data.total && <Button title="Trang sau" outline disabled={resource.loading} onPress={() => setPage(value => value + 1)} />}
  </Screen>;
}
