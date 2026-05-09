import { StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export function BrandWordmark({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Svg width={184} height={44} viewBox="0 0 184 44" style={style}>
      <Defs>
        <LinearGradient id="wordFill" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#67e8f9" />
          <Stop offset="0.46" stopColor="#f8fafc" />
          <Stop offset="1" stopColor="#c4b5fd" />
        </LinearGradient>
        <LinearGradient id="markFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fbbf24" />
          <Stop offset="1" stopColor="#a78bfa" />
        </LinearGradient>
      </Defs>
      <Path
        d="M5 37 C42 43 101 42 151 35"
        fill="none"
        stroke="#67e8f9"
        strokeLinecap="round"
        strokeOpacity={0.38}
        strokeWidth={2}
      />
      <SvgText
        x={3}
        y={30}
        fill="url(#wordFill)"
        fontFamily="sans-serif-condensed"
        fontSize={31}
        fontWeight="900"
        letterSpacing={0}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={0.35}>
        Anime
      </SvgText>
      <Rect
        x={116}
        y={6}
        width={53}
        height={31}
        rx={12}
        fill="url(#markFill)"
        opacity={0.2}
      />
      <Rect
        x={116}
        y={6}
        width={53}
        height={31}
        rx={12}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1}
      />
      <SvgText
        x={124}
        y={30}
        fill="#fff7ed"
        fontFamily="sans-serif-condensed"
        fontSize={27}
        fontWeight="900"
        letterSpacing={0}>
        DB
      </SvgText>
    </Svg>
  );
}
