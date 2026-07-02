// Tracker List — 디자인 토큰
// 핵심 원칙: 모노톤 미니멀리즘(B&W) + 투명도 기반 계층화

export type Theme = {
  bg: string;
  fg: string;
  isDark: boolean;
};

// 라이트: 흰 배경 / 잉크 텍스트
export const lightTheme: Theme = { bg: '#FFFFFF', fg: '#111111', isDark: false };

// 다크모드 인버전: 완전 블랙 배경 / 완전 화이트 텍스트·라인
export const darkTheme: Theme = { bg: '#000000', fg: '#FFFFFF', isDark: true };

// 투명도 토큰 — 농도/투명도만으로 데이터의 유효성·선후관계를 표현
export const OPACITY = {
  yesterday: 0.4, // 어제의 문장 (리마인드용 연한 회색)
  ghost: 0.25, // 더 먼 과거 / 비활성 힌트
  graphFill: 0.05, // 라이브 그래프 하단 면적 (시각적 안정감)
  hairline: 0.12, // 미니멀 실선/구분선
};

// fg(#111111 또는 #FFFFFF)를 알파 적용한 rgba 문자열로 변환
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
