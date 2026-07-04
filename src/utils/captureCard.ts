// 결산 카드 캡처 — 네이티브 구현 (react-native-view-shot + expo-media-library + expo-sharing)
// 웹에서는 captureCard.web.ts가 대신 로드된다(Metro 플랫폼 확장자 해석).
// 웹은 DOM id로 노드를 찾지만, 네이티브는 뷰 ref가 필요하다 → ref 파라미터 사용.
// SDK 56 주의: saveToLibraryAsync/createAssetAsync는 deprecated(런타임 throw) → Asset.create 사용.

import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// SDK 57 주의: Expo Go에는 media-library 네이티브 모듈(ExpoMediaLibraryNext)이 없어
// 정적 import 시 앱 부팅 자체가 죽는다 → 지연 require + 실패 시 null (공유 시트로 대체)
let MediaLibrary: typeof import('expo-media-library') | null = null;
try {
  MediaLibrary = require('expo-media-library');
} catch {
  MediaLibrary = null;
}

export const canCaptureImage = true;

async function renderPng(ref?: RefObject<any> | null): Promise<string | null> {
  if (!ref?.current) return null;
  try {
    return await captureRef(ref, { format: 'png', quality: 1 });
  } catch {
    return null;
  }
}

// 사진 앨범에 저장
export async function saveCardImage(
  _elementId: string,
  _filename: string,
  ref?: RefObject<any> | null
): Promise<boolean> {
  const uri = await renderPng(ref);
  if (!uri) return false;
  // Expo Go처럼 media-library가 없는 환경: 공유 시트로 대체 (거기서 갤러리 저장 가능)
  if (!MediaLibrary) {
    try {
      if (!(await Sharing.isAvailableAsync())) return false;
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      return true;
    } catch {
      return false;
    }
  }
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true); // writeOnly
    if (!perm.granted) return false;
    await MediaLibrary.Asset.create(uri);
    return true;
  } catch {
    return false;
  }
}

// 시스템 공유 시트로 이미지 파일 공유
export async function shareCardImage(
  _elementId: string,
  _filename: string,
  text: string,
  ref?: RefObject<any> | null
): Promise<boolean> {
  const uri = await renderPng(ref);
  if (!uri) return false;
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: text });
    return true;
  } catch {
    return false;
  }
}
