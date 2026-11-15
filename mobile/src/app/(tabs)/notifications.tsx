import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Heading, Button, Message, LoadState, LoginRequired, AppText as Text } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { api } from '../../lib/api';
import { fonts, palette } from '../../theme';
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
  return <Screen refresh={resource.refresh} refreshing={resource.loading && !!resource.data}>
    <Heading eyebrow="THÔNG BÁO · TOURGO" title="Thông tin hành trình" subtitle="Theo dõi cập nhật đơn đặt tour và thông báo từ TourGo." />
    <Button title="Đánh dấu tất cả đã đọc" outline busy={busy} onPress={() => { void read(); }} />
    <Message text={error} error />
    <LoadState loading={resource.loading && !resource.data} error={resource.error} retry={resource.refresh} empty={!resource.loading && !resource.error && !resource.data?.items.length ? 'Chưa có thông báo mới.' : undefined} />
    {resource.data?.items.map(item => <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => { if (!item.readAt) void read(item); if (item.payload?.bookingId) router.push({ pathname: '/bookings/[id]', params: { id: item.payload.bookingId } }); }}
      style={({ pressed }) => [s.item, !item.readAt && s.unread, pressed && s.pressed]}
    >
      <View style={[s.icon, !item.readAt && s.iconUnread]}>
        <Ionicons name={item.payload?.bookingId ? 'receipt-outline' : 'notifications-outline'} size={17} color={item.readAt ? palette.muted : palette.accentDark} />
      </View>
      <View style={s.copy}>
        <View style={s.titleRow}>
          <Text style={[s.title, !item.readAt && s.titleUnread]} numberOfLines={2}>{item.title}</Text>
          {!item.readAt && <View style={s.dot} />}
        </View>
        {!!item.body && <Text style={s.body} numberOfLines={3}>{item.body}</Text>}
        <Text style={s.time}>{dateTime(item.createdAt)}</Text>
      </View>
    </Pressable>)}
    {page > 1 && <Button title="Trang trước" outline onPress={() => setPage(value => value - 1)} />}{resource.data && page * 15 < resource.data.total && <Button title="Trang sau" outline onPress={() => setPage(value => value + 1)} />}
  </Screen>;
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white },
  unread: { borderLeftWidth: 3, borderLeftColor: palette.accent, backgroundColor: palette.cream },
  pressed: { opacity: 0.7 },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.sand, borderWidth: 1, borderColor: palette.line },
  iconUnread: { backgroundColor: palette.warnBg, borderColor: palette.warnBg },
  copy: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, color: palette.inkSoft },
  titleUnread: { color: palette.ink },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent, marginTop: 7 },
  body: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: palette.muted },
  time: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 0.5, color: palette.lineStrong, marginTop: 2 },
});
