import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useResource } from '../hooks/use-resource';
import type { Page } from '../lib/types';
import { Card, Title, Copy, LoadState, Button, colors, layout } from './ui';

interface Review { id: string; customerName?: string; userName?: string; rating: number; comment: string | null }

export default function TourReviews({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const reviews = useResource<Page<Review>>(`/reviews/tour/${id}?page=${page}&limit=5`);
  return <Card><Title>Đánh giá từ khách đã đi</Title><LoadState loading={reviews.loading && !reviews.data} error={reviews.error} retry={reviews.refresh} empty={!reviews.loading && !reviews.error && !reviews.data?.items.length ? 'Chưa có đánh giá được duyệt.' : undefined} />{reviews.data?.items.map(review => <View key={review.id} style={s.review}><Title>{review.customerName || review.userName || 'Khách hàng'} · {review.rating}/5 ★</Title><Copy>{review.comment}</Copy></View>)}<View style={layout.horizontal}>{page > 1 && <Button title="Trang trước" small outline disabled={reviews.loading} onPress={() => setPage(value => value - 1)} />}{reviews.data && page * 5 < reviews.data.total && <Button title="Trang sau" small outline disabled={reviews.loading} onPress={() => setPage(value => value + 1)} />}</View></Card>;
}

const s = StyleSheet.create({ review: { paddingTop: 14, borderTopWidth: 1, borderColor: colors.border, gap: 8 } });
