// Preserve the screenshot as pixels; Chinese text outside the white frame is editorial.
// node 制作竖屏插镜.mjs [Android|iOS] [--stills-only]
import { mkdirSync, mkdtempSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const here=fileURLToPath(new URL('./',import.meta.url)), out=join(here,'直接剪辑');
mkdirSync(out,{recursive:true});
const temp=mkdtempSync(join(tmpdir(),'rf-clips-'));
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const profiles={
  Android:{host:'developer.android.com',dir:'01-Android',sections:['ConsumerIrManager','BluetoothLeAdvertiser'],frames:[
    ['01-红外发射与硬件.png','红外要有发射器','Android-红外','1060x523+12+140'],
    ['02-蓝牙广播.png','这个接口广播的是蓝牙','Android-蓝牙']]},
  iOS:{host:'developer.apple.com',dir:'02-iOS',frames:[
    ['01-CoreBluetooth-框架.png','这套框架管的是蓝牙','iOS-蓝牙框架','1080x728+0+0'],
    ['02-startAdvertising-接口.png','App 可以广播蓝牙数据','iOS-蓝牙广播','1080x702+0+0']]}
};
const font="Noto Sans SC,Hiragino Sans GB,Arial Unicode MS,sans-serif";
const line=(x,y,size,fill,str,weight=500)=>`<text x="${x}" y="${y}" font-family="${font}" font-weight="${weight}" font-size="${size}" fill="${fill}">${xml(str)}</text>`;
function run(bin,args,opts={}){
  const result=spawnSync(bin,args,{...opts,maxBuffer:20*1024*1024});
  if(result.error || result.status!==0) throw new Error(bin+' failed: '+(result.error || result.stderr?.toString().slice(-2000)));
  return result.stdout;
}
function card(name,profile,[src,caption,stem,crop],index) {
  const original=join(here,profile.dir,src);
  const image=crop ? run('magick',[original,'-crop',crop,'+repage','png:-']) : readFileSync(original);
  if(image.toString('ascii',1,4)!=='PNG') throw Error('Expected a PNG: '+src);
  const w=image.readUInt32BE(16), h=image.readUInt32BE(20);
  const maxW=944, maxH=920, s=Math.min(maxW/w,maxH/h),rw=w*s,rh=h*s;
  // Keep both headings fixed across both cuts. Screenshot is fitted, never stretched.
  const top=561,left=(1080-rw)/2,pad=14, paper='#f6f3e9';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="${paper}"/>
    <rect x="68" y="338" width="32" height="5" rx="2" fill="#087958"/>
    ${line(114,352,30,'#4f6058',name+'  /  官方文档')}
    ${line(66,462,66,'#202e2a',caption,650)}
    ${line(70,517,27,'#586760',[profile.host,profile.sections?.[index]].filter(Boolean).join('   /   '))}
    <rect x="${left-pad}" y="${top-pad}" width="${rw+2*pad}" height="${rh+2*pad}" fill="white" stroke="#d1d6ce" stroke-width="2" rx="3"/>
    <image x="${left}" y="${top}" width="${rw}" height="${rh}" xlink:href="data:image/png;base64,${image.toString('base64')}"/>
    </svg>`;
  const path=join(out,stem+'-竖屏.png');
  run('rsvg-convert',['--output',path],{input:svg,env:{...process.env,XDG_CACHE_HOME:temp}});
  console.log(path); return path;
}
const args=process.argv.slice(2);
for(const [name,profile] of Object.entries(profiles)) {
  if(args.some(x=>x==='Android'||x==='iOS') && !args.includes(name)) continue;
  const paths=profile.frames.map((f,i)=>card(name,profile,f,i));
  if(args.includes('--stills-only')) continue;
  const output=join(out,name+'-文档插镜.mp4'), staged=join(temp,name+'.mp4');
  run('ffmpeg',['-v','error','-nostdin',...paths.flatMap(p=>['-loop','1','-framerate','30','-t','2.5','-i',p]),
    '-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0,scale=iw:ih:out_color_matrix=bt709,format=yuv420p[v]',
    '-map','[v]','-an','-frames:v','150','-c:v','libx264','-preset','medium','-threads','4','-crf','17','-r','30','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',staged]);
  const probes=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',staged]));
  const v=probes.streams[0];
  if(probes.streams.length!==1 || v.codec_name!=='h264' || v.width!==1080 || v.height!==1920 || v.nb_frames!=='150' || v.pix_fmt!=='yuv420p' || Math.abs(+probes.format.duration-5)>0.001) throw Error('MP4 verification failed');
  renameSync(staged,output); console.log(output);
}
