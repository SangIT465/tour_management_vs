import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Heading, Button, LoadState, LoginRequired, Chips, AppText as Text } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { fonts, palette, tracking } from '../../theme';
import { date, money, statusNames } from '../../lib/format';
import type { Booking, Page } from '../../lib/types';

const tone: Record<string, { bg: string; ink: string }> = {
  PENDING_PAYMENT: { bg: palette.warnBg, ink: palette.warnInk },
  PENDING_CONFIRMATION: { bg: palette.warnBg, ink: palette.warnInk },
  CONFIRMED: { bg: palette.successBg, ink: palette.successInk },
  COMPLETED: { bg: palette.sand, ink: palette.inkSoft },
  CANCELLED: { bg: palette.errorBg, ink: palette.errorInk },
  REJECTED: { bg: palette.errorBg, ink: palette.errorInk },
  EXPIRED: { bg: palette.errorBg, ink: palette.errorInk },
};

export default function Bookings() { return <LoginRequired next="/bookings"><BookingList /></LoginRequired>; }
function BookingList() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const resource = useResource<Page<Booking>>(`/bookings/me?page=${page}&limit=10${status ? `&status=${status}` : ''}`);
  return <Screen refresh={resource.refresh} refreshing={resource.loading && !!resource.data}>
    <Heading eyebrow="HÀNH TRÌNH ĐÃ ĐẶT" title="Những chuyến đi của bạn" subtitle="Đơn đặt trên web và điện thoại đều hiển thị tại đây." />
    <Chips value={status} onChange={value => { setStatus(value); setPage(1); }} items={[{ label: 'Tất cả', value: '' }, { label: 'Chờ thanh toán', value: 'PENDING_PAYMENT' }, { label: 'Đã xác nhận', value: 'CONFIRMED' }, { label: 'Hoàn thành', value: 'COMPLETED' }]} />
    <LoadState loading={resource.loading && !resource.data} error={resource.error} retry={resource.refresh} empty={!resource.loading && !resource.error && !resource.data?.items.length ? 'Chưa có đơn đặt tour trong mục này.' : undefined} />
    {resource.data?.items.map(item => {
      const color = tone[item.status] ?? { bg: palette.sand, ink: palette.muted };
      return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Xem đơn ${item.code}`} onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: item.id } })} style={({ pressed }) => [s.card, pressed && s.cardPressed]}>
        <View style={s.head}>
          <Text style={s.code}>{item.code}</Text>
          <View style={[s.pill, { backgroundColor: color.bg }]}><Text style={[s.pillText, { color: color.ink }]}>{statusNames[item.status] ?? item.status}</Text></View>
        </View>
        <Text style={s.tourName} numberOfLines={2}>{item.tourName}</Text>
        <View style={s.dateRow}>
          <Ionicons name="calendar-outline" size={13} color={palette.muted} />
          <Text style={s.dates}>{date(item.startDate)} — {date(item.endDate)}</Text>
        </View>
        <View style={s.foot}>
          <View style={s.footItem}><Ionicons name="people-outline" size={13} color={palette.muted} /><Text style={s.footText}>{item.passengerCount} khách</Text></View>
          <Text style={s.total}>{money(item.total)}</Text>
        </View>
        {item.status === 'PENDING_PAYMENT' && <Button title="Tiếp tục thanh toán" small onPress={() => router.push({ pathname: '/payment/[id]', params: { id: item.id } })} />}
      </Pressable>;
    })}
    {page > 1 && <Button title="Trang trước" outline disabled={resource.loading} onPress={() => setPage(value => value - 1)} />}{resource.data && page * 10 < resource.data.total && <Button title="Trang sau" outline disabled={resource.loading} onPress={() => setPage(value => value + 1)} />}
  </Screen>;
}

const s = StyleSheet.create({
  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, padding: 16, gap: 10 },
  cardPressed: { borderColor: palette.accent },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  code: { fontFamily: fonts.sans, fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.accentDark },
  pill: { paddingHorizontal: 9, paddingVertical: 5 },
  pillText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  tourName: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: palette.ink },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dates: { fontFamily: fonts.sans, fontSize: 12, color: palette.muted },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.line },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footText: { fontSize: 12, color: palette.muted },
  total: { fontFamily: fonts.serif, fontSize: 20, color: palette.ink },
});
