import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { AppText as Text } from './ui';

/** The same mountain and river mark used by the customer website. */
export default function Brand() {
  return <Pressable accessibilityRole="button" accessibilityLabel="TourGo trang chủ" onPress={() => router.navigate('/')} style={s.brand}>
    <Svg width={42} height={34} viewBox="0 0 56 44" fill="none">
      <Path d="M3 34 19 10l10 15 8-14 16 25H38L28 24 18 38Z" fill="#0068ff" />
      <Path d="m23 16 11-15 17 26-9-2L34 12l-6 10Z" fill="#00c889" />
      <Path d="m5 38 14-10 9 7c9 7 15 7 25-1" stroke="#0068ff" strokeWidth={4} strokeLinecap="round" />
      <Path d="m15 18 4-6 5 8-5-2Z" fill="white" />
    </Svg>
    <Text style={s.name}>TourGo</Text>
  </Pressable>;
}

const s = StyleSheet.create({ brand: { flexDirection: 'row', alignItems: 'center', gap: 6 }, name: { color: '#06409c', fontSize: 26, fontWeight: '800', letterSpacing: -0.9 } });
