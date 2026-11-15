import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { TourDetail } from '../lib/types';
import { api } from '../lib/api';
import { heroImage } from '../lib/destinations';
import { palette } from '../theme';

export default function TourGallery({ tour }: { tour: TourDetail }) {
  const images = [...tour.images].sort((left, right) => Number(right.isCover) - Number(left.isCover));
  const [selected, setSelected] = useState(0);
  const [failedUri, setFailedUri] = useState<string>();
  const uri = api.assetUrl(images[selected]?.url ?? tour.coverImageUrl);
  return <View style={s.gallery}>
    <Image source={uri && failedUri !== uri ? { uri } : heroImage} accessibilityLabel={tour.name} style={s.cover} resizeMode="cover" onError={() => setFailedUri(uri)} />
    {images.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbnails}>{images.map((image, index) => <Pressable key={image.id} accessibilityRole="button" accessibilityLabel={`Xem ảnh ${index + 1}`} accessibilityState={{ selected: selected === index }} onPress={() => setSelected(index)} style={[s.thumbnail, selected === index && s.selected]}><Image source={{ uri: api.assetUrl(image.url) }} style={s.thumbnailImage} resizeMode="cover" /></Pressable>)}</ScrollView>}
  </View>;
}

const s = StyleSheet.create({
  gallery: { gap: 10 },
  cover: { width: '100%', aspectRatio: 4 / 3, backgroundColor: palette.sand },
  thumbnails: { gap: 8 },
  thumbnail: { borderBottomWidth: 2, borderBottomColor: 'transparent', paddingBottom: 3 },
  selected: { borderBottomColor: palette.ink },
  thumbnailImage: { width: 74, height: 56, backgroundColor: palette.sand },
});
