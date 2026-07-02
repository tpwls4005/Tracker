// 공유 시트 — 결산 카드 미리보기 + [이미지 저장] / [SNS 공유]
// 웹: html-to-image로 카드를 PNG 캡처(다운로드/파일공유). 네이티브: 텍스트 공유로 폴백.

import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import RecapCard from './RecapCard';
import { Theme, withAlpha } from '../theme';
import { AppData, MONTH_LABELS, monthAvgRate, monthDayKeys } from '../storage';
import { canCaptureImage, saveCardImage, shareCardImage } from '../utils/captureCard';

const CARD_ID = 'recap-card';

type Props = {
  theme: Theme;
  data: AppData;
  year: number;
  month: number | null; // 1~12
  onClose: () => void;
};

export default function ShareSheet({ theme, data, year, month, onClose }: Props) {
  const [status, setStatus] = useState<string>('');

  if (month == null) return null;

  const filename = `tracker-${year}-${String(month).padStart(2, '0')}.png`;
  const filled = monthDayKeys(year, month).filter((k) => data.entries[k]?.sentence.trim().length).length;
  const avg = monthAvgRate(data.entries, year, month, data.habits.length);
  const shareText =
    `${year} ${MONTH_LABELS[month - 1]} 회고\n기록 ${filled}일 · 평균 달성률 ${avg}%\n— Tracker List`;

  const onSaveImage = async () => {
    if (!canCaptureImage) {
      setStatus('이 기기에선 이미지 저장이 아직 지원되지 않아요');
      return;
    }
    setStatus('이미지를 만드는 중…');
    const ok = await saveCardImage(CARD_ID, filename);
    setStatus(ok ? '이미지를 저장했어요 ✓' : '저장에 실패했어요');
  };

  const onShare = async () => {
    // 1) 이미지 파일 공유 시도(모바일 브라우저) → 실패 시 텍스트 공유로 폴백
    if (canCaptureImage) {
      setStatus('공유 준비 중…');
      const shared = await shareCardImage(CARD_ID, filename, shareText);
      if (shared) {
        setStatus('');
        return;
      }
    }
    try {
      const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
      if (Platform.OS === 'web' && nav?.share) {
        await nav.share({ text: shareText });
      } else {
        await Share.share({ message: shareText });
      }
      setStatus('');
    } catch {
      setStatus('');
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.bg }]}>
          <ScrollView
            contentContainerStyle={styles.preview}
            showsVerticalScrollIndicator={false}
          >
            {/* 캡처 대상 카드 */}
            <View style={[styles.cardShadow, { borderColor: withAlpha(theme.fg, 0.12) }]}>
              <RecapCard theme={theme} data={data} year={year} month={month} nativeID={CARD_ID} />
            </View>
          </ScrollView>

          {status !== '' && (
            <Text style={[styles.status, { color: withAlpha(theme.fg, 0.55) }]}>{status}</Text>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={onSaveImage}
              style={({ pressed }) => [
                styles.btn,
                { borderColor: withAlpha(theme.fg, 0.25), opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.btnText, { color: theme.fg }]}>카드 이미지 저장</Text>
            </Pressable>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [
                styles.btn,
                styles.btnFilled,
                { backgroundColor: theme.fg, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.btnText, { color: theme.bg }]}>SNS 공유</Text>
            </Pressable>
          </View>

          <Pressable onPress={onClose} hitSlop={8} style={{ paddingVertical: 10 }}>
            <Text style={[styles.close, { color: withAlpha(theme.fg, 0.5) }]}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    maxHeight: '92%',
  },
  preview: { alignItems: 'center', paddingBottom: 8 },
  cardShadow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, overflow: 'hidden' },
  status: { fontSize: 13, marginTop: 6, marginBottom: 2, letterSpacing: 0.3 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14, width: '100%', paddingHorizontal: 8 },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnFilled: { borderColor: 'transparent' },
  btnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  close: { fontSize: 14, marginTop: 4 },
});
