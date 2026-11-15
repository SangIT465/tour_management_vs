import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useResource } from '../hooks/use-resource';
import { date, money } from '../lib/format';
import type { AvailablePromotion } from '../lib/types';
import { fonts, palette, tracking } from '../theme';
import { AppText as Text, Badge, Button, LoadState, layout } from './ui';

export default function PromotionPicker({ code, subtotal, disabled, onSelect }: { code: string; subtotal?: number; disabled: boolean; onSelect: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const offers = useResource<AvailablePromotion[]>(open ? '/promotions/available' : null);
  return <View style={layout.gap}>
    <Button title={open ? 'Ẩn mã ưu đãi' : 'Chọn mã ưu đãi'} outline disabled={disabled} onPress={() => setOpen(value => !value)} />
    {open && <View style={layout.gap}>
      <Text style={s.hint}>Chọn mã rồi bấm áp dụng để hệ thống kiểm tra điều kiện và tính giảm giá.</Text>
      <LoadState loading={offers.loading && !offers.data} error={offers.error} retry={offers.refresh} empty={!offers.loading && !offers.error && !offers.data?.length ? 'Chưa có mã phù hợp với tài khoản. Bạn vẫn có thể nhập mã riêng.' : undefined} />
      {offers.data?.map(offer => {
        const belowMinimum = subtotal !== undefined && subtotal < offer.minOrder;
        const selected = code === offer.code;
        return <View key={offer.code} style={[s.offer, selected && s.offerSelected]}>
          <View style={s.offerHead}>
            <Text style={s.code}>{offer.code}</Text>
            <Badge>{offer.type === 'PERCENT' ? `Giảm ${offer.value}%` : `Giảm ${money(offer.value)}`}</Badge>
          </View>
          <Text style={s.meta}>Đơn từ {money(offer.minOrder)}{offer.type === 'PERCENT' && offer.maxDiscount != null ? ` · Giảm tối đa ${money(offer.maxDiscount)}` : ''}</Text>
          <Text style={s.meta}>Hạn dùng {date(offer.validTo)} · Tối đa {offer.perUserLimit} lần / khách</Text>
          {belowMinimum && <Text style={s.warn}>Đơn hiện tại chưa đủ mức tối thiểu.</Text>}
          <Button title={selected ? `Đang chọn ${offer.code}` : `Chọn mã ${offer.code}`} small outline disabled={disabled || belowMinimum || !!offers.error} onPress={() => { onSelect(offer.code); setOpen(false); }} />
        </View>;
      })}
    </View>}
  </View>;
}

const s = StyleSheet.create({
  hint: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 21, color: palette.muted },
  offer: { backgroundColor: palette.sand, borderWidth: 1, borderColor: palette.line, borderLeftWidth: 2, borderLeftColor: palette.accent, padding: 16, gap: 10 },
  offerSelected: { borderLeftColor: palette.ink, backgroundColor: palette.sandDeep },
  offerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  code: { fontFamily: fonts.serif, fontSize: 22, letterSpacing: 0.4, color: palette.ink },
  meta: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, color: palette.muted },
  warn: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.errorInk },
});
