// 결산 카드 캡처 — 네이티브 구현 (react-native-view-shot + expo-media-library + expo-sharing)
// 웹에서는 captureCard.web.ts가 대신 로드된다(Metro 플랫폼 확장자 해석).
// 웹은 DOM id로 노드를 찾지만, 네이티브는 뷰 ref가 필요하다 → ref 파라미터 사용.
// SDK 56 주의: saveToLibraryAsync/createAssetAsync는 deprecated(런타임 throw) → Asset.create 사용.

import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

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
