import React, { useState } from 'react';
import { View } from 'react-native';
import { Screen, Heading, Card, Title, Copy, Field, Button, Message, LoadState, LoginRequired, Badge, layout } from '../components/ui';
import { api } from '../lib/api';
import { useResource } from '../hooks/use-resource';
import { dateTime } from '../lib/format';
import type { Page } from '../lib/types';

interface Ticket { id: string; subject: string; message: string; status: string; createdAt: string; replies: { authorName: string; message: string; createdAt: string }[] }
export default function SupportScreen() { return <LoginRequired next="/support"><Support /></LoginRequired>; }
function Support() {
  const [page, setPage] = useState(1);
  const resource = useResource<Page<Ticket>>(`/support/me?page=${page}&limit=10`);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyId, setReplyId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(id?: string) {
    if (busy) return;
    if (id ? !reply.trim() : subject.trim().length < 3 || message.trim().length < 10) { setError('Nhập đầy đủ tiêu đề (ít nhất 3 ký tự) và nội dung (ít nhất 10 ký tự).'); return; }
    setBusy(true); setError(''); setNotice('');
    try { await api.request(id ? `/support/${id}/replies` : '/support', { method: 'POST', body: id ? { message: reply.trim() } : { subject: subject.trim(), message: message.trim() } }); if (id) { setReply(''); setReplyId(null); } else { setSubject(''); setMessage(''); setPage(1); } resource.refresh(); setNotice('Đã gửi yêu cầu tới bộ phận hỗ trợ.'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không gửi được yêu cầu.'); }
    finally { setBusy(false); }
  }
  return <Screen refresh={resource.refresh} refreshing={resource.loading && !!resource.data}><Heading title="TourGo luôn sẵn sàng hỗ trợ" subtitle="Gửi câu hỏi về đơn đặt tour, thanh toán hoặc hành trình của bạn." /><Message text={error} error /><Message text={notice} /><Card><Title>Gửi yêu cầu mới</Title><Field label="Tiêu đề" value={subject} onChangeText={setSubject} maxLength={200} editable={!busy} /><Field label="Nội dung" multiline value={message} onChangeText={setMessage} maxLength={4000} editable={!busy} hint="Ghi kèm mã đơn nếu cần hỗ trợ một đơn đặt tour cụ thể." /><Button title="Gửi yêu cầu hỗ trợ" busy={busy} onPress={() => { void submit(); }} /></Card>
    <Title>Lịch sử hỗ trợ</Title><LoadState loading={resource.loading && !resource.data} error={resource.error} retry={resource.refresh} empty={!resource.loading && !resource.error && !resource.data?.items.length ? 'Bạn chưa có yêu cầu hỗ trợ nào.' : undefined} />{resource.data?.items.map(ticket => <Card key={ticket.id}><Badge>{{ OPEN: 'Mới tiếp nhận', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý' }[ticket.status] ?? ticket.status}</Badge><Title>{ticket.subject}</Title><Copy>{ticket.message}</Copy><Copy muted>{dateTime(ticket.createdAt)}</Copy>{ticket.replies.map((entry, index) => <View key={index} style={layout.gap}><Copy>{entry.authorName}: {entry.message}</Copy><Copy muted>{dateTime(entry.createdAt)}</Copy></View>)}<Button title="Gửi phản hồi" small outline disabled={busy} onPress={() => { setReplyId(ticket.id); setReply(''); }} />{replyId === ticket.id && <><Field label="Phản hồi của bạn" multiline value={reply} onChangeText={setReply} maxLength={4000} editable={!busy} /><Button title="Gửi phản hồi" busy={busy} onPress={() => { void submit(ticket.id); }} /></>}</Card>)}{page > 1 && <Button title="Trang trước" outline onPress={() => setPage(value => value - 1)} />}{resource.data && page * 10 < resource.data.total && <Button title="Trang sau" outline onPress={() => setPage(value => value + 1)} />}</Screen>;
}
