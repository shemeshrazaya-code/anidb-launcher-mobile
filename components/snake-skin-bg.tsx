import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

const SCALE_W = 28;
const SCALE_H = 24;
const TILE_W = SCALE_W;
const TILE_H = SCALE_H * 2;

export function SnakeSkinBg() {
  const base = '#0e0f10';
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
        <Rect width="100%" height="100%" fill={base} />
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
});
