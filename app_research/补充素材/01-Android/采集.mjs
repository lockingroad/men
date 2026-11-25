// Real, unmodified Android Developers pixels. No HTML reconstruction or CSS overrides.
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')));
const here=fileURLToPath(new URL('.',import.meta.url));
const proxy=process.env.HTTPS_PROXY || process.env.https_proxy;
// Fresh temporary Chromium profile; no user account or personal browser session is used.
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ...(proxy ? {proxy:{server:new URL(proxy).origin}}:{}),
  args:['--disable-background-networking','--disable-sync','--disable-component-update']});
const context=await browser.newContext({viewport:{width:600,height:940},deviceScaleFactor:2.5,locale:'en-US',colorScheme:'light',serviceWorkers:'block'});
const proofs=[];
const temp=await mkdtemp(join(tmpdir(),'door-android-capture-'));
const plans=[
  {file:'01-红外发射与硬件.png',page:'android/hardware/ConsumerIrManager',key:'hasIrEmitter',mode:'table',verify:['hasIrEmitter','Check whether the device has an infrared emitter','transmit','Transmit an infrared pattern']},
  {file:'02-蓝牙广播.png',page:'android/bluetooth/le/BluetoothLeAdvertiser',key:'startAdvertising',mode:'row',verify:['startAdvertising','Start Bluetooth LE Advertising']},
];
try {
 for(const r of plans){
  const page=await context.newPage();
  let success=false;
  for(const root of ['https://developer.android.com','https://developer.android.google.cn']){
    const url=root+'/reference/'+r.page+'?hl=en';
    try{
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
      if(response?.status()!==200||!['developer.android.com','developer.android.google.cn'].includes(new URL(page.url()).hostname)) throw Error('Unexpected response '+response?.status()+' '+page.url());
      await page.locator('devsite-content,article').first().waitFor({timeout:9000});
      success=true;break;
    }catch(e){console.error(String(e).substring(0,250));}
  }
  if(!success)throw Error('Android reference did not load');
  await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3500))]));
  const autoOverlay=page.getByRole('button',{name:/reject all|no thanks|got it|dismiss/i}).first();
  if(await autoOverlay.isVisible().catch(()=>false))await autoOverlay.click({timeout:2000}).catch(()=>{});
  // Visible viewport crop encloses the key rows / method explanation, unchanged.
  const evidence=await page.evaluate(({mode,key,verify})=>{
    const clean=s=>s.replace(/\s+/g,' ').trim();
    const exactLink=(s)=>Array.from(document.querySelectorAll('a')).find(el=>el.closest('tr') && clean(el.textContent)===s);
    let elements=[], container;
    let anchor;
    if(mode==='table'||mode==='row'){
      const a=exactLink(key)||Array.from(document.querySelectorAll('a')).find(el=>el.closest('tr')&&clean(el.textContent).startsWith(key));
      if(!a)throw Error('No summary-table anchor '+key);
      const table=a.closest('table');
      const rows=Array.from(table.rows);
      const idx=rows.findIndex(row=>row.contains(a));
      container=mode==='table'?table:rows[idx]; elements=mode==='table'?rows.slice(idx,idx+2):[rows[idx]];
      anchor=decodeURIComponent(new URL(a.href).hash.slice(1));
    }else{
      const heading=Array.from(document.querySelectorAll('h3,h2')).find(el=>clean(el.textContent)===key);
      if(!heading)throw Error('No detail heading '+key);
      const wrapper=heading.closest('.api')||heading.parentElement;
      const pre=wrapper.querySelector('pre');
      const p=Array.from(wrapper.querySelectorAll('p')).find(el=>clean(el.textContent).startsWith('Start Bluetooth LE Advertising'));
      if(!p||!pre)throw Error('Incomplete method definition: '+wrapper.className+' '+clean(wrapper.innerText).slice(0,330));
      container=wrapper;elements=[heading,pre,p];anchor=heading.id;
    }
    const text=clean(elements.map(x=>x.innerText).join(' '));
    if(!verify.every(v=>text.includes(v)))throw Error('Missing source line: '+text.slice(0,500));
    const rects=elements.map(el=>el.getBoundingClientRect());
    const box=container.getBoundingClientRect();
    const top=Math.max(0,Math.floor(Math.min(...rects.map(v=>v.top))-box.top)-3);
    const bottom=Math.min(box.height,Math.ceil(Math.max(...rects.map(v=>v.bottom))-box.top)+3);
    function ptr(node){const path=[];while(node.parentElement){path.unshift(node.tagName.toLowerCase()+':nth-child('+(Array.from(node.parentElement.children).indexOf(node)+1)+')');node=node.parentElement;}return path.join(' > ');}
    return {text,top,bottom,width:box.width,selector:ptr(container),first:ptr(elements[0]),last:ptr(elements.at(-1)),url:location.href,anchor};
  },r);
  const native=join(temp,r.file);
  const sample=({key,mode})=>{
    const link=Array.from(document.querySelectorAll('table a')).find(el=>el.textContent.trim().startsWith(key));
    if(!link)throw Error('Source method link not found: '+key);
    const row=link.closest('tr'), table=link.closest('table'), rows=Array.from(table.rows);
    const a=row.getBoundingClientRect(), b=(mode==='table'?rows[rows.indexOf(row)+1]:row).getBoundingClientRect(),wrap=table.getBoundingClientRect();
    return {x:Math.max(0,Math.floor(wrap.left)-2),y:Math.floor(a.top)-2,width:Math.ceil(wrap.right-wrap.left)+4,height:Math.ceil(b.bottom-a.top)+4};
  };
  let size,stable=false;
  for(let i=0;i<5;i++){
    const before=await page.evaluate(sample,r);
    await page.evaluate(s=>window.scrollTo({left:0,top:window.scrollY+s.y-(innerHeight-s.height)/2,behavior:'instant'}),before);
    await page.waitForTimeout(650);
    size=await page.evaluate(sample,r);
    if(size.y<104||size.y+size.height>930)continue;
    await page.screenshot({path:native,scale:'device'});
    const after=await page.evaluate(sample,r);
    if(JSON.stringify(after)===JSON.stringify(size)){stable=true;break;}
  }
  if(!stable)throw Error('Source moved during capture');
  const path=join(here,r.file);
  execFileSync('magick',[native,'-crop',Math.round(size.width*2.5)+'x'+Math.round(size.height*2.5)+'+'+Math.round(size.x*2.5)+'+'+Math.round(size.y*2.5),'+repage',path]);
  proofs.push({file:r.file,canonical:'https://developer.android.com/reference/'+r.page+'#'+evidence.anchor,
    capturedFrom:evidence.url,section:evidence.selector,clipCssPx:size,deviceScaleFactor:2.5,
    pixels:execFileSync('magick',['identify','-format','%wx%h',path],{encoding:'utf8'}),checkedText:evidence.text,
    capture:'Live HTTP 200 official page, native DOM crop; no substituted text or CSS override.'});
  console.log(r.file,size,evidence.url);
  await page.close();
 }
 await writeFile(join(here,'原图记录.json'),JSON.stringify({date:new Date().toISOString(),browser:browser.version(),shots:proofs},null,2)+'\n');
} finally {await browser.close();}
