export function orderParts(items, P, k) {
  const started = performance.now();
  const camera = k.cameraOf(P);
  const viewer = [camera.cosA * camera.cosE, camera.sinA * camera.cosE, camera.sinE];
  const projectionCaches = orderParts.projectionCaches || (orderParts.projectionCaches = new WeakMap());
  let cache = projectionCaches.get(P);
  if (!cache) projectionCaches.set(P, cache = new WeakMap());
  const epsilon = 1e-7;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  function hull(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const lower = [];
    for (const point of sorted) {
      while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), point) <= epsilon) lower.pop();
      lower.push(point);
    }
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const point = sorted[i];
      while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), point) <= epsilon) upper.pop();
      upper.push(point);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }
  function axesOf(polygon) {
    return polygon.map((point, i) => {
      const next = polygon[(i + 1) % polygon.length];
      const length = Math.hypot(next[0] - point[0], next[1] - point[1]);
      return [-(next[1] - point[1]) / length, (next[0] - point[0]) / length];
    });
  }
  function interval(polygon, axis) {
    let min = Infinity;
    let max = -Infinity;
    for (const point of polygon) {
      const value = point[0] * axis[0] + point[1] * axis[1];
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    return [min, max];
  }
  function describe(shape) {
    if (cache.has(shape)) return cache.get(shape);
    let x0, x1, polygon;
    if (shape.kind === 'slab') {
      x0 = shape.plan.x;
      x1 = shape.plan.x + shape.plan.w;
      polygon = [[shape.plan.y, shape.z], [shape.plan.y + shape.plan.d, shape.z], [shape.plan.y + shape.plan.d, shape.z + shape.h], [shape.plan.y, shape.z + shape.h]];
    } else {
      const frame = shape.frame;
      if (Math.abs(frame.a[0] - 1) > epsilon || Math.abs(frame.a[1]) > epsilon || Math.abs(frame.a[2]) > epsilon) throw new Error('orderParts requires prisms parallel to the x axis.');
      x0 = frame.o[0] + shape.s0;
      x1 = frame.o[0] + shape.s1;
      const local = shape.kind === 'disc'
        ? Array.from({ length: 64 }, (_, i) => [shape.r * Math.cos(i * Math.PI / 32), shape.r * Math.sin(i * Math.PI / 32)])
        : shape.polygon;
      polygon = local.map(([u, v]) => [frame.o[1] + frame.u[1] * u + frame.v[1] * v, frame.o[2] + frame.u[2] * u + frame.v[2] * v]);
    }
    const projected = hull(polygon.flatMap(([y, z]) => [k.iso([x0, y, z], P), k.iso([x1, y, z], P)]));
    const descriptor = {
      x0, x1, polygon, axes: axesOf(polygon), projected, screenAxes: axesOf(projected),
      bounds: [Math.min(...projected.map(p => p[0])), Math.min(...projected.map(p => p[1])), Math.max(...projected.map(p => p[0])), Math.max(...projected.map(p => p[1]))],
    };
    cache.set(shape, descriptor);
    return descriptor;
  }
  function screenOverlap(a, b) {
    if (a.bounds[2] <= b.bounds[0] + epsilon || b.bounds[2] <= a.bounds[0] + epsilon || a.bounds[3] <= b.bounds[1] + epsilon || b.bounds[3] <= a.bounds[1] + epsilon) return false;
    for (const axis of [...a.screenAxes, ...b.screenAxes]) {
      const ia = interval(a.projected, axis), ib = interval(b.projected, axis);
      if (ia[1] <= ib[0] + epsilon || ib[1] <= ia[0] + epsilon) return false;
    }
    return true;
  }
  function relation(a, b) {
    if (a.x1 <= b.x0 + epsilon) return viewer[0] > 0 ? 1 : -1;
    if (b.x1 <= a.x0 + epsilon) return viewer[0] > 0 ? -1 : 1;
    for (const axis of [...a.axes, ...b.axes]) {
      const ia = interval(a.polygon, axis), ib = interval(b.polygon, axis);
      const toward = axis[0] * viewer[1] + axis[1] * viewer[2];
      if (Math.abs(toward) <= epsilon) continue;
      if (ia[1] <= ib[0] + epsilon) return toward > 0 ? 1 : -1;
      if (ib[1] <= ia[0] + epsilon) return toward > 0 ? -1 : 1;
    }
    return 0;
  }
  function intersection(a, b) {
    let polygon = a.projected;
    for (let i = 0; i < b.projected.length && polygon.length; i++) {
      const start = b.projected[i], end = b.projected[(i + 1) % b.projected.length];
      const clipped = [];
      for (let j = 0; j < polygon.length; j++) {
        const from = polygon[j], to = polygon[(j + 1) % polygon.length];
        const fromSide = cross(start, end, from), toSide = cross(start, end, to);
        const fromInside = fromSide >= -epsilon, toInside = toSide >= -epsilon;
        if (fromInside) clipped.push(from);
        if (fromInside !== toInside) {
          const t = fromSide / (fromSide - toSide);
          clipped.push([from[0] + t * (to[0] - from[0]), from[1] + t * (to[1] - from[1])]);
        }
      }
      polygon = clipped;
    }
    return polygon;
  }
  function frontDepth(shape, point) {
    // The screen basis and viewer direction form an orthonormal basis. A ray
    // through this point is origin + depth * viewer, so its largest in-solid
    // depth is the visible surface (not the object's centre).
    const sx = (point[0] - P.origin[0]) / camera.k;
    const sy = (point[1] - P.origin[1]) / camera.k;
    const origin = [sx * camera.sinA + sy * camera.cosA * camera.sinE,
      -sx * camera.cosA + sy * camera.sinA * camera.sinE, -sy * camera.cosE];
    let low = -Infinity, high = Infinity;
    const clip = (constant, slope) => {
      if (Math.abs(slope) <= epsilon) return constant >= -epsilon;
      const limit = -constant / slope;
      if (slope > 0) low = Math.max(low, limit);
      else high = Math.min(high, limit);
      return low <= high + epsilon;
    };
    if (!clip(origin[0] - shape.x0, viewer[0]) || !clip(shape.x1 - origin[0], -viewer[0])) return null;
    let area = 0;
    for (let i = 0; i < shape.polygon.length; i++) {
      const p = shape.polygon[i], q = shape.polygon[(i + 1) % shape.polygon.length];
      area += p[0] * q[1] - p[1] * q[0];
    }
    const sign = area < 0 ? -1 : 1;
    for (let i = 0; i < shape.polygon.length; i++) {
      const p = shape.polygon[i], q = shape.polygon[(i + 1) % shape.polygon.length];
      const ny = -(q[1] - p[1]) * sign, nz = (q[0] - p[0]) * sign;
      if (!clip(ny * (origin[1] - p[0]) + nz * (origin[2] - p[1]), ny * viewer[1] + nz * viewer[2])) return null;
    }
    return high;
  }
  function contactRelation(a, b) {
    // Adjacent hinged slats intentionally meet/interpenetrate slightly. SAT
    // cannot separate them, yet their visible faces still have a definite
    // order. Sample actual front surfaces inside their projected intersection.
    const polygon = intersection(a, b);
    if (polygon.length < 3) return 0;
    const center = polygon.reduce((sum, point) => [sum[0] + point[0] / polygon.length, sum[1] + point[1] / polygon.length], [0, 0]);
    const samples = [center, ...polygon.map(point => [(point[0] + center[0]) / 2, (point[1] + center[1]) / 2])];
    let positive = 0, negative = 0;
    for (const point of samples) {
      const da = frontDepth(a, point), db = frontDepth(b, point);
      if (da === null || db === null || Math.abs(da - db) <= 1e-5) continue;
      if (db > da) positive++;
      else negative++;
    }
    // A contact pair with genuinely crossing visible surfaces cannot be
    // represented by one painter's edge; leave it explicit as unresolved.
    if (positive && negative) return 0;
    return positive ? 1 : negative ? -1 : 0;
  }
  const descriptors = items.map(item => describe(item.shape));
  const outgoing = items.map(() => []);
  const incoming = new Int32Array(items.length);
  let overlapping = 0, edges = 0, unresolved = 0, contactEdges = 0;
  for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
    if (!screenOverlap(descriptors[a], descriptors[b])) continue;
    overlapping++;
    let order = relation(descriptors[a], descriptors[b]);
    if (!order) {
      order = contactRelation(descriptors[a], descriptors[b]);
      if (order) contactEdges++;
    }
    if (!order) { unresolved++; continue; }
    const back = order > 0 ? a : b;
    const front = order > 0 ? b : a;
    outgoing[back].push(front);
    incoming[front]++;
    edges++;
  }
  const remaining = new Set(items.map((_, index) => index));
  const sorted = [];
  let cycles = 0;
  const before = (a, b) => items[a].key < items[b].key || (items[a].key === items[b].key && a < b);
  while (remaining.size) {
    let selected = -1;
    for (const index of remaining) if (!incoming[index] && (selected < 0 || before(index, selected))) selected = index;
    if (selected < 0) {
      cycles++;
      for (const index of remaining) if (selected < 0 || before(index, selected)) selected = index;
    }
    remaining.delete(selected);
    sorted.push(items[selected]);
    for (const next of outgoing[selected]) incoming[next]--;
  }
  orderParts.lastStats = { items: items.length, overlapping, edges, contactEdges, unresolved, cycles, milliseconds: performance.now() - started };
  return sorted;
}
