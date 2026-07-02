// 결산 카드 캡처 — 웹 구현 (html-to-image)
// nativeID로 심은 DOM 노드를 PNG로 렌더해 다운로드하거나, 파일 공유(Web Share)한다.

import type { RefObject } from 'react';
import { toPng } from 'html-to-image';

export const canCaptureImage = true;

async function renderPng(elementId: string): Promise<string | null> {
  const node = typeof document !== 'undefined' ? document.getElementById(elementId) : null;
  if (!node) return null;
  return toPng(node, { pixelRatio: 3, backgroundColor: '#FFFFFF', cacheBust: true });
}

// PNG 다운로드 (ref는 네이티브 전용 — 웹에서는 무시)
export async function saveCardImage(
  elementId: string,
  filename: string,
  _ref?: RefObject<any> | null
): Promise<boolean> {
  const dataUrl = await renderPng(elementId);
  if (!dataUrl) return false;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

// 이미지 파일 자체를 공유 (모바일 브라우저의 네이티브 공유 시트 → SNS/저장)
// 파일 공유 미지원 시 false 반환 (호출부에서 다운로드/텍스트로 폴백)
export async function shareCardImage(
  elementId: string,
  filename: string,
  text: string,
  _ref?: RefObject<any> | null
): Promise<boolean> {
  const dataUrl = await renderPng(elementId);
  if (!dataUrl) return false;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: 'image/png' });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], text });
      return true;
    }
  } catch {
    // 취소/미지원
  }
  return false;
}
