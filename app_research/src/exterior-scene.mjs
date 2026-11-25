// Street-view installation. +x is along the axle, +y is OUT toward the street,
// +z is up. The camera remains on +y. The former machine is not flipped on screen:
// its material path is reflected in physical depth, then rebuilt and re-occluded.
// Assembly: threshold, two jambs, six guide walls, lintel, two cantilever
// bearing plates/caps, three axle pieces, two straps, 45 slats, bottom bar
// and seal. Five mitred folds of the hood finish at a cutaway near its right end.
export function exteriorModel(base) {
  const y = v => base.guide[0] - v;
  const point = ([v, z]) => [y(v), z];
  const vector = ([v, z]) => [-v, z];
  return {
    ...base, axis: point(base.axis), guide: point(base.guide),
    // atan2(z−axisZ, y−axisY) is the right-hand, world-space shaft angle.
    axisAngle: Math.PI - base.axisAngle, angularDisplacement: -base.angularDisplacement,
    attachment: point(base.attachment), exit: point(base.exit),
    bottomAttachment: point(base.bottomAttachment), bottomBar: {...base.bottomBar, y:y(base.bottomBar.y)},
    nodes:base.nodes.map(n=>({...n, a:point(n.a), b:point(n.b), mid:point(n.mid),
      tangent:vector(n.tangent), startTangent:vector(n.startTangent), endTangent:vector(n.endTangent)})),
    path:base.path.map(n=>({...n, y:y(n.y), tangent:vector(n.tangent)}))
  };
}

// The inside of each folded sheet meets the previous one on its mitre. These
// are narrow convex pieces rather than one concave solid that would fill the hood.
function foldedShell(points, thickness) {
  const normals=points.slice(1).map(([y,z],i)=>{
    const dy=y-points[i][0],dz=z-points[i][1],L=Math.hypot(dy,dz);
    return [dz/L,-dy/L];
  });
  const inner=points.map(([y,z],i)=>{
    const a=normals[Math.max(0,i-1)], b=normals[Math.min(i,normals.length-1)];
    const s=thickness/(1+a[0]*b[0]+a[1]*b[1]);
    return [y+s*(a[0]+b[0]), z+s*(a[1]+b[1])];
  });
  return normals.map((_,i)=>[points[i],points[i+1],inner[i+1],inner[i]]);
}

export function createExteriorScene(k,G,baseModelAt,config,orderParts) {
  const F=G.frameOf([0,0,0],[1,0,0],[0,1,0],[0,0,1]);
  const P=k.fitProjection(k.boxCorners({x:-150,y:-27,w:300,d:110,r:0},-5,341),930,1100,
    {pad:15,azimuth:61,elevation:15});
  const fixed=[];
  const midpoint=poly=>poly.reduce(([a,b],[y,z])=>[a+y/poly.length,b+z/poly.length],[0,0]);
  const part=(name,shape,paths,at,tone='mid',inner='')=>({name,shape,at,key:k.depthOf(at,P),
    svg:k.solidSvg(paths,{tone,inner})});
  function box(name,x,y,z,w,d,h,tone='mid'){
    const plan={x,y,w,d,r:Math.min(.45,w/4,d/4)};
    return part(name,{kind:'slab',plan,z,h},k.slabOf(plan,z,h,P,3,.22),[x+w/2,y+d/2,z+h/2],tone);
  }
  function prism(name,poly,s0,s1,tone='mid',inner=''){
    return part(name,{kind:'prism',frame:F,polygon:poly,s0,s1},G.prismOf(F,poly,s0,s1,P),
      [(s0+s1)/2,...midpoint(poly)],tone,inner);
  }
  const axisY=config.guideY-config.axisY, axisZ=config.axisZ;
  function axle(name,s0,s1,r,tone='mid'){
    const frame=G.frameOf([0,axisY,axisZ],F.a,F.u,F.v);
    return part(name,{kind:'disc',frame,s0,s1,r},G.disc(s0,s1,r,frame,P),[(s0+s1)/2,axisY,axisZ],tone);
  }
  fixed.push(box('stand.threshold',-148,-26,-5,296,53,5,'lo'));
  for (const side of [-1,1]){
    const left=side<0, railX=left?-130:118, plateX=left?-139:131;
    // Rear of the opening is -y. Each guide back bolts against a solid jamb.
    fixed.push(box('jamb.'+side,left?-145:123,-22,0,22,16,276));
    fixed.push(box('guide.back.'+side,railX,-6,0,12,2,250));
    fixed.push(box('guide.edge.'+side,left?-130:126,-4,0,4,8,250));
    fixed.push(box('guide.front.'+side,railX,4,0,12,2,250,'hi'));
    // Cantilever slopes out from the wall and ends around the shaft bearing.
    const bracket=[[-22,276],[-22,319],[axisY+8,319],[axisY+15,311],
      [axisY+15,293],[axisY+8,285],[-6,276]];
    fixed.push(prism('bearing.plate.'+side,bracket,plateX,plateX+8));
    fixed.push(axle('bearing.cap.'+side,left?-142:139,left?-139:142,10,'hi'));
  }
  // Header stays visibly behind the guides and the roll. Only the cover projects.
  fixed.push(box('jamb.header',-145,-22,319,290,10,20,'lo'));
  fixed.push(axle('shaft.core',-120,120,config.coreRadius),axle('shaft.left',-131,-120,7.5,'hi'),axle('shaft.right',120,131,7.5,'hi'));
  // Existing shop sign and social UI are not part of the model. Crop only the near
  // end of the hood so the outward axle and winding direction can be inspected.
  const profile=[[-22,340.5],[73,340.5],[82,331.5],[82,279],[68,265],[53,265]];
  foldedShell(profile,1.5).forEach((poly,i)=>fixed.push(prism('hood.fold.'+i,poly,-143,65,'hi')));

  function itemsAt(progress){
    const m=exteriorModel(baseModelAt(progress)), moving=[];
    const normals=m.nodes.map(n=>{
      const dy=n.b[0]-n.a[0], dz=n.b[1]-n.a[1], len=Math.hypot(dy,dz);
      return [-dz/len,dy/len];
    });
    // Butt neighbours at the same mitre instead of letting square-ended
    // slats interpenetrate as they enter the roll. The hinge stays on its
    // material node for every pose. Both neighbours share each joint exactly.
    const joint=i=>{
      const a=normals[Math.max(i-1,0)],b=normals[Math.min(i,normals.length-1)];
      const s=1.1/(1+a[0]*b[0]+a[1]*b[1]);
      return [(a[0]+b[0])*s,(a[1]+b[1])*s];
    };
    for(const [i,n] of m.nodes.entries()){
      const a=joint(i),b=joint(i+1);
      const poly=[[n.a[0]+a[0],n.a[1]+a[1]],[n.b[0]+b[0],n.b[1]+b[1]],
        [n.b[0]-b[0],n.b[1]-b[1]],[n.a[0]-a[0],n.a[1]-a[1]]];
      const ridge=[(poly[0][0]+poly[1][0])/2,(poly[0][1]+poly[1][1])/2];
      moving.push(prism('curtain.slat.'+n.id,poly,-120,120,'hi',k.lineSvg(k.segment([-120,...ridge],[120,...ridge],P),{tone:'faint'})));
    }
    const n=m.nodes[0];
    const dy=n.b[0]-n.a[0],dz=n.b[1]-n.a[1],L=Math.hypot(dy,dz),ty=dy/L,tz=dz/L;
    // Inner skin changes side under reflection. Choose by radial distance,
    // not by hardcoding the winding sense of the previous specimen.
    const radialDot=(-tz)*(n.a[0]-axisY)+ty*(n.a[1]-axisZ);
    const inward=radialDot<0?1:-1;
    const a=[n.a[0]+inward*(-tz)*1.1,n.a[1]+inward*ty*1.1];
    const b=[a[0]+3*ty,a[1]+3*tz];
    const py=(a[0]+b[0])/2-axisY,pz=(a[1]+b[1])/2-axisZ,norm=Math.hypot(py,pz);
    const contact=([y,z])=>{
      const s=config.coreRadius/((y-axisY)*py/norm+(z-axisZ)*pz/norm);
      return [axisY+(y-axisY)*s,axisZ+(z-axisZ)*s];
    };
    const strap=[contact(a),a,b,contact(b)];
    for(const x of [-80,70]) moving.push(prism('curtain.attachment.'+x,strap,x,x+10,'hi'));
    moving.push(box('curtain.bottom',-121,m.guide[0]-4,m.bottomZ-7,242,8,7,'hi'),
      box('curtain.seal',-120,m.guide[0]-2,m.bottomZ-8,240,4,1,'lo'));
    const at=(r)=>k.iso([142,axisY+r*Math.cos(m.axisAngle),axisZ+r*Math.sin(m.axisAngle)],P);
    const center=at(0), marker=`<path class="shaft-mark" d="${k.pathOf([at(3),at(8)])}"/><circle class="shaft-center" cx="${center[0]}" cy="${center[1]}" r="2.1"/>`;
    return {model:m,items:orderParts([...fixed,...moving],P,k),marker};
  }
  function draw(p){const {model,items,marker}=itemsAt(p);return {model,svg:items.map(i=>`<g data-part="${i.name}">${i.svg}</g>`).join('')+marker};}
  return {P,fixed,itemsAt,draw};
}
