import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

// Flat illustrations in the style of the onboarding mockups: a phone outline with sage UI content.

const PHONE = { x: 70, y: 10, w: 120, h: 220, r: 18 };

function Phone({ children }: { children?: React.ReactNode }) {
  return (
    <G>
      <Rect x={PHONE.x} y={PHONE.y} width={PHONE.w} height={PHONE.h} rx={PHONE.r} fill={colors.white} stroke="#5E625D" strokeWidth={6} />
      <Rect x={PHONE.x + 42} y={PHONE.y + 8} width={36} height={6} rx={3} fill="#5E625D" />
      {children}
    </G>
  );
}

function Leaf({ x, y, s = 1, rot = 0 }: { x: number; y: number; s?: number; rot?: number }) {
  return (
    <Path
      d="M0 0 C 10 -18, 30 -18, 34 -30 C 38 -10, 22 6, 0 0 Z"
      fill={colors.sageHover}
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
    />
  );
}

export function WelcomeArt() {
  return (
    <Svg width={260} height={240} viewBox="0 0 260 240">
      <Circle cx={130} cy={130} r={110} fill={colors.surface} />
      <Leaf x={36} y={200} s={1.3} rot={-20} />
      <Leaf x={214} y={196} s={1.1} rot={200} />
      <Phone>
        <Circle cx={130} cy={86} r={30} fill={colors.sageButton} />
        {/* fork */}
        <Path d="M117 70 v12 a5 5 0 0 0 4 5 v15 h4 v-15 a5 5 0 0 0 4 -5 v-12 h-3 v10 h-1.5 v-10 h-3 v10 h-1.5 v-10 Z" fill={colors.white} />
        {/* knife */}
        <Path d="M139 70 c6 2 8 10 6 18 h-2 v14 h-4 Z" fill={colors.white} />
        <Rect x={92} y={134} width={76} height={7} rx={3.5} fill="#5E625D" />
        <Rect x={98} y={150} width={64} height={6} rx={3} fill={colors.surface} />
        <Rect x={104} y={164} width={52} height={6} rx={3} fill={colors.surface} />
      </Phone>
    </Svg>
  );
}

export function RemindersArt() {
  const rows = [52, 82, 112, 142, 172];
  return (
    <Svg width={260} height={240} viewBox="0 0 260 240">
      <Phone>
        <Rect x={86} y={34} width={48} height={6} rx={3} fill="#5E625D" />
        {rows.map((y, i) => (
          <G key={y}>
            <Rect x={86} y={y} width={16} height={16} rx={4} fill={i < 3 ? colors.sageButton : colors.surface} />
            {i < 3 && <Path d={`M90 ${y + 8} l3 3 l6 -6`} stroke={colors.white} strokeWidth={2} fill="none" />}
            <Rect x={110} y={y + 2} width={62} height={5} rx={2.5} fill={colors.sageHover} />
            <Rect x={110} y={y + 10} width={40} height={4} rx={2} fill={colors.surface} />
          </G>
        ))}
      </Phone>
      <Circle cx={36} cy={110} r={5} fill="#5E625D" />
      <Circle cx={222} cy={96} r={4} fill="#5E625D" />
      <G transform="translate(196 150)">
        <Circle r={22} fill={colors.white} />
        <Path d="M-8 6 h16 l-2 -3 v-6 a6 6 0 0 0 -12 0 v6 Z M-3 9 a3 3 0 0 0 6 0" fill={colors.sageButton} />
      </G>
      <G transform="translate(52 60)">
        <Path d="M0 -14 C 8 -2, 8 6, 0 10 C -8 6, -8 -2, 0 -14 Z" fill={colors.skyBlue} />
      </G>
    </Svg>
  );
}

export function BackupArt() {
  return (
    <Svg width={260} height={240} viewBox="0 0 260 240">
      <Circle cx={130} cy={130} r={110} fill={colors.surfaceSubtle} />
      <Phone>
        <Rect x={92} y={40} width={76} height={6} rx={3} fill="#5E625D" />
        <Rect x={88} y={62} width={84} height={20} rx={8} fill={colors.surface} />
        <Rect x={88} y={90} width={84} height={20} rx={8} fill={colors.surface} />
        <Rect x={88} y={118} width={84} height={20} rx={8} fill={colors.surface} />
        <Circle cx={130} cy={178} r={18} fill={colors.sageButton} />
        <Path d="M121 178 l6 6 l12 -12" stroke={colors.white} strokeWidth={4} fill="none" strokeLinecap="round" />
      </Phone>
      <G transform="translate(228 44)">
        <Path d="M-28 -18 h20 l6 6 h30 v34 h-56 Z" fill={colors.sageHover} />
        <Path d="M-28 -6 h56 v28 h-56 Z" fill={colors.sageButton} />
      </G>
      <Leaf x={40} y={210} s={1.2} rot={-30} />
      <Leaf x={52} y={206} s={0.9} rot={-70} />
    </Svg>
  );
}
