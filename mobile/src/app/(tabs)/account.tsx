import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Heading, Copy, Field, Button, Message, LoginRequired, AppText as Text, ListRow, SectionLabel, Sheet } from '../../components/ui';
import { useSession } from '../../context/session';
import { api } from '../../lib/api';
import { fonts, palette, tracking } from '../../theme';

export default function AccountScreen() { return <LoginRequired next="/account"><Account /></LoginRequired>; }
function Account() {
  const session = useSession();
  const [name, setName] = useState(session.user?.fullName ?? '');
  const [phone, setPhone] = useState(session.user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sheet, setSheet] = useState<'profile' | 'password' | null>(null);
  async function save() {
    if (busy) return;
    if (name.trim().length < 2) { setError('Họ tên cần ít nhất 2 ký tự.'); return; }
    setBusy(true); setError(''); setNotice('');
    try { await api.request('/auth/me', { method: 'PATCH', body: { fullName: name.trim(), phone: phone.trim() } }); await session.reload(); setNotice('Đã cập nhật thông tin tài khoản.'); setSheet(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không lưu được tài khoản.'); }
    finally { setBusy(false); }
  }
  async function changePassword() {
    if (busy) return;
    if (!currentPassword || newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) { setError('Nhập mật khẩu hiện tại và mật khẩu mới ít nhất 8 ký tự, có chữ hoa, chữ thường và số.'); return; }
    setBusy(true); setError('');
    try { await api.request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }); await api.setSession(null); router.replace('/login'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không đổi được mật khẩu.'); }
    finally { setBusy(false); }
  }
  function logout() {
    const run = async () => { setBusy(true); try { await session.logout(); } catch { } finally { setBusy(false); router.replace('/(tabs)'); } };
    if (Platform.OS === 'web') { if (globalThis.confirm('Đăng xuất tài khoản TourGo?')) void run(); }
    else Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi tài khoản?', [{ text: 'Quay lại', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: () => { void run(); } }]);
  }
  const initial = (session.user?.fullName ?? 'T').trim().charAt(0).toUpperCase();
  return <Screen>
    <Heading eyebrow="TÀI KHOẢN TOURGO" title={`Xin chào, ${session.user?.fullName ?? 'bạn'}`} subtitle="Một tài khoản cho mọi hành trình trên web và điện thoại." />
    <View style={s.identity}>
      <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
      <View style={s.identityCopy}>
        <Text style={s.identityName}>{session.user?.fullName ?? 'Khách TourGo'}</Text>
        <Text style={s.identityMeta}>{session.user?.email ?? ''}</Text>
      </View>
    </View>
    <Message text={error} error /><Message text={notice} />

    <View style={s.section}>
      <SectionLabel>Cá nhân</SectionLabel>
      <View style={s.listGroup}>
        <ListRow icon="person-outline" label="Hồ sơ cá nhân" hint="Họ tên, số điện thoại" value={session.user?.fullName ?? ''} onPress={() => setSheet('profile')} />
        <ListRow icon="mail-outline" label="Email tài khoản" value={session.user?.email ?? ''} last />
      </View>
    </View>

    <View style={s.section}>
      <SectionLabel>Bảo mật</SectionLabel>
      <View style={s.listGroup}>
        <ListRow icon="lock-closed-outline" label="Đổi mật khẩu" hint="Yêu cầu đăng nhập lại sau khi đổi" onPress={() => setSheet('password')} />
        <ListRow icon="log-out-outline" label="Đăng xuất" danger onPress={logout} last />
      </View>
    </View>

    <View style={s.section}>
      <SectionLabel>Hỗ trợ</SectionLabel>
      <View style={s.listGroup}>
        <ListRow icon="headset-outline" label="Hỗ trợ khách hàng" hint="Gửi câu hỏi, theo dõi phản hồi" onPress={() => router.push('/support')} last />
      </View>
    </View>

    <Sheet open={sheet === 'profile'} onClose={() => setSheet(null)} title="Hồ sơ cá nhân" footer={<Button title="Lưu thông tin" busy={busy} onPress={() => { void save(); }} />}>
      <Field label="Họ và tên" value={name} onChangeText={setName} autoCapitalize="words" maxLength={150} editable={!busy} />
      <Field label="Điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} editable={!busy} placeholder="0901234567" />
    </Sheet>

    <Sheet open={sheet === 'password'} onClose={() => setSheet(null)} title="Đổi mật khẩu" footer={<Button title="Đổi mật khẩu" outline busy={busy} onPress={() => { void changePassword(); }} />}>
      <Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" editable={!busy} maxLength={72} />
      <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" editable={!busy} maxLength={72} hint="Ít nhất 8 ký tự, có chữ hoa, chữ thường và số." />
      <Copy muted>Đổi mật khẩu thành công sẽ yêu cầu đăng nhập lại.</Copy>
    </Sheet>
  </Screen>;
}

const s = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 2, borderTopColor: palette.ink, backgroundColor: palette.sand, padding: 18 },
  avatar: { width: 56, height: 56, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.serif, fontSize: 26, color: palette.gold },
  identityCopy: { flex: 1, gap: 3 },
  identityName: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: palette.ink },
  identityMeta: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: tracking.label, textTransform: 'uppercase', color: palette.muted },
  section: { gap: 10 },
  listGroup: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 14 },
});
