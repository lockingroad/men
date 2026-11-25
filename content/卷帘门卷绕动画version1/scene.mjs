export function createScene(k, G, modelAt, config, orderParts) {
  const F = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const P = k.fitProjection(
    k.boxCorners({ x: -155, y: -44, w: 310, d: 124, r: 0 }, 0, 343),
    930, 1100, { pad: 12, azimuth: 58, elevation: 18 },
  );
  P.origin[0] += 48;
  P.origin[1] += 412;
  const fixed = [];
  const add = (name, shape, paths, at, options = {}) => {
    const item = { name, shape, at, key: k.depthOf(at, P), svg: k.solidSvg(paths, options) };
    fixed.push(item);
    return item;
  };
  function box(name, x, y, z, w, d, h, tone = 'mid', extra = '') {
    const plan = { x, y, w, d, r: 0.5 };
    return add(name, { kind: 'slab', plan, z, h }, k.slabOf(plan, z, h, P, 3, 0.35),
      [x + w / 2, y + d / 2, z + h / 2], { tone, inner: extra });
  }
  function axle(name, s0, s1, r, y, z, tone = 'mid') {
    const frame = G.frameOf([0, y, z], F.a, F.u, F.v);
    return add(name, { kind: 'disc', frame, s0, s1, r }, G.disc(s0, s1, r, frame, P),
      [(s0 + s1) / 2, y, z], { tone });
  }
  function bolt(name, x, y, z) {
    const plan = { x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.5 };
    return add(name, { kind: 'slab', plan, z, h: 1.5 }, k.slabOf(plan, z, 1.5, P, 3, 0.25),
      [x, y, z + 0.75], { tone: 'hi', inner: k.lineSvg(k.lineOnTop([x - 1.2, y], [x + 1.2, y], z + 1.5, P), { tone: 'lo' }) });
  }
  box('stand.base', -155, -44, -8, 310, 124, 8, 'lo');
  for (const side of [-1, 1]) {
    const x = side < 0 ? -141 : 127;
    box(`stand.foot.${side}`, x - 3, -34, 0, 20, 50, 3, 'mid');
    for (const bx of [x, x + 14]) for (const by of [-31.5, 10]) bolt(`foot-bolt.${side}.${bx}.${by}`, bx, by, 3);
    box(`stand.post.${side}`, x, -28, 3, 14, 12, 273, 'mid');
    for (const zz of [31, 129, 227]) box(`guide.mount.${side}.${zz}`, side < 0 ? -134 : 127, -16, zz, 7, 54, 7, 'lo');
    const outerX = side < 0 ? -128 : 124;
    box(`guide.back.${side}`, side < 0 ? -128 : 118, 38, 8, 10, 2, 242, 'mid');
    box(`guide.edge.${side}`, outerX, 40, 8, 4, 9, 242, 'mid');
    box(`guide.front.${side}`, side < 0 ? -128 : 118, 49, 8, 10, 2, 242, 'hi');
    const sx = side < 0 ? -139 : 131;
    const platePoly = [[-28, 276], [-28, 319], [10, 319], [17, 310], [17, 289], [5, 276]];
    const frame = F;
    add(`bearing.plate.${side}`, { kind: 'prism', frame, polygon: platePoly, s0: sx, s1: sx + 8 },
      G.prismOf(frame, platePoly, sx, sx + 8, P), [sx + 4, -5, 300], { tone: 'mid' });
    axle(`bearing.cap.${side}`, side < 0 ? -142 : 139, side < 0 ? -139 : 142, 11, 0, 300, 'hi');
  }
  box('stand.top-beam', -127, -28, 260, 254, 8, 10, 'lo');
  axle('shaft.core', -120, 120, config.coreRadius, 0, 300, 'mid');
  axle('shaft.left', -131, -120, 7.5, 0, 300, 'hi');
  axle('shaft.right', 120, 131, 7.5, 0, 300, 'hi');

  const trackedId = 28;
  function movingItems(progress) {
    const model = modelAt(progress);
    const parts = [];
    for (const node of model.nodes) {
      const dy = node.b[0] - node.a[0];
      const dz = node.b[1] - node.a[1];
      const length = Math.hypot(dy, dz);
      const n = [-dz / length, dy / length];
      const t = 1.1;
      const polygon = [
        [node.a[0] + n[0] * t, node.a[1] + n[1] * t],
        [node.b[0] + n[0] * t, node.b[1] + n[1] * t],
        [node.b[0] - n[0] * t, node.b[1] - n[1] * t],
        [node.a[0] - n[0] * t, node.a[1] - n[1] * t],
      ];
      const ridge = [(node.a[0] + node.b[0]) / 2 + n[0] * t, (node.a[1] + node.b[1]) / 2 + n[1] * t];
      const detail = k.lineSvg(k.segment([-120, ...ridge], [120, ...ridge], P), { tone: node.id === trackedId ? 'hi' : 'faint' });
      parts.push({
        name: `curtain.slat.${node.id}`, shape: { kind: 'prism', frame: F, polygon, s0: -120, s1: 120 },
        at: [0, ...node.mid], key: k.depthOf([0, ...node.mid], P),
        svg: k.solidSvg(G.prismOf(F, polygon, -120, 120, P), { tone: 'hi', lit: node.id === trackedId, inner: detail, className: node.id === trackedId ? 'tracked-slat' : 'curtain-slat' }),
      });
    }
    const angle = model.axisAngle;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const first = model.nodes[0];
    const delta = [first.b[0] - first.a[0], first.b[1] - first.a[1]];
    const norm = Math.hypot(...delta);
    const tangent = delta.map(value => value / norm);
    const normal = [-tangent[1], tangent[0]];
    const edgeA = [first.a[0] - normal[0] * 1.1, first.a[1] - normal[1] * 1.1];
    const edgeB = [edgeA[0] + tangent[0] * 3, edgeA[1] + tangent[1] * 3];
    const coreDirection = [edgeA[0] + edgeB[0], edgeA[1] + edgeB[1] - 600];
    const coreNorm = Math.hypot(...coreDirection);
    coreDirection[0] /= coreNorm; coreDirection[1] /= coreNorm;
    const onCore = point => { const scale = 18 / (point[0] * coreDirection[0] + (point[1] - 300) * coreDirection[1]); return [point[0] * scale, 300 + (point[1] - 300) * scale]; };
    const connection = [onCore(edgeA), edgeA, edgeB, onCore(edgeB)];
    for (const x of [-80, 70]) parts.push({
      name: `curtain.attachment.${x}`, shape: { kind: 'prism', frame: F, polygon: connection, s0: x, s1: x + 10 },
      at: [x + 5, 19 * ca, 300 + 19 * sa], key: k.depthOf([x + 5, 19 * ca, 300 + 19 * sa], P),
      svg: k.solidSvg(G.prismOf(F, connection, x, x + 10, P), { tone: 'hi' }),
    });
    const bottom = model.nodes.at(-1).b;
    const bottomPlan = { x: -121, y: bottom[0] - 4, w: 242, d: 8, r: 0.5 };
    const sealPlan = { x: -120, y: bottom[0] - 2, w: 240, d: 4, r: 0.4 };
    for (const [name, plan, z, h, tone] of [
      ['curtain.bottom', bottomPlan, bottom[1] - 7, 7, 'hi'],
      ['curtain.seal', sealPlan, bottom[1] - 8, 1, 'lo'],
    ]) parts.push({ name, shape: { kind: 'slab', plan, z, h }, at: [0, bottom[0], z + h / 2],
      key: k.depthOf([0, bottom[0], z + h / 2], P), svg: k.solidSvg(k.slabOf(plan, z, h, P, 3, 0.3), { tone }) });
    const center = k.iso([143, 0, 300], P);
    const p0 = k.iso([143, Math.cos(model.axisAngle) * 3, 300 + Math.sin(model.axisAngle) * 3], P);
    const p1 = k.iso([143, Math.cos(model.axisAngle) * 8, 300 + Math.sin(model.axisAngle) * 8], P);
    const marker = `<path class="shaft-mark" d="${k.pathOf([p0, p1])}"/><circle class="shaft-center" cx="${center[0]}" cy="${center[1]}" r="2.1"/>`;
    return { model, parts, marker };
  }
  function itemsAt(progress) {
    const { model, parts, marker } = movingItems(progress);
    const items = orderParts([...fixed, ...parts], P, k);
    return { model, items, marker };
  }
  function draw(progress) {
    const { model, items, marker } = itemsAt(progress);
    return { model, svg: items.map(item => `<g data-part="${item.name}">${item.svg}</g>`).join('') + marker };
  }
  return { P, fixed, itemsAt, draw, trackedId };
}
