// Build an offline animated SVG. Its SMIL clock is the MP4's exact frame clock.
import { readFile, writeFile } from 'node:fs/promises';
import { remote, phone, receiver } from './devices.mjs';
import { makeDoor } from './door.mjs';
const at = s => new URL('../' + s, import.meta.url);
const {duration:D, fps, palette:p, copy:c, time:t, showLabels=true} = JSON.parse(await readFile(at('模板配置.json'), 'utf8'));
if (D !== 6 || fps !== 30) throw Error('本小样固定为6秒、30fps。');
const events=[0,t.remotePress,t.signalStart,t.recognized,t.liftStart,t.liftEnd,t.switch,t.phonePress,t.phoneResult,D];
if (events.some((e,i)=>!Number.isFinite(e)||(i>0 && e<=events[i-1]))) throw Error('模板配置：动作时间必须依次递增且位于0–6秒内。');
const door = await makeDoor({duration:D,fps,liftStart:t.liftStart,liftEnd:t.liftEnd,reset:t.switch});
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const key = s=>(s/D).toFixed(7).replace(/0+$/,'').replace(/\.$/,'')||'0';
function anim(attr, points, {type='',ref='',mode='linear',transform=false}={}){
  const tag=transform?'animateTransform':'animate';
  return `<${tag} ${ref?'href="#'+ref+'" ':''}attributeName="${attr}" ${type?'type="'+type+'" ':''}dur="${D}s" repeatCount="indefinite" calcMode="${mode}" keyTimes="${points.map(x=>key(x[0])).join(';')}" values="${points.map(x=>esc(x[1])).join(';')}"/>`;
}
function period(start,end,attr='visibility',ref=''){
  const v=attr==='visibility'?['hidden','visible']:['0','1'];
  const points=start===0?[[0,v[1]]]:[[0,v[0]],[start,v[1]]];
  if(end<D) points.push([end,v[0]]);
  points.push([D,points.at(-1)[1]]);
  return anim(attr,points,{mode:'discrete',ref});
}
const group=(id,a,b,inside)=>`<g id="${id}" visibility="${a===0?'visible':'hidden'}">${period(a,b)}${inside}</g>`;
function label(x,y,s,size,color){
  return showLabels && s ? `<text data-overlay="true" x="${x}" y="${y}" font-size="${size}" font-weight="560" fill="${color}" text-anchor="middle">${esc(s)}</text>` : '';
}
function variant(id,a,b,device,name){
  return group(id,a,b,
    `<g transform="${id==='original-remote'?'translate(105 1170) scale(1.38)':'translate(91 1156) scale(1.52)'}">${device}</g>`+
    label(243,1497,name,39,p.secondary)
  );
}
const sMid=(t.signalStart+t.recognized)*0.5;
const packet=group('rf-path',0,t.switch,
  // Path appears ONLY while a transmission is taking place; line stands for a path, not a waveform.
  group('wireless-flight',t.signalStart,t.recognized,
    `<path d="M340 1313H659" fill="none" stroke="${p.signal}" opacity=".28" stroke-width="3" stroke-dasharray="6 10" stroke-linecap="round"/>`+
    `<g fill="none" stroke="${p.signal}" stroke-linecap="round" stroke-width="7">
     ${anim('transform',[[0,'345 1313'],[t.signalStart,'345 1313'],[sMid,'500 1313'],[t.recognized,'659 1313'],[D,'659 1313']],{transform:true,type:'translate'})}
     <path d="M-8 -9 Q1 0 -8 9"/><path d="M5 -15 Q20 0 5 15"/></g>`)+
  group('signal-note',t.signalStart,t.liftEnd,label(500,1272,c.rfTag,38,p.signal))
);
const phoneBand=group('no-rf-path',t.phoneResult,D,label(500,1272,c.noSignal,38,p.quiet));
const active=anim('opacity',[[0,0],[t.remotePress,0],[t.remotePress+.09,1],[t.signalStart,1],[sMid,0],[D,0]],{ref:'remote-active'})+
  anim('opacity',[[0,0],[t.phonePress,0],[t.phonePress+.09,1],[t.phoneResult,1],[t.phoneResult+.19,0],[D,0]],{ref:'phone-active'})+
  period(t.recognized,t.switch,'opacity','receiver-active');
const artwork=`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1920" width="1080" height="1920" role="img" aria-labelledby="title description" font-family="'PingFang SC','Noto Sans CJK SC','Microsoft YaHei',sans-serif">
<title id="title">遥控信号对比</title><desc id="description">从街上看同一扇外卷门：卷轴和罩壳凸向街侧，门帘从卷轴后侧向上卷入。原遥控器发来的433指令被识别后门升起；重新从关门状态对照，普通手机只装App不能直接发出这种信号，门不动。</desc>
<rect width="1080" height="1920" fill="${p.paper}"/>
<g id="same-door" transform="translate(28 176) scale(1.64)">${door}</g>
${variant('original-remote',0,t.switch,remote(),c.remote)}
${variant('ordinary-phone',t.switch,D,phone(),c.phone)}
<g transform="translate(611 1136) scale(1.66)">${receiver()}</g>
${packet}${phoneBand}${active}
</svg>\n`;
await writeFile(at('遥控信号对比.svg'), artwork);
console.log('已构建遥控信号对比.svg ('+(Buffer.byteLength(artwork)/1024).toFixed(0)+' KiB)');
