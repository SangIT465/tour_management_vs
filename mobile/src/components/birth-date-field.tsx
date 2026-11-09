import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Copy, Field, layout } from './ui';
import { date, isValidBirthday, localDate } from '../lib/format';

export default function BirthDateField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date(1990, 0, 1));
  if (Platform.OS === 'web') return <Field label="Ngày sinh (YYYY-MM-DD)" value={value} onChangeText={onChange} editable={!disabled} placeholder="1990-05-20" maxLength={10} />;
  const parts = value.split('-').map(Number);
  function show() { setDraft(isValidBirthday(value) ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(1990, 0, 1)); setOpen(true); }
  return <View style={layout.gap}><Copy muted>Ngày sinh</Copy><Button title={value ? date(value) : 'Chọn ngày sinh'} outline disabled={disabled} onPress={show} />{open && <><DateTimePicker value={draft} mode="date" maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onValueChange={(_, next) => {
    setDraft(next);
    if (Platform.OS !== 'ios') { onChange(localDate(next)); setOpen(false); }
  }} onDismiss={() => setOpen(false)} />{Platform.OS === 'ios' && <View style={layout.horizontal}><Button title="Quay lại" small outline onPress={() => setOpen(false)} /><Button title="Xong" small disabled={disabled} onPress={() => { onChange(localDate(draft)); setOpen(false); }} /></View>}</>}</View>;
}
