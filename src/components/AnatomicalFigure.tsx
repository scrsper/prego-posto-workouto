import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Ellipse, G, Line, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { BodyVariant, MuscleGroupId } from '../types/journey';
import {
  BODY_SILHOUETTES,
  FIGURE_VIEW_BOX,
  muscleShapesFor,
  type MuscleShape,
} from './anatomy/muscleGeometry';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const SKIN_COLOR = '#F3D9C6';
const OUTLINE_COLOR = '#B8876A';
const BELLY_COLOR = '#F6E3D3';
const RESTING_MUSCLE_COLOR = '#7C6FE8';
const HIGHLIGHT_MUSCLE_COLOR = '#EF5DA8';
const RESTING_OPACITY = 0.14;
const HIGHLIGHT_PEAK_OPACITY = 0.72;

export interface AnatomicalFigureProps {
  variant: BodyVariant;
  /** Muscle groups to animate/highlight for the current exercise. */
  highlightedMuscles: MuscleGroupId[];
  /** Seconds per rep — the highlight pulse syncs to this tempo. Set 0 to disable animation. */
  repTempoSeconds?: number;
  size?: number;
  showCesareanScar?: boolean;
}

type MuscleAnimatedProps = { fillOpacity: number };

function MuscleShapeView({
  shape,
  fill,
  animatedProps,
}: {
  shape: MuscleShape;
  fill: string;
  animatedProps: Partial<MuscleAnimatedProps>;
}) {
  if (shape.kind === 'ellipse') {
    return (
      <AnimatedEllipse
        cx={shape.cx}
        cy={shape.cy}
        rx={shape.rx}
        ry={shape.ry}
        fill={fill}
        animatedProps={animatedProps}
      />
    );
  }
  return (
    <AnimatedRect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={shape.rx ?? 0}
      fill={fill}
      animatedProps={animatedProps}
    />
  );
}

function AnimatedMuscleGroup({
  variant,
  muscle,
  isHighlighted,
  pulseProgress,
}: {
  variant: BodyVariant;
  muscle: MuscleGroupId;
  isHighlighted: boolean;
  pulseProgress: SharedValue<number>;
}) {
  const shapes = muscleShapesFor(variant, muscle);

  const animatedProps = useAnimatedProps(() => {
    if (!isHighlighted) {
      return { fillOpacity: RESTING_OPACITY };
    }
    const opacity = RESTING_OPACITY + pulseProgress.value * (HIGHLIGHT_PEAK_OPACITY - RESTING_OPACITY);
    return { fillOpacity: opacity };
  }, [isHighlighted]);

  const fill = isHighlighted ? HIGHLIGHT_MUSCLE_COLOR : RESTING_MUSCLE_COLOR;

  return (
    <G>
      {shapes.map((shape, index) => (
        <MuscleShapeView key={`${muscle}-${index}`} shape={shape} fill={fill} animatedProps={animatedProps} />
      ))}
    </G>
  );
}

/**
 * Renders the shared anatomical rig (see anatomy/muscleGeometry.ts) for a
 * given body variant, animating a soft opacity pulse on whichever muscle
 * groups are relevant to the current exercise. The pulse tempo matches the
 * exercise's rep tempo so the highlight doubles as a movement-pace cue.
 *
 * Always pair this with the exercise's text instructions and safety tags —
 * this visual is a supplement, not a substitute, for that information.
 */
export function AnatomicalFigure({
  variant,
  highlightedMuscles,
  repTempoSeconds = 4,
  size = 240,
  showCesareanScar = false,
}: AnatomicalFigureProps) {
  const pulseProgress = useSharedValue(0);
  const silhouette = BODY_SILHOUETTES[variant];
  const highlightedSet = useMemo(() => new Set(highlightedMuscles), [highlightedMuscles]);

  useEffect(() => {
    if (repTempoSeconds <= 0 || highlightedMuscles.length === 0) {
      pulseProgress.value = withTiming(0, { duration: 200 });
      return;
    }
    const halfCycleMs = Math.max(300, (repTempoSeconds * 1000) / 2);
    pulseProgress.value = withRepeat(
      withTiming(1, { duration: halfCycleMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [repTempoSeconds, highlightedMuscles.length, pulseProgress]);

  const scale = size / FIGURE_VIEW_BOX.width;
  const height = FIGURE_VIEW_BOX.height * scale;

  return (
    <View style={[styles.container, { width: size, height }]}>
      <Svg
        width={size}
        height={height}
        viewBox={`0 0 ${FIGURE_VIEW_BOX.width} ${FIGURE_VIEW_BOX.height}`}
      >
        {/* Base silhouette */}
        <G>
          <Ellipse cx={120} cy={40} rx={28} ry={32} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          <Rect x={110} y={66} width={20} height={18} rx={6} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
          {/* torso */}
          <Rect x={72} y={84} width={96} height={200} rx={34} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          {/* arms */}
          <Rect x={38} y={90} width={26} height={166} rx={13} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          <Rect x={176} y={90} width={26} height={166} rx={13} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          {/* pelvis */}
          <Ellipse cx={120} cy={300} rx={58} ry={42} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          {/* legs */}
          <Rect x={88} y={332} width={30} height={172} rx={15} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          <Rect x={122} y={332} width={30} height={172} rx={15} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          {/* feet */}
          <Ellipse cx={103} cy={510} rx={18} ry={9} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          <Ellipse cx={137} cy={510} rx={18} ry={9} fill={SKIN_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
          {/* belly overlay — the piece that changes shape per variant */}
          <Ellipse
            cx={silhouette.belly.cx}
            cy={silhouette.belly.cy}
            rx={silhouette.belly.rx}
            ry={silhouette.belly.ry}
            fill={BELLY_COLOR}
            stroke={OUTLINE_COLOR}
            strokeWidth={1.5}
          />
          {silhouette.supportsScarOverlay && showCesareanScar ? (
            <Line
              x1={silhouette.belly.cx - 32}
              y1={silhouette.belly.cy + 40}
              x2={silhouette.belly.cx + 32}
              y2={silhouette.belly.cy + 40}
              stroke="#C97B9B"
              strokeWidth={2}
              strokeDasharray="2,3"
            />
          ) : null}
        </G>

        {/* Muscle group overlays */}
        <G>
          {(
            [
              'erectorSpinae',
              'chestShoulders',
              'obliques',
              'transverseAbdominis',
              'rectusAbdominis',
              'hipFlexors',
              'pelvicFloor',
              'glutes',
              'quadriceps',
              'hamstrings',
            ] as MuscleGroupId[]
          ).map((muscle) => (
            <AnimatedMuscleGroup
              key={muscle}
              variant={variant}
              muscle={muscle}
              isHighlighted={highlightedSet.has(muscle)}
              pulseProgress={pulseProgress}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
