export function createCloseup(k, G, modelAt, config) {
  const F = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const P = k.fitProjection([[0, -38, 215], [0, 58, 340]], 830, 950, { pad: 20, azimuth: 0, elevation: 0 });
  P.origin[0] += 110;
  P.origin[1] += 460;
  const point = (y, z) => k.iso([0, y, z], P);
  return function closeup(progress) {
    const state = modelAt(progress);
    const out = [];
    const center = point(0, 300);
    const radius = config.coreRadius * k.cameraOf(P).k;
    out.push(`<circle class="section-core" cx="${center[0]}" cy="${center[1]}" r="${radius}"/>`);
    const groove = [[41.3, 250], [40.2, 250], [40.2, 218], [41.3, 218]];
    const guide = [[46.7, 250], [47.8, 250], [47.8, 218], [46.7, 218]];
    for (const polygon of [groove, guide]) out.push(k.solidSvg(G.prismOf(F, polygon, -6, 6, P), { tone: 'mid' }));
    for (const node of state.nodes) {
      const dy = node.b[0] - node.a[0], dz = node.b[1] - node.a[1];
      const len = Math.hypot(dy, dz);
      const n = [-dz / len * 1.1, dy / len * 1.1];
      const polygon = [[node.a[0] + n[0], node.a[1] + n[1]], [node.b[0] + n[0], node.b[1] + n[1]],
        [node.b[0] - n[0], node.b[1] - n[1]], [node.a[0] - n[0], node.a[1] - n[1]]];
      out.push(k.solidSvg(G.prismOf(F, polygon, -6, 6, P), { tone: 'hi', lit: node.id === 28 }));
    }
    const a = state.axisAngle;
    const first = state.nodes[0];
    const delta = [first.b[0] - first.a[0], first.b[1] - first.a[1]];
    const norm = Math.hypot(...delta);
    const tangent = delta.map(value => value / norm), normal = [-tangent[1], tangent[0]];
    const edgeA = [first.a[0] - normal[0] * 1.1, first.a[1] - normal[1] * 1.1];
    const edgeB = [edgeA[0] + tangent[0] * 3, edgeA[1] + tangent[1] * 3];
    const coreDirection = [edgeA[0] + edgeB[0], edgeA[1] + edgeB[1] - 600];
    const coreNorm = Math.hypot(...coreDirection);
    coreDirection[0] /= coreNorm; coreDirection[1] /= coreNorm;
    const onCore = point => { const scale = 18 / (point[0] * coreDirection[0] + (point[1] - 300) * coreDirection[1]); return [point[0] * scale, 300 + (point[1] - 300) * scale]; };
    const attachment = [onCore(edgeA), edgeA, edgeB, onCore(edgeB)];
    out.push(k.solidSvg(G.prismOf(F, attachment, -6, 6, P), { tone: 'hi' }));
    const bottom = state.bottomZ;
    out.push(k.solidSvg(G.prismOf(F, [[40, bottom], [48, bottom], [48, bottom - 7], [40, bottom - 7]], -6, 6, P), { tone: 'hi' }));
    out.push(k.solidSvg(G.prismOf(F, [[42, bottom - 7], [46, bottom - 7], [46, bottom - 8], [42, bottom - 8]], -6, 6, P), { tone: 'lo' }));
    const p0 = point(0, 300), p1 = point(Math.cos(a) * 13, 300 + Math.sin(a) * 13);
    out.push(`<path class="shaft-mark" d="${k.pathOf([p0, p1])}"/><circle class="shaft-center" cx="${center[0]}" cy="${center[1]}" r="5"/>`);
    return out.join('');
  };
}
