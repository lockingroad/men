import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG, modelAt } from "./model.mjs";

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const near = (actual, expected, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) < tolerance,
    `expected ${actual} to equal ${expected} within ${tolerance}`);
};

test("total curtain length and individual slat identities stay constant", () => {
  const closed = modelAt(0);
  const initialIds = closed.nodes.map(({ id, s0, s1 }) => ({ id, s0, s1 }));
  for (let i = 0; i <= 100; i += 1) {
    const m = modelAt(i / 100);
    near(m.totalLength, closed.totalLength);
    near(m.rollLength + m.leadLength + m.verticalLength, m.totalLength);
    near(m.nodes.reduce((sum, n) => sum + n.s1 - n.s0, 0), m.totalLength);
    assert.deepEqual(m.nodes.map(({ id, s0, s1 }) => ({ id, s0, s1 })), initialIds);
    near(m.path.at(-1).s, m.totalLength);
  }
});

test("opening raises the bottom and increases roll radius and axle rotation", () => {
  let previous = modelAt(0);
  near(previous.bottomZ, CONFIG.closedBottomZ);
  near(previous.bottomBar.bottomZ, 0);
  near(previous.turns, CONFIG.initialTurns);
  for (let i = 1; i <= 100; i += 1) {
    const current = modelAt(i / 100);
    assert.ok(current.bottomZ > previous.bottomZ);
    assert.ok(current.radius > previous.radius);
    assert.ok(current.rollLength > previous.rollLength);
    assert.ok(current.axisAngle > previous.axisAngle);
    assert.ok(current.verticalLength < previous.verticalLength);
    assert.deepEqual(current.axis, [CONFIG.axisY, CONFIG.axisZ]);
    assert.deepEqual(current.guide, [CONFIG.guideY, CONFIG.guideZ]);
    previous = current;
  }
  near(previous.bottomZ, CONFIG.openBottomZ);
  assert.ok(previous.bottomBar.topZ < CONFIG.guideZ);
});

test("slats cover a continuous path without gaps or implausible spatial jumps", () => {
  for (const p of [0, 0.001, 0.25, 0.5, 0.75, 0.999, 1]) {
    const m = modelAt(p);
    for (let i = 0; i < m.nodes.length; i += 1) {
      const n = m.nodes[i];
      near(Math.hypot(...n.tangent), 1);
      assert.ok(distance(n.a, n.mid) <= (n.s1 - n.s0) / 2 + 1e-8);
      assert.ok(distance(n.mid, n.b) <= (n.s1 - n.s0) / 2 + 1e-8);
      if (i > 0) near(distance(m.nodes[i - 1].b, n.a), 0);
    }
    for (let i = 1; i < m.path.length; i += 1) {
      const a = m.path[i - 1];
      const b = m.path[i];
      const chord = distance([a.y, a.z], [b.y, b.z]);
      assert.ok(chord <= b.s - a.s + 1e-8);
      assert.ok(chord < CONFIG.pathSampleSpacing + 1e-8);
    }
    near(distance(m.nodes.at(-1).b, m.bottomAttachment), 0);
    near(distance(m.nodes[0].a, m.attachment), 0);
  }
});

test("the inner attachment rotates on the axle while the vertical guide stays fixed", () => {
  const r = CONFIG.coreRadius + CONFIG.thickness / 2;
  for (const p of [0, 0.2, 0.5, 0.8, 1]) {
    const m = modelAt(p);
    near(distance(m.attachment, m.axis), r);
    near(m.attachment[0], CONFIG.axisY + r * Math.cos(m.axisAngle));
    near(m.attachment[1], CONFIG.axisZ + r * Math.sin(m.axisAngle));
    for (const sample of m.path.filter(({ region }) => region === "vertical")) {
      near(sample.y, CONFIG.guideY);
      assert.deepEqual(sample.tangent, [0, -1]);
    }
    // Outgoing spiral tangent equals the straight span's direction.
    const angle = m.axisAngle - m.wrapAngle;
    const b = CONFIG.thickness / (2 * Math.PI);
    const norm = Math.hypot(b, m.spiralRadius);
    const tangent = [
      (b * Math.cos(angle) + m.spiralRadius * Math.sin(angle)) / norm,
      (b * Math.sin(angle) - m.spiralRadius * Math.cos(angle)) / norm,
    ];
    const lead = [
      (CONFIG.guideY - m.exit[0]) / m.leadLength,
      (CONFIG.guideZ - m.exit[1]) / m.leadLength,
    ];
    near(distance(tangent, lead), 0);
  }
});

test("material points move smoothly between adjacent frames", () => {
  let previous = modelAt(0);
  for (let i = 1; i <= 120; i += 1) {
    const current = modelAt(i / 120);
    for (let j = 0; j < current.nodes.length; j += 1) {
      for (const key of ["a", "mid", "b"]) {
        assert.ok(distance(current.nodes[j][key], previous.nodes[j][key]) < 5,
          `slat ${j} ${key} jumped at progress ${i / 120}`);
      }
    }
    previous = current;
  }
});

test("reversing the timeline returns the identical closed geometry", () => {
  const first = modelAt(0);
  for (let i = 0; i <= 20; i += 1) modelAt(i / 20);
  for (let i = 20; i >= 0; i -= 1) modelAt(i / 20);
  assert.deepEqual(modelAt(0), first);
  assert.deepEqual(modelAt(-1), first);
  assert.deepEqual(modelAt(2), modelAt(1));
  assert.throws(() => modelAt(NaN), TypeError);
});
