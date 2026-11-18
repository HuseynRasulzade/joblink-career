import { chromium } from 'playwright';
export const URL='http://localhost:3111';
const CURSOR=`(()=>{const mk=()=>{if(document.getElementById('__cur'))return;const c=document.createElement('div');c.id='__cur';c.style.cssText='position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:transform .02s linear';c.innerHTML='<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7.5 18 2.3-7.2L20 10.5z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';document.documentElement.appendChild(c);const r=document.createElement('div');r.id='__rip';r.style.cssText='position:fixed;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #ff8a4c;z-index:2147483646;pointer-events:none;opacity:0';document.documentElement.appendChild(r);addEventListener('mousemove',e=>{c.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)'},true);addEventListener('mousedown',e=>{r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';r.animate([{opacity:.9,transform:'scale(.3)'},{opacity:0,transform:'scale(1.4)'}],{duration:450})},true)};if(document.readyState!='loading')mk();else addEventListener('DOMContentLoaded',mk);})()`;
export async function ctx(browser,{login,record=true,name}){
  const opts={viewport:{width:1440,height:810}};
  if(record) opts.recordVideo={dir:'/tmp/promo2/clips/raw_'+name,size:{width:1440,height:810}};
  const c=await browser.newContext(opts);
  await c.addInitScript(CURSOR);
  // the contact number on the page is a placeholder until the real one is set: keep it out of the video
  await c.addInitScript(`addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='.gate-nav-phone,.contact-phone,.landing-footer-links a[href^="tel:"]{visibility:hidden!important}';document.head.appendChild(s)})`);
  const p=await c.newPage();
  const t0=Date.now();
  if(login){ await p.goto(URL+'/',{waitUntil:'networkidle'});
    await p.evaluate(async(e)=>{await fetch('/api/joblink/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:e,password:'Demo-12345-local'})})},login); }
  return {c,p,t0};
}
export async function glide(p,x,y,steps=28){ await p.mouse.move(x,y,{steps}); }
export async function click(p,loc,{pause=350}={}){ const el=typeof loc==='string'?p.locator(loc).first():loc.first(); await el.scrollIntoViewIfNeeded().catch(()=>{}); const b=await el.boundingBox({timeout:6000}).catch(e=>{throw new Error('box fail: '+(typeof loc==='string'?loc:String(loc))+' '+e.message.split('\n')[0])}); if(!b) throw new Error('no box for '+loc); await glide(p,b.x+b.width/2,b.y+b.height/2); await p.waitForTimeout(pause); await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up(); await p.waitForTimeout(pause); }
export async function type(p,loc,text,delay=70){ const el=typeof loc==='string'?p.locator(loc).first():loc.first(); await click(p,el,{pause:200}); await p.keyboard.type(text,{delay}); }
export async function finish({c,p,t0,startMark}){
  const v=p.video(); await c.close(); const path=await v.path(); return {path,trim:(startMark-t0)/1000};
}
export {chromium};
