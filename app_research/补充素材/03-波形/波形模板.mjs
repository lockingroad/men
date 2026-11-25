// Render a standalone SMIL SVG and a silent editing insert from the same math.
// node 波形模板.mjs [--svg-only | --export | --verify | --still]
import { execFile, spawn } from 'node:child_process';
import { writeFile, mkdtemp, rm, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
const run=promisify(execFile);
const dest=fileURLToPath(new URL('.',import.meta.url));
const base='433载波与指令';
// Change bits to any small illustrative sequence. Never use a real customer's code.
const bits=[1,0,1,0,1], cycles=2; // illustrative cycles per bit, not a real symbol rate
const W=1080,H=1920,D=6,FPS=30;
const start=0.32,finish=4.94, fadeEnd=5.36;
const X=98,R=938,L=R-X, col=L/bits.length, A=61, upper=627, lower=1063;
const paper='#f6f3e9',ink='#24322e',sub='#55635c',mute='#778378',grid='#c5ccbf';
const teal='#087958',darkTeal='#096546';
const fmt=n=>Number(n.toFixed(4));
const clamp=x=>Math.min(1,Math.max(0,x));
const progressAt=t=>clamp((t-start)/(finish-start));
const bitAt=u=>bits[Math.min(bits.length-1,Math.floor(clamp(u)*bits.length))];
const amp=(u,gate)=>Math.sin(u*Math.PI*2*cycles*bits.length)*(gate?bitAt(u):1);
const text=(x,y,str,size=37,weight=500,color=ink,anchor='start',font='')=>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" ${font?'font-family="'+font+'"':''}>${str}</text>`;
const path=(d,color,width,rest='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${rest}/>`;
const timing=(attr, vals, times, mode='linear')=>`<animate attributeName="${attr}" calcMode="${mode}" dur="6s" repeatCount="indefinite" values="${vals.join(';')}" keyTimes="${times.map(t=>fmt(t/D)).join(';')}"/>`;
const trace=(y,gate)=>Array.from({length:bits.length*cycles*32+1},(_,i)=>{
  const u=i/(bits.length*cycles*32);
  return (i?'L':'M')+fmt(X+L*u)+','+fmt(y-amp(u,gate)*A);
}).join('');
const a=trace(upper,false),b=trace(lower,true);
// Gray uninterrupted carrier remains visible even on the opening frame.
function svg(t) {
  const live=t===undefined; if(live) t=0;
  const u=progressAt(t), edge=X+u*L;
  const scanOpacity=t<start?clamp((t-(start-.08))/.08):t<=finish?1:clamp(1-(t-finish)/(fadeEnd-finish));
  const maskTrack=live?timing('width',[0,0,L,L],[0,start,finish,D]):'';
  const scanTrack=live?timing('opacity',[0,0,1,1,0,0],[0,start-.08,start,finish,fadeEnd,D]):'';
  let ruler='',labels='';
  for(let j=0;j<=bits.length;j++){
    const x=X+j*col;
    ruler+=path(`M${x},${upper-102}v204 M${x},${lower-102}v231`,grid,1.6,`stroke-dasharray="3 9"`);
    if(j===bits.length) continue;
    const cx=x+col/2;
    // Use one neutral label at rest, ink it only once the write head reaches this cell.
    labels+=text(fmt(cx),lower+174,bits[j],52,520,mute,'middle','Menlo, Consolas, monospace');
    const when=start+j/bits.length*(finish-start);
    const op=t>=when?1:0;
    labels+=`<g opacity="${op}">${live?timing('opacity',[0,1,1],[0,when,D],'discrete'):''}${text(fmt(cx),lower+174,bits[j],52,700,bits[j]?darkTeal:ink,'middle','Menlo, Consolas, monospace')}</g>`;
  }
  // Track value is x only; the cursor move and trace clipping share the same u.
  let scan='';
  for(const y of [upper,lower]){
    scan+=`<line x1="${fmt(edge)}" x2="${fmt(edge)}" y1="${y-97}" y2="${y+97}" stroke="${teal}" opacity=".67" stroke-width="2.3">${live?timing('x1',[X,X,R,R],[0,start,finish,D])+timing('x2',[X,X,R,R],[0,start,finish,D]):''}</line>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" font-family="'Noto Sans SC','PingFang SC','Heiti SC',sans-serif">
<title id="t">433 MHz 载波如何携带指令：OOK 示意</title><desc id="d">上方是不间断的示意载波；下方按照示例位串 ${bits.join('')} 开关载波。1 对应发射，0 对应停发。横轴放慢、周期数压缩；不代表具体遥控器的码型。</desc>
<defs><clipPath id="reveal"><rect x="${X}" y="370" width="${fmt(u*L)}" height="900">${maskTrack}</rect></clipPath></defs>
<rect width="${W}" height="${H}" fill="${paper}"/>
${text(X,447,'连续载波',58,640,ink)}${text(R,447,'433 MHz',42,520,sub,'end','Menlo, Consolas, monospace')}
${text(X,884,'开关后的波形',58,640,ink)}${text(R,884,'1 发射   0 停发',37,520,sub,'end')}
${ruler}
${path(`M${X} ${upper}H${R} M${X} ${lower}H${R}`,grid,2)}
${path(a,'#a1afa6',4.0)}
<g clip-path="url(#reveal)">${path(a,'#526b60',5.4)}${path(b,teal,6.2)}</g>
${labels}<g opacity="${fmt(scanOpacity)}">${scanTrack}${scan}</g>
${text(X,1374,'OOK 示例 · 波形放慢展示，非实测',31,500,sub)}
</svg>\n`;
}
function checkModel(){
  assert.ok(bits.length>=2 && bits.length<=8 && bits.includes(0) && bits.includes(1) && bits.every(x=>x===0||x===1));
  assert.ok(Number.isInteger(cycles) && cycles>0);
  for (let i=0;i<bits.length;i++) for(const q of [0.13,0.25,0.64,0.89]){
    const u=(i+q)/bits.length;
    assert.ok(Math.abs(amp(u,true)-bits[i]*amp(u,false))<1e-9);
  }
  assert.equal(progressAt(0),0); assert.equal(progressAt(D-1/FPS),1);
}
async function verify(mp4) {
  const {stdout}=await run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',mp4]);
  const m=JSON.parse(stdout),v=m.streams[0]; assert.equal(m.streams.length,1);
  for(const [k,value] of Object.entries({codec_type:'video',codec_name:'h264',width:W,height:H,avg_frame_rate:FPS+'/1',pix_fmt:'yuv420p',nb_read_frames:String(D*FPS)})) assert.equal(v[k],value);
  assert.equal(Number(m.format.duration),D);
  console.log(`${W}×${H}, ${D}s, ${FPS} fps, ${v.nb_read_frames} frames, H.264/yuv420p, no audio`);
}
async function raster(s,out,cache) {
  const p=spawn('rsvg-convert',['--output',out,'-'],{
    stdio:['pipe','ignore','pipe'], env:{...process.env,XDG_CACHE_HOME:cache}
  });
  let err=''; p.stderr.on('data',v=>err+=v); p.stdin.on('error',()=>{});
  await new Promise((ok,bad)=>{p.once('error',bad);p.on('close',c=>c?bad(Error(err)):ok());p.stdin.end(s);});
}
async function render(){
  const tmp=await mkdtemp(join(tmpdir(),'zq-ook-'));
  try{
    await raster(svg(0),join(tmp,'f000.png'),tmp);
    let i=1;
    await Promise.all(Array.from({length:3},async()=>{
      while(i<D*FPS){const j=i++;await raster(svg(j/FPS),join(tmp,'f'+String(j).padStart(3,'0')+'.png'),tmp);}
    }));
    const file=join(tmp,'out.mp4');
    await run('ffmpeg',['-hide_banner','-loglevel','error','-framerate',String(FPS),'-i',join(tmp,'f%03d.png'),
      '-an','-frames:v',String(D*FPS),'-vf','scale=iw:ih:out_color_matrix=bt709,format=yuv420p,setsar=1','-c:v','libx264','-threads','4','-preset','medium','-crf','17',
      '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',file]);
    await verify(file); await rename(file,join(dest,base+'.mp4'));
  }finally{await rm(tmp,{recursive:true,force:true});}
}
checkModel();
const arg=process.argv[2]??'--export';
if(arg==='--verify') await verify(join(dest,base+'.mp4'));
else if(arg==='--svg-only'||arg==='--export'){
  await writeFile(join(dest,base+'.svg'),svg());
  if(arg==='--export') await render();
}else if(arg==='--still') {
  const tmp=await mkdtemp(join(tmpdir(),'zq-ook-still-'));
  try {await raster(svg(5.5),join(dest,'波形定格.png'),tmp);} finally {await rm(tmp,{recursive:true,force:true});}
}else throw Error('Use --svg-only / --export / --verify / --still');
