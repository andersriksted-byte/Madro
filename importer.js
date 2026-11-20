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
async function viaProxy(url,as,ms,progress){
  let lastErr=null;const errs=[];let n=0;
  for(const p of PROXIES){n++;if(progress&&as!=="blob")progress("Henter opskriften fra siden… ("+n+"/"+PROXIES.length+")");
    if(as==="blob"&&p.text)continue;
    try{const ac=new AbortController();const t=setTimeout(()=>ac.abort(),ms||15000);
      const r=await fetch(p.u(url),{signal:ac.signal,headers:p.h||{}});
      if(!r.ok){clearTimeout(t);lastErr=new Error("HTTP "+r.status);errs.push(r.status);continue;}
      let v=as==="blob"?await r.blob():await r.text();clearTimeout(t);
      if(p.json){try{v=JSON.parse(v)[p.json]||"";}catch(e){v="";}}
      if(as!=="blob"&&(!v||v.length<200)){lastErr=new Error("tom side");errs.push("tom");continue;}
      if(as!=="blob"&&!/ld\+json|recipeIngredient|schema\.org\/Recipe|ingredient|ingrediens|zutaten|ingrédients|ingredientes/i.test(v)){lastErr=new Error("ingen opskriftsdata");errs.push("uden opskrift");continue;}
      if(as==="blob"&&!/^image\//.test(v.type||"")&&v.size<1000){lastErr=new Error("intet billede");continue;}
      return v;}catch(e){lastErr=e;errs.push(e&&e.name==="AbortError"?"for langsom":"blokeret");}
  }
  const e=new Error("ingen af mellemstationerne kunne hente siden: "+errs.join(", "));throw e;
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
/* foreign units -> Danish kitchen units (dl, ml, g, spsk, tsk …) */
const FOREIGN=[
  [/^(?:fl\.?\s*oz\.?|fluid\s+ounces?)$/i,a=>vol(a*29.57)],
  [/^(?:cups?|c\.|tazas?|tasse[n]?|kopp(?:ar)?)$/i,a=>vol(a*236.6)],
  [/^(?:tbsps?\.?|tbl\.?|tablespoons?|T\.?|EL|Essl\.?|Esslöffel|msk\.?|ss\.?|cucharadas?|c\.s\.|cs)$/,a=>({amount:a,unit:"spsk"})],
  [/^(?:tsps?\.?|teaspoons?|t\.?|TL|Teel\.?|Teelöffel|tsk\.?|ts\.?|cucharaditas?|c\.c\.|cc)$/,a=>({amount:a,unit:"tsk"})],
  [/^(?:oz\.?|ounces?|onzas?)$/i,a=>wt(a*28.35)],
  [/^(?:lbs?\.?|pounds?|libras?)$/i,a=>wt(a*453.6)],
  [/^(?:pints?|pt\.?)$/i,a=>vol(a*473)],
  [/^(?:quarts?|qt\.?)$/i,a=>vol(a*946)],
  [/^(?:gallons?|gal\.?)$/i,a=>vol(a*3785)],
  [/^(?:sticks?)$/i,a=>wt(a*113)],
  [/^(?:grams?|gramm|gramos|gr\.?)$/i,a=>({amount:a,unit:"g"})],
  [/^(?:kilograms?|kilogramm|kilos?)$/i,a=>({amount:a,unit:"kg"})],
  [/^(?:millilit(?:er|re)s?|milliliter)$/i,a=>vol(a)],
  [/^(?:centilit(?:er|re)s?)$/i,a=>vol(a*10)],
  [/^(?:decilit(?:er|re)s?)$/i,a=>vol(a*100)],
  [/^(?:lit(?:er|re)s?|liter)$/i,a=>vol(a*1000)],
  [/^(?:pinch(?:es)?|prisen?|nypa|dash(?:es)?|krm)$/i,a=>({amount:a,unit:"knsp"})],
  [/^(?:cloves?|zehen?|klyftor|klyfta|dientes?)$/i,a=>({amount:a,unit:"fed"})],
  [/^(?:cans?|tins?|dosen?|burkar?|latas?)$/i,a=>({amount:a,unit:"dåse"})],
  [/^(?:bunch(?:es)?|bund|knippe)$/i,a=>({amount:a,unit:"bundt"})],
  [/^(?:slices?|scheiben?|skivor?)$/i,a=>({amount:a,unit:"skive"})],
  [/^(?:handfuls?|handvoll)$/i,a=>({amount:a,unit:"håndfuld"})],
  [/^(?:packages?|pkgs?\.?|packets?|packungen?|paket)$/i,a=>({amount:a,unit:"pakke"})],
  [/^(?:pieces?|pcs?\.?|stück|st\.?)$/i,a=>({amount:a,unit:"stk"})]
];
const FOREIGN_RE=/^((?:fl\.?\s*oz\.?|fluid\s+ounces?)|[A-Za-zÄÖÜäöüß.]+)\s*(.*)$/;
function r5(x){return Math.max(5,Math.round(x/5)*5);}
function q(x,st){return Math.round(x/st)*st;}
function vol(ml){if(ml==null)return {amount:null,unit:"dl"};
  if(ml<10)return {amount:Math.max(1,Math.round(ml)),unit:"ml"};
  if(ml<100)return {amount:Math.max(.5,Math.round(ml/5)/2),unit:"cl"};
  if(ml<1000)return {amount:Math.max(1,q(ml/100,ml<200?.25:.5)),unit:"dl"};
  return {amount:Math.round(ml/100)/10,unit:"l"};}
function wt(g){if(g==null)return {amount:null,unit:"g"};if(g>=1000)return {amount:Math.round(g/100)/10,unit:"kg"};return {amount:g<20?Math.round(g):(g<500?r5(g):q(g,25)),unit:"g"};}
function isForeign(u){const k=u.trim();return FOREIGN.some(([re])=>re.test(k));}
function convUnit(a,u){const k=u.trim();for(const [re,f] of FOREIGN){if(re.test(k))return f(a);}
  const d=UNITS[k.toLowerCase()];return {amount:a,unit:d||""};}
/* the same in running text: 350°F, 9-inch, 14 oz, 2 cups */
function convText(t){if(!t)return t;
  return String(t)
    .replace(/(\d{2,3})\s*(?:°|º|˚|degrees?\s*)\s*F(?:ahrenheit)?\b/gi,(m,f)=>Math.round(((+f-32)*5/9)/5)*5+" °C")
    .replace(/\b(\d{3})\s*F\b/g,(m,f)=>Math.round(((+f-32)*5/9)/5)*5+" °C")
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:-|\s)?(?:inch(?:es)?|in\.|")(?=[\s,.)]|$)/gi,(m,n)=>Math.round(parseFloat(n.replace(",","."))*2.54)+" cm")
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:-|\s)?(?:fl\.?\s*oz|ounces?|oz)\b\.?/gi,(m,n)=>{const c=wt(parseFloat(n.replace(",","."))*28.35);return c.amount+" "+c.unit;})
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:-|\s)?(?:lbs?|pounds?)\b\.?/gi,(m,n)=>{const c=wt(parseFloat(n.replace(",","."))*453.6);return String(c.amount).replace(".",",")+" "+c.unit;})
    .replace(/(\d+(?:[.,]\d+)?|[½¼¾⅓⅔])\s*cups?\b/gi,(m,n)=>{const v=vol((FR[n]!=null?FR[n]:parseFloat(n.replace(",",".")))*236.6);return String(v.amount).replace(".",",")+" "+v.unit;});}
const FR={"½":.5,"¼":.25,"¾":.75,"⅓":1/3,"⅔":2/3,"⅛":.125};
function parseAmount(s){s=s.trim().replace(",",".");if(!s)return null;
  const range=s.split(/\s*[-–]\s*/);if(range.length>1)s=range[range.length-1];
  let total=0,any=false;for(const part of s.split(/\s+/)){
    if(FR[part]!=null){total+=FR[part];any=true;continue;}
    const m=/^(\d+(?:\.\d+)?)([½¼¾⅓⅔⅛])?$/.exec(part);if(m){total+=parseFloat(m[1])+(m[2]?FR[m[2]]:0);any=true;continue;}
    const f=/^(\d+)\/(\d+)$/.exec(part);if(f){total+=(+f[1])/(+f[2]);any=true;continue;}
  }
  return any?Math.round(total*100)/100:null;}
const LIQUID=/\b(rum|vodka|gin|tequila|mezcal|whiske?y|bourbon|brandy|cognac|liqueur|likør|vermouth|aperol|campari|wine|vin|champagne|prosecco|beer|øl|juice|saft|syrup|sirup|soda|tonic|water|vand|milk|mælk|cream|fløde|broth|stock|bouillon|vinegar|eddike|sauce|bitters|espresso|coffee|kaffe|tea|te)\b/i;
function parseIngredient(line,group,drink){
  line=decode(line).replace(/\u2044/g,"/").replace(/(\d)\s+\|\s*/,"$1 ").replace(/\s*\|\s*/g," ").replace(/^[-•*·]\s*/,"");
  const m=/^((?:\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛])(?:\s*[½¼¾⅓⅔⅛])?(?:\s*[-–]\s*(?:\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛]))?(?:\s+\d+\/\d+)?)\s*(.*)$/.exec(line);
  let amount=null,rest=line;
  if(m){amount=parseAmount(m[1]);rest=m[2];}
  let pre="";const pm=/^\(([^)]*)\)\s*(.*)$/.exec(rest);if(pm){pre=convText(pm[1]);rest=pm[2];}
  let unit="";const fu=FOREIGN_RE.exec(rest);
  if(fu&&isForeign(fu[1])&&(amount!=null||/^(pinch|prise|nypa|dash|clove|zehe|klyfta)/i.test(fu[1]))){const liq=/^(oz\.?|ounces?)$/i.test(fu[1].trim())&&(drink||LIQUID.test(fu[2]));const c=liq?vol(amount==null?null:amount*29.57):convUnit(amount,fu[1]);amount=c.amount;unit=c.unit;rest=fu[2];}
  else{const w=/^(\S+)\s+(.*)$/.exec(rest);
  if(w&&UNITS[w[1].toLowerCase()]){unit=UNITS[w[1].toLowerCase()];rest=w[2];}
  else if(UNITS[rest.toLowerCase()]&&amount!=null){unit=UNITS[rest.toLowerCase()];rest="";}}
  rest=rest.replace(/^of\s+/i,"");
  let name=rest,note="";const c=rest.indexOf(",");if(c>0){name=rest.slice(0,c).trim();note=rest.slice(c+1).trim();}
  const par=/^(.*?)\s*\(([^)]*)\)\s*$/.exec(name);if(par){name=par[1];note=(note?note+", ":"")+par[2];}
  if(pre)note=pre+(note?", "+note:"");
  return {group:group||"",amount,unit,name:name.trim()||line,note};}

const TAGS=[[/aftensmad|middag|hovedret|dinner|main/i,"Aftensmad"],[/frokost|lunch/i,"Frokost"],[/morgenmad|brunch|breakfast/i,"Morgenmad"],[/dessert|kage|bagv|cake/i,"Dessert"],
  [/vegetar|vegetarian/i,"Vegetar"],[/vegan/i,"Vegansk"],[/kylling|chicken/i,"Kylling"],[/okse|beef/i,"Oksekød"],[/svin|gris|pork/i,"Svinekød"],[/fisk|laks|torsk|fish/i,"Fisk"],[/pasta/i,"Pasta"],[/suppe|soup/i,"Suppe"],[/cocktail|drink|martini|mojito|spritz|sour\b|daiquiri|margarita|negroni|punch|lemonade|smoothie/i,"Drinks"]];
function tagsOf(r,title){const hay=[txt(r.recipeCategory),Array.isArray(r.recipeCategory)?r.recipeCategory.join(" "):"",txt(r.keywords),Array.isArray(r.keywords)?r.keywords.join(" "):"",txt(r.recipeCuisine),title].join(" ");
  const out=[];TAGS.forEach(([re,t])=>{if(re.test(hay)&&!out.includes(t))out.push(t);});return out.slice(0,3);}

/* schema.org Recipe written as microdata (itemprop="…") instead of JSON-LD, as e.g. Valdemarsro does */
function microdata(doc){
  const root=doc.querySelector('[itemtype*="schema.org/Recipe" i]');if(!root)return null;
  const val=el=>{if(!el)return "";if(el.hasAttribute("content"))return el.getAttribute("content");if(el.tagName==="META")return el.getAttribute("content")||"";
    if(el.tagName==="TIME")return el.getAttribute("datetime")||el.textContent;if(el.tagName==="IMG")return el.getAttribute("src")||el.getAttribute("data-src")||"";
    if(el.tagName==="LINK"||el.tagName==="A")return el.getAttribute("href")||"";return el.textContent;};
  const all=p=>[...root.querySelectorAll('[itemprop~="'+p+'"]')];
  /* prefer the recipe's own property over one inside a nested item (author, publisher …) */
  const own=el=>{const sc=el.parentElement&&el.parentElement.closest("[itemscope]");return !sc||sc===root;};
  const one=p=>{const l=all(p);return l.find(own)||l[0];};
  const ingr=all("recipeIngredient").concat(all("ingredients")).map(e=>val(e).replace(/\s+/g," ").trim()).filter(Boolean);
  let ins=all("recipeInstructions");let steps=[];
  ins.forEach(e=>{const li=e.querySelectorAll("li,p,[itemprop=text]");if(li.length)li.forEach(x=>{const t=x.textContent.replace(/\s+/g," ").trim();if(t)steps.push(t);});else{const t=val(e).replace(/\s+/g," ").trim();if(t)steps.push(t);}});
  const nut=root.querySelector('[itemprop~="nutrition"]');
  return {name:val(one("name")).trim(),recipeYield:val(one("recipeYield")),totalTime:val(one("totalTime"))||val(one("cookTime"))||val(one("prepTime")),
    description:val(one("description")),recipeIngredient:ingr,recipeInstructions:steps,image:val(one("image")),recipeCategory:val(one("recipeCategory")),keywords:val(one("keywords")),
    nutrition:nut?{calories:val(nut.querySelector('[itemprop~="calories"]')),proteinContent:val(nut.querySelector('[itemprop~="proteinContent"]')),fiberContent:val(nut.querySelector('[itemprop~="fiberContent"]'))}:null};
}
/* pages without schema.org: find the "Ingredients" and "Method" headings and read the lists after them */
const ING_H=/^\s*(ingredients?|ingredienser|ingredienserne|du skal bruge|zutaten|ingrédients|ingredientes|ingredienti|ingrediënten)\b/i;
const STEP_H=/^\s*(instructions?|method|directions|how to make|preparation|steps|fremgangsmåde|sådan gør du|tilberedning|zubereitung|anleitung|préparation|preparación|preparazione|bereiding)\b/i;
function rowsAfter(h,stopRe){
  const out=[];let el=h;const walker=h.ownerDocument.createTreeWalker(h.ownerDocument.body,1);walker.currentNode=h;let n=0;
  while((el=walker.nextNode())&&n<400){n++;
    if(/^H[1-4]$/.test(el.tagName)&&out.length)break;
    if(stopRe&&/^(H[1-6]|STRONG|B|TH|DT|LEGEND)$/.test(el.tagName)&&stopRe.test(el.textContent)&&out.length)break;
    if(el.tagName==="LI"||el.tagName==="TR"){const cells=el.tagName==="TR"?[...el.children].map(c=>c.textContent.replace(/\s+/g," ").trim()).filter(Boolean):[el.textContent.replace(/\s+/g," ").trim()];
      const t=cells.join(" ").trim();if(t&&t.length<300)out.push(t);}
    else if(el.tagName==="P"&&!el.closest("li,tr")&&out.length===0&&stopRe===ING_H){const t=el.textContent.replace(/\s+/g," ").trim();if(t.length>20)out.push(t);}
  }
  return out;}
function genericRecipe(doc){
  const heads=[...doc.querySelectorAll("h1,h2,h3,h4,h5,strong,b,th,dt,legend,caption,[class*=title],[class*=heading]")];
  const ih=heads.find(h=>ING_H.test(h.textContent)&&h.textContent.length<60);if(!ih)return null;
  let ingr=rowsAfter(ih,STEP_H);
  if(!ingr.length){const li=[...doc.querySelectorAll('[class*="ingredient" i] li,[class*="ingredient" i] tr,li[class*="ingredient" i]')];ingr=li.map(e=>e.textContent.replace(/\s+/g," ").trim()).filter(Boolean);}
  if(!ingr.length)return null;
  const sh=heads.find(h=>STEP_H.test(h.textContent)&&h.textContent.length<60);
  const st=sh?rowsAfter(sh,ING_H):[];
  const m=q=>{const e=doc.querySelector(q);return e?e.getAttribute("content")||"":"";};
  const h1=doc.querySelector("h1");
  return {name:(h1&&h1.textContent.replace(/\s+/g," ").trim())||m('meta[property="og:title"]'),description:m('meta[name="description"]')||m('meta[property="og:description"]'),
    recipeIngredient:ingr.slice(0,60),recipeInstructions:st.slice(0,40),image:m('meta[property="og:image"]'),keywords:"",recipeCategory:""};}
function recipeFromHTML(html,url){
  const doc=new DOMParser().parseFromString(html,"text/html");
  let r=null;for(const s of doc.querySelectorAll('script[type="application/ld+json"]')){try{r=findRecipe(JSON.parse(s.textContent));}catch(e){try{r=findRecipe(JSON.parse(s.textContent.replace(/[\u0000-\u001f]+/g," ")));}catch(e2){}}if(r)break;}
  if(!r)r=microdata(doc);
  if(!r)r=genericRecipe(doc);
  if(!r)return null;
  const meta=q=>{const m=doc.querySelector(q);return m?txt(m.getAttribute("content")||""):"";};
  const site=meta('meta[property="og:site_name"]');let host="";try{host=new URL(url).hostname.replace(/^www\./,"").split(".")[0];}catch(e){}
  const isSite=t=>{const k=String(t||"").toLowerCase().replace(/[^a-zæøå0-9]/g,"");return !k||(site&&k===site.toLowerCase().replace(/[^a-zæøå0-9]/g,""))||(host&&k===host.toLowerCase().replace(/[^a-zæøå0-9]/g,""));};
  const strip=t=>String(t||"").replace(/\s*[|\-–—]\s*[^|\-–—]*$/,"").trim();
  const h1=doc.querySelector("h1");
  let title=txt(r.name);
  [meta('meta[property="og:title"]'),h1&&h1.textContent.replace(/\s+/g," ").trim(),strip(doc.title)].forEach(t=>{if(isSite(title)&&t&&!isSite(t))title=t;});
  if(isSite(title)&&!isSite(strip(title)))title=strip(title);
  const ingr=[];const raw=r.recipeIngredient||r.ingredients||[];const drink=tagsOf(r,title).includes("Drinks")||/cocktail|drink/i.test(url);
  (Array.isArray(raw)?raw:[raw]).forEach(l=>{if(typeof l==="string"&&l.trim())ingr.push(parseIngredient(l,"",drink));});
  const st=steps(r.recipeInstructions).map(convText);ingr.forEach(i=>{i.note=convText(i.note);});
  if(!title||!ingr.length)return null;
  let servings=num(r.recipeYield);if(!servings||servings>40)servings=4;
  const n=r.nutrition||{};const kcal=num(n.calories),protein=num(n.proteinContent),fiber=num(n.fiberContent);
  let desc=txt(r.description);if(desc.length>220)desc=desc.slice(0,217).replace(/\s+\S*$/,"")+"…";
  const img=imageOf(r.image)||(doc.querySelector('meta[property="og:image"]')||{}).content||"";
  const tags=tagsOf(r,title);
  return {title,servings,time:isoDur(r.totalTime||r.cookTime||r.prepTime),description:desc,ingredients:ingr,steps:st,tags:tags.length?tags:[/drink|cocktail/i.test(url)?"Drinks":"Aftensmad"],meals:tags.includes("Drinks")?["Drinks"]:tags.includes("Dessert")?["Dessert"]:tags.includes("Morgenmad")?["Morgenmad"]:tags.includes("Frokost")?["Frokost"]:["Aftensmad"],
    _lang:langOf(doc,r,[title,desc].concat(st).join(" ")),
    source:url,createdAt:Date.now(),nutrition:kcal?{kcal,protein:protein||0,fiber:fiber||0,source:"opskrift"}:null,image:img&&!/^data:/.test(img)?new URL(img,url).href:""};
}
async function shrink(blob){try{const bmp=await createImageBitmap(blob);const sc=Math.min(1,720/Math.max(bmp.width,bmp.height));const cv=document.createElement("canvas");
  cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);return cv.toDataURL("image/jpeg",.72);}catch(e){return "";}}

/* ---------- language: translate recipes that are not in Danish ---------- */
function langOf(doc,r,sample){
  const l=String(r.inLanguage||doc.documentElement.getAttribute("lang")||(doc.querySelector('meta[property="og:locale"]')||{}).content||"").toLowerCase();
  const w=String(sample||"").toLowerCase();const c=re=>(w.match(re)||[]).length;
  const da=c(/\b(og|med|til|skal|ikke|eller|evt|derefter|gryde|steg|hak|tilsæt)\b/g)+c(/[æø]/g)/3;
  const en=c(/\b(the|and|with|until|into|minutes|add|heat|stir)\b/g);
  const de=c(/\b(und|mit|die|der|das|bis|minuten|zugeben)\b/g);
  if(/^da/.test(l))return "da";
  if(l&&!/^(nb|no|nn|sv)/.test(l)&&da<(en+de))return l.slice(0,2);
  if(da>=(en+de)*1.5&&da>=3&&!/^(nb|no|nn|sv)/.test(l))return "da";
  return l?l.slice(0,2):(en>=de?"en":"de");}
const GT=q=>"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=da&dt=t&q="+encodeURIComponent(q);
async function gtx(text){
  const tries=[u=>u,u=>"https://corsproxy.io/?url="+encodeURIComponent(u),u=>"https://api.allorigins.win/raw?url="+encodeURIComponent(u)];
  let err;for(const t of tries){try{const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),12000);
    const r=await fetch(t(GT(text)),{signal:ac.signal});clearTimeout(tm);if(!r.ok){err=new Error("HTTP "+r.status);continue;}
    const j=JSON.parse(await r.text());return (j[0]||[]).map(x=>x[0]||"").join("");}catch(e){err=e;}}
  throw err||new Error("oversættelse fejlede");}
/* translate a list of short texts in a few calls; keeps the order, falls back one by one */
async function translateAll(list){
  const out=list.slice();const idx=[];list.forEach((t,i)=>{if(t&&/[A-Za-zÀ-ÿ]/.test(t))idx.push(i);});
  let chunk=[];const flush=async()=>{if(!chunk.length)return;const src=chunk.map(i=>list[i].replace(/\n+/g," "));
    let res=null;try{res=(await gtx(src.join("\n"))).split("\n");}catch(e){}
    if(!res||res.length!==src.length){res=[];for(const t of src){try{res.push(await gtx(t));}catch(e){res.push(t);}}}
    chunk.forEach((i,k)=>{out[i]=(res[k]||list[i]).trim();});chunk=[];};
  let len=0;for(const i of idx){const l=list[i].length+1;if(len+l>1500){await flush();len=0;}chunk.push(i);len+=l;}
  await flush();return out;}
async function localize(r,progress){
  const lang=r._lang;delete r._lang;if(!lang||lang==="da")return r;
  if(progress)progress("Oversætter opskriften til dansk…");
  const ing=r.ingredients;
  const list=[r.title,r.description].concat(ing.map(i=>i.name),ing.map(i=>i.note||""),ing.map(i=>i.group||""),r.steps);
  try{const t=await translateAll(list);let k=0;
    r.title=t[k++]||r.title;r.description=t[k++]||"";
    ing.forEach(i=>{const n=t[k++]||i.name;i.name=n.charAt(0).toLowerCase()+n.slice(1);});
    ing.forEach(i=>{i.note=t[k++]||"";});ing.forEach(i=>{i.group=t[k++]||"";});
    r.steps=r.steps.map(()=>t[k++]);
    r.translatedFrom=lang;
  }catch(e){r.translateFailed=true;}
  return r;}

/* fetch + parse one link; returns a recipe object ready for Firestore, or throws */
async function importRecipe(url,progress){
  const html=await viaProxy(url,"text",15000,progress);if(progress)progress("Læser opskriften…");
  const r=recipeFromHTML(html,url);
  if(!r)throw new Error("Siden har ingen opskrift, appen kan læse");
  await localize(r,progress);
  if(r.image){if(progress)progress("Henter billedet…");const orig=r.image;try{const b=await viaProxy(orig,"blob",15000);r.image=(await shrink(b))||orig;}catch(e){r.image=orig;}}
  if(!r.nutrition)delete r.nutrition;
  return r;
}
window.MadroImporter={importRecipe,recipeFromHTML,parseIngredient,isoDur,convText,localize};
})();
