import React from 'react';
import { Tabs, router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText as Text } from '../../components/ui';
import Brand from '../../components/brand';
import { useSession } from '../../context/session';
import { fonts, palette, tracking } from '../../theme';

export default function TabsLayout() {
  return <Tabs screenOptions={{
    tabBarActiveTintColor: palette.ink,
    tabBarInactiveTintColor: '#9c9285',
    headerTitle: () => <Brand />,
    headerTitleAlign: 'left',
    headerRight: () => <HeaderActions />,
    headerStyle: { backgroundColor: palette.cream },
    headerShadowVisible: false,
    tabBarStyle: { borderTopColor: palette.line, borderTopWidth: 1, backgroundColor: palette.cream, ...(Platform.OS === 'web' ? { height: 68, paddingTop: 6, paddingBottom: 10 } : {}) },
    tabBarLabelStyle: { fontSize: 9, lineHeight: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: fonts.sans },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Trang chủ', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="explore" options={{ title: 'Khám phá', tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="bookings" options={{ title: 'Tour của tôi', tabBarIcon: ({ color, size }) => <Ionicons name="bag-handle-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="favorites" options={{ title: 'Yêu thích', tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="notifications" options={{ title: 'Thông báo', href: null }} />
    <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
  </Tabs>;
}

function HeaderActions() {
  const { user } = useSession();
  return <View style={s.actions}>
    <Pressable accessibilityRole="button" accessibilityLabel="Thông báo" onPress={() => router.navigate('/notifications')} style={s.icon}><Ionicons name="notifications-outline" size={22} color={palette.ink} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={user ? 'Tài khoản của bạn' : 'Đăng nhập'} onPress={() => router.navigate(user ? '/account' : '/login')} style={({ pressed }) => [user ? s.avatar : s.login, pressed && s.pressed]}>
      {user ? <Text style={s.initial}>{user.fullName.trim().charAt(0).toUpperCase()}</Text> : <Text style={s.loginText}>Đăng nhập</Text>}
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 14 },
  icon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  login: { backgroundColor: palette.ink, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  loginText: { color: palette.cream, fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },
  avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.sand, borderWidth: 1, borderColor: palette.line },
  initial: { color: palette.accentDark, fontFamily: fonts.serif, fontSize: 19 },
  pressed: { opacity: 0.7 },
});
