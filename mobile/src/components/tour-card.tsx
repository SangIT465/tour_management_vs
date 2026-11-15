import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Tour } from '../lib/types';
import { api } from '../lib/api';
import { heroImage } from '../lib/destinations';
import { money } from '../lib/format';
import { AppText as Text } from './ui';
import { fonts, palette, tracking } from '../theme';

export default function TourCard({ tour, compact = false }: { tour: Tour; compact?: boolean }) {
  const [failedUri, setFailedUri] = useState<string>();
  const uri = api.assetUrl(tour.coverImageUrl);
  const rating = Number(tour.avgRating);
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Xem tour ${tour.name}`}
    onPress={() => router.push({ pathname: '/tours/[id]', params: { id: tour.id } })}
    style={({ pressed }) => [s.card, pressed && s.pressed]}
  >
    <View>
      <Image source={uri && failedUri !== uri ? { uri } : heroImage} accessibilityLabel={tour.name} style={[s.image, compact && s.compactImage]} resizeMode="cover" onError={() => setFailedUri(uri)} />
      <View style={s.category}><Text style={s.categoryText} numberOfLines={1}>{tour.categories?.[0]?.name || 'Khám phá'}</Text></View>
      {!compact && <View style={s.duration}><Text style={s.durationText}>{tour.durationDays}N · {tour.durationNights}Đ</Text></View>}
    </View>
    <View style={[s.info, compact && s.compactInfo]}>
      <View style={s.top}>
        <View style={s.location}><Ionicons name="location-outline" size={compact ? 11 : 13} color={palette.muted} /><Text style={[s.meta, compact && s.tiny]} numberOfLines={1}>{tour.departureCity || 'Theo lịch trình'}</Text></View>
        <Text style={[s.rating, compact && s.tiny]}>{rating > 0 ? `★ ${rating.toFixed(1)}` : 'Mới mở bán'}</Text>
      </View>
      <Text style={[s.title, compact && s.compactTitle]} numberOfLines={2}>{tour.name}</Text>
      {!compact && <Text style={s.summary} numberOfLines={2}>{tour.summary || 'Khám phá những điểm đến và trải nghiệm đáng nhớ trong hành trình của bạn.'}</Text>}
      <View style={[s.metadata, compact && s.compactMetadata]}>
        <Text style={[s.meta, compact && s.tiny]}>{tour.durationDays} ngày {tour.durationNights} đêm</Text>
        <Text style={[s.meta, compact && s.tiny]}>{tour.reviewCount || 0} đánh giá</Text>
      </View>
      <View style={s.priceRow}>
        <View style={s.priceCopy}>
          <Text style={[s.from, compact && s.tiny]}>Giá từ / khách</Text>
          <Text style={[s.price, compact && s.compactPrice]}>{money(tour.fromPrice)}</Text>
        </View>
        <View style={s.arrow}>
          {!compact && <Text style={s.link}>Chi tiết</Text>}
          <Ionicons name="arrow-forward" size={compact ? 14 : 16} color={palette.ink} />
        </View>
      </View>
    </View>
  </Pressable>;
}

const s = StyleSheet.create({
  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, overflow: 'hidden' },
  pressed: { borderColor: palette.accent },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: palette.sand },
  compactImage: { aspectRatio: 1 },
  category: { position: 'absolute', bottom: 0, left: 0, backgroundColor: palette.cream, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '82%' },
  categoryText: { color: palette.ink, fontSize: 9, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },
  duration: { position: 'absolute', top: 0, right: 0, backgroundColor: palette.ink, paddingHorizontal: 9, paddingVertical: 6 },
  durationText: { fontSize: 10, color: palette.cream, letterSpacing: 1 },
  info: { padding: 18, gap: 10 },
  compactInfo: { padding: 12, gap: 7 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  location: { flexDirection: 'row', gap: 4, alignItems: 'center', flex: 1, overflow: 'hidden' },
  meta: { color: palette.muted, fontSize: 11, letterSpacing: 0.6, flexShrink: 1 },
  tiny: { fontSize: 9, letterSpacing: 0.4 },
  rating: { color: palette.accentDark, fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
  title: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 28, color: palette.ink },
  compactTitle: { fontSize: 15, lineHeight: 20, minHeight: 40 },
  summary: { fontSize: 13, lineHeight: 21, color: palette.muted },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  compactMetadata: { flexDirection: 'column', alignItems: 'flex-start', gap: 3 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.line },
  priceCopy: { flex: 1 },
  from: { color: palette.muted, fontSize: 9, letterSpacing: tracking.label, textTransform: 'uppercase' },
  price: { fontFamily: fonts.serif, fontSize: 25, color: palette.ink, marginTop: 2 },
  compactPrice: { fontSize: 16 },
  arrow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 4 },
  link: { color: palette.ink, fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },
});
