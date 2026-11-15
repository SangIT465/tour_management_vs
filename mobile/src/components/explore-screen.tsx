import PhotoBackdrop from './photo-backdrop';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText as Text, Screen, Heading, Card, Field, Button, Chips, LoadState, Message, Title, layout } from './ui';
import TourCard from './tour-card';
import { useResource } from '../hooks/use-resource';
import { query } from '../lib/format';
import { destinations, heroImage } from '../lib/destinations';
import { filterKeys, readTourFilters, sortOptions, validateTourFilters, type TourFilters } from '../lib/tour-filters';
import { fonts, palette, tracking } from '../theme';
import type { Page, Tour } from '../lib/types';

export default function ExploreScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  return <Explorer key={JSON.stringify(params)} params={params} />;
}

function Explorer({ params }: { params: Record<string, string | string[]> }) {
  const values = readTourFilters(params);
  const [draft, setDraft] = useState<TourFilters>(values);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterError, setFilterError] = useState('');
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const sort = sortOptions.find(option => option.value === `${params.sortBy}:${params.sortOrder}`)?.value ?? 'createdAt:DESC';
  const [sortBy, sortOrder] = sort.split(':');
  const validationError = validateTourFilters(values);
  const categories = useResource<{ id: string; name: string }[]>('/catalog/categories');
  const tours = useResource<Page<Tour>>(validationError ? null : `/tours?${query({ ...values, page, limit: 9, sortBy, sortOrder })}`);
  const count = filterKeys.filter(key => !!values[key]).length;
  function update(changes: Record<string, string>) {
    router.setParams({ ...values, sortBy, sortOrder, page: '1', ...changes });
  }
  function apply() {
    const cleaned = readTourFilters(draft);
    const error = validateTourFilters(cleaned);
    setFilterError(error);
    if (!error) update(cleaned);
  }
  function reset() { update(Object.fromEntries(filterKeys.map(key => [key, '']))); }
  function field(key: keyof TourFilters, value: string) { setDraft(previous => ({ ...previous, [key]: value })); }
  return <Screen padded={false} refresh={tours.refresh} refreshing={tours.loading && !!tours.data}>
    <PhotoBackdrop source={heroImage} style={s.banner}>
      <LinearGradient colors={['#1a1510e0', '#211d18cc']} style={s.bannerInner}>
        <Heading title="Khám phá hành trình của bạn" subtitle="Tìm chuyến đi phù hợp. Mang về những trải nghiệm đáng nhớ." eyebrow="MỘT ĐIỂM ĐẾN MỚI · MỘT CÂU CHUYỆN MỚI" />
        <Text style={s.suggestion}>Gợi ý điểm đến</Text>
        <Chips items={destinations.map(place => ({ label: place.name, value: place.name }))} value={values.destination} onChange={destination => update({ destination })} />
      </LinearGradient>
    </PhotoBackdrop>
    <View style={s.content}>
      <Button title={`${filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}${count ? ` (${count})` : ''}`} outline onPress={() => setFiltersOpen(value => !value)} />
      {filtersOpen && <Card>
        <View style={layout.spread}><Title>Bộ lọc tìm kiếm</Title><Pressable accessibilityRole="button" onPress={reset} style={s.textAction}><Text style={s.link}>Đặt lại</Text></Pressable></View>
        <Field label="Từ khóa" value={draft.search} onChangeText={value => field('search', value)} placeholder="Tên tour, mã tour..." maxLength={120} returnKeyType="search" onSubmitEditing={apply} />
        <Field label="Điểm đến" value={draft.destination} onChangeText={value => field('destination', value)} placeholder="Bạn muốn khám phá đâu?" maxLength={150} />
        <Field label="Khởi hành từ" value={draft.departureCity} onChangeText={value => field('departureCity', value)} placeholder="Thành phố khởi hành" maxLength={100} />
        <Title>Ngân sách / khách</Title><View style={s.range}><View style={layout.grow}><Field label="Từ (VNĐ)" value={draft.minPrice} onChangeText={value => field('minPrice', value)} keyboardType="number-pad" placeholder="0" maxLength={15} /></View><View style={layout.grow}><Field label="Đến (VNĐ)" value={draft.maxPrice} onChangeText={value => field('maxPrice', value)} keyboardType="number-pad" placeholder="Không giới hạn" maxLength={15} /></View></View>
        <Title>Thời gian hành trình</Title><View style={s.range}><View style={layout.grow}><Field label="Tối thiểu (ngày)" value={draft.minDays} onChangeText={value => field('minDays', value)} keyboardType="number-pad" placeholder="1" maxLength={3} /></View><View style={layout.grow}><Field label="Tối đa (ngày)" value={draft.maxDays} onChangeText={value => field('maxDays', value)} keyboardType="number-pad" placeholder="365" maxLength={3} /></View></View>
        <Title>Loại hành trình</Title><Chips items={[{ label: 'Tất cả tour', value: '' }, ...(categories.data ?? []).map(item => ({ label: item.name, value: item.id }))]} value={draft.categoryId} onChange={value => field('categoryId', value)} /><LoadState loading={categories.loading && !categories.data} error={categories.error} retry={categories.refresh} />
        <Message text={filterError} error /><Button title="Áp dụng bộ lọc" onPress={apply} />
      </Card>}
      <View style={s.resultsHead}>
        <Text style={s.resultsTitle}>Những chuyến đi dành cho bạn</Text>
        <Text style={s.resultsMeta}>{tours.loading ? 'Đang tìm hành trình...' : tours.error || validationError ? 'Chưa thể tải danh sách tour' : `${tours.data?.total ?? 0} tour phù hợp với lựa chọn của bạn`}</Text>
      </View>
      <Text style={s.sortLabel}>Sắp xếp theo</Text>
      <Chips items={sortOptions} value={sort} onChange={value => { const [sortBy, sortOrder] = value.split(':'); update({ sortBy, sortOrder }); }} />
      {count > 0 && <View style={s.activeFilters}>{filterKeys.filter(key => !!values[key]).map(key => <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Bỏ lọc ${key}`} onPress={() => update({ [key]: '' })} style={s.activeFilter}><Text style={s.activeText}>{key === 'categoryId' ? categories.data?.find(item => item.id === values[key])?.name || 'Loại hành trình' : values[key]}</Text><Ionicons name="close" size={12} color={palette.accentDark} /></Pressable>)}<Pressable accessibilityRole="button" onPress={reset} style={s.textAction}><Text style={s.link}>Xóa tất cả</Text></Pressable></View>}
      <Message text={validationError} error />
      <LoadState loading={tours.loading && !tours.data} error={tours.error} retry={tours.refresh} empty={!tours.loading && !tours.error && !validationError && !tours.data?.items.length ? 'Chưa có tour phù hợp. Thử đổi từ khóa hoặc bộ lọc.' : undefined} />
      {!tours.loading && !tours.error && !!tours.data && !tours.data.items.length && count > 0 && <>{!!values.destination && <Button title="Tìm theo tên tour" outline onPress={() => update({ destination: '', search: values.destination })} />}<Button title="Xóa bộ lọc và xem tất cả tour" outline onPress={reset} /></>}
      {tours.data?.items.map(tour => <TourCard key={tour.id} tour={tour} />)}
      {!!tours.data?.total && <View style={s.pager}><Text style={s.pagerText}>{tours.data.total} hành trình · Trang {page} / {Math.max(1, Math.ceil(tours.data.total / 9))}</Text><View style={s.range}><View style={layout.grow}><Button title="Trang trước" outline disabled={page <= 1 || tours.loading} onPress={() => update({ page: String(page - 1) })} /></View><View style={layout.grow}><Button title="Trang sau" outline disabled={page * 9 >= tours.data.total || tours.loading} onPress={() => update({ page: String(page + 1) })} /></View></View></View>}
      <View style={s.help}>
        <Text style={s.helpKicker}>CẦN GỢI Ý HÀNH TRÌNH?</Text>
        <Text style={s.helpTitle}>Gửi yêu cầu tư vấn để được hỗ trợ lựa chọn chuyến đi.</Text>
        <Button title="Liên hệ tư vấn" outline onPress={() => router.push('/support')} />
      </View>
    </View>
  </Screen>;
}

const s = StyleSheet.create({
  banner: { backgroundColor: palette.ink },
  bannerInner: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 26, gap: 16 },
  suggestion: { fontSize: 9, color: palette.gold, letterSpacing: tracking.eyebrow, textTransform: 'uppercase' },
  content: { paddingHorizontal: 20, paddingTop: 22, gap: 18, paddingBottom: 48 },
  range: { flexDirection: 'row', gap: 10 },
  link: { color: palette.accentDark, fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },
  textAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  resultsHead: { gap: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: palette.line },
  resultsTitle: { fontFamily: fonts.serif, fontSize: 28, color: palette.ink },
  resultsMeta: { fontSize: 12, color: palette.muted, lineHeight: 19 },
  sortLabel: { fontSize: 9, color: palette.muted, letterSpacing: tracking.label, textTransform: 'uppercase' },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  activeFilter: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.sand, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, maxWidth: '100%' },
  activeText: { fontSize: 11, color: palette.accentDark, flexShrink: 1, letterSpacing: 0.4 },
  pager: { gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.line },
  pagerText: { fontSize: 11, color: palette.muted, letterSpacing: 0.6 },
  help: { backgroundColor: palette.sand, padding: 24, gap: 12, marginTop: 8 },
  helpKicker: { fontSize: 9, letterSpacing: tracking.eyebrow, color: palette.accentDark },
  helpTitle: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: palette.ink },
});
