const {setup,chromium}=require('./lib.js');const fs=require('fs');
const OUT=require('path').join(__dirname,'vid');fs.mkdirSync(OUT,{recursive:true});
const CLIPS={
 link:{crop:40,async pre(H){await H.go('opskrifter');await H.p.evaluate(()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));
   window.MadroImporter={importRecipe:async(url,cb)=>{cb("Henter opskriften fra siden…");await sl(1000);cb("Læser ingredienser og fremgangsmåde…");await sl(1000);
     return {title:"Boller i karry",servings:4,time:"45 min",description:"Klassiske kødboller i mild karrysauce med ris.",ingredients:[{group:"",amount:500,unit:"g",name:"hakket svinekød",note:""},{group:"",amount:1,unit:"",name:"løg",note:""},{group:"",amount:1,unit:"",name:"æg",note:""},{group:"",amount:2,unit:"spsk",name:"karry",note:""},{group:"",amount:5,unit:"dl",name:"bouillon",note:""},{group:"",amount:300,unit:"g",name:"ris",note:""}],steps:["Rør farsen.","Kog bollerne i bouillon.","Lav karrysaucen.","Server med ris."],tags:["Svinekød"],themes:[],meals:["Aftensmad"],kids:{},source:url,image:"",rating:0};}};});},
  async run(H){await H.wait(500);await H.tap('#newBtn');await H.wait(500);await H.type('#impUrl','https://www.valdemarsro.dk/boller-i-karry/');await H.wait(400);await H.tap('#impGo');await H.wait(3800);}},
 left:{crop:200,async pre(H){await H.go('opskrifter');},
  async run(H){await H.wait(500);const c=await H.p.locator('#recipeList .sw-wrap').first().boundingBox();const y=c.y+c.height/2;
   await H.swipe(330,y,110,y,650);await H.wait(800);await H.tap('#recipeList .sw-wrap.open [data-swday="5"]');await H.wait(1700);
   await H.tap('.tabs a[data-tab="madplan"]');await H.wait(700);
   await H.p.evaluate(()=>{const d=[...document.querySelectorAll('#days .day')].find(x=>/Lørdag/.test(x.textContent));if(d){const y0=scrollY,y1=Math.min(d.getBoundingClientRect().top+scrollY-330,document.documentElement.scrollHeight-innerHeight),t0=performance.now();const st=t=>{const k=Math.min(1,(t-t0)/700),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;window.scrollTo(0,y0+(y1-y0)*e);if(k<1)requestAnimationFrame(st);};requestAnimationFrame(st);}});await H.wait(2200);}},
 right:{crop:200,async pre(H){await H.go('opskrifter');},
  async run(H){await H.wait(500);const c=await H.p.locator('#recipeList .sw-wrap').first().boundingBox();const y=c.y+c.height/2;
   await H.swipe(60,y,300,y,650);await H.wait(900);
   const bx=await H.p.evaluate(()=>{const w=document.querySelector('#recipeList .sw-wrap.open-r');const el=[...w.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent.trim()==='Oskar');
     const own=el.closest('button');if(own){const q=own.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};}
     const row=el;const btns=[...w.querySelectorAll('button')];const r0=row.getBoundingClientRect();let best=null,bd=1e9;btns.forEach(b=>{const r=b.getBoundingClientRect();const d=Math.abs(r.top+r.height/2-(r0.top+r0.height/2))+Math.abs(r.left-r0.right);if(r.left>=r0.right-2&&d<bd){bd=d;best=r;}});return best&&{x:best.left+best.width/2,y:best.top+best.height/2};});
   if(bx){await H.tapXY(bx.x,bx.y);}await H.wait(1300);await H.tapXY(200,175);await H.wait(1800);}},
 shop:{crop:100,async pre(H){await H.go('madplan');},
  async run(H){await H.wait(500);await H.tap('#pickBtn');await H.wait(1100);await H.tap('text=/Tilføj \\d+ varer/');await H.wait(1400);
   await H.tap('#groupSeg >> text=Ret');await H.wait(900);
   const n=await H.p.locator('#shopList .sl-block').first().locator('.sl-cb').count();
   for(let i=0;i<n;i++){await H.tap('#shopList .sl-block:first-child .sl-cb:not(:checked)');await H.wait(250);}
   await H.wait(700);await H.tap('.tabs a[data-tab="madplan"]');await H.wait(600);await H.p.evaluate(()=>scrollTo(0,0));await H.wait(2200);}},
 offers:{crop:180,async pre(H){await H.go('madplan');await H.tap('#pickBtn');await H.wait(1000);await H.tap('text=/Tilføj \\d+ varer/');await H.wait(1200);await H.go('indkob');await H.p.evaluate(()=>scrollTo(0,0));},
  async run(H){await H.wait(600);await H.tap('#viewBtn');await H.wait(1700);await H.tap('#groupSeg >> text=Butik');await H.wait(1500);
   await H.p.evaluate(()=>{const y0=scrollY,y1=260,t0=performance.now();const st=t=>{const k=Math.min(1,(t-t0)/800),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;window.scrollTo(0,y0+(y1-y0)*e);if(k<1)requestAnimationFrame(st);};requestAnimationFrame(st);});await H.wait(2000);}},
 tinder:{crop:105,async pre(H){await H.go('spil');await H.tap('[data-g="swipe"]');await H.wait(800);await H.tap('[data-mmsrc="comm"]');await H.wait(900);},
  async run(H){await H.wait(600);for(let k=0;k<1;k++){const c=await H.p.locator('#gameBox .sw-card:not(.back1):not(.back2)').first().boundingBox();
    await H.drag(c.x+c.width/2,c.y+c.height/2,c.x-150,c.y+c.height/2-20,550);await H.wait(1500);}
    await H.click('#gameBox .sw-card:not(.back1):not(.back2) .sw-info');await H.wait(1300);await H.click('#crSave');await H.wait(2200);}},
 share:{crop:30,async pre(H){await H.go('opskrifter');H.p.on('dialog',d=>setTimeout(()=>d.accept().catch(()=>{}),250));},
  async run(H){await H.wait(500);await H.tap('#recipeList [data-r]');await H.wait(1300);await H.tap('#rShare');await H.wait(2600);}}
};
(async()=>{const b=await chromium.launch();const meta={};
 const only=process.argv.slice(2);
 for(const [name,c] of Object.entries(CLIPS)){if(only.length&&!only.includes(name))continue;
  const dir=OUT+'/'+name;fs.rmSync(dir,{recursive:true,force:true});
  const H=await setup(b,{video:dir});await c.pre(H);await H.wait(300);H.startRec(c.crop);
  /* keep frames flowing even when nothing moves: a 1px element that toggles */
  await H.p.evaluate(()=>{const d=document.createElement('div');d.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:2147483647;opacity:.01;background:#000';document.body.appendChild(d);let k=0;setInterval(()=>{d.style.background=(k++%2)?'#000':'#fff';},40);});
  await c.run(H);await H.wait(200);const n=await H.stopRec(dir);await H.ctx.close();meta[name]={list:dir+'/list.txt',crop:c.crop};console.log(name,n,'frames');const old=fs.existsSync(OUT+'/meta.json')?JSON.parse(fs.readFileSync(OUT+'/meta.json')):{};old[name]=meta[name];fs.writeFileSync(OUT+'/meta.json',JSON.stringify(old,null,1));}
 const old=fs.existsSync(OUT+'/meta.json')?JSON.parse(fs.readFileSync(OUT+'/meta.json')):{};fs.writeFileSync(OUT+'/meta.json',JSON.stringify(Object.assign(old,meta),null,1));await b.close();})();
