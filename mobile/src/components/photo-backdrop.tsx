import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageProps } from 'expo-image';

/** Explicitly constrain the photo to its container on Android, iOS and web. */
export default function PhotoBackdrop({ source, style, accessibilityLabel, children }: React.PropsWithChildren<{ source: ImageProps['source']; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }>) {
  return <View style={[s.container, style]}><Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={accessibilityLabel} />{children}</View>;
}

const s = StyleSheet.create({ container: { overflow: 'hidden' } });
