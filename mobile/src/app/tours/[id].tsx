import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, Card, Title, Copy, Button, LoadState, Row, Message, Badge, layout } from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { useSession } from '../../context/session';
import { api } from '../../lib/api';
import { date, money } from '../../lib/format';
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
  async function toggleFavorite() {
    if (!user) { router.push({ pathname: '/login', params: { next: `/tours/${id}` } }); return; }
    setBusy(true); setError('');
    try { await api.request(`/tours/${id}/favorite`, { method: favorite.data?.favorited ? 'DELETE' : 'POST' }); favorite.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không cập nhật được yêu thích.'); }
    finally { setBusy(false); }
  }
  const item = tour.data;
  return <Screen refresh={() => { tour.refresh(); schedules.refresh(); }} refreshing={tour.loading && !!item}>
    <LoadState loading={tour.loading && !item} error={tour.error} retry={tour.refresh} />
    {item && <><Heading title={item.name} subtitle={item.summary ?? undefined} eyebrow={`${item.durationDays} NGÀY ${item.durationNights} ĐÊM · ${item.departureCity ?? 'KHÁM PHÁ VIỆT NAM'}`} /><TourGallery tour={item} />
      <Card><Copy muted>CHỌN NGÀY, BẮT ĐẦU HÀNH TRÌNH</Copy><Row label="Giá từ / khách" value={money(item.fromPrice)} strong /><Copy muted>Giá chính xác được tính theo ngày sinh hành khách và lịch khởi hành.</Copy></Card>
      <Card><View style={layout.spread}><Badge>★ {item.avgRating ? item.avgRating.toFixed(1) : 'Chưa có đánh giá'}</Badge><Copy muted>{item.reviewCount} đánh giá</Copy></View>{item.destinations.length > 0 && <Copy>{item.destinations.map(place => place.name).join(' · ')}</Copy>}<Copy>{item.description || 'Xem lịch trình và lịch khởi hành bên dưới để chuẩn bị chuyến đi.'}</Copy><Button title={favorite.data?.favorited ? 'Đã lưu yêu thích ♥' : 'Lưu tour yêu thích ♡'} outline busy={busy} onPress={() => { void toggleFavorite(); }} /><Message text={error || favorite.error} error /></Card>
      <Title>Chọn lịch khởi hành</Title><LoadState loading={schedules.loading && !schedules.data} error={schedules.error} retry={schedules.refresh} empty={!schedules.loading && !schedules.error && !schedules.data?.length ? 'Tour chưa có lịch mở bán. Vui lòng quay lại sau.' : undefined} />
      {schedules.data?.map(schedule => <Card key={schedule.id}><Title>{date(schedule.startDate)} → {date(schedule.endDate)}</Title><Row label="Chỗ còn lại" value={schedule.availableSeats} /><Row label="Người lớn" value={money(schedule.priceAdult)} /><Row label="Trẻ em" value={money(schedule.priceChild)} /><Row label="Em bé" value={money(schedule.priceInfant)} /><Copy muted>{schedule.meetingPoint || 'Điểm đón được cập nhật trong thông tin chuyến đi.'}</Copy><Button title="Đặt lịch này" disabled={schedule.availableSeats < 1} onPress={() => router.push({ pathname: '/booking/[id]', params: { id, scheduleId: schedule.id } })} /></Card>)}
      {!!item.itinerary.length && <Card><Title>Lịch trình</Title>{[...item.itinerary].sort((left, right) => left.dayNo - right.dayNo).map(day => <View key={day.id} style={layout.gap}><Title>Ngày {day.dayNo} · {day.title}</Title><Copy>{day.content || 'Đang cập nhật'}</Copy>{!!day.meals && <Copy muted>Bữa ăn: {day.meals}</Copy>}</View>)}</Card>}
      <TourReviews id={id} />
      {item.cancelPolicy && <Card><Title>{item.cancelPolicy.name}</Title><Copy>{item.cancelPolicy.description}</Copy>{item.cancelPolicy.rules.map(rule => <Copy key={rule.daysBefore}>Trước ngày đi {rule.daysBefore} ngày: phí hủy {rule.feePercent}%.</Copy>)}</Card>}
    </>}
  </Screen>;
}
