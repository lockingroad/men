// Save the complete native, rendered Apple Developer page. No artificial
// layout/styles, synthetic document text, login, or personal Chrome profile.
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFile, rename, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const here = dirname(fileURLToPath(import.meta.url));
const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright').catch(async error=>{
  if (process.env.PLAYWRIGHT_MODULE || error.code!=='ERR_MODULE_NOT_FOUND') throw error;
  return import(pathToFileURL(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
});
const browser = await pw.chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-background-networking','--disable-sync','--disable-component-update']});
const entries=[
  {stem:'CoreBluetooth',url:'https://developer.apple.com/documentation/corebluetooth',heading:'Core Bluetooth',tokens:['Overview','Topics','CBPeripheralManager']},
  {stem:'startAdvertising',url:'https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager/startadvertising(_:)',heading:'startAdvertising(_:)',tokens:['Parameters','advertisementData','Discussion','Bluetooth']},
];
const opts={viewport:{width:740,height:960},deviceScaleFactor:2,locale:'en-US',colorScheme:'light',reducedMotion:'reduce',serviceWorkers:'block'};
const hash=s=>createHash('sha256').update(s).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function readDoc(){
  const d=document.scrollingElement, main=document.querySelector('main'), foot=document.querySelector('footer:last-of-type')||document.querySelector('footer');
  const norm=s=>s.replace(/\s+/g,' ').trim(), all=norm(document.body.innerText), text=norm(main?.innerText||'');
  return {heading:document.querySelector('h1')?.innerText,title:document.title,fullWidth:d.scrollWidth,fullHeight:d.scrollHeight,
    viewportWidth:innerWidth,viewportHeight:innerHeight,text,all,headings:[...main.querySelectorAll('h1,h2,h3,h4')].map(x=>norm(x.innerText)).filter(Boolean),
    footer:foot?norm(foot.innerText).slice(-310):all.slice(-310),
    footerY:foot?Math.round(foot.getBoundingClientRect().bottom+scrollY):null,
    articleScrollers:[main,...main.querySelectorAll('*')].filter(el=>el.clientHeight>200 && el.scrollHeight>el.clientHeight+100 && ['auto','scroll'].includes(getComputedStyle(el).overflowY)).map(el=>({tag:el.tagName,class:el.className,inner:el.clientHeight,content:el.scrollHeight})),
  };
}
const report=[];
try{
  for(const entry of entries){
    const ctx=await browser.newContext(opts),page=await ctx.newPage();
    const response=await page.goto(entry.url,{waitUntil:'domcontentloaded',timeout:50000});
    if(response?.status()!==200 || new URL(page.url()).hostname!=='developer.apple.com') throw Error('Unexpected source '+response?.status()+' '+page.url());
    await page.getByRole('heading',{name:entry.heading,exact:true}).first().waitFor({timeout:40000});
    await page.evaluate(()=>document.fonts.ready);
    // Trigger deferred/lazy sections and media by traversing the document, then
    // restore its real initial position so the normal header is not mid-page.
    for(let y=0,i=0;i<100;i++,y+=760){
      const max=await page.evaluate(y=>{window.scrollTo(0,y);return document.scrollingElement.scrollHeight-innerHeight;},y);
      await pause(90);
      if(y>=max)break;
    }
    await page.evaluate(()=>window.scrollTo(0,0)); await pause(450);
    let live=await page.evaluate(readDoc);
    if(live.heading!==entry.heading || !entry.tokens.every(s=>live.text.includes(s)) || live.articleScrollers.length || live.fullHeight<=live.viewportHeight || live.fullWidth!==opts.viewport.width || !/Copyright/i.test(live.all.slice(-1000))) throw Error('Unexpected native document: '+JSON.stringify({...live,text:live.text.slice(-300),all:live.all.slice(-420)}));
    const base=join(here,entry.stem+'-整页'), png=await page.screenshot({fullPage:true,animations:'disabled',scale:'device'});
    const pixels=[png.readUInt32BE(16),png.readUInt32BE(20)];
    if(pixels[0]!==live.fullWidth*opts.deviceScaleFactor || Math.abs(pixels[1]-live.fullHeight*opts.deviceScaleFactor)>2) throw Error('Full page pixel extent mismatch '+pixels);
    const cdp=await ctx.newCDPSession(page);
    const archive=(await cdp.send('Page.captureSnapshot',{format:'mhtml'})).data;
    if(!archive.includes('multipart/related'))throw Error('Incomplete native archive');
    await writeFile(base+'.tmp.mhtml',archive);
    const offline=await browser.newContext({...opts,javaScriptEnabled:false,offline:true}),local=await offline.newPage();
    await local.goto(pathToFileURL(base+'.tmp.mhtml').href,{waitUntil:'load',timeout:30000});
    const restored=await local.evaluate(readDoc);
    if(restored.heading!==entry.heading || !entry.tokens.every(s=>restored.text.includes(s)) || !restored.all.includes('Copyright') || restored.text!==live.text) {
      throw Error('Native archive offline content mismatch: '+JSON.stringify({live:live.text.length,local:restored.text.length,heading:restored.heading,tail:restored.all.slice(-310)}));
    }
    await offline.close();
    await rename(base+'.tmp.mhtml',base+'.mhtml');
    await writeFile(base+'.png',png);
    report.push({name:entry.stem,canonical:entry.url,source:page.url(),http:response.status(),browser:browser.version(),timestamp:new Date().toISOString(),
      deviceScaleFactor:opts.deviceScaleFactor,viewport:[live.viewportWidth,live.viewportHeight],documentCssPx:[live.fullWidth,live.fullHeight],pngPx:pixels,
      fullNativePage:true,nestedMainScrollers:live.articleScrollers,mainHeading:live.heading,sectionHeadings:live.headings,footer:live.footer,footerBottomCssY:live.footerY,
      nativeArchive:{format:'MHTML / CDP Page.captureSnapshot',offlineChrome:true,offlineNetworkBlocked:true,javaScriptDisabled:true,mainTextMatchesLiveExactly:true,normalizedMainCharacters:live.text.length,normalizedMainSHA256:hash(live.text)},
      pngSHA256:hash(png),archiveSHA256:hash(archive)});
    await ctx.close();
    console.log(entry.stem,pixels,live.text.length,restored.footer,live.footerY);
  }
  await writeFile(join(here,'整页记录.json'),JSON.stringify(report,null,2)+'\n');
} finally {await browser.close();}
