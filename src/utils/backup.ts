// 데이터 백업 — 네이티브 폴백
// 내보내기: JSON 텍스트를 시스템 공유 시트로 전달 (파일 저장은 추후 expo-file-system으로)
// 불러오기: 네이티브 파일 픽커 미구현 → null 반환 (웹에서 지원)

import { Share } from 'react-native';
import { AppData, todayKey } from '../storage';

export const canImportBackup = false;

export async function exportBackup(data: AppData): Promise<boolean> {
  try {
    await Share.share({
      title: `tracker-list-backup-${todayKey()}`,
      message: JSON.stringify(data),
    });
    return true;
  } catch {
    return false;
  }
}

export async function importBackup(): Promise<AppData | null> {
  return null;
}
