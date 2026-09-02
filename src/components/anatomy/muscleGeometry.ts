import type { BodyVariant, MuscleGroupId } from '../../types/journey';

/**
 * Placeholder geometry for the shared anatomical rig.
 *
 * PRODUCTION NOTE: this hand-built geometric rig stands in for the
 * commissioned layered illustration described in the PRD ("ONE base set of
 * layered anatomical illustrations ... with individual muscle groups as
 * separate, named SVG paths/groups"). The architecture here — one body
 * outline per BodyVariant, plus a named set of muscle overlay shapes reused
 * and re-highlighted per exercise — is exactly the structure real
 * illustrations should slot into: replace the `rect`/`ellipse` primitives
 * below with real `<Path d="..." />` data exported from the illustrator's
 * SVG, keyed by the same MuscleGroupId names, and the rest of the app
 * (AnatomicalFigure, every exercise screen) needs no changes.
 *
 * This is a front-view-only figure. Muscles that are primarily visible from
 * behind (glutes, hamstrings, erector spinae) are approximated at their
 * front-visible limb/torso boundary so every exercise can still show a
 * highlighted region — real artwork should add a back-view variant for
 * these instead.
 */

export interface RectShape {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

export interface EllipseShape {
  kind: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export type MuscleShape = RectShape | EllipseShape;

export const FIGURE_VIEW_BOX = { width: 240, height: 520 };

interface BodySilhouette {
  /** Belly overlay drawn on top of the base torso to show the variant's shape. */
  belly: EllipseShape;
  /** Whether a faint horizontal cesarean scar line can be shown on this variant. */
  supportsScarOverlay: boolean;
}

export const BODY_SILHOUETTES: Record<BodyVariant, BodySilhouette> = {
  neutral: { belly: { kind: 'ellipse', cx: 120, cy: 225, rx: 38, ry: 45 }, supportsScarOverlay: false },
  pregnant: { belly: { kind: 'ellipse', cx: 120, cy: 245, rx: 72, ry: 88 }, supportsScarOverlay: false },
  postpartum: { belly: { kind: 'ellipse', cx: 120, cy: 238, rx: 54, ry: 64 }, supportsScarOverlay: true },
};

const SHARED_MUSCLE_SHAPES: Record<Exclude<MuscleGroupId, 'transverseAbdominis' | 'rectusAbdominis' | 'obliques'>, MuscleShape[]> = {
  pelvicFloor: [{ kind: 'ellipse', cx: 120, cy: 308, rx: 20, ry: 11 }],
  glutes: [
    { kind: 'ellipse', cx: 94, cy: 322, rx: 20, ry: 24 },
    { kind: 'ellipse', cx: 146, cy: 322, rx: 20, ry: 24 },
  ],
  hipFlexors: [
    { kind: 'ellipse', cx: 96, cy: 298, rx: 15, ry: 11 },
    { kind: 'ellipse', cx: 144, cy: 298, rx: 15, ry: 11 },
  ],
  erectorSpinae: [
    { kind: 'rect', x: 100, y: 178, width: 14, height: 115, rx: 7 },
    { kind: 'rect', x: 126, y: 178, width: 14, height: 115, rx: 7 },
  ],
  quadriceps: [
    { kind: 'rect', x: 90, y: 342, width: 26, height: 92, rx: 12 },
    { kind: 'rect', x: 124, y: 342, width: 26, height: 92, rx: 12 },
  ],
  hamstrings: [
    { kind: 'rect', x: 90, y: 342, width: 26, height: 92, rx: 12 },
    { kind: 'rect', x: 124, y: 342, width: 26, height: 92, rx: 12 },
  ],
  chestShoulders: [{ kind: 'rect', x: 82, y: 92, width: 76, height: 48, rx: 22 }],
};

/** Abdominal muscle overlays shift slightly per variant to loosely follow the belly contour. */
const ABDOMINAL_SHAPES_BY_VARIANT: Record<
  BodyVariant,
  Record<'transverseAbdominis' | 'rectusAbdominis' | 'obliques', MuscleShape[]>
> = {
  neutral: {
    transverseAbdominis: [{ kind: 'ellipse', cx: 120, cy: 248, rx: 42, ry: 24 }],
    rectusAbdominis: [{ kind: 'rect', x: 105, y: 172, width: 30, height: 105, rx: 10 }],
    obliques: [
      { kind: 'rect', x: 76, y: 186, width: 22, height: 86, rx: 10 },
      { kind: 'rect', x: 142, y: 186, width: 22, height: 86, rx: 10 },
    ],
  },
  pregnant: {
    transverseAbdominis: [{ kind: 'ellipse', cx: 120, cy: 258, rx: 66, ry: 40 }],
    rectusAbdominis: [{ kind: 'rect', x: 100, y: 172, width: 40, height: 150, rx: 14 }],
    obliques: [
      { kind: 'rect', x: 62, y: 190, width: 26, height: 120, rx: 12 },
      { kind: 'rect', x: 152, y: 190, width: 26, height: 120, rx: 12 },
    ],
  },
  postpartum: {
    transverseAbdominis: [{ kind: 'ellipse', cx: 120, cy: 252, rx: 52, ry: 30 }],
    rectusAbdominis: [{ kind: 'rect', x: 103, y: 172, width: 34, height: 125, rx: 12 }],
    obliques: [
      { kind: 'rect', x: 70, y: 188, width: 24, height: 100, rx: 11 },
      { kind: 'rect', x: 146, y: 188, width: 24, height: 100, rx: 11 },
    ],
  },
};

export function muscleShapesFor(variant: BodyVariant, muscle: MuscleGroupId): MuscleShape[] {
  if (muscle === 'transverseAbdominis' || muscle === 'rectusAbdominis' || muscle === 'obliques') {
    return ABDOMINAL_SHAPES_BY_VARIANT[variant][muscle];
  }
  return SHARED_MUSCLE_SHAPES[muscle];
}

export const ALL_MUSCLE_GROUPS: MuscleGroupId[] = [
  'transverseAbdominis',
  'rectusAbdominis',
  'obliques',
  'pelvicFloor',
  'glutes',
  'hipFlexors',
  'erectorSpinae',
  'quadriceps',
  'hamstrings',
  'chestShoulders',
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroupId, string> = {
  transverseAbdominis: 'Transverse Abdominis',
  rectusAbdominis: 'Rectus Abdominis',
  obliques: 'Obliques',
  pelvicFloor: 'Pelvic Floor',
  glutes: 'Glutes',
  hipFlexors: 'Hip Flexors',
  erectorSpinae: 'Erector Spinae',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  chestShoulders: 'Chest & Shoulders',
};
