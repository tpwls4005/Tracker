// 데이터 백업 — 네이티브 구현
// 내보내기: JSON을 캐시에 .json 파일로 쓰고 시스템 공유 시트로 전달 (파일 앱 저장·카톡 전송 등)
// 불러오기: 문서 픽커로 .json 선택 → 검증 → AppData 반환
// SDK 56 주의: FileSystem.readAsStringAsync 등 legacy API는 main export에서 런타임 throw → File/Paths 클래스 사용.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppData, isBackupShape, normalizeData, todayKey } from '../storage';

export const canImportBackup = true;

// 'cancelled' = 사용자가 픽커를 닫음(오류 아님), null = 파일이 백업 형태가 아님
export type ImportResult = AppData | 'cancelled' | null;

export async function exportBackup(data: AppData, filename?: string): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const name = filename ?? `tracker-list-backup-${todayKey()}.json`;
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete(); // 같은 달을 다시 내보낼 때 이전 파일 대체
    file.create();
    file.write(JSON.stringify(data, null, 2));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: name });
    return true;
  } catch {
    return false;
  }
}

export async function importBackup(): Promise<ImportResult> {
  try {
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return 'cancelled';
    const uri = picked.assets?.[0]?.uri;
    if (!uri) return null;
    const parsed = JSON.parse(await new File(uri).text());
    return isBackupShape(parsed) ? normalizeData(parsed) : null;
  } catch {
    return null;
  }
}
