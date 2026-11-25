// Real Android Developers full pages, not a reconstruction or an article-only crop.
// Run: node 抓取整页.mjs ; requires Playwright and a local headless Chrome.
import { mkdtemp, writeFile, readFile, rename } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE||'playwright').catch(()=>import(pathToFileURL(bundled).href));
const here=dirname(fileURLToPath(import.meta.url)), stage=await mkdtemp(join(tmpdir(),'android-fullpage-'));
const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
const browser=await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ...(proxy?{proxy:{server:new URL(proxy).origin}}:{}),args:['--disable-background-networking','--disable-component-update','--disable-sync']});
const spec=[
 {name:'ConsumerIrManager',src:'android/hardware/ConsumerIrManager',need:['hasIrEmitter','getCarrierFrequencies','transmit','The IR carrier frequency in Hertz']},
 {name:'BluetoothLeAdvertiser',src:'android/bluetooth/le/BluetoothLeAdvertiser',need:['startAdvertising','startAdvertisingSet','stopAdvertisingSet','stopAdvertising']},
];
const report=[];
const settings={ viewport:{width:760,height:1000},deviceScaleFactor:1.5,locale:'en-US',colorScheme:'light',reducedMotion:'reduce',serviceWorkers:'block' };
const stable=ms=>new Promise(r=>setTimeout(r,ms));
function measure(){
 const article=document.querySelector('article'), heading=article?.querySelector('h1'), body=document.body, el=document.scrollingElement;
 const r=node=>Math.round(node.getBoundingClientRect().top+scrollY);
 const links=[...document.querySelectorAll('a')].filter(a=>a.getBoundingClientRect().height>0);
 const terms=links.findLast(a=>a.textContent.trim()==='Terms' || a.textContent.trim()==='Privacy');
 const h=[...(article?.querySelectorAll('h1,h2,h3,h4')??[])].map(n=>n.textContent.trim()).filter(Boolean);
 return {title:document.title,h1:heading?.innerText.trim(),height:el.scrollHeight,width:el.scrollWidth,articleTop:article?r(article):null,articleEnd:article?r(article)+Math.round(article.getBoundingClientRect().height):null,headings:h,footerLink:terms?{text:terms.innerText,y:r(terms)}:null,body:article?.innerText??body.innerText,footerText:body.innerText.trim().split('\n').filter(x=>x.trim()).slice(-10).join(' / ')};
}
async function size(name){const b=await readFile(name);return [b.readUInt32BE(16),b.readUInt32BE(20)];}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const magick=(...args)=>execFileSync('magick',args,{encoding:'utf8',maxBuffer:2e6});
function similarity(full,view,top,height,width){
 // Compare the central 80% - bottom 2/3 of separately captured viewport vs the
 // same pixel region of the full-page PNG; omit fixed header, scrollbar and edges.
 const W=Math.floor(width*.8), H=Math.min(300,Math.floor(height*.2)),X=Math.floor((width-W)/2),Y=Math.floor(height*.65);
 const a=join(stage,'fragment-a.png'),b=join(stage,'fragment-b.png');
 magick(full,'-crop',W+'x'+H+'+'+X+'+'+(top+Y),'+repage',a);
 magick(view,'-crop',W+'x'+H+'+'+X+'+'+Y,'+repage',b);
 return Number(magick(a,b,'-compose','difference','-composite','-colorspace','gray','-format','%[fx:mean]','info:'));
}
// Chrome's single-shot fullPage compositor can repeat pixels beyond the GPU
// texture limit even when its reported PNG size is correct. Capture overlapping
// live viewports and keep each strip once, excluding the repeated sticky header.
async function fullCapture(page,m,base,png) {
 const dpr=settings.deviceScaleFactor, strips=[], audit=[];
 let cursor=0,adjust=0;
 for(let i=0;i<100;i++) {
   const target=i===0?0:Math.round(cursor/dpr - 190 + adjust);
   await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),target); await stable(190);
   const pos=await page.evaluate(()=>({scroll:scrollY,height:document.scrollingElement.scrollHeight,screen:innerHeight,articleTop:document.querySelector('article').getBoundingClientRect().top+scrollY}));
   adjust=pos.articleTop-m.articleTop;
   const world=Math.round((pos.scroll-adjust)*dpr);
   const viewport=join(stage,base+'-viewport-'+i+'.png');
   await page.screenshot({path:viewport,scale:'device',animations:'disabled'});
   const [width,vh]=await size(viewport);
   const offset=cursor-world;
   const atBottom=pos.scroll+pos.screen>=pos.height-1;
   const end=atBottom?vh:vh-120;
   if(offset<0 || offset>=end || (i>0&&offset<140*dpr)) throw Error('Invalid overlap: '+JSON.stringify({cursor,world,offset,end,pos}));
   const h=end-offset;
   const strip=join(stage,base+'-strip-'+i+'.png');
   magick(viewport,'-crop',width+'x'+h+'+0+'+offset,'+repage',strip);
   strips.push(strip); audit.push({nativeViewportScroll:pos.scroll,worldStartPx:world,nativeHeightCSS:pos.height,fromPx:offset,toPx:end,atBottom});
   cursor+=h;
   if(atBottom) break;
 }
 if(!audit.at(-1)?.atBottom)throw Error('Never reached true page end');
 magick(...strips,'-append','+repage',png);
 return audit;
}
try{
 const ctx=await browser.newContext(settings);
 for(const s of spec){
   const page=await ctx.newPage(),url='https://developer.android.com/reference/'+s.src+'?hl=en';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
   if(response?.status()!==200||new URL(page.url()).hostname!=='developer.android.com')throw Error('Not the official loaded page: '+page.url());
   await page.getByRole('heading',{level:1,name:s.name,exact:true}).first().waitFor({timeout:30000});
   await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,4000))]));
   const dismiss=page.getByRole('button',{name:/reject all|no thanks|got it|dismiss/i}).first();
   if(await dismiss.isVisible().catch(()=>false)) await dismiss.click({timeout:2000}).catch(()=>{});
   // Traverse the original page before capture so lazy footer and below-fold resources have loaded.
   for(let y=0;y<50000;y+=790){
      const {height}=await page.evaluate(measure); if(y>height+1000)break;
      await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y); await stable(75);
   }
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await stable(450);
   const m=await page.evaluate(measure);
   if(m.h1!==s.name || !s.need.every(word=>m.body.includes(word)) || !m.footerLink || !(m.footerLink.y > m.articleEnd-10 && m.height > m.articleEnd && m.width===settings.viewport.width)) throw Error('Incomplete page: '+JSON.stringify({...m,body:m.body.slice(-560)}));
   const base=s.name+'-整页',png=join(stage,base+'.png'),archive=join(stage,base+'.mhtml');
   const stitched=await fullCapture(page,m,base,png);
   const [width,height]=await size(png);
   const expected=stitched.at(-1).worldStartPx+stitched.at(-1).toPx;
   if(Math.abs(width-m.width*settings.deviceScaleFactor)>2 || height!==expected)throw Error('Full-page raster bounds mismatch: '+JSON.stringify({width,height,expected}));
   const check=[];
   for(const pos of [0, Math.round(m.height/2),m.height]){
      await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),pos);await stable(450);
      const scroll=await page.evaluate(()=>scrollY);
      const relative=await page.evaluate(initial=>scrollY-(document.querySelector('article').getBoundingClientRect().top+scrollY-initial),m.articleTop);
      const vp=join(stage,base+'-verify.png');await page.screenshot({path:vp,scale:'device',animations:'disabled'});
      const [vw,vh]=await size(vp);
      const diff=similarity(png,vp,Math.round(relative*settings.deviceScaleFactor),vh,vw);
      if(diff>.015)throw Error('Screenshot lost visible viewport at '+scroll+': '+diff);
      check.push({scrollY:scroll,meanPixelDifferenceNormalized:diff});
   }
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await stable(200);
   const cdp=await ctx.newCDPSession(page);
   const {data}=await cdp.send('Page.captureSnapshot',{format:'mhtml'}); await cdp.detach();
   await writeFile(archive,data);
   const offline=await browser.newContext({...settings,offline:true});
   const saved=await offline.newPage();
   await saved.goto(pathToFileURL(archive).href,{waitUntil:'domcontentloaded',timeout:30000});
   const checkArchive=await saved.evaluate(measure);
   if(checkArchive.h1!==s.name || !s.need.every(word=>checkArchive.body.includes(word)) || !checkArchive.footerLink || checkArchive.headings.join('|')!==m.headings.join('|'))throw Error('Offline MHTML does not contain all headings, text anchors and footer');
   await offline.close();
   await rename(png,join(here,base+'.png')); await rename(archive,join(here,base+'.mhtml'));
   const {body,...pageMetrics}=m;
   report.push({name:s.name,source:page.url(),httpStatus:response.status(),png:base+'.png',archive:base+'.mhtml',pngPixels:[width,height],nativePage:pageMetrics,stripCount:stitched.length,viewportChecks:check,
     offlineVerification:{network:'disabled',articleHeadings:checkArchive.headings.length,requiredText:s.need,footer:checkArchive.footerLink.text},sha256:{png:digest(await readFile(join(here,base+'.png'))),mhtml:digest(data)}});
   console.log(s.name,width,height,'footer:',m.footerLink.y,'safe offline archive',check);
   await page.close();
 }
 await writeFile(join(here,'整页记录.json'),JSON.stringify({capturedAt:new Date().toISOString(),browser:browser.version(),settings,method:'Fresh anonymous headless Chrome; original complete native page layout. Full PNG from consecutive overlapping screenshots; no duplicated sticky header, no changes to the page. Top, middle and last viewport independently verified. Offline MHTML checked with network disabled.',pages:report},null,2)+'\n');
 await ctx.close();
}finally{await browser.close();}
