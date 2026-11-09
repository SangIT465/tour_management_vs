import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { api } from './api';

export async function openInvoice(bookingId: string, share: boolean) {
  const document = await api.request<{ number: string; html: string }>(`/bookings/${bookingId}/invoice/document`);
  if (!share || Platform.OS === 'web') { await Print.printAsync({ html: document.html }); return; }
  if (!await Sharing.isAvailableAsync()) throw new Error('Thiết bị này chưa hỗ trợ chia sẻ tệp. Hãy dùng chức năng in hóa đơn.');
  const file = await Print.printToFileAsync({ html: document.html, width: 595, height: 842 });
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Hóa đơn ${document.number}` });
}
