import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen, Heading, Card, Title, Copy, Row, Field, Button, Message, LoginRequired } from '../../components/ui';
import { useSession } from '../../context/session';
import { api } from '../../lib/api';

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
  async function save() {
    if (busy) return;
    if (name.trim().length < 2) { setError('Họ tên cần ít nhất 2 ký tự.'); return; }
    setBusy(true); setError(''); setNotice('');
    try { await api.request('/auth/me', { method: 'PATCH', body: { fullName: name.trim(), phone: phone.trim() } }); await session.reload(); setNotice('Đã cập nhật thông tin tài khoản.'); }
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
    const run = async () => { setBusy(true); try { await session.logout(); } catch {} finally { setBusy(false); router.replace('/(tabs)'); } };
    if (Platform.OS === 'web') { if (globalThis.confirm('Đăng xuất tài khoản TourGo?')) void run(); }
    else Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi tài khoản?', [{ text: 'Quay lại', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: () => { void run(); } }]);
  }
  return <Screen><Heading title={`Xin chào, ${session.user?.fullName ?? 'bạn'}`} subtitle="Một tài khoản cho mọi hành trình trên web và điện thoại." /><Message text={error} error /><Message text={notice} /><Card><Title>Hồ sơ cá nhân</Title><Row label="Email tài khoản" value={session.user?.email ?? ''} /><Field label="Họ và tên" value={name} onChangeText={setName} autoCapitalize="words" maxLength={150} editable={!busy} /><Field label="Điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} editable={!busy} /><Button title="Lưu thông tin" busy={busy} onPress={() => { void save(); }} /></Card>
    <Card><Title>Bảo mật tài khoản</Title><Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" editable={!busy} maxLength={72} /><Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" editable={!busy} maxLength={72} hint="Ít nhất 8 ký tự, có chữ hoa, chữ thường và số." /><Copy muted>Đổi mật khẩu thành công sẽ yêu cầu đăng nhập lại.</Copy><Button title="Đổi mật khẩu" outline busy={busy} onPress={() => { void changePassword(); }} /></Card>
    <Button title="Hỗ trợ khách hàng" outline onPress={() => router.push('/support')} /><Button title="Đăng xuất" danger disabled={busy} onPress={logout} />
  </Screen>;
}
