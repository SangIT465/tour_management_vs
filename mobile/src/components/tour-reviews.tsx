import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useResource } from '../hooks/use-resource';
import type { Page } from '../lib/types';
import { AppText as Text, LoadState, Button, layout } from './ui';
import { fonts, palette, tracking } from '../theme';

interface Review { id: string; customerName?: string; userName?: string; rating: number; comment: string | null }

export default function TourReviews({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const reviews = useResource<Page<Review>>(`/reviews/tour/${id}?page=${page}&limit=5`);
  return <View style={s.wrap}>
    <Text style={s.kicker}>ĐÁNH GIÁ TỪ KHÁCH ĐÃ ĐI</Text>
    <Text accessibilityRole="header" style={s.title}>Họ đã kể lại chuyến đi</Text>
    <LoadState loading={reviews.loading && !reviews.data} error={reviews.error} retry={reviews.refresh} empty={!reviews.loading && !reviews.error && !reviews.data?.items.length ? 'Chưa có đánh giá được duyệt.' : undefined} />
    {reviews.data?.items.map(review => <View key={review.id} style={s.review}>
      <Text style={s.quote}>“</Text>
      <Text style={s.comment}>{review.comment || 'Khách hàng đã chấm điểm nhưng chưa để lại nhận xét.'}</Text>
      <Text style={s.author}>{review.customerName || review.userName || 'Khách hàng'} · {review.rating}/5 ★</Text>
    </View>)}
    <View style={layout.horizontal}>{page > 1 && <Button title="Trang trước" small outline disabled={reviews.loading} onPress={() => setPage(value => value - 1)} />}{reviews.data && page * 5 < reviews.data.total && <Button title="Trang sau" small outline disabled={reviews.loading} onPress={() => setPage(value => value + 1)} />}</View>
  </View>;
}

const s = StyleSheet.create({
  wrap: { gap: 14, paddingTop: 22, borderTopWidth: 1, borderTopColor: palette.line },
  kicker: { fontSize: 9, letterSpacing: tracking.eyebrow, color: palette.accent, textTransform: 'uppercase' },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 33, color: palette.ink },
  review: { gap: 8, paddingVertical: 18, borderTopWidth: 1, borderTopColor: palette.line },
  quote: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 30, color: palette.lineStrong },
  comment: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 29, color: palette.inkSoft, fontStyle: 'italic' },
  author: { fontSize: 11, color: palette.muted, letterSpacing: tracking.label, textTransform: 'uppercase' },
});
