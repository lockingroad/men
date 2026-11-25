// Traverse every vertical position of a full-page PNG, with the full width visible.
// This is a pan over an actual saved page, not a recording of live browser gestures.
// Usage: node 制作整页滚动.mjs [ConsumerIrManager|BluetoothLeAdvertiser|CoreBluetooth|startAdvertising]
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const dir=fileURLToPath(new URL('.',import.meta.url)),dest=join(dir,'竖屏滚动');
const manifest=[['Android','ConsumerIrManager'],['Android','BluetoothLeAdvertiser'],['iOS','CoreBluetooth'],['iOS','startAdvertising']];
const arg=process.argv[2]; if(arg&&!manifest.some(([,id])=>id===arg))throw Error('Unknown document');
mkdirSync(dest,{recursive:true});
function run(cmd,args){const p=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:10*1024*1024});if(p.status!==0)throw Error(p.error||p.stderr||cmd);return p.stdout;}
for(const [platform,id] of manifest.filter(([,v])=>!arg||v===arg)){
  const input=join(dir,platform,id+'-整页.png');
  const header=readFileSync(input).subarray(0,24);
  if(header.toString('ascii',1,4)!=='PNG')throw Error('Not PNG');
  const iw=header.readUInt32BE(16),ih=header.readUInt32BE(20);
  const targetH=Math.round(ih*1080/iw/2)*2, travel=Math.max(0,targetH-1920);
  const fps=30,hold=24;
  // Time proportional to document length. Import into 剪映 and cut where needed.
  const runFrames=Math.max(60,Math.ceil(travel/500*fps)), frames=2*hold+runFrames;
  const step=`clip((n-${hold})/${runFrames},0,1)`;
  const vf=[`scale=1080:${targetH}:flags=lanczos`,`pad=1080:${Math.max(1920,targetH)}:0:0:color=white`,
    `loop=loop=${frames}:size=1:start=0`, 'setpts=N/(30*TB)',
    `crop=1080:1920:0:'round(${travel}*${step})'`, 'setsar=1','scale=iw:ih:out_color_matrix=bt709','format=yuv420p'].join(',');
  const output=join(dest,id+'-从页首到页尾.mp4'),tmp=join(dest,'.'+id+'-'+process.pid+'.mp4');
  run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-n','-framerate','30','-i',input,
    '-vf',vf,'-frames:v',String(frames),'-an','-c:v','libx264','-preset','veryfast','-threads','4','-crf','17','-r','30',
    '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',tmp]);
  const q=JSON.parse(run('ffprobe',['-v','error','-show_streams','-of','json',tmp]));
  const v=q.streams[0];
  if(q.streams.length!==1||v.width!==1080||v.height!==1920||v.codec_name!=='h264'||+v.nb_frames!==frames)throw Error('Output stream mismatch');
  renameSync(tmp,output);console.log(id,iw+'×'+ih,(frames/fps).toFixed(1)+'s',output);
}
