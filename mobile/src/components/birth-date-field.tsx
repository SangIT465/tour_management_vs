import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText as Text, Sheet } from './ui';
import { date, isValidBirthday, localDate, maskDisplayDate, parseDisplayDate } from '../lib/format';
import { fonts, palette, radius, tracking } from '../theme';

/**
 * Ngày sinh trên app: khách Việt gõ dd/mm/yyyy (dấu "/" tự chèn) hoặc chọn bằng
 * bộ chọn ngày/tháng/năm dạng sheet. Không còn ô nhập thô "YYYY-MM-DD".
 */
type Picked = { day: number; month: number; year: number };

export default function BirthDateField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  // Bản nháp chỉ áp dụng khi khớp với value hiện tại, nhờ vậy không cần effect đồng bộ.
  const [draft, setDraft] = React.useState<{ value: string; text: string } | null>(null);
  const [picker, setPicker] = React.useState<Picked | null>(null);
  const typed = draft && draft.value === value ? draft.text : value ? date(value) : '';
  const invalid = !!typed && typed.replace(/\D/g, '').length === 8 && !parseDisplayDate(typed);
  const complete = typed.replace(/\D/g, '').length === 8;

  function edit(text: string) {
    const masked = maskDisplayDate(text);
    const iso = parseDisplayDate(masked);
    setDraft({ value: iso, text: masked });
    onChange(iso);
  }

  function openPicker() {
    const parts = isValidBirthday(value) ? value.split('-').map(Number) : [1990, 5, 20];
    setPicker({ year: parts[0], month: parts[1], day: parts[2] });
  }

  return <View style={s.field}>
    <View style={s.labelRow}>
      <Text style={s.label}>Ngày sinh</Text>
      <Text style={s.format}>DD/MM/YYYY</Text>
    </View>
    <View style={[s.inputRow, invalid && s.inputRowError, disabled && s.inputRowDisabled]}>
      <Ionicons name="calendar-outline" size={17} color={invalid ? palette.errorInk : palette.muted} />
      <TextInput
        value={typed}
        onChangeText={edit}
        editable={!disabled}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="20/05/1990"
        placeholderTextColor="#9c9285"
        accessibilityLabel="Ngày sinh, định dạng ngày tháng năm"
        maxLength={10}
        selectionColor={palette.accent}
        style={s.input}
      />
      {complete && !invalid && <Ionicons name="checkmark-circle" size={18} color={palette.successInk} />}
      <Pressable accessibilityRole="button" accessibilityLabel="Mở lịch chọn ngày sinh" disabled={disabled} onPress={openPicker} style={({ pressed }) => [s.calendarButton, pressed && s.calendarPressed]}>
        <Ionicons name="chevron-down" size={16} color={palette.ink} />
      </Pressable>
    </View>
    {invalid
      ? <Text style={s.errorText}>Ngày này không tồn tại. Kiểm tra lại ngày / tháng.</Text>
      : <Text style={s.hint}>Dùng để tính loại vé: em bé, trẻ em hay người lớn.</Text>}
    <BirthDateSheet picked={picker} onChange={setPicker} onClose={() => setPicker(null)} onPick={next => { onChange(next); setPicker(null); }} />
  </View>;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const YEARS = (() => {
  const current = Number(localDate().slice(0, 4));
  return Array.from({ length: current - 1900 + 1 }, (_, index) => current - index);
})();
const daysIn = (month: number, year: number) => new Date(year, month, 0).getDate();

function BirthDateSheet({ picked, onChange, onClose, onPick }: { picked: Picked | null; onChange: (next: Picked) => void; onClose: () => void; onPick: (value: string) => void }) {
  const day = picked?.day ?? 20;
  const month = picked?.month ?? 5;
  const year = picked?.year ?? 1990;
  const maxDay = daysIn(month, year);
  const safeDay = Math.min(day, maxDay);
  const candidate = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  const valid = isValidBirthday(candidate);
  const today = localDate();
  return <Sheet
    open={!!picked}
    onClose={onClose}
    title="Chọn ngày sinh"
    footer={<>
      {!valid && <Text style={s.sheetError}>Ngày sinh phải nằm trong khoảng 1900 đến hôm nay.</Text>}
      <Pressable accessibilityRole="button" disabled={!valid} onPress={() => onPick(candidate)} style={({ pressed }) => [s.sheetConfirm, !valid && s.sheetConfirmDisabled, pressed && valid && s.sheetConfirmPressed]}>
        <Text style={s.sheetConfirmText}>Xác nhận {date(candidate)}</Text>
      </Pressable>
    </>}
  >
    <View style={s.previewRow}>
      <View style={s.previewCell}><Text style={s.previewValue}>{String(safeDay).padStart(2, '0')}</Text><Text style={s.previewLabel}>Ngày</Text></View>
      <View style={s.previewCell}><Text style={s.previewValue}>{String(month).padStart(2, '0')}</Text><Text style={s.previewLabel}>Tháng</Text></View>
      <View style={s.previewCell}><Text style={s.previewValue}>{year}</Text><Text style={s.previewLabel}>Năm</Text></View>
    </View>
    <PickerColumn title="Ngày" data={Array.from({ length: maxDay }, (_, index) => index + 1)} value={safeDay} render={item => String(item).padStart(2, '0')} onSelect={next => onChange({ day: next, month, year })} />
    <PickerColumn title="Tháng" data={MONTHS} value={month} render={item => `Tháng ${item}`} onSelect={next => onChange({ day: Math.min(safeDay, daysIn(next, year)), month: next, year })} />
    <PickerColumn title="Năm" data={YEARS} value={year} render={item => String(item)} onSelect={next => onChange({ day: Math.min(safeDay, daysIn(month, next)), month, year: next })} />
    <Text style={s.sheetHint}>Hôm nay là {date(today)}.</Text>
  </Sheet>;
}

function PickerColumn<T extends number>({ title, data, value, render, onSelect }: { title: string; data: T[]; value: number; render: (item: T) => string; onSelect: (item: T) => void }) {
  return <View style={s.column}>
    <Text style={s.columnTitle}>{title}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.columnScroll} keyboardShouldPersistTaps="handled">
      {data.map(item => {
        const selected = item === value;
        return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${title} ${render(item)}`} onPress={() => onSelect(item)} style={({ pressed }) => [s.cell, selected && s.cellSelected, pressed && !selected && s.cellPressed]}>
          <Text style={[s.cellText, selected && s.cellTextSelected]}>{render(item)}</Text>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  label: { fontFamily: fonts.sans, color: palette.muted, fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },
  format: { fontFamily: fonts.mono, color: palette.lineStrong, fontSize: 10, letterSpacing: 0.6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: palette.line, borderRadius: radius.none, backgroundColor: palette.white, paddingLeft: 14, minHeight: 52 },
  inputRowError: { borderColor: palette.errorInk },
  inputRowDisabled: { backgroundColor: palette.sand, opacity: 0.7 },
  input: { flex: 1, minWidth: 0, minHeight: 50, paddingVertical: 12, paddingHorizontal: 0, color: palette.ink, fontSize: 17, fontFamily: fonts.sans, letterSpacing: 1.2 },
  calendarButton: { width: 46, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: palette.line },
  calendarPressed: { backgroundColor: palette.sand },
  hint: { fontFamily: fonts.sans, color: palette.muted, fontSize: 12, lineHeight: 18 },
  errorText: { fontFamily: fonts.sans, color: palette.errorInk, fontSize: 12, lineHeight: 18 },

  previewRow: { flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 1, borderColor: palette.ink, backgroundColor: palette.sand, marginBottom: 4 },
  previewCell: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  previewValue: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34, color: palette.ink },
  previewLabel: { fontFamily: fonts.sans, fontSize: 9, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.muted },

  column: { gap: 8 },
  columnTitle: { fontFamily: fonts.sans, fontSize: 9, fontWeight: '600', letterSpacing: tracking.eyebrow, textTransform: 'uppercase', color: palette.accent },
  columnScroll: { gap: 8, paddingVertical: 2, paddingRight: 4 },
  cell: { minWidth: 54, minHeight: 46, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white },
  cellSelected: { backgroundColor: palette.ink, borderColor: palette.ink },
  cellPressed: { borderColor: palette.accent },
  cellText: { fontFamily: fonts.sans, fontSize: 14, color: palette.ink },
  cellTextSelected: { color: palette.cream, fontWeight: '600' },

  sheetHint: { fontFamily: fonts.sans, fontSize: 11, color: palette.muted, textAlign: 'center' },
  sheetError: { fontFamily: fonts.sans, fontSize: 12, color: palette.errorInk, textAlign: 'center' },
  sheetConfirm: { minHeight: 54, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  sheetConfirmPressed: { backgroundColor: palette.accent },
  sheetConfirmDisabled: { opacity: 0.4 },
  sheetConfirmText: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.cream },
});
