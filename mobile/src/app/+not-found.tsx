import React from 'react';
import { router } from 'expo-router';
import { Screen, Heading, Button } from '../components/ui';
export default function NotFound() { return <Screen><Heading title="Không tìm thấy trang" subtitle="Đường dẫn này không có trong ứng dụng TourGo." /><Button title="Về trang khám phá" onPress={() => router.replace('/(tabs)')} /></Screen>; }
