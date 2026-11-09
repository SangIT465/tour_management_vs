import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useResource } from '../hooks/use-resource';
import { date, money } from '../lib/format';
import type { AvailablePromotion } from '../lib/types';
import { Badge, Button, Card, Copy, LoadState, Title, colors, layout } from './ui';

export default function PromotionPicker({ code, subtotal, disabled, onSelect }: { code: string; subtotal?: number; disabled: boolean; onSelect: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const offers = useResource<AvailablePromotion[]>(open ? '/promotions/available' : null);
  return <View style={layout.gap}>
    <Button title={open ? 'Ẩn mã ưu đãi' : 'Chọn mã ưu đãi'} outline disabled={disabled} onPress={() => setOpen(value => !value)} />
    {open && <View style={layout.gap}>
      <Copy muted>Chọn mã rồi bấm áp dụng để hệ thống kiểm tra điều kiện và tính giảm giá.</Copy>
      <LoadState loading={offers.loading && !offers.data} error={offers.error} retry={offers.refresh} empty={!offers.loading && !offers.error && !offers.data?.length ? 'Chưa có mã phù hợp với tài khoản. Bạn vẫn có thể nhập mã riêng.' : undefined} />
      {offers.data?.map(offer => {
        const belowMinimum = subtotal !== undefined && subtotal < offer.minOrder;
        return <Card key={offer.code} style={s.offer}>
          <View style={layout.horizontal}><Title>{offer.code}</Title><Badge>{offer.type === 'PERCENT' ? `Giảm ${offer.value}%` : `Giảm ${money(offer.value)}`}</Badge></View>
          <Copy muted>Đơn từ {money(offer.minOrder)}{offer.type === 'PERCENT' && offer.maxDiscount != null ? ` · Giảm tối đa ${money(offer.maxDiscount)}` : ''}</Copy>
          <Copy muted>Hạn dùng {date(offer.validTo)} · Tối đa {offer.perUserLimit} lần / khách</Copy>
          {belowMinimum && <Copy muted>Đơn hiện tại chưa đủ mức tối thiểu.</Copy>}
          <Button title={code === offer.code ? `Đang chọn ${offer.code}` : `Chọn mã ${offer.code}`} small outline disabled={disabled || belowMinimum || !!offers.error} onPress={() => { onSelect(offer.code); setOpen(false); }} />
        </Card>;
      })}
    </View>}
  </View>;
}

const s = StyleSheet.create({ offer: { backgroundColor: colors.light, padding: 12 } });
