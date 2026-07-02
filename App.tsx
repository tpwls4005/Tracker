// Tracker List — App 허브
// 데이터 로드/저장, 폰트 로드, 화면 라우팅 (라이트 전용)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AppData, loadData, saveData } from './src/storage';
import { lightTheme } from './src/theme';
import { installWebFont } from './src/webFont';
import LandingScreen from './src/screens/LandingScreen';
import MainScreen from './src/screens/MainScreen';
import DrawerScreen from './src/screens/DrawerScreen';

// 웹 전역 폰트(조선신명조) 강제 — 모듈 로드 시 1회
installWebFont();

type Screen = 'landing' | 'main' | 'drawer';

const theme = lightTheme;

const SCREEN_ORDER: Record<Screen, number> = { landing: 0, main: 1, drawer: 2 };

// 화면 전환 래퍼 — 마운트 시 방향(dir)에 따라 페이드 + 살짝 슬라이드-인
function AnimatedScreen({ dir, children }: { dir: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v]);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [dir * 22, 0] });
  return (
    <Animated.View style={{ flex: 1, opacity: v, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [screen, setScreen] = useState<Screen>('landing');
  const prevScreen = useRef<Screen>('landing');

  // 앱 폰트(조선신명조) 로드 — 웹·네이티브 공통 임베드
  const [fontsLoaded] = useFonts({ ChosunSm: require('./assets/fonts/ChosunSm.ttf') });

  // 전환 방향 계산용: 렌더 후 이전 화면 기록
  useEffect(() => {
    prevScreen.current = screen;
  }, [screen]);

  // 최초 로드
  useEffect(() => {
    let alive = true;
    loadData().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 변경 시 로컬 저장
  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  const update = useCallback((updater: (d: AppData) => AppData) => {
    setData((prev) => (prev ? updater(prev) : prev));
  }, []);

  // 데이터·폰트 준비 전: 빈 배경만
  if (!data || !fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  // 전환 방향: 더 깊은 화면으로 가면 +1(오른쪽에서), 돌아오면 -1(왼쪽에서)
  const dir = SCREEN_ORDER[screen] >= SCREEN_ORDER[prevScreen.current] ? 1 : -1;

  let content: React.ReactNode;
  if (screen === 'landing') {
    content = <LandingScreen theme={theme} onEnter={() => setScreen('main')} />;
  } else if (screen === 'main') {
    content = (
      <MainScreen
        theme={theme}
        data={data}
        update={update}
        onOpenDrawer={() => setScreen('drawer')}
      />
    );
  } else {
    content = <DrawerScreen theme={theme} data={data} onBack={() => setScreen('main')} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style="dark" />
      <AnimatedScreen key={screen} dir={dir}>
        {content}
      </AnimatedScreen>
    </View>
  );
}
