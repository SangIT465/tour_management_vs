import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Heading, Copy, Row, Field, Button, Message, LoadState, LoginRequired, AppText as Text, SectionLabel, FooterTotal } from '../../components/ui';
import BirthDateField from '../../components/birth-date-field';
import PromotionPicker from '../../components/promotion-picker';
import { useSession } from '../../context/session';
import { useResource } from '../../hooks/use-resource';
import { api } from '../../lib/api';
import { fonts, palette, tracking } from '../../theme';
import { date, isValidBirthday, money, ticketNames } from '../../lib/format';
import type { Booking, Passenger, Quote, Schedule, TourDetail } from '../../lib/types';

export default function BookingScreen() {
  const { id, scheduleId } = useLocalSearchParams<{ id: string; scheduleId: string }>();
  return <LoginRequired next={`/booking/${id}?scheduleId=${encodeURIComponent(scheduleId ?? '')}`}><BookingForm id={id} scheduleId={scheduleId} /></LoginRequired>;
}
function BookingForm({ id, scheduleId }: { id: string; scheduleId: string }) {
  const { user } = useSession();
  const schedules = useResource<Schedule[]>(`/schedules/tour/${id}`);
  const tour = useResource<TourDetail>(`/tours/${id}`);
  const selected = schedules.data?.find(item => item.id === scheduleId);
  const [contactName, setContactName] = useState(user?.fullName ?? '');
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [note, setNote] = useState('');
  const [passengers, setPassengers] = useState<Passenger[]>([{ fullName: user?.fullName ?? '', dob: '' }]);
  const [promotionCode, setPromotionCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState<'contact' | 'note' | null>('contact');
  const lock = useRef(false);
  function passenger(index: number, changes: Partial<Passenger>) { setPassengers(values => values.map((value, at) => at === index ? { ...value, ...changes } : value)); setQuote(null); }
  async function submit(create: boolean) {
    if (lock.current || !selected) return;
    if (passengers.some(value => value.fullName.trim().length < 2 || !isValidBirthday(value.dob))) { setError('Nhập họ tên và ngày sinh hợp lệ cho từng hành khách (từ năm 1900, không sau hôm nay).'); return; }
    if (contactName.trim().length < 2 || !/^(0\d{9}|\+84\d{9})$/.test(contactPhone.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) { setError('Kiểm tra họ tên, số điện thoại Việt Nam và email liên hệ.'); return; }
    if (create && (!quote || !quote.canBook)) { setError(quote?.blockedReason || 'Hãy xem báo giá hợp lệ trước khi xác nhận đặt tour.'); return; }
    lock.current = true; setBusy(true); setError('');
    const body = { scheduleId, passengers: passengers.map(value => ({ fullName: value.fullName.trim(), dob: value.dob })), ...(promotionCode.trim() ? { promotionCode: promotionCode.trim() } : {}) };
    try {
      if (create) {
        const booking = await api.request<Booking>('/bookings', { method: 'POST', body: { ...body, contactName: contactName.trim(), contactPhone: contactPhone.trim(), contactEmail: contactEmail.trim(), ...(note.trim() ? { note: note.trim() } : {}) } });
        router.replace({ pathname: '/payment/[id]', params: { id: booking.id } });
      } else setQuote(await api.request<Quote>('/bookings/quote', { method: 'POST', body }));
    } catch (failure) { setQuote(null); setError(failure instanceof Error ? failure.message : 'Không xử lý được đơn đặt tour.'); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!selected) return <Screen><LoadState loading={schedules.loading} error={schedules.error} retry={schedules.refresh} empty={!schedules.loading && !schedules.error ? 'Lịch này không còn mở bán. Vui lòng chọn lịch khởi hành khác.' : undefined} /><Button title="Chọn lịch khác" outline onPress={() => router.replace({ pathname: '/tours/[id]', params: { id } })} /></Screen>;

  const ready = passengers.every(value => value.fullName.trim().length >= 2 && isValidBirthday(value.dob));
  return <Screen
    footer={<View style={s.footerRow}>
      <FooterTotal label={quote ? 'Tổng thanh toán' : 'Tạm tính'} value={quote ? money(quote.total) : '—'} caption={quote ? `${passengers.length} hành khách${quote.discount ? ' · đã giảm giá' : ''}` : 'Xem báo giá để biết tổng tiền'} />
      <Button title={quote ? 'Xác nhận' : 'Xem giá'} disabled={!ready || (!!quote && !quote.canBook)} busy={busy} onPress={() => { void submit(!!quote); }} />
    </View>}
  >
    <Heading eyebrow="ĐẶT TOUR · BƯỚC CUỐI" title="Hoàn tất đặt tour" subtitle={tour.data?.name || selected.tourName} />

    <View style={s.trip}>
      <View style={s.tripHead}>
        <Ionicons name="airplane-outline" size={16} color={palette.accentDark} />
        <Text style={s.tripLabel}>Khởi hành</Text>
      </View>
      <Text style={s.tripDate}>{date(selected.startDate)}</Text>
      <Text style={s.tripMeta}>Về {date(selected.endDate)} · còn {selected.availableSeats} chỗ</Text>
      <View style={s.tripPoint}><Ionicons name="location-outline" size={13} color={palette.muted} /><Text style={s.tripMeta} numberOfLines={2}>{selected.meetingPoint || 'Điểm đón đang cập nhật'}</Text></View>
    </View>

    <View style={s.section}>
      <SectionLabel action={<Text style={s.count}>{passengers.length} khách</Text>}>Hành khách</SectionLabel>
      {passengers.map((value, index) => <View key={index} style={s.passengerCard}>
        <View style={s.passengerHead}>
          <View style={s.passengerBadge}><Text style={s.passengerBadgeText}>{String(index + 1).padStart(2, '0')}</Text></View>
          <Text style={s.passengerTitle}>Hành khách {index + 1}</Text>
          {passengers.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa hành khách ${index + 1}`} disabled={busy} onPress={() => { setPassengers(values => values.filter((_, at) => at !== index)); setQuote(null); }} style={s.removeButton}><Ionicons name="close" size={16} color={palette.errorInk} /></Pressable>}
        </View>
        <Field label="Họ tên theo giấy tờ tùy thân" value={value.fullName} onChangeText={fullName => passenger(index, { fullName })} autoCapitalize="words" maxLength={150} editable={!busy} placeholder="Nguyễn Văn A" />
        <BirthDateField value={value.dob} disabled={busy} onChange={dob => passenger(index, { dob })} />
      </View>)}
      <Button title="Thêm hành khách" icon="add" outline disabled={busy || passengers.length >= 30} onPress={() => { setPassengers(values => [...values, { fullName: '', dob: '' }]); setQuote(null); }} />
    </View>

    <View style={s.section}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: openSection === 'contact' }} onPress={() => setOpenSection(value => value === 'contact' ? null : 'contact')} style={s.accordionHead}>
        <View style={s.flex}><Text style={s.accordionTitle}>Thông tin liên hệ</Text><Text style={s.accordionHint}>{contactName || 'Chưa nhập'} · {contactPhone || 'chưa có SĐT'}</Text></View>
        <Ionicons name={openSection === 'contact' ? 'chevron-up' : 'chevron-down'} size={18} color={palette.muted} />
      </Pressable>
      {openSection === 'contact' && <View style={s.accordionBody}>
        <Field label="Họ và tên" value={contactName} onChangeText={setContactName} autoCapitalize="words" autoComplete="name" maxLength={150} editable={!busy} />
        <Field label="Số điện thoại" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={20} editable={!busy} placeholder="0901234567" />
        <Field label="Email nhận xác nhận và hóa đơn" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoComplete="email" maxLength={191} editable={!busy} />
      </View>}
    </View>

    <View style={s.section}>
      <SectionLabel>Ưu đãi</SectionLabel>
      <PromotionPicker code={promotionCode} subtotal={quote?.subtotal} disabled={busy} onSelect={value => { setPromotionCode(value); setQuote(null); }} />
      <Field label="Mã giảm giá (tùy chọn)" value={promotionCode} onChangeText={value => { setPromotionCode(value.toUpperCase()); setQuote(null); }} autoCapitalize="characters" maxLength={40} editable={!busy} placeholder="TOURGO2026" />
      {!!promotionCode && <Button title="Gỡ mã" small outline disabled={busy} onPress={() => { setPromotionCode(''); setQuote(null); }} />}
    </View>

    <View style={s.section}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: openSection === 'note' }} onPress={() => setOpenSection(value => value === 'note' ? null : 'note')} style={s.accordionHead}>
        <View style={s.flex}><Text style={s.accordionTitle}>Ghi chú cho chuyến đi</Text><Text style={s.accordionHint}>{note ? `${note.length} ký tự` : 'Yêu cầu ăn chay, phòng, đón riêng...'}</Text></View>
        <Ionicons name={openSection === 'note' ? 'chevron-up' : 'chevron-down'} size={18} color={palette.muted} />
      </Pressable>
      {openSection === 'note' && <View style={s.accordionBody}><Field label="Ghi chú" value={note} onChangeText={setNote} multiline maxLength={1000} editable={!busy} placeholder="Ví dụ: 2 người ăn chay, cần phòng 2 giường." /></View>}
    </View>

    <Message text={error} error />
    {quote && <View style={s.quote}>
      <Text style={s.quoteKicker}>Báo giá của bạn</Text>
      {quote.lines.map(line => <Row key={line.type} label={`${ticketNames[line.type] ?? line.type} × ${line.quantity}`} value={money(line.amount)} />)}
      <Row label="Tạm tính" value={money(quote.subtotal)} />
      <Row label={`Giảm giá ${quote.promotionCode ?? ''}`} value={`−${money(quote.discount)}`} />
      <View style={s.totalRow}><Text style={s.totalLabel}>Tổng thanh toán</Text><Text style={s.total}>{money(quote.total)}</Text></View>
      <Message text={!quote.canBook ? (quote.blockedReason || 'Không đủ chỗ cho số hành khách đã chọn.') : 'Báo giá chưa giữ chỗ. Giá và chỗ sẽ được kiểm tra lại khi tạo đơn.'} error={!quote.canBook} />
    </View>}
    <Copy muted>Loại vé và giá được hệ thống tính theo ngày sinh, lịch khởi hành. Tạo đơn chưa đồng nghĩa đã thanh toán.</Copy>
  </Screen>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  trip: { borderTopWidth: 2, borderTopColor: palette.ink, backgroundColor: palette.sand, padding: 18, gap: 4 },
  tripHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripLabel: { fontFamily: fonts.sans, fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.accentDark },
  tripDate: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 33, color: palette.ink, marginTop: 2 },
  tripMeta: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: palette.muted, flexShrink: 1 },
  tripPoint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },

  section: { gap: 12, paddingTop: 18, borderTopWidth: 1, borderTopColor: palette.line },
  count: { fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.muted },

  passengerCard: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, padding: 16, gap: 14 },
  passengerHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passengerBadge: { width: 28, height: 28, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  passengerBadgeText: { fontFamily: fonts.serif, fontSize: 13, color: palette.gold },
  passengerTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 19, color: palette.ink },
  removeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  accordionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6 },
  accordionTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: palette.ink },
  accordionHint: { fontSize: 12, color: palette.muted, marginTop: 2 },
  accordionBody: { gap: 14, paddingTop: 4 },

  quote: { borderTopWidth: 2, borderTopColor: palette.ink, backgroundColor: palette.sand, padding: 18, gap: 12 },
  quoteKicker: { fontFamily: fonts.sans, fontSize: 10, fontWeight: '600', letterSpacing: tracking.eyebrow, textTransform: 'uppercase', color: palette.accentDark },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.lineStrong },
  totalLabel: { fontFamily: fonts.sans, fontSize: 11, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.muted },
  total: { fontFamily: fonts.serif, fontSize: 28, color: palette.ink },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
