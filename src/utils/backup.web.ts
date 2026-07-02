// 데이터 백업 — 웹 구현
// 내보내기: JSON 파일 다운로드 / 불러오기: 파일 픽커 → 검증 → AppData 반환

import { AppData, isBackupShape, normalizeData, todayKey } from '../storage';

export const canImportBackup = true;

export async function exportBackup(data: AppData, filename?: string): Promise<boolean> {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `tracker-list-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return true;
  } catch {
    return false;
  }
}

export function importBackup(): Promise<AppData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          resolve(isBackupShape(parsed) ? normalizeData(parsed) : null);
        } catch {
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
