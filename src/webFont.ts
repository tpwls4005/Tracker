// 웹 전역 폰트 강제 — 조선신명조(ChosunSm)
// 문제: react-native-web은 각 텍스트에 기본 폰트 스택을 심어서, fontFamily를
//       명시하지 않으면 앱 폰트가 적용되지 않는다.
// 해결: 실제 폰트 로드는 App.tsx의 expo-font(useFonts)가 @font-face로 처리하고,
//       여기서는 전역 font-family만 강제해 모든 텍스트(SVG 라벨 포함)를 통일한다.
// 'ChosunSm'  = expo-font가 임베드한 패밀리(어느 기기에서나 동작)
// '조선신명조' = 사용자 기기에 설치돼 있을 경우의 폴백

import { Platform } from 'react-native';

const FONT_STACK =
  "'ChosunSm', '조선신명조', 'Apple SD Gothic Neo', 'Malgun Gothic', serif";

export function installWebFont(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('app-web-font')) return;

  const style = document.createElement('style');
  style.id = 'app-web-font';
  style.textContent = `
    html, body, #root, * {
      font-family: ${FONT_STACK} !important;
    }
    body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  `;
  document.head.appendChild(style);
}
