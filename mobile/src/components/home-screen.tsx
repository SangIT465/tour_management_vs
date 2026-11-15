import PhotoBackdrop from './photo-backdrop';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AppText as Text, Button, Chips, LoadState, Screen } from './ui';
import TourCard from './tour-card';
import { useResource } from '../hooks/use-resource';
import { destinations, heroImage } from '../lib/destinations';
import { fonts, palette, tracking } from '../theme';
import type { Page, Tour } from '../lib/types';

const benefits: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string }[] = [
  { icon: 'earth-outline', title: 'Tour đa dạng', text: 'Khám phá nhiều điểm đến' },
  { icon: 'shield-checkmark-outline', title: 'Giá tour minh bạch', text: 'Xem chi tiết trước khi đặt' },
  { icon: 'headset-outline', title: 'Hỗ trợ hành trình', text: 'Gửi yêu cầu tư vấn' },
  { icon: 'star-outline', title: 'Đánh giá thực tế', text: 'Từ khách đã tham gia tour' },
  { icon: 'wallet-outline', title: 'Quản lý thanh toán', text: 'Theo dõi trong tài khoản' },
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
      <LinearGradient colors={['#1a1510e6', '#211d1899', '#211d18d9']} locations={[0, 0.55, 1]} style={s.heroInner}>
        <Text style={s.kicker}>KHÁM PHÁ VIỆT NAM CÙNG TOURGO</Text>
        <Text accessibilityRole="header" style={s.heroTitle}>Mỗi chuyến đi{'\n'}là <Text style={s.heroAccent}>một câu chuyện</Text></Text>
        <Text style={s.heroCopy}>Hành trình mới, cảm hứng mới từ những miền đất đẹp. Tìm chuyến đi phù hợp, mang về kỷ niệm đáng nhớ.</Text>
        <View style={s.searchPanel}>
          <Text style={s.panelLabel}>Tìm hành trình</Text>
          <SearchField label="Điểm đến hoặc tên tour" icon="location-outline" value={search} onChangeText={setSearch} placeholder="Bạn muốn đi đâu?" maxLength={120} returnKeyType="search" onSubmitEditing={() => explore({ search: search.trim(), departureCity: departureCity.trim(), categoryId })} />
          <SearchField label="Khởi hành từ" icon="flag-outline" value={departureCity} onChangeText={setDepartureCity} placeholder="Thành phố khởi hành" maxLength={100} />
          <View style={s.searchField}>
            <Text style={s.fieldLabel}>Loại hành trình</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Chọn loại hành trình" accessibilityState={{ expanded: categoriesOpen }} onPress={() => setCategoriesOpen(value => !value)} style={s.categoryPicker}>
              <Text style={s.categoryValue}>{categories.data?.find(item => item.id === categoryId)?.name || 'Tất cả loại tour'}</Text>
              <Ionicons name={categoriesOpen ? 'chevron-up' : 'chevron-down'} size={15} color={palette.muted} />
            </Pressable>
          </View>
          {categoriesOpen && <><Chips items={[{ label: 'Tất cả loại tour', value: '' }, ...(categories.data ?? []).map(item => ({ label: item.name, value: item.id }))]} value={categoryId} onChange={value => { setCategoryId(value); setCategoriesOpen(false); }} /><LoadState loading={categories.loading && !categories.data} error={categories.error} retry={categories.refresh} /></>}
          <Pressable accessibilityRole="button" accessibilityLabel="Tìm tour" onPress={() => explore({ search: search.trim(), departureCity: departureCity.trim(), categoryId })} style={({ pressed }) => [s.searchButton, pressed && s.searchButtonPressed]}>
            <Text style={s.searchButtonText}>Tìm tour</Text>
            <Ionicons name="arrow-forward" size={16} color={palette.cream} />
          </Pressable>
        </View>
      </LinearGradient>
    </PhotoBackdrop>
    <View style={s.body}>
      <View style={s.benefits}>{benefits.map(item => <View key={item.title} style={s.benefit}><Ionicons name={item.icon} size={18} color={palette.accent} /><View style={s.benefitCopy}><Text style={s.benefitTitle}>{item.title}</Text><Text style={s.benefitText}>{item.text}</Text></View></View>)}</View>
      <SectionHeading title="Tour nổi bật" subtitle="Những hành trình được yêu thích nhất" onPress={() => explore()} />
      <LoadState loading={tours.loading && !tours.data} error={tours.error} retry={tours.refresh} empty={!tours.loading && !tours.error && !tours.data?.items.length ? 'Chưa có tour mở bán. Vui lòng quay lại sau.' : undefined} />
      <View style={s.grid}>{tours.data?.items.map(tour => <View key={tour.id} style={columns}><TourCard tour={tour} compact={width > 360} /></View>)}</View>
      <SectionHeading title="Điểm đến phổ biến" subtitle="Khám phá những miền đất đẹp của Việt Nam" onPress={() => explore()} />
      <View style={s.grid}>{destinations.map(place => <Pressable key={place.name} accessibilityRole="button" accessibilityLabel={`Khám phá ${place.name}`} style={({ pressed }) => [s.half, pressed && s.destinationPressed]} onPress={() => explore({ destination: place.name })}><PhotoBackdrop source={place.image} style={s.destination}><LinearGradient colors={['transparent', '#211d18e6']} style={s.destinationCaption}><Text style={s.destinationTitle}>{place.name}</Text><Text style={s.destinationCopy}>{place.caption}</Text></LinearGradient></PhotoBackdrop></Pressable>)}</View>
      <View style={s.promo}>
        <View style={s.promoCopy}>
          <Text style={s.promoKicker}>CẢM HỨNG CHO CHUYẾN ĐI TIẾP THEO</Text>
          <Text style={s.promoTitle}>Đi xa hơn, mang về nhiều kỷ niệm hơn</Text>
          <Text style={s.promoText}>Chọn một điểm đến mới, bắt đầu câu chuyện của riêng bạn.</Text>
          <Button title="Khám phá ngay" onPress={() => explore()} />
        </View>
        <PhotoBackdrop source={destinations[3].image} style={s.promoImage}><Text style={s.travel}>Travel{'\n'}   More</Text></PhotoBackdrop>
      </View>
      <Text style={s.photoNote}>Ảnh minh họa điểm đến · Pexels. Giá, lịch khởi hành và dịch vụ cụ thể được cập nhật trong từng tour.</Text>
    </View>
    <View style={s.footer}>
      <Text style={s.footerBrand}>TourGo</Text>
      <Text style={s.footerCopy}>Mỗi chuyến đi là một câu chuyện.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/support')} style={s.footerLink}><Text style={s.footerLinkText}>Liên hệ và hỗ trợ hành trình</Text><Ionicons name="arrow-forward" color={palette.gold} size={15} /></Pressable>
    </View>
  </Screen>;
}

function SectionHeading({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return <View style={s.sectionHeading}>
    <View style={s.sectionCopy}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text><Text style={s.sectionSubtitle}>{subtitle}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem tất cả ${title.toLowerCase()}`} onPress={onPress} style={s.seeAll}><Text style={s.seeAllText}>Xem tất cả</Text><Ionicons name="arrow-forward" size={13} color={palette.ink} /></Pressable>
  </View>;
}

function SearchField({ label, icon, ...props }: TextInputProps & { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return <View style={s.searchField}>
    <Text style={s.fieldLabel}>{label}</Text>
    <View style={s.searchInputRow}><Ionicons name={icon} size={16} color={palette.muted} /><TextInput autoCapitalize="none" placeholderTextColor="#9c9285" selectionColor={palette.accent} {...props} accessibilityLabel={label} style={s.searchInput} /></View>
  </View>;
}

const s = StyleSheet.create({
  hero: { backgroundColor: palette.ink, overflow: 'hidden' },
  heroInner: { paddingHorizontal: 20, paddingTop: 44, paddingBottom: 24 },
  kicker: { color: palette.gold, fontSize: 9, letterSpacing: tracking.eyebrow, marginBottom: 14 },
  heroTitle: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 46, color: palette.cream },
  heroAccent: { fontFamily: fonts.serif, fontStyle: 'italic', color: palette.gold },
  heroCopy: { fontSize: 13, lineHeight: 22, color: '#e8e0d4', marginTop: 16, marginBottom: 26, maxWidth: 480 },
  searchPanel: { backgroundColor: palette.cream, padding: 18, gap: 12 },
  panelLabel: { fontFamily: fonts.serif, fontSize: 20, color: palette.ink, marginBottom: 2 },
  searchField: { borderBottomWidth: 1, borderBottomColor: palette.line, paddingBottom: 8, gap: 4 },
  fieldLabel: { color: palette.muted, fontSize: 9, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },
  searchInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { minWidth: 0, flex: 1, fontSize: 14, color: palette.ink, padding: 0, minHeight: 26, fontFamily: fonts.sans },
  categoryPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  categoryValue: { flex: 1, fontSize: 14, color: palette.ink, fontFamily: fonts.sans },
  searchButton: { minHeight: 52, backgroundColor: palette.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18, marginTop: 4 },
  searchButtonPressed: { backgroundColor: palette.accent },
  searchButtonText: { color: palette.cream, fontSize: 11, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },

  body: { paddingHorizontal: 20, paddingTop: 0 },
  benefits: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line, paddingVertical: 6, marginBottom: 30 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.line },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: palette.ink, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  benefitText: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 2 },

  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: palette.line },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: palette.ink, fontFamily: fonts.serif, fontSize: 28 },
  sectionSubtitle: { fontSize: 12, color: palette.muted, lineHeight: 19, marginTop: 4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 },
  seeAllText: { fontSize: 9, color: palette.ink, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 34 },
  half: { width: '48%' },
  full: { width: '100%' },
  destination: { aspectRatio: 3 / 4, overflow: 'hidden', justifyContent: 'flex-end' },
  destinationPressed: { opacity: 0.85 },
  destinationCaption: { padding: 14, paddingTop: 40 },
  destinationTitle: { fontFamily: fonts.serif, fontSize: 21, color: palette.cream },
  destinationCopy: { fontSize: 9, color: palette.gold, marginTop: 3, letterSpacing: tracking.label, textTransform: 'uppercase' },

  promo: { backgroundColor: palette.sand, overflow: 'hidden', marginBottom: 18 },
  promoCopy: { padding: 24, gap: 12 },
  promoKicker: { fontSize: 9, letterSpacing: tracking.eyebrow, color: palette.accentDark },
  promoTitle: { color: palette.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 34 },
  promoText: { fontSize: 13, lineHeight: 21, color: palette.muted },
  promoImage: { height: 150, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 26 },
  travel: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 38, fontStyle: 'italic', color: palette.cream, textShadowColor: '#211d18a0', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  photoNote: { fontSize: 10, lineHeight: 18, color: palette.muted, marginTop: 4, marginBottom: 26 },

  footer: { backgroundColor: palette.ink, paddingHorizontal: 20, paddingVertical: 30, gap: 10 },
  footerBrand: { fontFamily: fonts.serif, fontSize: 30, color: palette.cream },
  footerCopy: { fontSize: 12, color: '#c9c0b2', lineHeight: 20 },
  footerLink: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44, borderTopWidth: 1, borderTopColor: '#3a332b', marginTop: 8, paddingTop: 14 },
  footerLinkText: { fontSize: 10, color: palette.gold, letterSpacing: tracking.label, textTransform: 'uppercase', fontWeight: '600' },
});
