// Geometry regressions for the street-view insert; node --test app_research/src/exterior.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createExteriorScene } from './exterior-scene.mjs';
import { CONFIG, modelAt } from '../../content/卷帘门卷绕动画version1/model.mjs';
import { orderParts } from '../../content/卷帘门卷绕动画version1/order.mjs';

const dir = process.env.ANATOMY_DIR || join(homedir(), '.codex', 'skills', 'anatomy');
const [k, G] = await Promise.all(['iso-kit.mjs','lathe.mjs'].map(file => import(pathToFileURL(join(dir,'kit',file)))));
const scene = createExteriorScene(k, G, modelAt, CONFIG, orderParts);
const states = Array.from({length:21}, (_,i)=>{
  const pose=scene.itemsAt(i/20);
  return {...pose,orderStats:{...orderParts.lastStats}};
});
const close = (a,b,eps=1e-7) => assert.ok(Math.abs(a-b)<eps, `${a} vs ${b}`);
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);

test('真实卷轴位于门帘靠街的一侧；同一高度下它比门帘更靠近外侧机位',()=>{
  assert.ok(k.towardViewer(scene.P)[1]>0);
  for (const {model:m,items} of states){
    assert.ok(m.axis[0]-m.guide[0] > m.radius);
    const near = k.depthOf([0,...m.axis],scene.P);
    const back = k.depthOf([0,m.guide[0],m.axis[1]],scene.P);
    assert.ok(near>back);
    const shaft = items.find(({shape:s})=>s.kind==='disc' && s.r===m.coreRadius && s.s0<0 && s.s1>0);
    assert.ok(shaft,'expected actual rendered axle core'); close(shaft.at[1],m.axis[0]); close(shaft.at[2],m.axis[1]);
    const hood = items.filter(item=>item.name.startsWith('hood.'));
    assert.ok(hood.length>0 && hood.some(({shape})=>shape.polygon.some(([y])=>y>m.axis[0]+m.radius)));
    const slats = new Map(items.filter(it=>it.name.startsWith('curtain.slat.')).map(it=>[Number(it.name.split('.').at(-1)),it.shape]));
    for(const n of m.nodes){
      const q=slats.get(n.id)?.polygon; assert.ok(q);
      const mid=(u,v)=>[(u[0]+v[0])/2,(u[1]+v[1])/2];
      // Compare the visible slat's geometry to *both* model hinges, not only diagnostics.
      close(dist(mid(q[0],q[3]),n.a),0); close(dist(mid(q[1],q[2]),n.b),0);
    }
  }
});

test('帘片从轴后侧入卷；开门时贴轴连接处沿反向右手角转动',()=>{
  for(const [{model:last},{model:m}] of states.slice(1).map((frame,i)=>[states[i],frame])){
    assert.ok(m.exit[0]<m.axis[0]); assert.ok(m.guide[0]<m.exit[0]);
    assert.ok(m.axisAngle < last.axisAngle);
    const a=last.attachment.map((v,i)=>v-last.axis[i]), b=m.attachment.map((v,i)=>v-m.axis[i]);
    const swept=Math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]);
    close(swept,m.axisAngle-last.axisAngle); assert.ok(swept<0);
    // At the rear tangent, the upward component of omega × radius is positive.
    assert.ok(swept*(m.exit[0]-m.axis[0]) > 0);
    const spiral=m.path.filter(p=>p.region==='roll');
    // Winding sense along the curtain, from first fixed slat toward guide, is positive.
    assert.ok(spiral.every(p=>(p.y-m.axis[0])*p.tangent[1]-(p.z-m.axis[1])*p.tangent[0]>0));
  }
});

test('固定导轨内上升、卷层增厚；材料总长和逐片连接恒定',()=>{
  const reference=states[0].model, ids=reference.nodes.map(n=>[n.id,n.s0,n.s1]);
  for(const [i,{model:m}] of states.entries()){
    assert.deepEqual(m.axis,reference.axis); assert.deepEqual(m.guide,reference.guide);
    close(m.totalLength,reference.totalLength); close(m.rollLength+m.leadLength+m.verticalLength,m.totalLength);
    close(m.bottomBar.y,m.guide[0]); close(dist(m.bottomAttachment,m.nodes.at(-1).b),0);
    close(dist(m.attachment,m.nodes[0].a),0);
    assert.deepEqual(m.nodes.map(n=>[n.id,n.s0,n.s1]),ids);
    for(let j=1;j<m.nodes.length;j++) close(dist(m.nodes[j-1].b,m.nodes[j].a),0);
    for(const p of m.path.filter(p=>p.region==='vertical')) close(p.y,m.guide[0]);
    if(i){const prior=states[i-1].model; assert.ok(m.bottomZ>prior.bottomZ && m.radius>prior.radius && m.rollLength>prior.rollLength);}
  }
});

test('罩壳、近端和可见帘片的绘制顺序没有环或无法判断的重叠',()=>{
  for(const {orderStats:s} of states){
    assert.ok(s.overlapping>0); assert.equal(s.cycles,0); assert.equal(s.unresolved,0);
  }
});
