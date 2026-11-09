import PhotoBackdrop from '../components/photo-backdrop';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Screen, Card, Button, Message, colors, AppText as Text } from '../components/ui';
import Brand from '../components/brand';
import { heroImage } from '../lib/destinations';
import { useSession } from '../context/session';
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
    <PhotoBackdrop source={heroImage} style={s.hero}><LinearGradient colors={['#062a51c9', '#073b5b80']} style={s.heroInner}><Text style={s.kicker}>KHÁM PHÁ THẾ GIỚI CÙNG TOURGO</Text><Text style={s.heroTitle}>Mỗi chuyến đi{'\n'}là <Text style={s.accent}>một câu chuyện.</Text></Text><Text style={s.heroCopy}>Đăng nhập để quản lý tour, theo dõi hành trình và khám phá những điểm đến tuyệt vời.</Text></LinearGradient></PhotoBackdrop>
    <Card style={s.form}><Brand /><Text accessibilityRole="header" style={s.title}>{registering ? 'Tạo tài khoản TourGo' : 'Đăng nhập tài khoản'}</Text><Text style={s.intro}>{registering ? 'Bắt đầu hành trình mới. Tạo tài khoản để lưu tour yêu thích và quản lý chuyến đi của bạn.' : 'Chào mừng bạn trở lại! Đăng nhập để tiếp tục khám phá những hành trình tuyệt vời cùng TourGo.'}</Text>
      {registering && <AuthField label="Họ và tên" icon="person-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" maxLength={150} editable={!busy} placeholder="Nhập họ và tên" />}
      <AuthField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" maxLength={191} editable={!busy} placeholder="Nhập địa chỉ email" />
      {registering && <AuthField label="Số điện thoại (không bắt buộc)" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={20} editable={!busy} placeholder="0901234567" />}
      <AuthField label="Mật khẩu" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete={registering ? 'new-password' : 'current-password'} maxLength={72} editable={!busy} placeholder="Nhập mật khẩu" returnKeyType="go" onSubmitEditing={() => { void submit(); }} trailing={<Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setVisible(value => !value)} style={s.toggle}><Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} /></Pressable>} />
      {registering && <Text style={s.note}>Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</Text>}
      <View style={s.secure}><Ionicons name="shield-checkmark-outline" color={colors.green} size={15} /><Text style={s.note}>Đăng nhập an toàn bằng tài khoản TourGo</Text></View>
      <Message text={error} error /><Button title={registering ? 'Tạo tài khoản →' : 'Đăng nhập →'} busy={busy} onPress={() => { void submit(); }} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setRegistering(value => !value); setError(''); }} style={s.switch}><Text style={s.switchCopy}>{registering ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}<Text style={s.link}>{registering ? 'Đăng nhập' : 'Đăng ký ngay'}</Text></Text></Pressable>
    </Card>
  </Screen>;
}

function AuthField({ label, icon, trailing, ...props }: TextInputProps & { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; trailing?: React.ReactNode }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.inputRow}><Ionicons name={icon} color="#7386a2" size={20} /><TextInput autoCapitalize="none" placeholderTextColor="#8393aa" {...props} accessibilityLabel={label} style={s.input} />{trailing}</View></View>;
}

const s = StyleSheet.create({ hero: { backgroundColor: colors.navy }, heroInner: { padding: 24, gap: 12, paddingVertical: 30 }, kicker: { color: '#d2eafb', fontSize: 9, letterSpacing: 1.2 }, heroTitle: { color: '#fff', fontSize: 32, lineHeight: 37, fontWeight: '800', letterSpacing: -1 }, accent: { color: '#8af4df' }, heroCopy: { color: '#f2f8ff', fontSize: 12, lineHeight: 20, maxWidth: 440 }, form: { margin: 16, padding: 22, gap: 18 }, title: { color: colors.ink, fontSize: 25, fontWeight: '700', letterSpacing: -0.7, marginTop: 5 }, intro: { color: colors.muted, fontSize: 13, lineHeight: 21 }, field: { gap: 8 }, label: { color: colors.ink, fontSize: 13, fontWeight: '600' }, inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dce6f3', borderRadius: 8, paddingLeft: 12, backgroundColor: '#fbfdff' }, input: { flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: 10, paddingVertical: 12, color: colors.ink, fontSize: 15 }, toggle: { width: 44, height: 48, justifyContent: 'center', alignItems: 'center' }, secure: { flexDirection: 'row', gap: 7, alignItems: 'center' }, note: { fontSize: 11, lineHeight: 18, color: colors.muted, flexShrink: 1 }, switch: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, switchCopy: { fontSize: 13, color: colors.muted }, link: { color: colors.primary, fontWeight: '700' } });
