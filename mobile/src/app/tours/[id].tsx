import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, AppText as Text, Button, LoadState, Message, Sheet, SectionLabel, FooterTotal } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { useSession } from '../../context/session';
import { api } from '../../lib/api';
import { date, money } from '../../lib/format';
import { fonts, palette, tracking } from '../../theme';
import type { Schedule, TourDetail } from '../../lib/types';
import TourGallery from '../../components/tour-gallery';
import TourReviews from '../../components/tour-reviews';

export default function TourScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const tour = useResource<TourDetail>(`/tours/${id}`);
  const schedules = useResource<Schedule[]>(`/schedules/tour/${id}`);
  const favorite = useResource<{ favorited: boolean }>(user ? `/tours/${id}/favorite` : null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  async function toggleFavorite() {
    if (!user) { router.push({ pathname: '/login', params: { next: `/tours/${id}` } }); return; }
    setBusy(true); setError('');
    try { await api.request(`/tours/${id}/favorite`, { method: favorite.data?.favorited ? 'DELETE' : 'POST' }); favorite.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không cập nhật được yêu thích.'); }
    finally { setBusy(false); }
  }
  const item = tour.data;
  const open = schedules.data?.filter(schedule => schedule.availableSeats > 0) ?? [];
  const cheapest = open.length ? Math.min(...open.map(schedule => schedule.priceAdult)) : null;
  const selected = open.find(schedule => schedule.id === picked) ?? open[0];
  const book = (scheduleId: string) => router.push({ pathname: '/booking/[id]', params: { id, scheduleId } });

  return <Screen
    padded={false}
    refresh={() => { tour.refresh(); schedules.refresh(); }}
    refreshing={tour.loading && !!item}
    footer={item ? <View style={s.footerRow}>
      <FooterTotal label={selected ? 'Khởi hành đã chọn' : 'Giá từ / khách'} value={money(selected?.priceAdult ?? cheapest ?? item.fromPrice)} caption={selected ? `${date(selected.startDate)} — ${date(selected.endDate)}` : `${open.length} lịch đang mở bán`} />
      <Button title={selected ? 'Đặt tour' : 'Chọn lịch'} onPress={() => { if (selected) book(selected.id); else setSheetOpen(true); }} />
    </View> : undefined}
  >
    <LoadState loading={tour.loading && !item} error={tour.error} retry={tour.refresh} />
    {item && <>
      <TourGallery tour={item} />

      <View style={s.body}>
        <View style={s.titleBlock}>
          <Text style={s.eyebrow}>{item.durationDays} NGÀY {item.durationNights} ĐÊM · {item.departureCity ?? 'KHÁM PHÁ VIỆT NAM'}</Text>
          <Text accessibilityRole="header" style={s.title}>{item.name}</Text>
          <View style={s.metaRow}>
            <View style={s.metaItem}><Ionicons name="star" size={13} color={palette.accent} /><Text style={s.metaText}>{item.avgRating ? item.avgRating.toFixed(1) : 'Mới'}</Text></View>
            <View style={s.metaDot} />
            <Text style={s.metaText}>{item.reviewCount} đánh giá</Text>
            {!!item.destinations.length && <><View style={s.metaDot} /><Text style={s.metaText} numberOfLines={1}>{item.destinations.map(place => place.name).join(' · ')}</Text></>}
          </View>
        </View>

        <View style={s.quickActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={favorite.data?.favorited ? 'Bỏ lưu tour' : 'Lưu tour yêu thích'} disabled={busy} onPress={() => { void toggleFavorite(); }} style={({ pressed }) => [s.quickAction, pressed && s.quickActionPressed]}>
            <Ionicons name={favorite.data?.favorited ? 'heart' : 'heart-outline'} size={19} color={favorite.data?.favorited ? palette.accent : palette.ink} />
            <Text style={s.quickActionText}>{favorite.data?.favorited ? 'Đã lưu' : 'Lưu tour'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Chọn lịch khởi hành" onPress={() => setSheetOpen(true)} style={({ pressed }) => [s.quickAction, pressed && s.quickActionPressed]}>
            <Ionicons name="calendar-outline" size={19} color={palette.ink} />
            <Text style={s.quickActionText}>Lịch khởi hành</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Liên hệ hỗ trợ" onPress={() => router.push('/support')} style={({ pressed }) => [s.quickAction, pressed && s.quickActionPressed]}>
            <Ionicons name="chatbubble-ellipses-outline" size={19} color={palette.ink} />
            <Text style={s.quickActionText}>Hỗ trợ</Text>
          </Pressable>
        </View>
        <Message text={error || favorite.error} error />

        <View style={s.section}>
          <SectionLabel>Giới thiệu hành trình</SectionLabel>
          <Text style={s.prose}>{item.description || 'Xem lịch trình và lịch khởi hành bên dưới để chuẩn bị chuyến đi.'}</Text>
        </View>

        <View style={s.section}>
          <SectionLabel action={<Pressable accessibilityRole="button" onPress={() => setSheetOpen(true)} style={s.textAction}><Text style={s.link}>Xem tất cả</Text></Pressable>}>Lịch khởi hành</SectionLabel>
          <LoadState loading={schedules.loading && !schedules.data} error={schedules.error} retry={schedules.refresh} empty={!schedules.loading && !schedules.error && !open.length ? 'Tour chưa có lịch mở bán. Vui lòng quay lại sau.' : undefined} />
          {open.slice(0, 3).map(schedule => {
            const active = selected?.id === schedule.id;
            return <Pressable key={schedule.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setPicked(schedule.id)} style={({ pressed }) => [s.scheduleCard, active && s.scheduleCardActive, pressed && !active && s.scheduleCardPressed]}>
              <View style={s.scheduleTop}>
                <View style={s.flex}>
                  <Text style={s.scheduleDate}>{date(schedule.startDate)}</Text>
                  <Text style={s.scheduleMeta}>Về {date(schedule.endDate)} · còn {schedule.availableSeats} chỗ</Text>
                </View>
                <View style={[s.radio, active && s.radioActive]}>{active && <View style={s.radioDot} />}</View>
              </View>
              <View style={s.priceLine}>
                <Text style={s.priceFrom}>{money(schedule.priceAdult)}</Text>
                <Text style={s.priceUnit}>/ người lớn</Text>
              </View>
            </Pressable>;
          })}
          {open.length > 3 && <Button title={`Xem thêm ${open.length - 3} lịch khác`} outline small onPress={() => setSheetOpen(true)} />}
        </View>

        {!!item.itinerary.length && <View style={s.section}>
          <SectionLabel>Lịch trình từng ngày</SectionLabel>
          {[...item.itinerary].sort((left, right) => left.dayNo - right.dayNo).map((day, index, all) => <View key={day.id} style={s.timelineRow}>
            <View style={s.timelineRail}>
              <View style={s.timelineDot}><Text style={s.timelineDotText}>{day.dayNo}</Text></View>
              {index < all.length - 1 && <View style={s.timelineLine} />}
            </View>
            <View style={s.timelineBody}>
              <Text style={s.dayTitle}>{day.title}</Text>
              <Text style={s.prose}>{day.content || 'Đang cập nhật'}</Text>
              {!!day.meals && <View style={s.mealChip}><Ionicons name="restaurant-outline" size={12} color={palette.accentDark} /><Text style={s.mealText}>{day.meals}</Text></View>}
            </View>
          </View>)}
        </View>}

        <TourReviews id={id} />

        {item.cancelPolicy && <View style={s.section}>
          <SectionLabel>Chính sách hủy</SectionLabel>
          <Text style={s.dayTitle}>{item.cancelPolicy.name}</Text>
          {!!item.cancelPolicy.description && <Text style={s.prose}>{item.cancelPolicy.description}</Text>}
          <View style={s.policyTable}>
            {item.cancelPolicy.rules.map(rule => <View key={rule.daysBefore} style={s.policyRow}>
              <Text style={s.policyLabel}>Trước {rule.daysBefore} ngày</Text>
              <Text style={s.policyValue}>Phí {rule.feePercent}%</Text>
            </View>)}
          </View>
        </View>}
      </View>
    </>}

    <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Chọn lịch khởi hành" footer={selected ? <Button title={`Đặt tour · ${date(selected.startDate)}`} onPress={() => { setSheetOpen(false); book(selected.id); }} /> : undefined}>
      {!open.length && <Text style={s.prose}>Chưa có lịch mở bán cho tour này.</Text>}
      {open.map(schedule => {
        const active = selected?.id === schedule.id;
        return <Pressable key={schedule.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setPicked(schedule.id)} style={({ pressed }) => [s.sheetRow, active && s.sheetRowActive, pressed && !active && s.scheduleCardPressed]}>
          <View style={s.flex}>
            <Text style={s.sheetDate}>{date(schedule.startDate)} — {date(schedule.endDate)}</Text>
            <Text style={s.scheduleMeta}>Còn {schedule.availableSeats} chỗ · {schedule.meetingPoint || 'Điểm đón cập nhật sau'}</Text>
            <View style={s.sheetPrices}>
              <Text style={s.sheetPrice}>NL {money(schedule.priceAdult)}</Text>
              <Text style={s.sheetPrice}>TE {money(schedule.priceChild)}</Text>
              <Text style={s.sheetPrice}>EB {money(schedule.priceInfant)}</Text>
            </View>
          </View>
          <View style={[s.radio, active && s.radioActive]}>{active && <View style={s.radioDot} />}</View>
        </Pressable>;
      })}
    </Sheet>
  </Screen>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 20, gap: 24, paddingBottom: 8 },
  titleBlock: { gap: 8 },
  eyebrow: { fontSize: 9, letterSpacing: tracking.eyebrow, color: palette.accent, textTransform: 'uppercase', fontWeight: '600' },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: palette.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: palette.muted, flexShrink: 1 },
  metaDot: { width: 3, height: 3, backgroundColor: palette.lineStrong, borderRadius: 2 },

  quickActions: { flexDirection: 'row', gap: 8 },
  quickAction: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, minHeight: 66 },
  quickActionPressed: { backgroundColor: palette.sand },
  quickActionText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: palette.ink },

  section: { gap: 12, paddingTop: 20, borderTopWidth: 1, borderTopColor: palette.line },
  prose: { fontSize: 14, lineHeight: 24, color: palette.muted },
  textAction: { minHeight: 32, justifyContent: 'center' },
  link: { fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.accentDark },

  scheduleCard: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, padding: 16, gap: 10 },
  scheduleCardActive: { borderColor: palette.ink, borderLeftWidth: 3, borderLeftColor: palette.accent },
  scheduleCardPressed: { backgroundColor: palette.sand },
  scheduleTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scheduleDate: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 27, color: palette.ink },
  scheduleMeta: { fontSize: 12, lineHeight: 18, color: palette.muted, marginTop: 2 },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.line },
  priceFrom: { fontFamily: fonts.serif, fontSize: 20, color: palette.ink },
  priceUnit: { fontSize: 11, color: palette.muted },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: palette.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: palette.ink },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.ink },

  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineRail: { alignItems: 'center', width: 30 },
  timelineDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  timelineDotText: { fontFamily: fonts.serif, fontSize: 14, color: palette.gold },
  timelineLine: { flex: 1, width: 1, backgroundColor: palette.line, marginVertical: 4 },
  timelineBody: { flex: 1, gap: 6, paddingBottom: 18 },
  dayTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: palette.ink },
  mealChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: palette.sand, paddingHorizontal: 10, paddingVertical: 6 },
  mealText: { fontSize: 11, color: palette.accentDark },

  policyTable: { borderTopWidth: 1, borderTopColor: palette.line },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.line },
  policyLabel: { fontSize: 13, color: palette.muted },
  policyValue: { fontSize: 13, color: palette.ink, fontWeight: '600' },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, padding: 14 },
  sheetRowActive: { borderColor: palette.ink, borderLeftWidth: 3, borderLeftColor: palette.accent },
  sheetDate: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, color: palette.ink },
  sheetPrices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  sheetPrice: { fontSize: 11, color: palette.muted },
});
