import {chromium,ctx,click,type,glide,URL} from './record_lib.mjs';
import fs from 'fs';
const which=process.argv[2];
const b=await chromium.launch();
const out={};
async function done(name,o,startMark){const v=o.p.video();await o.c.close();const path=await v.path();fs.copyFileSync(path,`/tmp/promo2/clips/${name}.webm`);fs.writeFileSync(`/tmp/promo2/clips/${name}.json`,JSON.stringify({trim:(startMark-o.t0)/1000}));console.log(name,'trim',(startMark-o.t0)/1000);}
const flows={
 async gate(){ const o=await ctx(b,{name:'gate'}); const {p}=o;
   await p.goto(URL+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(800); const sm=Date.now();
   await p.waitForTimeout(1800);
   await click(p,p.getByRole('button',{name:/Daxil ol/}).first());
   await click(p,p.locator('[role=menuitem]').first());
   await p.waitForTimeout(700);
   await type(p,'.auth-modal input[type=email]','namized@joblink.test',55);
   await type(p,'.auth-modal input[type=password]','Demo-12345-local',45);
   await p.waitForTimeout(300);
   await click(p,'.auth-modal button.primary');
   await p.waitForTimeout(4200);
   await done('gate',o,sm);},
 async jobs(){ const o=await ctx(b,{login:'namized@joblink.test',name:'jobs'}); const {p}=o;
   await p.goto(URL+'/#jobs'); await p.reload({waitUntil:'load'}); await p.waitForTimeout(3500); const sm=Date.now();
   await p.waitForTimeout(1200);
   await type(p,'input[aria-label="Vakansiya axtar"]','mühasib',90);
   await p.waitForTimeout(900);
   await click(p,p.locator('text=/Demo Şirkət · /').nth(0));
   await p.waitForTimeout(1600);
   await click(p,p.getByRole('button',{name:'Müraciət et'}));
   await p.waitForTimeout(1600);
   const ok=p.getByRole('button',{name:/Təsdiq et və göndər/}); if(await ok.count()) await click(p,ok);
   await p.waitForTimeout(3000);
   await done('jobs',o,sm);},
 async applications(){ const o=await ctx(b,{login:'namized@joblink.test',name:'apps'}); const {p}=o;
   await p.goto(URL+'/#applications'); await p.reload({waitUntil:'load'}); await p.waitForTimeout(3500); const sm=Date.now();
   await p.waitForTimeout(1500); await p.mouse.wheel(0,300); await p.waitForTimeout(1500); await p.mouse.wheel(0,-300); await p.waitForTimeout(1000);
   await done('applications',o,sm);},
 async company(){ const o=await ctx(b,{login:'isveren@joblink.test',name:'co'}); const {p}=o;
   await p.goto(URL+'/#hr-overview'); await p.reload({waitUntil:'load'}); await p.waitForTimeout(4500); const sm=Date.now();
   await p.waitForTimeout(1500); await p.mouse.move(700,500,{steps:30}); await p.mouse.wheel(0,380); await p.waitForTimeout(1800); await p.mouse.wheel(0,-380); await p.waitForTimeout(800);
   await click(p,p.locator('.sidebar .nav-item',{hasText:'Namizədlər'}));
   await p.waitForTimeout(2500);
   await done('company',o,sm);},
 async payroll(){ const o=await ctx(b,{login:'isveren@joblink.test',name:'pay'}); const {p}=o;
   await p.goto(URL+'/#hr-payroll'); await p.reload({waitUntil:'load'}); await p.waitForTimeout(4500); const sm=Date.now();
   await p.waitForTimeout(1500);
   await type(p,'input[placeholder*="axtar"]','Aysel',110);
   await p.waitForTimeout(1500); await p.mouse.wheel(0,250); await p.waitForTimeout(1800);
   await done('payroll',o,sm);},
 async calc(){ const o=await ctx(b,{name:'calc'}); const {p}=o;
   await p.goto(URL+'/kalkulyatorlar',{waitUntil:'networkidle'}); await p.waitForTimeout(1200); const sm=Date.now();
   await p.waitForTimeout(1200); await p.mouse.wheel(0,330); await p.waitForTimeout(900);
   const amount=p.locator('input[type=number]').first();
   await click(p,amount,{pause:200}); await p.keyboard.press('Control+A'); await p.keyboard.type('3200',{delay:140}); await p.waitForTimeout(1300);
   await p.mouse.wheel(0,260); await p.waitForTimeout(2000);
   const det=p.locator('details.lc-sg summary').first(); if(await det.count()){ await click(p,det); await p.waitForTimeout(2200); }
   await done('calc',o,sm);},
 async pricing(){ const o=await ctx(b,{name:'pricing'}); const {p}=o;
   await p.goto(URL+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(1000); const sm=Date.now();
   await p.evaluate(()=>document.querySelector('#qiymetler')?.scrollIntoView({behavior:'smooth'})); await p.waitForTimeout(2200);
   await click(p,p.getByRole('tab',{name:/Şirkətlər üçün/})); await p.waitForTimeout(1800);
   await p.mouse.move(980,520,{steps:30}); await p.waitForTimeout(1600);
   await done('pricing',o,sm);},
};
for(const n of (which==='all'?Object.keys(flows):[which])){ try{ await flows[n](); }catch(e){ console.log('FAIL',n,e.message.split('\n')[0]); } }
await b.close();
