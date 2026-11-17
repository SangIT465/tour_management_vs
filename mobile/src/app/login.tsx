import PhotoBackdrop from '../components/photo-backdrop';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Screen, Card, Button, Message, AppText as Text } from '../components/ui';
import Brand from '../components/brand';
import { heroImage } from '../lib/destinations';
import { useSession } from '../context/session';
import { fonts, palette, tracking } from '../theme';
import { safeNext } from '../lib/format';

export default function Login() {
  const params = useLocalSearchParams<{ next?: string }>();
  const session = useSession();
  const [registering, setRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    if (!email.trim() || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    if (registering && (fullName.trim().length < 2 || password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))) { setError('Nhập họ tên và mật khẩu ít nhất 8 ký tự, có chữ hoa, chữ thường và số.'); return; }
    setBusy(true); setError('');
    try {
      if (registering) await session.register({ email, password, fullName, phone });
      else await session.login(email, password);
      router.replace(safeNext(params.next) as Href);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không đăng nhập được.'); }
    finally { setBusy(false); }
  }
  return <Screen padded={false}>
    <PhotoBackdrop source={heroImage} style={s.hero}><LinearGradient colors={['#1a1510e6', '#211d18b3']} style={s.heroInner}>
      <Text style={s.kicker}>KHÁM PHÁ THẾ GIỚI CÙNG TOURGO</Text>
      <Text style={s.heroTitle}>Mỗi chuyến đi{'\n'}là <Text style={s.accent}>một câu chuyện.</Text></Text>
      <Text style={s.heroCopy}>Đăng nhập để quản lý tour, theo dõi hành trình và khám phá những điểm đến tuyệt vời.</Text>
    </LinearGradient></PhotoBackdrop>
    <Card style={s.form}>
      <Brand />
      <Text accessibilityRole="header" style={s.title}>{registering ? 'Tạo tài khoản TourGo' : 'Đăng nhập tài khoản'}</Text>
      <Text style={s.intro}>{registering ? 'Bắt đầu hành trình mới. Tạo tài khoản để lưu tour yêu thích và quản lý chuyến đi của bạn.' : 'Chào mừng bạn trở lại! Đăng nhập để tiếp tục khám phá những hành trình tuyệt vời cùng TourGo.'}</Text>
      {registering && <AuthField label="Họ và tên" icon="person-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" maxLength={150} editable={!busy} placeholder="Nhập họ và tên" />}
      <AuthField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" maxLength={191} editable={!busy} placeholder="Nhập địa chỉ email" />
      {registering && <AuthField label="Số điện thoại (không bắt buộc)" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={20} editable={!busy} placeholder="0901234567" />}
      <AuthField label="Mật khẩu" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete={registering ? 'new-password' : 'current-password'} maxLength={72} editable={!busy} placeholder="Nhập mật khẩu" returnKeyType="go" onSubmitEditing={() => { void submit(); }} trailing={<Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setVisible(value => !value)} style={s.toggle}><Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={20} color={palette.muted} /></Pressable>} />
      {registering && <Text style={s.note}>Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</Text>}
      <View style={s.secure}><Ionicons name="shield-checkmark-outline" color={palette.successInk} size={14} /><Text style={s.note}>Đăng nhập an toàn bằng tài khoản TourGo</Text></View>
      <Message text={error} error />
      <Button title={registering ? 'Tạo tài khoản' : 'Đăng nhập'} busy={busy} onPress={() => { void submit(); }} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setRegistering(value => !value); setError(''); }} style={s.switch}><Text style={s.switchCopy}>{registering ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}<Text style={s.link}>{registering ? 'Đăng nhập' : 'Đăng ký ngay'}</Text></Text></Pressable>
    </Card>
  </Screen>;
}

function AuthField({ label, icon, trailing, ...props }: TextInputProps & { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; trailing?: React.ReactNode }) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <View style={s.inputRow}><Ionicons name={icon} color={palette.muted} size={18} /><TextInput autoCapitalize="none" placeholderTextColor="#9c9285" selectionColor={palette.accent} {...props} accessibilityLabel={label} style={s.input} />{trailing}</View>
  </View>;
}

const s = StyleSheet.create({
  hero: { backgroundColor: palette.ink },
  heroInner: { paddingHorizontal: 24, paddingVertical: 40, gap: 14 },
  kicker: { color: palette.gold, fontSize: 9, letterSpacing: tracking.eyebrow },
  heroTitle: { color: palette.cream, fontFamily: fonts.serif, fontSize: 40, lineHeight: 44 },
  accent: { fontFamily: fonts.serif, fontStyle: 'italic', color: palette.gold },
  heroCopy: { color: '#e8e0d4', fontSize: 13, lineHeight: 22, maxWidth: 440 },
  form: { margin: 20, padding: 26, gap: 18 },
  title: { color: palette.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 35, marginTop: 4 },
  intro: { color: palette.muted, fontSize: 13, lineHeight: 22 },
  field: { gap: 8 },
  label: { color: palette.muted, fontSize: 10, fontWeight: '600', letterSpacing: tracking.label, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.line, paddingLeft: 14, backgroundColor: palette.white },
  input: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 10, paddingVertical: 13, color: palette.ink, fontSize: 15, fontFamily: fonts.sans },
  toggle: { width: 44, height: 50, justifyContent: 'center', alignItems: 'center' },
  secure: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  note: { fontSize: 11, lineHeight: 18, color: palette.muted, flexShrink: 1 },
  switch: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  switchCopy: { fontSize: 13, color: palette.muted },
  link: { color: palette.accentDark, fontWeight: '600', textDecorationLine: 'underline' },
});
