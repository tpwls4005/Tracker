// 앱 전역 폰트(조선신명조) 강제 — 네이티브에서는 RN Text/TextInput에 fontFamily를
// 자동 상속시킬 방법이 없어(React 19는 함수형 컴포넌트 defaultProps 미지원),
// 매 사용처에서 이 래퍼로 fontFamily를 덮어씌운다. 웹은 webFont.ts가 CSS로 강제.
import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
} from 'react-native';

const FONT_FAMILY = 'ChosunSm';

export function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={[style, { fontFamily: FONT_FAMILY }]} />;
}

export function TextInput({ style, ...rest }: TextInputProps) {
  return <RNTextInput {...rest} style={[style, { fontFamily: FONT_FAMILY }]} />;
}
