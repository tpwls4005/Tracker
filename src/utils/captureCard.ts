// 결산 카드 캡처 — 네이티브 스텁
// 웹에서는 captureCard.web.ts가 대신 로드된다(Metro 플랫폼 확장자 해석).
// 네이티브 이미지 저장은 후속: react-native-view-shot + expo-media-library 필요.

export const canCaptureImage = false;

export async function saveCardImage(_elementId: string, _filename: string): Promise<boolean> {
  return false;
}

export async function shareCardImage(
  _elementId: string,
  _filename: string,
  _text: string
): Promise<boolean> {
  return false;
}
