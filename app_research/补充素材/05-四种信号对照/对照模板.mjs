// Generates both native SMIL and deterministic video frames using exactly the same tracks.
// “Signal” marks are purposeful visual cues, NOT measured radiation or physical speed.
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {mkdtemp,writeFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {remote} from '../../src/photo-remote.mjs';
import {receiver} from '../../src/photo-controller.mjs';
const run=promisify(execFile), dir=fileURLToPath(new URL('.',import.meta.url));
const W=1080,H=1920,FPS=30,D=9,frames=D*FPS,base='四种信号对照';
const p={paper:'#f6f3e9',ink:'#20352d',gray:'#59665d',muted:'#748074',line:'#c4cabe',green:'#08755a',light:'#a4d5b7',ir:'#b95c3b',metal:'#83948a'};
const variants=[
  ['蓝牙','2.4 GHz','手机连接蓝牙音箱'],
  ['红外','红外光','遥控器对准电视'],
  ['NFC','13.56 MHz','手机贴近标签'],
  ['433 遥控','433 MHz','已配对的遥控器开门'],
];
const fmt=x=>Number(x.toFixed(5)),clamp=x=>Math.max(0,Math.min(1,x));
const E={bluetooth:[0,1.9],ir:[1.95,3.85],nfc:[3.9,5.85],rf:[5.9,8.0],all:8.15};
// Numerical tracks; the browser linearly interpolates the same points as the encoder.
const tracks={
 focus:variants.map((_,i)=>{const [s,e]=Object.values(E)[i];
   return i===0?[[0,1],[e-.18,1],[e,.56],[8,.56],[8.35,1],[D,1]]:
     [[0,.56],[s-.05,.56],[s+.16,1],[e-.16,1],[e,.56],[8.04,.56],[8.35,1],[D,1]];}),
 // State changes persist in the final overview; travellers exist only during their own exchange.
 btRx:[[0,0],[.62,0],[.80,1],[D,1]], note:[[0,0],[.68,0],[.88,1],[D,1]],
 btPulse:[[0,0],[.14,0],[.23,1],[.70,1],[.83,0],[D,0]], btGo:[[0,0],[.14,0],[.70,1],[D,1]],
 btAck:[[0,0],[.85,0],[.99,1],[1.39,1],[1.51,0],[D,0]], btBack:[[0,0],[.85,0],[1.45,1],[D,1]],
 irBeam:[[0,0],[2.20,0],[2.39,1],[2.85,1],[3.01,0],[D,0]],
 tvOn:[[0,0],[2.45,0],[2.71,1],[D,1]],
 phoneSlide:[[0,0],[4.13,0],[4.26,.06],[4.48,.38],[4.74,.86],[4.93,1],[D,1]],
 field:[[0,0],[4.7,0],[4.97,1],[5.46,1],[5.72,0],[D,0]], tagOK:[[0,0],[4.98,0],[5.16,1],[D,1]],
 key:[[0,0],[6.13,0],[6.24,1],[6.54,1],[6.72,0],[D,0]],
 rfPulse:[[0,0],[6.33,0],[6.43,1],[6.90,1],[7.01,0],[D,0]],
 rfGo:[[0,0],[6.33,0],[6.91,1],[D,1]],
 rfRx:[[0,0],[6.91,0],[7.03,1],[D,1]],
 door:[[0,0],[7.06,0],[7.20,.06],[7.46,.41],[7.72,.85],[7.96,1],[D,1]]
};
for(const tr of [...tracks.focus,...Object.values(tracks).slice(1)]){
 assert.equal(tr[0][0],0);assert.equal(tr.at(-1)[0],D);assert.ok(tr.every(([t,v],i)=>v>=0&&v<=1&&(!i||t>tr[i-1][0])));
}
function sample(tr,t){for(let i=1;i<tr.length;i++)if(t<=tr[i][0]){const [a,x]=tr[i-1],[b,y]=tr[i];return x+(y-x)*clamp((t-a)/(b-a));}return tr.at(-1)[1];}
const text=(x,y,msg,size,color=p.ink,weight=560,anchor='start',font='')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="${weight}" ${font?'font-family="'+font+'"':''}>${msg}</text>`;
const path=(d,stroke,width,extra='')=>`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const shadow=(cx,cy,rx,ry)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#283d32" opacity=".085"/>`;
const defs=`<defs><linearGradient id="br" x2=".9" y2="1"><stop stop-color="#eff1e9"/><stop offset=".46" stop-color="#bbc6ba"/><stop offset="1" stop-color="#8b998d"/></linearGradient>
<linearGradient id="poly" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#516059"/><stop offset=".38" stop-color="#35423a"/><stop offset="1" stop-color="#25332b"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#86988a"/><stop offset="1" stop-color="#526559"/></linearGradient>
<linearGradient id="ir-cone"><stop stop-color="#c66f4d" stop-opacity=".42"/><stop offset="1" stop-color="#c66f4d" stop-opacity=".08"/></linearGradient>
<linearGradient id="tv" x2="1" y2=".8"><stop stop-color="#d6e9d9"/><stop offset="1" stop-color="#71ac94"/></linearGradient>
<pattern id="mesh" patternUnits="userSpaceOnUse" width="6" height="6"><circle cx="2" cy="2" r="1.6" fill="#273731"/><circle cx="2" cy="2.5" r=".55" fill="#89968a"/></pattern>
<clipPath id="gateOpening"><rect x="825" y="-46" width="119" height="101"/></clipPath></defs>`;
function phone(mode){
 const display=mode==='bt'?`<rect x="-25" y="-27" width="50" height="50" rx="9" fill="#d6e5d8"/>${path('M-3 3v-17l16-3v15',p.green,4.4)}<ellipse cx="-7" cy="6" rx="6.8" ry="4.3" fill="${p.green}"/><ellipse cx="9.4" cy=".8" rx="6.4" ry="4.3" fill="${p.green}"/>${path('M-23 36H19 M-19 43H9','#82968a',2.1)}`:
 `<g fill="none" stroke="#90aa97" stroke-width="2.5"><rect x="-24" y="-31" width="48" height="53" rx="10"/><rect x="-18" y="-25" width="36" height="41" rx="8"/></g><rect x="-9" y="-12" width="18" height="19" rx="3" fill="#698d7a"/>`;
 return `${shadow(5,89,46,4.8)}<rect x="-39" y="-78" width="82" height="165" rx="13" fill="#7e8c80" stroke="#24372d" stroke-width="3"/><rect x="-43" y="-82" width="82" height="165" rx="13" fill="url(#poly)" stroke="#21332b" stroke-width="2.4"/><rect x="-37" y="-75" width="70" height="151" rx="10" fill="#e8ece0"/><path d="M-8 -68H9" stroke="#53675b" stroke-width="3.4" stroke-linecap="round"/><circle cx="15" cy="-68" r="2.15" fill="#6e8375"/>${display}${path('M-10 66H10','#92a091',2.5)}`;
}
function speaker(){
 return `${shadow(5,84,51,5)}<path d="M-50-53q0-15 13-19l76-3q13 0 17 14l4 124q0 14-12 18l-74 3q-14 0-17-13z" fill="url(#poly)" stroke="#283b32" stroke-width="2.7"/><rect x="-50" y="-67" width="99" height="143" rx="17" fill="url(#br)" stroke="#4b5e50" stroke-width="2.5"/><rect x="-44" y="-60" width="88" height="128" rx="14" fill="#819285"/><rect x="-44" y="-60" width="88" height="128" rx="14" fill="url(#mesh)"/><circle cy="24" r="24.5" fill="none" stroke="#536658" stroke-width="2.4"/><circle cy="-29" r="12" fill="none" stroke="#546859" stroke-width="2"/><circle cx="27" cy="59" r="3.8" fill="#405246"/>`;
}
function remoteTV(){
 return `<g transform="rotate(79)">${shadow(2,72,23,3)}<rect x="-22" y="-71" width="47" height="143" rx="13" fill="#24362c"/><rect x="-25" y="-74" width="47" height="143" rx="13" fill="url(#poly)" stroke="#273a2f" stroke-width="2.5"/><rect x="-9" y="-73" width="17" height="6" rx="3" fill="#623b34"/><circle cx="10" cy="-50" r="6" fill="#b26550"/><circle cy="-25" r="12.5" fill="#718174"/><circle cy="-25" r="6.5" fill="#d3d9cd"/>${Array.from({length:12},(_,i)=>`<rect x="${-14+(i%3)*10}" y="${-2+Math.floor(i/3)*11}" width="7.8" height="6" rx="1.7" fill="#acb8ab"/>`).join('')}${path('M-13 48H11','#85988a',3)}</g>`;
}
function tv(active){
 return `${shadow(0,75,94,5)}<path d="M-44 72l12-18h64l13 18" fill="#617367" stroke="#314738" stroke-width="2.5"/><rect x="-96" y="-64" width="194" height="118" rx="7" fill="url(#poly)" stroke="#243b30" stroke-width="3"/><rect x="-88" y="-55" width="178" height="98" rx="3" fill="#778b7e"/>${active}<circle cx="-76" cy="49" r="3" fill="#452c27"/>`;
}
function tag(){
 return `${shadow(0,66,56,4)}<g transform="rotate(-7)"><rect x="-58" y="-59" width="118" height="120" rx="13" fill="#a8b6a7" stroke="#617663" stroke-width="2"/><rect x="-61" y="-63" width="118" height="120" rx="13" fill="#edeedf" stroke="#91a28e" stroke-width="2"/>${[0,1,2,3].map(i=>`<rect x="${-49+4*i}" y="${-49+4*i}" width="${96-8*i}" height="${92-8*i}" rx="${10-i}" fill="none" stroke="#82987d" stroke-width="2"/>`).join('')}<rect x="24" y="-8" width="13" height="16" rx="2" fill="#657767"/>${path('M31 -8v-15h-6','#768e76',1.8)}</g>`;
}
function miniGate(lift){
 const slats=Array.from({length:13},(_,i)=>path(`M825 ${-42+i*8}H944`,'#9daa9e',1.8)).join('');
 return `${shadow(883,68,68,3)}<rect x="824" y="-47" width="121" height="103" fill="#c7cbbd"/><rect x="827" y="-45" width="115" height="99" fill="#e5e6d8"/>
 <g clip-path="url(#gateOpening)">${lift(`<rect x="825" y="-47" width="119" height="102" fill="#cbd5c8"/>${slats}<path d="M825 53h119" stroke="#566a5b" stroke-width="4"/>`)}</g>
 <rect x="817" y="-48" width="9" height="110" rx="1.5" fill="url(#br)" stroke="#6a7d6a" stroke-width="1.4"/><rect x="943" y="-48" width="9" height="110" rx="1.5" fill="url(#br)" stroke="#6a7d6a" stroke-width="1.4"/>
 <path d="M810 -64l8-9h130l10 7v22H810z" fill="url(#br)" stroke="#627965" stroke-width="2"/>${path('M811 -63h146','#dfe4d9',2)}`;
}
function svg(at){
 const live=at===undefined,t=at??0;
 function item(tr,kind,content,from=0,to=1){
   const V=x=>fmt(from+(to-from)*x), vals=tr.map(x=>V(x[1]));
   const prop=kind==='o'?'opacity':'transform', val=V(sample(tr,t));
   const trans=kind==='y'?x=>'0 '+x:x=>x+' 0';
   const keyTimes=tr.map(x=>fmt(x[0]/D)).join(';');
   const anim=!live?'':kind==='o'?`<animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" keyTimes="${keyTimes}" values="${vals.join(';')}"/>`:`<animateTransform attributeName="transform" type="translate" dur="${D}s" repeatCount="indefinite" keyTimes="${keyTimes}" values="${vals.map(trans).join(';')}"/>`;
   return `<g ${prop}="${kind==='o'?val:'translate('+trans(val)+')'}">${anim}${content}</g>`;
 }
 const op=(tr,c)=>item(tr,'o',c);
 const near=op(tracks.field,`<g transform="translate(736 0) rotate(-8)" stroke="#07805e" fill="none">${[0,1,2].map(i=>`<ellipse rx="${13+7*i}" ry="${28+7*i}" stroke-width="${2.7-i*.45}" opacity="${.78-i*.17}"/>`).join('')}</g>`);
 const tvActive=op(tracks.tvOn,`<rect x="-88" y="-55" width="178" height="98" rx="3" fill="url(#tv)"/><path d="M-87 35l39-34 27 18 35-40 70 64h-171z" fill="#8fae9a"/><circle cx="49" cy="-29" r="9" fill="#edf3d7"/>`);
 const signal=(tr,trX,from,to,sprite)=>op(tr,item(trX,'x',sprite,from,to));
 const btPacket=`<g fill="${p.green}">${[0,1,2].map(j=>`<circle cx="${j*9}" cy="0" r="${4.8-j*.75}"/>`).join('')}</g>`;
 const BT=`<g transform="translate(343 0) rotate(-7)">${phone('bt')}</g><g transform="translate(769 0)">${speaker()}${op(tracks.btRx,'<circle cx="27" cy="59" r="4.1" fill="#99e0ae"/>')}</g>`+
 signal(tracks.btPulse,tracks.btGo,408,694,btPacket)+signal(tracks.btAck,tracks.btBack,697,413,`<g transform="translate(0 15)">${btPacket}</g>`)+
 op(tracks.note,`<g transform="translate(851 -41)">${path('M0 12v-23l13-3v6L2-6',p.green,3.6)}<ellipse cx="-4" cy="13" rx="6.4" ry="4.4" fill="${p.green}"/></g>`);
 const IR=`<g transform="translate(343 0)">${remoteTV()}</g>${op(tracks.irBeam,`<path d="M416 -14L698 38 698 59Z" fill="url(#ir-cone)"/>${path('M416-14 694 49','#c56e52',2.3,'stroke-dasharray="4 11"')}`)}<g transform="translate(771 0)">${tv(tvActive)}</g>`;
 const NFC=`<g transform="translate(773 0)">${tag()}</g>${item(tracks.phoneSlide,'x',`<g transform="rotate(-7)">${phone('nfc')}${op(tracks.tagOK,`<circle cy="43" r="13" fill="${p.green}"/>${path('m-6 43 4 4 8-9','#f2faef',2.8)}`)}</g>`,343,709)}${near}`;
 const activate=(s,id,tr)=>s.replace(new RegExp('(<g id="'+id+'" )opacity="0"([^>]*>)'),(_,a,b)=>a+'opacity="'+fmt(sample(tr,t))+'"'+b+(live?`<animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" keyTimes="${tr.map(x=>fmt(x[0]/D)).join(';')}" values="${tr.map(x=>x[1]).join(';')}"/>`:''));
 const RM=`<g transform="translate(367 0) scale(.93) translate(-100 -101)">${activate(remote(),'remote-active',tracks.key)}</g>
 ${signal(tracks.rfPulse,tracks.rfGo,425,665,`<g fill="none" stroke="${p.green}" stroke-width="4.6" stroke-linecap="round"><path d="M-8 -8Q2 0 -8 8 M3 -15Q19 0 3 15"/></g>`)}
 ${miniGate(c=>item(tracks.door,'y',c,0,-79))}
 <g transform="translate(726 4) scale(.75) translate(-100 -100)">${activate(receiver(),'receiver-active',tracks.rfRx)}</g>`;
 const lanes=[BT,IR,NFC,RM].map((art,i)=>{
   const y=251+i*331, [name,detail,verb]=variants[i];
   return `<g transform="translate(0 ${y})">${i?path('M78-151H975',p.line,1.5):''}
     ${item(tracks.focus[i],'o',text(76,-13,name,i===3?49:60,p.ink,690)+
       text(78,43,detail,36,p.gray,510)+art+text(599,124,verb,39,p.gray,540,'middle'))}</g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Noto Sans SC','PingFang SC','Heiti SC',sans-serif" role="img" aria-labelledby="ttl ds"><title id="ttl">蓝牙、红外、NFC、433 MHz 遥控的区别</title><desc id="ds">手机与兼容音箱通过蓝牙连接；红外遥控器向电视接收窗发出红外光；手机靠近非接触标签，通过近场耦合读取；已配对的遥控器向相应433接收器发指令，门才上升。433 MHz 指频段，不是唯一协议。动作是交互路径示意，不代表实际波速、波长或固定通信距离。</desc>${defs}<rect width="${W}" height="${H}" fill="${p.paper}"/>${lanes}</svg>\n`;
}
async function raster(s,file,cache){
 const sub=spawn('rsvg-convert',['--output',file,'-'],{stdio:['pipe','ignore','pipe'],env:{...process.env,XDG_CACHE_HOME:cache}});
 let err='';sub.stderr.on('data',x=>err+=x);sub.stdin.on('error',()=>{});
 await new Promise((ok,bad)=>{sub.on('error',bad);sub.on('close',c=>c?bad(Error(err)):ok());sub.stdin.end(s);});
}
async function verify(file){const {stdout}=await run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]);const m=JSON.parse(stdout),v=m.streams[0];assert.equal(m.streams.length,1);for(const [k,e] of Object.entries({codec_type:'video',codec_name:'h264',width:W,height:H,pix_fmt:'yuv420p',avg_frame_rate:'30/1',nb_read_frames:String(frames)}))assert.equal(v[k],e,k);assert.equal(+m.format.duration,D);console.log('Verified 9 seconds, 270 frames, 1080×1920, silent H.264');}
async function exportClip(){const tmp=await mkdtemp(join(tmpdir(),'four-signals-'));try{
 await raster(svg(0),join(tmp,'f000.png'),tmp);
 let n=1;await Promise.all(Array.from({length:4},async()=>{while(n<frames){const j=n++;await raster(svg(j/FPS),join(tmp,'f'+String(j).padStart(3,'0')+'.png'),tmp);}}));
 const file=join(tmp,'clip.mp4');
 await run('ffmpeg',['-v','error','-framerate',String(FPS),'-i',join(tmp,'f%03d.png'),'-an','-frames:v',String(frames),'-vf','scale=iw:ih:out_color_matrix=bt709,format=yuv420p,setsar=1','-c:v','libx264','-preset','medium','-crf','17','-threads','4','-r','30','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',file]);
 await verify(file);await rename(file,join(dir,base+'.mp4'));
 }finally{await rm(tmp,{recursive:true,force:true});}}
const arg=process.argv[2]||'--export';
if(arg==='--verify') await verify(join(dir,base+'.mp4'));
else if(arg==='--svg-only'||arg==='--export'||arg==='--still'){
 await writeFile(join(dir,base+'.svg'),svg());
 const tmp=await mkdtemp(join(tmpdir(),'four-signals-still-'));
 try{await raster(svg(8.6),join(dir,'四种信号对照-定格.png'),tmp);}finally{await rm(tmp,{recursive:true,force:true});}
 if(arg==='--export')await exportClip();
}else throw Error('Expected --export, --still, --svg-only or --verify');
