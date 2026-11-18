/* Madro: hent en opskrift fra et link direkte i appen.
   Siden hentes gennem en offentlig CORS-mellemstation, og opskriften læses fra
   sidens strukturerede data (schema.org Recipe, som de fleste opskriftssider har). */
(function(){
"use strict";
/* several free gateways; the first one that answers wins */
const PROXIES=[
  {u:u=>"https://api.allorigins.win/raw?url="+encodeURIComponent(u)},
  {u:u=>"https://api.allorigins.win/get?url="+encodeURIComponent(u),json:"contents",text:true},
  {u:u=>"https://corsproxy.io/?url="+encodeURIComponent(u)},
  {u:u=>"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(u)},
  {u:u=>"https://r.jina.ai/"+u,h:{"X-Return-Format":"html"},text:true}
];
async function viaProxy(url,as,ms){
  let lastErr=null;
  for(const p of PROXIES){
    if(as==="blob"&&p.text)continue;
    try{const ac=new AbortController();const t=setTimeout(()=>ac.abort(),ms||15000);
      const r=await fetch(p.u(url),{signal:ac.signal,headers:p.h||{}});
      if(!r.ok){clearTimeout(t);lastErr=new Error("HTTP "+r.status);continue;}
      let v=as==="blob"?await r.blob():await r.text();clearTimeout(t);
      if(p.json){try{v=JSON.parse(v)[p.json]||"";}catch(e){v="";}}
      if(as!=="blob"&&(!v||v.length<200)){lastErr=new Error("tom side");continue;}
      if(as==="blob"&&!/^image\//.test(v.type||"")&&v.size<1000){lastErr=new Error("intet billede");continue;}
      return v;}catch(e){lastErr=e;}
  }
  throw lastErr||new Error("kunne ikke hentes");
}

/* ---------- schema.org Recipe ---------- */
function findRecipe(node){
  if(!node)return null;
  if(Array.isArray(node)){for(const n of node){const r=findRecipe(n);if(r)return r;}return null;}
  if(typeof node!=="object")return null;
  const t=node["@type"];const types=Array.isArray(t)?t:[t];
  if(types.some(x=>String(x).toLowerCase()==="recipe"))return node;
  if(node["@graph"])return findRecipe(node["@graph"]);
  if(node.mainEntity)return findRecipe(node.mainEntity);
  return null;
}
function txt(v){if(v==null)return "";if(typeof v==="string")return decode(v);if(Array.isArray(v))return txt(v[0]);if(typeof v==="object")return txt(v.text||v.name||v["@value"]||"");return String(v);}
const ta=document.createElement("textarea");
function decode(s){ta.innerHTML=String(s).replace(/<[^>]+>/g," ");return ta.value.replace(/\s+/g," ").trim();}
function isoDur(v){v=txt(v);const m=/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(v);if(!m)return v||"";
  const mins=(+m[1]||0)*1440+(+m[2]||0)*60+(+m[3]||0);if(!mins)return "";
  const h=Math.floor(mins/60),mm=mins%60;return h?(h+" t"+(mm?" "+mm+" min":"")):mm+" min";}
function imageOf(v){if(!v)return "";if(typeof v==="string")return v;if(Array.isArray(v)){for(const x of v){const u=imageOf(x);if(u)return u;}return "";}return v.url||v.contentUrl||"";}
function steps(v,out){out=out||[];if(!v)return out;
  if(typeof v==="string"){decode(v).split(/\n+|\.\s{2,}/).map(s=>s.trim()).filter(Boolean).forEach(s=>out.push(s));return out;}
  if(Array.isArray(v)){v.forEach(x=>steps(x,out));return out;}
  if(v.itemListElement)return steps(v.itemListElement,out);
  const s=txt(v.text||v.name);if(s)out.push(s);return out;}
function num(v){const m=/[\d.,]+/.exec(txt(v));return m?Math.round(parseFloat(m[0].replace(",","."))):null;}

/* ---------- ingredient lines like "500 g hakket oksekød, i tern" ---------- */
const UNITS={"g":"g","gr":"g","gram":"g","kg":"kg","kilo":"kg","dl":"dl","l":"l","liter":"l","ml":"ml","cl":"cl","spsk":"spsk","spsk.":"spsk","tsk":"tsk","tsk.":"tsk",
  "stk":"stk","stk.":"stk","fed":"fed","dåse":"dåse","dåser":"dåse","ds":"dåse","ds.":"dåse","bundt":"bundt","bdt":"bundt","bdt.":"bundt","knsp":"knsp","knsp.":"knsp","nip":"knsp",
  "pakke":"pakke","pakker":"pakke","pk":"pakke","pk.":"pakke","håndfuld":"håndfuld","skive":"skive","skiver":"skive","glas":"glas","bakke":"bakke","pose":"pose","dash":"knsp"};
const FR={"½":.5,"¼":.25,"¾":.75,"⅓":1/3,"⅔":2/3,"⅛":.125};
function parseAmount(s){s=s.trim().replace(",",".");if(!s)return null;
  const range=s.split(/\s*[-–]\s*/);if(range.length>1)s=range[range.length-1];
  let total=0,any=false;for(const part of s.split(/\s+/)){
    if(FR[part]!=null){total+=FR[part];any=true;continue;}
    const m=/^(\d+(?:\.\d+)?)([½¼¾⅓⅔⅛])?$/.exec(part);if(m){total+=parseFloat(m[1])+(m[2]?FR[m[2]]:0);any=true;continue;}
    const f=/^(\d+)\/(\d+)$/.exec(part);if(f){total+=(+f[1])/(+f[2]);any=true;continue;}
  }
  return any?Math.round(total*100)/100:null;}
function parseIngredient(line,group){
  line=decode(line).replace(/^[-•*·]\s*/,"");
  const m=/^((?:\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛]|\d+\/\d+)(?:\s*[½¼¾⅓⅔⅛])?(?:\s*[-–]\s*(?:\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛]))?(?:\s+\d+\/\d+)?)\s*(.*)$/.exec(line);
  let amount=null,rest=line;
  if(m){amount=parseAmount(m[1]);rest=m[2];}
  let unit="";const w=/^(\S+)\s+(.*)$/.exec(rest);
  if(w&&UNITS[w[1].toLowerCase()]){unit=UNITS[w[1].toLowerCase()];rest=w[2];}
  else if(UNITS[rest.toLowerCase()]&&amount!=null){unit=UNITS[rest.toLowerCase()];rest="";}
  let name=rest,note="";const c=rest.indexOf(",");if(c>0){name=rest.slice(0,c).trim();note=rest.slice(c+1).trim();}
  const par=/^(.*?)\s*\(([^)]*)\)\s*$/.exec(name);if(par){name=par[1];note=(note?note+", ":"")+par[2];}
  return {group:group||"",amount,unit,name:name.trim()||line,note};}

const TAGS=[[/aftensmad|middag|hovedret|dinner|main/i,"Aftensmad"],[/frokost|lunch/i,"Frokost"],[/morgenmad|brunch|breakfast/i,"Morgenmad"],[/dessert|kage|bagv|cake/i,"Dessert"],
  [/vegetar|vegetarian/i,"Vegetar"],[/vegan/i,"Vegansk"],[/kylling|chicken/i,"Kylling"],[/okse|beef/i,"Oksekød"],[/svin|gris|pork/i,"Svinekød"],[/fisk|laks|torsk|fish/i,"Fisk"],[/pasta/i,"Pasta"],[/suppe|soup/i,"Suppe"]];
function tagsOf(r,title){const hay=[txt(r.recipeCategory),Array.isArray(r.recipeCategory)?r.recipeCategory.join(" "):"",txt(r.keywords),Array.isArray(r.keywords)?r.keywords.join(" "):"",txt(r.recipeCuisine),title].join(" ");
  const out=[];TAGS.forEach(([re,t])=>{if(re.test(hay)&&!out.includes(t))out.push(t);});return out.slice(0,3);}

function recipeFromHTML(html,url){
  const doc=new DOMParser().parseFromString(html,"text/html");
  let r=null;for(const s of doc.querySelectorAll('script[type="application/ld+json"]')){try{r=findRecipe(JSON.parse(s.textContent));}catch(e){try{r=findRecipe(JSON.parse(s.textContent.replace(/[\u0000-\u001f]+/g," ")));}catch(e2){}}if(r)break;}
  if(!r)return null;
  const title=txt(r.name)||txt(doc.querySelector('meta[property="og:title"]')&&doc.querySelector('meta[property="og:title"]').content);
  const ingr=[];const raw=r.recipeIngredient||r.ingredients||[];(Array.isArray(raw)?raw:[raw]).forEach(l=>{if(typeof l==="string"&&l.trim())ingr.push(parseIngredient(l));});
  const st=steps(r.recipeInstructions);
  if(!title||!ingr.length)return null;
  let servings=num(r.recipeYield);if(!servings||servings>40)servings=4;
  const n=r.nutrition||{};const kcal=num(n.calories),protein=num(n.proteinContent),fiber=num(n.fiberContent);
  let desc=txt(r.description);if(desc.length>220)desc=desc.slice(0,217).replace(/\s+\S*$/,"")+"…";
  const img=imageOf(r.image)||(doc.querySelector('meta[property="og:image"]')||{}).content||"";
  const tags=tagsOf(r,title);
  return {title,servings,time:isoDur(r.totalTime||r.cookTime||r.prepTime),description:desc,ingredients:ingr,steps:st,tags:tags.length?tags:["Aftensmad"],meals:tags.includes("Dessert")?["Dessert"]:tags.includes("Morgenmad")?["Morgenmad"]:tags.includes("Frokost")?["Frokost"]:["Aftensmad"],
    source:url,createdAt:Date.now(),nutrition:kcal?{kcal,protein:protein||0,fiber:fiber||0,source:"opskrift"}:null,image:img&&!/^data:/.test(img)?new URL(img,url).href:""};
}
async function shrink(blob){try{const bmp=await createImageBitmap(blob);const sc=Math.min(1,720/Math.max(bmp.width,bmp.height));const cv=document.createElement("canvas");
  cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);return cv.toDataURL("image/jpeg",.72);}catch(e){return "";}}

/* fetch + parse one link; returns a recipe object ready for Firestore, or throws */
async function importRecipe(url){
  const html=await viaProxy(url,"text",20000);
  const r=recipeFromHTML(html,url);
  if(!r)throw new Error("Siden har ingen opskrift, appen kan læse");
  if(r.image){const orig=r.image;try{const b=await viaProxy(orig,"blob",15000);r.image=(await shrink(b))||orig;}catch(e){r.image=orig;}}
  if(!r.nutrition)delete r.nutrition;
  return r;
}
window.MadroImporter={importRecipe,recipeFromHTML,parseIngredient,isoDur};
})();
