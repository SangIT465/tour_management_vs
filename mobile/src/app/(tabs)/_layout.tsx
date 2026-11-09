import React from 'react';
import { Tabs, router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, AppText as Text } from '../../components/ui';
import Brand from '../../components/brand';
import { useSession } from '../../context/session';

export default function TabsLayout() {
  return <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, headerTitle: () => <Brand />, headerTitleAlign: 'left', headerRight: () => <HeaderActions />, headerStyle: { backgroundColor: '#fff' }, headerShadowVisible: false, tabBarStyle: { borderTopColor: colors.border, backgroundColor: '#fff', ...(Platform.OS === 'web' ? { height: 65, paddingTop: 5, paddingBottom: 8 } : {}) }, tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontWeight: '600' } }}>
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
  return <View style={s.actions}><Pressable accessibilityRole="button" accessibilityLabel="Thông báo" onPress={() => router.navigate('/notifications')} style={s.icon}><Ionicons name="notifications-outline" size={23} color={colors.ink} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={user ? 'Tài khoản của bạn' : 'Đăng nhập'} onPress={() => router.navigate(user ? '/account' : '/login')} style={user ? s.avatar : s.login}>{user ? <Text style={s.initial}>{user.fullName.trim().charAt(0).toUpperCase()}</Text> : <Text style={s.loginText}>Đăng nhập</Text>}</Pressable></View>;
}

const s = StyleSheet.create({ actions: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 12 }, icon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, login: { backgroundColor: colors.primary, borderRadius: 7, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' }, loginText: { color: '#fff', fontSize: 12, fontWeight: '700' }, avatar: { width: 40, height: 40, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0edff' }, initial: { color: '#1659ae', fontWeight: '700', fontSize: 18 } });
