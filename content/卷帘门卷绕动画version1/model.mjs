/**
 * Generic rolling-shutter display model, not an engineering/force simulation.
 *
 * World coordinates: x spans the horizontal axle; y is depth; z is height.
 * The curtain follows an Archimedean spiral, its outward tangent to a fixed
 * guide mouth, then a vertical guide. The guide-mouth change of direction is
 * a simplified corner rather than a modeled guide roller or finite bend.
 * Slats may be drawn slightly curved: their IDs and material lengths never
 * change. Effective layer thickness represents packed profile depth, not
 * sheet-metal wall thickness. Friction, hinges, tension and motor internals
 * are intentionally outside this explanatory model.
 */

export const CONFIG = Object.freeze({
  width: 240,
  axisY: 0,
  axisZ: 300,
  guideY: 44,
  guideZ: 250,
  closedBottomZ: 8,
  openBottomZ: 235,
  coreRadius: 18,
  thickness: 4.2,
  slatPitch: 10,
  bottomBarHeight: 8,
  initialTurns: 1,
  pathSampleSpacing: 1.5,
});

const TAU = 2 * Math.PI;
const B = CONFIG.thickness / TAU;
// The innermost centerline sits half a layer clear of the axle surface.
const A = CONFIG.coreRadius + CONFIG.thickness / 2;
const INITIAL_Q = CONFIG.initialTurns * TAU;
const GUIDE_DY = CONFIG.guideY - CONFIG.axisY;
const GUIDE_DOWN = CONFIG.axisZ - CONFIG.guideZ;
const GUIDE_DISTANCE = Math.hypot(GUIDE_DY, GUIDE_DOWN);
const GUIDE_SCREEN_ANGLE = Math.atan2(GUIDE_DOWN, GUIDE_DY);

function primitive(radius) {
  return (
    radius * Math.hypot(radius, B) +
    B * B * Math.asinh(radius / B)
  ) / 2;
}

const PRIMITIVE_A = primitive(A);

function spiralLength(q) {
  return (primitive(A + B * q) - PRIMITIVE_A) / B;
}

/**
 * Solve the external tangent analytically. In the screen side-plane (y, -z),
 * the spiral tangent has radial component B/hypot(B,R) and tangential
 * component R/hypot(B,R). Choose the tangent that travels outward/downward
 * to the fixed guide mouth; never move the guide to match the growing roll.
 */
function windingGeometry(q) {
  const r = A + B * q;
  if (!(r < GUIDE_DISTANCE)) {
    throw new RangeError("The roll reaches the guide mouth; configuration is invalid.");
  }
  const tangentNorm = Math.hypot(B, r);
  const radialProjection = r * B / tangentNorm;
  const leadLength = -radialProjection + Math.sqrt(
    GUIDE_DISTANCE * GUIDE_DISTANCE - r * r + radialProjection * radialProjection,
  );
  const betweenRadiusAndGuide = Math.atan2(
    leadLength * r / tangentNorm,
    r + leadLength * B / tangentNorm,
  );
  const exitScreenAngle = GUIDE_SCREEN_ANGLE - betweenRadiusAndGuide;
  // Positive axisAngle is a right-handed rotation about +x: +y toward +z.
  const axisAngle = q - exitScreenAngle;
  const exit = [
    CONFIG.axisY + r * Math.cos(exitScreenAngle),
    CONFIG.axisZ - r * Math.sin(exitScreenAngle),
  ];
  return {
    q,
    spiralRadius: r,
    radius: r + CONFIG.thickness / 2,
    axisAngle,
    exit,
    leadLength,
    rollLength: spiralLength(q),
  };
}

const CLOSED = windingGeometry(INITIAL_Q);
const TOTAL_LENGTH = CLOSED.rollLength + CLOSED.leadLength +
  CONFIG.guideZ - CONFIG.closedBottomZ;
const SLAT_COUNT = Math.ceil(TOTAL_LENGTH / CONFIG.slatPitch);
const SLAT_LENGTH = TOTAL_LENGTH / SLAT_COUNT;
const PATH_INTERVALS = Math.ceil(TOTAL_LENGTH / CONFIG.pathSampleSpacing);

function solveWinding(bottomZ) {
  const target = TOTAL_LENGTH - (CONFIG.guideZ - bottomZ);
  let lo = INITIAL_Q;
  let hi = (GUIDE_DISTANCE - A) / B - 1e-6;
  const largest = windingGeometry(hi);
  if (largest.rollLength + largest.leadLength < target) {
    throw new RangeError("The requested lift cannot fit before the roll reaches the guide.");
  }
  for (let i = 0; i < 64; i += 1) {
    const q = (lo + hi) / 2;
    const candidate = windingGeometry(q);
    if (candidate.rollLength + candidate.leadLength < target) lo = q;
    else hi = q;
  }
  return windingGeometry((lo + hi) / 2);
}

function inverseSpiralLength(s, qMax) {
  if (s <= 0) return 0;
  if (s >= spiralLength(qMax)) return qMax;
  // Integrating r alone gives a close initial estimate; Newton includes the
  // radial component and converges to the actual spiral arc length.
  let q = (Math.sqrt(A * A + 2 * B * s) - A) / B;
  for (let i = 0; i < 7; i += 1) {
    q -= (spiralLength(q) - s) / Math.hypot(A + B * q, B);
    q = Math.max(0, Math.min(qMax, q));
  }
  return q;
}

function sampleMaterial(s, geometry) {
  if (s <= geometry.rollLength) {
    const theta = inverseSpiralLength(s, geometry.q);
    const radius = A + B * theta;
    const angle = geometry.axisAngle - theta;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    const norm = Math.hypot(radius, B);
    return {
      point: [CONFIG.axisY + radius * c, CONFIG.axisZ + radius * sn],
      tangent: [(B * c + radius * sn) / norm, (B * sn - radius * c) / norm],
      region: "roll",
    };
  }
  const afterRoll = s - geometry.rollLength;
  if (afterRoll <= geometry.leadLength) {
    const tangent = [
      (CONFIG.guideY - geometry.exit[0]) / geometry.leadLength,
      (CONFIG.guideZ - geometry.exit[1]) / geometry.leadLength,
    ];
    return {
      point: [
        geometry.exit[0] + tangent[0] * afterRoll,
        geometry.exit[1] + tangent[1] * afterRoll,
      ],
      tangent,
      region: "lead",
    };
  }
  return {
    point: [CONFIG.guideY, CONFIG.guideZ - (afterRoll - geometry.leadLength)],
    tangent: [0, -1],
    region: "vertical",
  };
}

/**
 * @param {number} progress Opening fraction, clamped to [0, 1].
 * @returns {object} Serializable geometry for a complete, constant-length
 * curtain. radius is the outer envelope; spiralRadius is its outer centerline.
 * bottomZ is the top/attachment of the independent bottom bar; the bar extends
 * downward by bottomBarHeight (closed bar thus reaches floor z=0).
 * Node tangents point along the material, from axle attachment toward bottom.
 */
export function modelAt(progress) {
  if (!Number.isFinite(progress)) throw new TypeError("progress must be a finite number");
  const p = Math.max(0, Math.min(1, progress));
  const bottomZ = CONFIG.closedBottomZ +
    (CONFIG.openBottomZ - CONFIG.closedBottomZ) * p;
  const geometry = p === 0 ? CLOSED : solveWinding(bottomZ);
  const nodes = Array.from({ length: SLAT_COUNT }, (_, id) => {
    const s0 = id * SLAT_LENGTH;
    const s1 = id === SLAT_COUNT - 1 ? TOTAL_LENGTH : (id + 1) * SLAT_LENGTH;
    const a = sampleMaterial(s0, geometry);
    const b = sampleMaterial(s1, geometry);
    const mid = sampleMaterial((s0 + s1) / 2, geometry);
    return {
      id,
      s0,
      s1,
      a: a.point,
      b: b.point,
      mid: mid.point,
      tangent: mid.tangent,
      startTangent: a.tangent,
      endTangent: b.tangent,
      region: mid.region,
    };
  });
  const path = Array.from({ length: PATH_INTERVALS + 1 }, (_, i) => {
    const s = TOTAL_LENGTH * i / PATH_INTERVALS;
    const { point, tangent, region } = sampleMaterial(s, geometry);
    return { s, y: point[0], z: point[1], tangent, region };
  });
  const attachment = sampleMaterial(0, geometry).point;
  return {
    progress: p,
    radius: geometry.radius,
    spiralRadius: geometry.spiralRadius,
    coreRadius: CONFIG.coreRadius,
    axisAngle: geometry.axisAngle,
    angularDisplacement: geometry.axisAngle - CLOSED.axisAngle,
    wrapAngle: geometry.q,
    turns: geometry.q / TAU,
    axis: [CONFIG.axisY, CONFIG.axisZ],
    guide: [CONFIG.guideY, CONFIG.guideZ],
    attachment,
    exit: geometry.exit,
    bottomZ,
    bottomAttachment: [CONFIG.guideY, bottomZ],
    bottomBar: {
      y: CONFIG.guideY,
      topZ: bottomZ,
      bottomZ: bottomZ - CONFIG.bottomBarHeight,
      height: CONFIG.bottomBarHeight,
      width: CONFIG.width,
    },
    totalLength: TOTAL_LENGTH,
    rollLength: geometry.rollLength,
    leadLength: geometry.leadLength,
    verticalLength: CONFIG.guideZ - bottomZ,
    slatLength: SLAT_LENGTH,
    nodes,
    path,
  };
}
