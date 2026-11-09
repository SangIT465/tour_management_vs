import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '../context/session';
import { colors } from '../components/ui';

export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerTintColor: colors.primary, headerStyle: { backgroundColor: '#fff' }, headerTitleStyle: { color: colors.ink }, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="login" options={{ title: 'Tài khoản TourGo', presentation: 'modal' }} />
    <Stack.Screen name="tours/[id]" options={{ title: 'Chi tiết hành trình' }} />
    <Stack.Screen name="booking/[id]" options={{ title: 'Đặt tour' }} />
    <Stack.Screen name="bookings/[id]" options={{ title: 'Đơn đặt tour' }} />
    <Stack.Screen name="payment/[id]" options={{ title: 'Thanh toán' }} />
    <Stack.Screen name="support" options={{ title: 'Hỗ trợ khách hàng' }} />
    <Stack.Screen name="review/[id]" options={{ title: 'Đánh giá chuyến đi' }} />
  </Stack></SessionProvider></SafeAreaProvider>;
}
