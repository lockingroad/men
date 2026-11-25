// Re-capture the real, public Apple Developer pages, with no injected webpage
// markup/styles, translation, or login. A temporary headless browser profile
// is created and destroyed by Playwright. Contact sheets are not evidence.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright').catch(async err=>{
  if(process.env.PLAYWRIGHT_MODULE || err.code!=='ERR_MODULE_NOT_FOUND') throw err;
  return import(pathToFileURL(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
});
const folder = dirname(fileURLToPath(import.meta.url));
const origin = 'https://developer.apple.com/documentation/corebluetooth';
const work = [
  {name:'01-CoreBluetooth-框架.png', url:origin, h1:'Core Bluetooth', token:/Bluetooth.*(energy|wireless|devices)/i},
  {name:'02-startAdvertising-接口.png', url:origin+'/cbperipheralmanager/startadvertising(_:)', h1:'startAdvertising(_:)', token:/advertis(e|es|ing) (peripheral|services|data|the)/i},
];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--disable-background-networking','--disable-component-update','--disable-sync']
});
try {
  const ctx = await browser.newContext({
    viewport:{width:540,height:900},deviceScaleFactor:2,locale:'en-US',
    colorScheme:'light',reducedMotion:'reduce',serviceWorkers:'block'
  });
  const log=[];
  for (const item of work) {
    const page=await ctx.newPage();
    page.on('requestfailed', req=> { if(req.resourceType()==='document') console.error('Document load failed:', req.url(),req.failure()); });
    const res=await page.goto(item.url,{waitUntil:'domcontentloaded',timeout:45000});
    if (!res?.ok()) throw Error('HTTP status '+res?.status()+' '+item.url);
    await page.getByRole('heading',{name:item.h1,exact:true}).first().waitFor({timeout:45000});
    await page.evaluate(async()=>await document.fonts.ready);
    const info=await page.evaluate(()=>{
      const head=document.querySelector('h1'),main=document.querySelector('main')||document.body;
      return {title:document.title,heading:head?.textContent.trim(),main:main.innerText.slice(0,10000),headingTop:head?.getBoundingClientRect().top,
        width:innerWidth,height:innerHeight, scrollWidth:document.documentElement.scrollWidth};
    });
    if (info.heading!==item.h1 || !item.token.test(info.main)) throw Error('Unexpected document body: '+JSON.stringify(info));
    // No injected overlays. The screenshot is of the page viewport at its native top.
    await page.screenshot({path:join(folder,item.name),animations:'disabled',scale:'device',caret:'hide'});
    const {main,...measurements}=info;
    console.log(item.name,page.url(),measurements,main.slice(0,1700));
    log.push({png:item.name,source:page.url(),status:res.status(),...measurements,deviceScaleFactor:2});
    await page.close();
  }
  await writeFile(join(folder,'截图记录.json'),JSON.stringify({capturedAt:new Date().toISOString(),captureMethod:'Live Apple Developer Documents; temporary headless Chromium; unaltered top-of-page viewport',pages:log},null,2)+'\n');
  await ctx.close();
} finally { await browser.close(); }
