import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { useAppBackground } from '@/src/services/background';

const SCALE_W = 28;
const SCALE_H = 24;
const TILE_W = SCALE_W;
const TILE_H = SCALE_H * 2;
const BASE = '#0e0f10';

export function AppBackground() {
  const { config } = useAppBackground();

  if (config.variant === 'custom' && config.customUri) {
    return (
      <View style={styles.bg} pointerEvents="none">
        <Image
          source={{ uri: config.customUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View style={[StyleSheet.absoluteFill, styles.customOverlay]} />
      </View>
    );
  }

  if (config.variant === 'solid') {
    return <View style={[styles.bg, { backgroundColor: BASE }]} pointerEvents="none" />;
  }

  if (config.variant === 'gradient') {
    return (
      <View style={styles.bg} pointerEvents="none">
        <LinearGradient
          colors={['#1a1226', '#0e0f10', '#0e0f10']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  if (config.variant === 'aurora') {
    return <AuroraBackground />;
  }

  return <SnakeSkin />;
}

function AuroraBackground() {
  return (
    <View style={styles.bg} pointerEvents="none">
      <LinearGradient
        colors={['#071314', '#0d1015', '#101014']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(45,212,191,0.22)', 'rgba(18,24,32,0.08)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(139,92,246,0.15)', 'rgba(8,10,12,0.25)']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.softNoise]} />
    </View>
  );
}

function SnakeSkin() {
  const scaleFill = '#16161b';
  const scaleHighlight = 'rgba(139, 92, 246, 0.045)';
  const scaleStroke = 'rgba(255, 255, 255, 0.025)';
  const scalePath = `M0 ${SCALE_H} Q ${SCALE_W / 2} 0, ${SCALE_W} ${SCALE_H} Z`;

  return (
    <View style={styles.bg} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="scales"
            x="0"
            y="0"
            width={TILE_W}
            height={TILE_H}
            patternUnits="userSpaceOnUse">
            <Path d={scalePath} fill={scaleFill} stroke={scaleStroke} strokeWidth={0.5} />
            <Path d={scalePath} fill={scaleHighlight} />
            <Path
              d={scalePath}
              fill={scaleFill}
              stroke={scaleStroke}
              strokeWidth={0.5}
              transform={`translate(${SCALE_W / 2} ${SCALE_H})`}
            />
            <Path
              d={scalePath}
              fill={scaleHighlight}
              transform={`translate(${SCALE_W / 2} ${SCALE_H})`}
            />
            <Path
              d={scalePath}
              fill={scaleFill}
              stroke={scaleStroke}
              strokeWidth={0.5}
              transform={`translate(-${SCALE_W / 2} ${SCALE_H})`}
            />
            <Path
              d={scalePath}
              fill={scaleHighlight}
              transform={`translate(-${SCALE_W / 2} ${SCALE_H})`}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={BASE} />
        <Rect width="100%" height="100%" fill="url(#scales)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  customOverlay: { backgroundColor: 'rgba(0,0,0,0.4)' },
  softNoise: { backgroundColor: 'rgba(255,255,255,0.015)' },
});
