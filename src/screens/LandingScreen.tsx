// Section 1: Landing Page
// 화면 중앙에 'Tracker List' 볼드 텍스트 + 우상향 꺾은선 로고 드로잉 애니메이션

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Typography';
import LogoMark from '../components/LogoMark';
import { Theme, withAlpha } from '../theme';

type Props = {
  theme: Theme;
  onEnter: () => void;
};

export default function LandingScreen({ theme, onEnter }: Props) {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(titleOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [titleOpacity]);

  const handleLogoDone = () => {
    // 로고 드로잉(0.8초) 완료 → 진입 힌트 페이드인, 잠시 후 자동 진입
    Animated.timing(hintOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    // 완성된 로고와 힌트가 잠시 머문 뒤 자동 진입 (탭하면 즉시 진입)
    const id = setTimeout(onEnter, 1500);
    return () => clearTimeout(id);
  };

  return (
    <Pressable style={[styles.root, { backgroundColor: theme.bg }]} onPress={onEnter}>
      <View style={styles.center}>
        <Animated.Text style={[styles.title, { color: theme.fg, opacity: titleOpacity }]}>
          Tracker List
        </Animated.Text>
        <View style={styles.logoWrap}>
          <LogoMark color={theme.fg} size={140} onDone={handleLogoDone} />
        </View>
      </View>
      <Animated.Text
        style={[styles.hint, { color: withAlpha(theme.fg, 0.4), opacity: hintOpacity }]}
      >
        화면을 눌러 시작하기
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'ChosunSm',
  },
  logoWrap: { marginTop: 28 },
  hint: {
    position: 'absolute',
    bottom: 64,
    fontSize: 13,
    letterSpacing: 0.5,
    fontFamily: 'ChosunSm',
  },
});
