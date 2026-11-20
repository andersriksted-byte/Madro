const {chromium}=require('playwright');
const BASE='http://localhost:8766/index.html';
async function setup(b,{video,theme}={}){
  const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2,
  });
  await ctx.route('**/shim.js*',r=>r.fulfill({path:require('path').join(__dirname,'fakeshim.js'),contentType:'text/javascript'}));
  await ctx.route(/firebase|googleapis|gstatic/,r=>r.abort());
  await ctx.addInitScript(t=>{try{localStorage.setItem('mp_theme',t||'light')}catch(e){}
    addEventListener('DOMContentLoaded',()=>{const f=document.createElement('div');f.id='__fing';f.style.cssText='position:fixed;z-index:2147483647;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(40,40,40,.28);border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;left:0;top:0';document.body.appendChild(f);});},theme);
  const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
  const cdp=await ctx.newCDPSession(p);
  const frames=[];let rec=false;
  let loopP=null;
  async function loop(crop){while(rec){const t=Date.now()/1000;try{const sy=(await cdp.send('Runtime.evaluate',{expression:'scrollY',returnByValue:true})).result.value||0;const r=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:90,clip:{x:0,y:crop+sy,width:390,height:640,scale:2},captureBeyondViewport:false});if(rec)frames.push({d:r.data,t});}catch(e){}}}
  const fing=async(x,y,on)=>p.evaluate(([x,y,on])=>{const f=document.getElementById('__fing');if(!f)return;f.style.left=x+'px';f.style.top=y+'px';f.style.opacity=on?1:0;f.style.transform=on?'scale(1)':'scale(1.4)';},[x,y,on]);
  const H={p,ctx,frames,
    startRec(crop){rec=true;loopP=loop(crop);},
    async stopRec(dir){rec=false;await loopP;const fs=require('fs');fs.mkdirSync(dir,{recursive:true});let txt='ffconcat version 1.0\n';
      frames.forEach((f,i)=>{const fn=dir+'/f'+String(i).padStart(5,'0')+'.jpg';fs.writeFileSync(fn,Buffer.from(f.d,'base64'));const next=frames[i+1]?frames[i+1].t:f.t+0.5;txt+='file '+fn+'\nduration '+Math.max(0.01,next-f.t).toFixed(3)+'\n';});
      if(frames.length)txt+='file '+dir+'/f'+String(frames.length-1).padStart(5,'0')+'.jpg\n';fs.writeFileSync(dir+'/list.txt',txt);return frames.length;},
    wait:ms=>p.waitForTimeout(ms),
    async tapXY(x,y){await fing(x,y,true);await p.waitForTimeout(220);await p.touchscreen.tap(x,y);await p.waitForTimeout(120);await fing(x,y,false);},
    async tap(sel){const el=p.locator(sel+' >> visible=true').first();await el.scrollIntoViewIfNeeded();const bx=await el.boundingBox();await H.tapXY(bx.x+bx.width/2,bx.y+bx.height/2);},
    async click(sel){const el=p.locator(sel+' >> visible=true').first();const bx=await el.boundingBox();const x=bx.x+bx.width/2,y=bx.y+bx.height/2;await fing(x,y,true);await p.waitForTimeout(220);await p.mouse.click(x,y);await p.waitForTimeout(120);await fing(x,y,false);},
    async swipe(x1,y1,x2,y2,ms=600){const n=Math.max(8,Math.round(ms/16));await fing(x1,y1,true);await p.waitForTimeout(150);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});
      for(let i=1;i<=n;i++){const t=i/n,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;const x=x1+(x2-x1)*e,y=y1+(y2-y1)*e;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await fing(x,y,true);await p.waitForTimeout(ms/n);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await fing(x2,y2,false);},
    async drag(x1,y1,x2,y2,ms=500){/* pointer/mouse drag (Tinder card uses pointer events) */const n=Math.max(8,Math.round(ms/16));await fing(x1,y1,true);await p.waitForTimeout(150);
      await p.mouse.move(x1,y1);await p.mouse.down();for(let i=1;i<=n;i++){const t=i/n;const x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;await p.mouse.move(x,y);await fing(x,y,true);await p.waitForTimeout(ms/n);}await p.mouse.up();await fing(x2,y2,false);},
    async type(sel,txt){await p.locator(sel).first().pressSequentially(txt,{delay:45});},
    shot:path=>p.screenshot({path}),
    async go(h){await p.goto(BASE+'#'+h);await p.waitForTimeout(1400);}
  };
  return H;}
module.exports={setup,chromium};
