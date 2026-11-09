import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Tour } from '../lib/types';
import { api } from '../lib/api';
import { heroImage } from '../lib/destinations';
import { money } from '../lib/format';
import { colors, AppText as Text } from './ui';

export default function TourCard({ tour, compact = false }: { tour: Tour; compact?: boolean }) {
  const [failedUri, setFailedUri] = useState<string>();
  const uri = api.assetUrl(tour.coverImageUrl);
  const rating = Number(tour.avgRating);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem tour ${tour.name}`} onPress={() => router.push({ pathname: '/tours/[id]', params: { id: tour.id } })} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
    <View>
      <Image source={uri && failedUri !== uri ? { uri } : heroImage} accessibilityLabel={tour.name} style={[s.image, compact && s.compactImage]} resizeMode="cover" onError={() => setFailedUri(uri)} />
      <View style={s.category}><Text style={s.categoryText} numberOfLines={1}>{tour.categories?.[0]?.name || 'Khám phá'}</Text></View>
      {!compact && <View style={s.duration}><Ionicons name="time-outline" size={13} color="#fff" /><Text style={s.durationText}>{tour.durationDays}N{tour.durationNights}Đ</Text></View>}
    </View>
    <View style={[s.info, compact && s.compactInfo]}>
      <View style={s.top}><View style={s.location}><Ionicons name="location-outline" size={compact ? 11 : 14} color={colors.muted} /><Text style={[s.meta, compact && s.tiny]} numberOfLines={1}>{tour.departureCity || 'Theo lịch trình'}</Text></View><Text style={[s.rating, compact && s.tiny]}>★ {rating > 0 ? rating.toFixed(1) : 'Mới'}</Text></View>
      <Text style={[s.title, compact && s.compactTitle]} numberOfLines={2}>{tour.name}</Text>
      {!compact && <Text style={s.summary} numberOfLines={2}>{tour.summary || 'Khám phá những điểm đến và trải nghiệm đáng nhớ trong hành trình của bạn.'}</Text>}
      <View style={[s.metadata, compact && s.compactMetadata]}><View style={s.calendar}><Ionicons name="calendar-outline" size={compact ? 12 : 14} color={colors.muted} /><Text style={[s.meta, compact && s.tiny]}>{tour.durationDays} ngày {tour.durationNights} đêm</Text></View><Text style={[s.meta, compact && s.tiny]}>{tour.reviewCount || 0} đánh giá</Text></View>
      <View style={s.priceRow}><View style={s.priceCopy}><Text style={[s.from, compact && s.tiny]}>Giá từ / khách</Text><Text style={[s.price, compact && s.compactPrice]}>{money(tour.fromPrice)}</Text></View><View style={[s.arrow, compact && s.compactArrow]}>{!compact && <Text style={s.link}>Chi tiết</Text>}<Ionicons name="arrow-forward" size={compact ? 15 : 17} color={colors.primary} /></View></View>
    </View>
  </Pressable>;
}

const s = StyleSheet.create({
  card: { borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, image: { width: '100%', height: 210, backgroundColor: colors.light }, compactImage: { height: 112 },
  category: { position: 'absolute', bottom: 9, left: 9, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, maxWidth: '82%' }, categoryText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  duration: { position: 'absolute', top: 10, right: 10, backgroundColor: '#102b50b3', borderRadius: 20, flexDirection: 'row', gap: 4, padding: 7 }, durationText: { fontSize: 11, color: '#fff' },
  info: { padding: 16, gap: 10 }, compactInfo: { padding: 10, gap: 7 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 }, location: { flexDirection: 'row', gap: 3, alignItems: 'center', flex: 1, overflow: 'hidden' }, meta: { color: colors.muted, fontSize: 12, flexShrink: 1 }, tiny: { fontSize: 10 },
  rating: { color: '#c17c00', fontSize: 12, fontWeight: '600' }, title: { fontSize: 18, fontWeight: '700', lineHeight: 25, color: colors.ink }, compactTitle: { fontSize: 12, lineHeight: 18, minHeight: 36 }, summary: { fontSize: 13, lineHeight: 20, color: colors.muted },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }, compactMetadata: { flexDirection: 'column', alignItems: 'flex-start', gap: 5 }, calendar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4, paddingTop: 10, borderTopWidth: 1, borderColor: '#f0f4f9' }, priceCopy: { flex: 1 }, from: { color: colors.muted, fontSize: 11 }, price: { fontSize: 22, fontWeight: '800', color: colors.price, marginTop: 3, letterSpacing: -0.5 }, compactPrice: { fontSize: 15 }, arrow: { backgroundColor: colors.light, borderRadius: 7, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 5 }, compactArrow: { borderRadius: 20, padding: 5 }, link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
});
