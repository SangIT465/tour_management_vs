import PhotoBackdrop from './photo-backdrop';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AppText as Text, Button, Chips, LoadState, Screen, colors } from './ui';
import TourCard from './tour-card';
import { useResource } from '../hooks/use-resource';
import { destinations, heroImage } from '../lib/destinations';
import type { Page, Tour } from '../lib/types';

const benefits: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string; color: string; background: string }[] = [
  { icon: 'earth-outline', title: 'Tour đa dạng', text: 'Khám phá nhiều điểm đến', color: '#d88d00', background: '#fff7df' },
  { icon: 'shield-checkmark-outline', title: 'Giá tour minh bạch', text: 'Xem chi tiết trước khi đặt', color: '#06a0bd', background: '#e0f9ff' },
  { icon: 'headset-outline', title: 'Hỗ trợ hành trình', text: 'Gửi yêu cầu tư vấn', color: '#9348ee', background: '#f3eaff' },
  { icon: 'star-outline', title: 'Đánh giá thực tế', text: 'Từ khách đã tham gia tour', color: '#d88d00', background: '#fff7df' },
  { icon: 'wallet-outline', title: 'Quản lý thanh toán', text: 'Theo dõi trong tài khoản', color: '#00a0d4', background: '#e0faff' },
];

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { width } = useWindowDimensions();
  const categories = useResource<{ id: string; name: string }[]>('/catalog/categories');
  const tours = useResource<Page<Tour>>('/tours?limit=5&sortBy=avgRating&sortOrder=DESC');
  const explore = (params: Record<string, string> = {}) => router.push({ pathname: '/explore', params });
  const columns = width <= 360 ? s.full : s.half;
  return <Screen padded={false} refresh={() => { tours.refresh(); categories.refresh(); }} refreshing={tours.loading && !!tours.data}>
    <PhotoBackdrop source={heroImage} style={s.hero} accessibilityLabel="Phong cảnh vịnh Hạ Long">
      <LinearGradient colors={['#062a51c9', '#073b5b72']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroInner}>
        <Text style={s.kicker}>KHÁM PHÁ VIỆT NAM CÙNG TOURGO</Text>
        <Text accessibilityRole="header" style={s.heroTitle}>Mỗi chuyến đi{'\n'}là <Text style={s.heroAccent}>một câu chuyện</Text></Text>
        <Text style={s.heroCopy}>Hành trình mới, cảm hứng mới từ những miền đất đẹp. Tìm chuyến đi phù hợp, mang về kỷ niệm đáng nhớ.</Text>
        <View style={s.searchTab}><Ionicons name="earth-outline" color={colors.primary} size={17} /><Text style={s.searchTabText}>Khám phá hành trình</Text></View>
        <View style={s.searchPanel}>
          <SearchField label="Điểm đến hoặc tên tour" icon="location-outline" value={search} onChangeText={setSearch} placeholder="Bạn muốn đi đâu?" maxLength={120} returnKeyType="search" onSubmitEditing={() => explore({ search: search.trim(), departureCity: departureCity.trim(), categoryId })} />
          <SearchField label="Khởi hành từ" icon="flag-outline" value={departureCity} onChangeText={setDepartureCity} placeholder="Thành phố khởi hành" maxLength={100} />
          <View style={s.categoryField}><Text style={s.fieldLabel}>Loại hành trình</Text><Pressable accessibilityRole="button" accessibilityLabel="Chọn loại hành trình" accessibilityState={{ expanded: categoriesOpen }} onPress={() => setCategoriesOpen(value => !value)} style={s.categoryPicker}><Ionicons name="bag-handle-outline" size={17} color={colors.muted} /><Text style={s.categoryValue}>{categories.data?.find(item => item.id === categoryId)?.name || 'Tất cả loại tour'}</Text><Ionicons name={categoriesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} /></Pressable></View>
          {categoriesOpen && <><Chips items={[{ label: 'Tất cả loại tour', value: '' }, ...(categories.data ?? []).map(item => ({ label: item.name, value: item.id }))]} value={categoryId} onChange={value => { setCategoryId(value); setCategoriesOpen(false); }} /><LoadState loading={categories.loading && !categories.data} error={categories.error} retry={categories.refresh} /></>}
          <Pressable accessibilityRole="button" accessibilityLabel="Tìm tour" onPress={() => explore({ search: search.trim(), departureCity: departureCity.trim(), categoryId })} style={({ pressed }) => [s.searchButton, pressed && { opacity: 0.8 }]}><Ionicons name="search-outline" size={19} color="#fff" /><Text style={s.searchButtonText}>Tìm tour</Text></Pressable>
        </View>
      </LinearGradient>
    </PhotoBackdrop>
    <View style={s.body}>
      <View style={s.benefits}>{benefits.map(item => <View key={item.title} style={s.benefit}><View style={[s.benefitIcon, { backgroundColor: item.background }]}><Ionicons name={item.icon} size={23} color={item.color} /></View><View style={s.benefitCopy}><Text style={s.benefitTitle}>{item.title}</Text><Text style={s.benefitText}>{item.text}</Text></View></View>)}</View>
      <SectionHeading title="Tour nổi bật" subtitle="Những hành trình được yêu thích nhất" onPress={() => explore()} />
      <LoadState loading={tours.loading && !tours.data} error={tours.error} retry={tours.refresh} empty={!tours.loading && !tours.error && !tours.data?.items.length ? 'Chưa có tour mở bán. Vui lòng quay lại sau.' : undefined} />
      <View style={s.grid}>{tours.data?.items.map(tour => <View key={tour.id} style={columns}><TourCard tour={tour} compact={width > 360} /></View>)}</View>
      <SectionHeading title="Điểm đến phổ biến" subtitle="Khám phá những miền đất đẹp của Việt Nam" onPress={() => explore()} />
      <View style={s.grid}>{destinations.map(place => <Pressable key={place.name} accessibilityRole="button" accessibilityLabel={`Khám phá ${place.name}`} style={s.half} onPress={() => explore({ destination: place.name })}><PhotoBackdrop source={place.image} style={s.destination}><LinearGradient colors={['transparent', '#071f42d9']} style={s.destinationCaption}><Text style={s.destinationTitle}>{place.name}</Text><Text style={s.destinationCopy}>{place.caption}</Text></LinearGradient></PhotoBackdrop></Pressable>)}</View>
      <View style={s.promo}><View style={s.promoCopy}><Text style={s.promoKicker}>CẢM HỨNG CHO CHUYẾN ĐI TIẾP THEO</Text><Text style={s.promoTitle}>Đi xa hơn, mang về nhiều kỷ niệm hơn</Text><Text style={s.promoText}>Chọn một điểm đến mới, bắt đầu câu chuyện của riêng bạn.</Text><Button title="Khám phá ngay →" onPress={() => explore()} /></View><PhotoBackdrop source={destinations[3].image} style={s.promoImage}><Text style={s.travel}>Travel{ '\n' }   More</Text></PhotoBackdrop></View>
      <Text style={s.photoNote}>Ảnh minh họa điểm đến · Pexels. Giá, lịch khởi hành và dịch vụ cụ thể được cập nhật trong từng tour.</Text>
    </View>
    <View style={s.footer}><Text style={s.footerBrand}>TourGo</Text><Text style={s.footerCopy}>Mỗi chuyến đi là một câu chuyện.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/support')} style={s.footerLink}><Ionicons name="headset-outline" color="#c5dcfa" size={18} /><Text style={s.footerCopy}>Liên hệ và hỗ trợ hành trình →</Text></Pressable></View>
  </Screen>;
}

function SectionHeading({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return <View style={s.sectionHeading}><View style={s.sectionCopy}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text><Text style={s.sectionSubtitle}>{subtitle}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Xem tất cả ${title.toLowerCase()}`} onPress={onPress} style={s.seeAll}><Text style={s.seeAllText}>Xem tất cả</Text><Ionicons name="arrow-forward" size={14} color={colors.primary} /></Pressable></View>;
}

function SearchField({ label, icon, ...props }: TextInputProps & { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return <View style={s.searchField}><Text style={s.fieldLabel}>{label}</Text><View style={s.searchInputRow}><Ionicons name={icon} size={17} color="#5b718e" /><TextInput autoCapitalize="none" placeholderTextColor="#82939c" {...props} accessibilityLabel={label} style={s.searchInput} /></View></View>;
}

const s = StyleSheet.create({
  hero: { backgroundColor: '#154966', overflow: 'hidden' }, heroInner: { padding: 16, paddingTop: 30, paddingBottom: 20 }, kicker: { color: '#d2eafb', fontSize: 9, letterSpacing: 1, marginBottom: 10 }, heroTitle: { fontSize: 36, lineHeight: 40, letterSpacing: -1.2, fontWeight: '800', color: '#fff' }, heroAccent: { color: '#8af4df' }, heroCopy: { fontSize: 12, lineHeight: 20, color: '#f2f8ff', marginTop: 13, marginBottom: 24, maxWidth: 480 },
  searchTab: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', alignSelf: 'flex-start', padding: 12, borderTopLeftRadius: 9, borderTopRightRadius: 9 }, searchTabText: { fontSize: 12, fontWeight: '700', color: colors.primary }, searchPanel: { backgroundColor: '#fff', padding: 12, borderRadius: 9, borderTopLeftRadius: 0, gap: 9 },
  searchField: { borderWidth: 1, borderColor: '#e1e9f4', borderRadius: 6, backgroundColor: '#fbfdff', padding: 10, gap: 5 }, fieldLabel: { color: '#526581', fontSize: 10, fontWeight: '600' }, searchInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, searchInput: { minWidth: 0, flex: 1, fontSize: 13, color: '#4c617e', padding: 0, minHeight: 24 },
  searchButton: { minHeight: 52, borderRadius: 6, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 }, searchButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' }, categoryField: { gap: 5, borderWidth: 1, borderColor: '#e1e9f4', backgroundColor: '#fbfdff', borderRadius: 6, padding: 10 }, categoryPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }, categoryValue: { flex: 1, fontSize: 13, color: colors.muted },
  body: { padding: 16, paddingTop: 0 }, benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, paddingVertical: 22 }, benefit: { flexDirection: 'row', alignItems: 'center', gap: 7, width: '47%' }, benefitIcon: { width: 33, height: 33, borderRadius: 30, justifyContent: 'center', alignItems: 'center' }, benefitCopy: { flex: 1 }, benefitTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' }, benefitText: { color: '#73829a', fontSize: 9, lineHeight: 14, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }, sectionCopy: { flex: 1 }, sectionTitle: { color: '#152b4e', fontSize: 20, fontWeight: '700', letterSpacing: -0.6 }, sectionSubtitle: { fontSize: 11, color: '#73829b', lineHeight: 17, marginTop: 3 }, seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }, seeAllText: { fontSize: 10, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }, half: { width: '48.4%' }, full: { width: '100%' }, destination: { height: 122, borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' }, destinationCaption: { padding: 12, paddingTop: 35 }, destinationTitle: { fontSize: 17, fontWeight: '700', color: '#fff' }, destinationCopy: { fontSize: 10, color: '#e4f2ff', marginTop: 3 },
  promo: { backgroundColor: '#e2efff', borderRadius: 10, overflow: 'hidden' }, promoCopy: { padding: 22, gap: 10 }, promoKicker: { fontSize: 9, letterSpacing: 0.7, color: '#41608a' }, promoTitle: { color: colors.ink, fontSize: 23, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 }, promoText: { fontSize: 12, lineHeight: 20, color: '#5d7598' }, promoImage: { height: 130, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 30 }, travel: { fontSize: 36, lineHeight: 34, fontWeight: '800', fontStyle: 'italic', color: '#fff', textShadowColor: '#174d76a0', textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } }, photoNote: { fontSize: 10, lineHeight: 17, color: '#7b8da5', marginTop: 14 },
  footer: { backgroundColor: colors.navy, padding: 24, gap: 10 }, footerBrand: { fontSize: 27, color: '#fff', fontWeight: '800' }, footerCopy: { fontSize: 12, color: '#c5dcfa', lineHeight: 20 }, footerLink: { flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 44 },
});
