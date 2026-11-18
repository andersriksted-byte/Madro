/* Madplan web: login, familie og invitationer oven på Firebase.
   Appen selv (index.html) kender kun window.claude.use("db"), som her
   peger på families/<familie-id>/<samling> i Firestore. */
(function(){
"use strict";
window.__webApp=true;
const CFG=window.FIREBASE_CONFIG||{};
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const low=e=>String(e||"").trim().toLowerCase();
const ikey=e=>low(e).replace(/[.#$/\[\]]/g,",");
const rid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-5);

let auth=null,fs=null,configOK=!!(CFG.apiKey&&CFG.projectId&&!/^DIN_/.test(CFG.apiKey));
if(configOK&&window.firebase){
  firebase.initializeApp(CFG);auth=firebase.auth();fs=firebase.firestore();
  try{fs.settings({ignoreUndefinedProperties:true,merge:true});}catch(e){}
  try{fs.enablePersistence({synchronizeTabs:true}).catch(()=>{});}catch(e){}
}

const S={user:null,fid:null,family:null,me:null,famUnsub:null,invitesUnsub:null,invites:[],importBusy:false};
let ready;const readyP=new Promise(r=>ready=r);

/* ---------- the window.claude shim the app talks to ---------- */
async function saveFile(o){
  const file=new File([o.data],o.filename,{type:o.data.type||"application/octet-stream"});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:o.filename});return;}}catch(e){if(e&&e.name==="AbortError")return;}
  const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=o.filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
}
const famCol=c=>fs.collection("families/"+S.fid+"/"+c);
window.claude={use:async n=>{
  if(n==="db"){await readyP;return {collection:c=>famCol(c)};}
  if(n==="downloads")return {save:saveFile};
  return null;
}};

/* ---------- UI ---------- */
const css=`
#authWrap{position:fixed;inset:0;z-index:500;background:var(--bg,#f5f3f8);color:var(--ink,#221d33);display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;font-family:inherit}
#authWrap[hidden]{display:none}
.au-box{width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px}
.au-kick{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent,#a8452c);font-weight:800}
.au-box h1{font-family:var(--serif,Georgia,serif);font-size:38px;line-height:1.05;margin:0}
.au-box p{margin:0;color:var(--muted,#625d72);line-height:1.45}
.au-box label{font-weight:700;font-size:14px;margin-bottom:-6px}
.au-box input,.au-box select{font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid var(--line,#e3dfeb);background:var(--surface,#fff);color:inherit;width:100%;box-sizing:border-box}
.au-btn{font:inherit;font-weight:800;font-size:16px;padding:13px 16px;border-radius:999px;border:1px solid var(--ink,#221d33);background:var(--ink,#221d33);color:var(--bg,#fff);cursor:pointer}
.au-btn.plain{background:transparent;color:var(--ink,#221d33)}
.au-btn[disabled]{opacity:.5}
.au-link{background:none;border:0;padding:0;font:inherit;color:var(--accent,#a8452c);font-weight:700;text-decoration:underline;cursor:pointer;align-self:flex-start}
.au-msg{min-height:1.2em;font-size:14px;color:var(--accent,#a8452c);font-weight:600}
.au-msg.ok{color:#2f7d4f}
.au-start{border:1px solid var(--line,#e3dfeb);border-radius:14px;padding:10px 12px;margin:2px 0;display:flex;flex-direction:column;gap:8px}
.au-start legend{font-weight:700;font-size:14px;padding:0 4px}
.au-opt{display:flex;gap:10px;align-items:flex-start;cursor:pointer;margin:0!important;font-weight:400!important}
.au-opt input{width:auto!important;margin-top:3px}
.au-opt span{display:flex;flex-direction:column}.au-opt small{color:var(--muted,#666);font-size:13px}
.au-hr{height:1px;background:var(--line,#e3dfeb);margin:6px 0}
#famCard .fm-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid var(--line)}
#famCard .fm-row small{display:block;color:var(--muted);font-size:12px}
#famCard .fm-tag{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
#famCard form{display:flex;flex-direction:column;gap:8px}
#famCard input,#famCard select{font:inherit;font-size:16px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
#famCard .fm-comm{display:flex;flex-direction:column;gap:8px;padding:10px 2px;border-bottom:1px solid var(--line)}
#famCard .fm-opt{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
#famCard .fm-opt input{margin-top:4px}
#famCard .fm-opt span{display:flex;flex-direction:column}#famCard .fm-opt small,#famCard .fm-comm>small{color:var(--muted);font-size:12.5px;line-height:1.35}
#famCard .fm-msg{font-size:13px;color:var(--muted);min-height:1em}
`;
function mountUI(){
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  const w=document.createElement("div");w.id="authWrap";w.setAttribute("role","dialog");w.setAttribute("aria-modal","true");
  w.innerHTML='<div class="au-box" id="auBox"><p>Indlæser…</p></div>';document.body.appendChild(w);
}
function show(html,wire){const w=$("#authWrap");w.hidden=false;$("#auBox").innerHTML=html;if(wire)wire($("#auBox"));
  const f=$("#auBox input:not([type=hidden])");if(f&&!f.value)setTimeout(()=>f.focus(),50);}
function hide(){$("#authWrap").hidden=true;}
const head=(kick,title,txt)=>'<div class="au-kick">'+esc(kick)+'</div><h1>'+esc(title)+'</h1>'+(txt?'<p>'+txt+'</p>':'');
const msg=(box,t,ok)=>{const m=box.querySelector(".au-msg");if(m){m.textContent=t||"";m.classList.toggle("ok",!!ok);}};
const linkURL=()=>location.origin+location.pathname;
function errText(e){const c=(e&&e.code)||"";
  if(c==="auth/invalid-email")return "Mailadressen ser forkert ud.";
  if(c==="auth/user-not-found"||c==="auth/wrong-password"||c==="auth/invalid-credential"||c==="auth/invalid-login-credentials")return "Forkert mail eller adgangskode. Har du ikke valgt en kode endnu, så få et login-link på mail.";
  if(c==="auth/too-many-requests")return "For mange forsøg. Vent lidt, og prøv igen.";
  if(c==="auth/weak-password")return "Adgangskoden skal være mindst 6 tegn.";
  if(c==="auth/invalid-action-code"||c==="auth/expired-action-code")return "Linket er udløbet eller allerede brugt. Bed om et nyt.";
  if(c==="auth/requires-recent-login")return "Log ind igen med et nyt link, før du vælger kode.";
  if(c==="auth/user-token-expired")return "Du er blevet logget ud, fx fordi koden er skiftet på en anden enhed. Log ind igen.";
  if(c==="permission-denied")return "Du har ikke adgang til det.";
  if(c==="auth/network-request-failed"||c==="unavailable")return "Ingen forbindelse. Prøv igen.";
  return (e&&e.message)||"Noget gik galt.";}

/* ---------- screens ---------- */
function screenSetup(){show(head("Madro","Opsætning mangler","Firebase er ikke sat op endnu. Udfyld <b>config.js</b> med dit Firebase-projekts oplysninger, som beskrevet i README."));}
function screenLogin(prefill){
  show(head("Madro","Log ind","Familiens fælles kogebog, madplan og indkøbsliste.")+
    '<form id="auLogin" style="display:contents"><label for="auMail">Mail</label><input id="auMail" type="email" autocomplete="email" inputmode="email" value="'+esc(prefill||"")+'">'+
    '<label for="auPw">Adgangskode</label><input id="auPw" type="password" autocomplete="current-password">'+
    '<button class="au-btn" type="submit">Log ind</button></form><div class="au-msg" role="status"></div><div class="au-hr"></div>'+
    '<p>Første gang, inviteret eller glemt koden?</p><button class="au-btn plain" type="button" id="auSendLink">Send mig et login-link på mail</button><button class="au-link" type="button" id="auReset">Vælg eller nulstil adgangskode</button>',
  box=>{
    box.querySelector("#auLogin").onsubmit=async e=>{e.preventDefault();const m=low(box.querySelector("#auMail").value),p=box.querySelector("#auPw").value;
      if(!m||!p){msg(box,"Skriv mail og adgangskode.");return;}msg(box,"Logger ind…",true);
      try{await auth.signInWithEmailAndPassword(m,p);}catch(err){msg(box,errText(err));}};
    box.querySelector("#auReset").onclick=async()=>{const m=low(box.querySelector("#auMail").value);if(!m){msg(box,"Skriv din mail først.");box.querySelector("#auMail").focus();return;}
      try{await auth.sendPasswordResetEmail(m);msg(box,"Vi har sendt en mail til "+m+", hvor du kan vælge en kode.",true);}catch(err){msg(box,errText(err));}};
    box.querySelector("#auSendLink").onclick=async()=>{const m=low(box.querySelector("#auMail").value);if(!m){msg(box,"Skriv din mail først.");box.querySelector("#auMail").focus();return;}
      msg(box,"Sender…",true);
      try{await auth.sendSignInLinkToEmail(m,{url:linkURL(),handleCodeInApp:true});try{localStorage.setItem("mp_loginMail",m);}catch(e){}
        show(head("Madro","Tjek din mail","Vi har sendt et login-link til <b>"+esc(m)+"</b>. Åbn det på denne enhed. Kan du ikke finde det, så kig i spam.")+'<button class="au-btn plain" type="button" id="auBack">Tilbage</button>',b=>{b.querySelector("#auBack").onclick=()=>screenLogin(m);});}
      catch(err){msg(box,errText(err));}};
  });
}
function screenLinkMail(){
  show(head("Madro","Bekræft din mail","Skriv den mail, som login-linket blev sendt til.")+'<form id="auF" style="display:contents"><input id="auMail" type="email" autocomplete="email"><button class="au-btn" type="submit">Log ind</button></form><div class="au-msg"></div>',
  box=>{box.querySelector("#auF").onsubmit=async e=>{e.preventDefault();await finishLink(low(box.querySelector("#auMail").value),box);};});
}
async function finishLink(mail,box){
  try{await auth.signInWithEmailLink(mail,location.href);try{localStorage.removeItem("mp_loginMail");}catch(e){}
    try{sessionStorage.setItem("mp_viaLink","1");}catch(e){}history.replaceState(null,"",linkURL()+location.hash);}
  catch(err){if(box)msg(box,errText(err));else screenLogin(mail);}
}
function screenPassword(next){
  show(head("Madro","Vælg en adgangskode","Så kan du logge ind med mail og kode, også fra appen på hjemmeskærmen.")+
    '<form id="auF" style="display:contents"><input id="auPw" type="password" autocomplete="new-password" placeholder="Mindst 6 tegn"><button class="au-btn" type="submit">Gem kode</button></form><div class="au-msg"></div><button class="au-link" type="button" id="auSkip">Spring over</button>',
  box=>{box.querySelector("#auF").onsubmit=async e=>{e.preventDefault();const p=box.querySelector("#auPw").value;if(p.length<6){msg(box,"Mindst 6 tegn.");return;}
      try{await auth.currentUser.updatePassword(p);try{sessionStorage.removeItem("mp_viaLink");}catch(e){}next();}
      catch(err){/* Firebase sometimes refuses a new password right after a link login: send the "choose password" mail instead */
        const m=low(auth.currentUser&&auth.currentUser.email);try{sessionStorage.removeItem("mp_viaLink");}catch(e){}
        try{await auth.sendPasswordResetEmail(m);}catch(e2){msg(box,errText(err));return;}
        show(head("Madro","Tjek din mail","Koden kunne ikke gemmes direkte, så vi har sendt en mail til <b>"+esc(m)+"</b>, hvor du vælger din kode. Du kan bruge Madro imens.")+'<button class="au-btn" type="button" id="auGo">Fortsæt til Madro</button>',b=>{b.querySelector("#auGo").onclick=()=>next();});}};
    box.querySelector("#auSkip").onclick=()=>{try{sessionStorage.removeItem("mp_viaLink");}catch(e){}next();};});
}
function screenNoFamily(inv){
  const mail=low(S.user.email);
  if(inv){
    show(head("Invitation","Velkommen","<b>"+esc(inv.invitedByName||"En fra familien")+"</b> har inviteret dig til familien <b>"+esc(inv.familyName||"")+"</b>.")+
      '<label for="auName">Dit navn</label><input id="auName" value="'+esc(inv.name||"")+'"><button class="au-btn" type="button" id="auJoin">Bliv en del af familien</button><div class="au-msg"></div><button class="au-link" type="button" id="auOut">Log ud</button>',
    box=>{box.querySelector("#auJoin").onclick=async()=>{const nm=box.querySelector("#auName").value.trim();if(!nm){msg(box,"Skriv dit navn.");return;}
        msg(box,"Melder dig ind…",true);try{await joinFamily(inv,nm);}catch(err){msg(box,errText(err));}};
      box.querySelector("#auOut").onclick=()=>auth.signOut();});
    return;
  }
  show(head("Ny familie","Opret jeres familie","Du er logget ind som <b>"+esc(mail)+"</b>. Opret familien, og invitér resten bagefter under Opsætning.")+
    '<label for="auFam">Familiens navn</label><input id="auFam" placeholder="fx Familien Riksted"><label for="auName">Dit navn</label><input id="auName" placeholder="fx Anders">'+
    '<fieldset class="au-start"><legend>Hvordan vil I starte?</legend>'+
    '<label class="au-opt"><input type="radio" name="auStart" value="lib" checked><span><b>Vær med i fællesskabet</b><small id="auLibN">Start med opskrifter fra andre familier, og del dem, I selv vælger</small></span></label>'+
    '<label class="au-opt"><input type="radio" name="auStart" value="empty"><span><b>Lukket kogebog</b><small>Start helt tomt. Intet deles med andre</small></span></label>'+
    '<small style="color:var(--muted,#666)">Det kan altid ændres under Opsætning.</small></fieldset>'+
    '<button class="au-btn" type="button" id="auCreate">Opret familie</button><div class="au-msg"></div><p style="font-size:13px">Er du blevet inviteret? Så skal du logge ind med præcis den mail, invitationen blev sendt til.</p><button class="au-link" type="button" id="auOut">Log ud</button>',
  box=>{libraryCount().then(n=>{const el=box.querySelector("#auLibN");if(!el)return;el.textContent=n>0?"Start med "+n+" opskrifter fra andre familier, og del dem, I selv vælger":"Se og hent andre familiers opskrifter, og del dem, I selv vælger";});
    box.querySelector("#auCreate").onclick=async()=>{const fn=box.querySelector("#auFam").value.trim(),nm=box.querySelector("#auName").value.trim();
      if(!fn||!nm){msg(box,"Skriv både familiens og dit navn.");return;}msg(box,"Opretter…",true);
      const useLib=(box.querySelector('input[name="auStart"]:checked')||{}).value==="lib";
      try{await createFamily(fn,nm,useLib,t=>msg(box,t,true));}catch(err){msg(box,errText(err));}};
    box.querySelector("#auOut").onclick=()=>auth.signOut();});
}

/* ---------- family data ---------- */
async function createFamily(famName,myName,useLib,progress){
  const uid=S.user.uid,fid="f"+rid(),pid="p"+rid();
  await fs.doc("families/"+fid).set({name:famName,community:!!useLib,createdAt:Date.now(),createdBy:uid,members:{[uid]:{name:myName,email:low(S.user.email),role:"admin",personId:pid,joinedAt:Date.now()}}});
  await fs.doc("families/"+fid+"/meta/settings").set({kids:[{id:pid,name:myName}],stores:["Netto","Rema 1000"],primary:"Netto",maxStores:2},{merge:true});
  await fs.doc("users/"+uid).set({familyId:fid});
  S.fid=fid;S.family={name:famName,members:{}};
  if(useLib){try{await copyLibrary(progress);}catch(e){}}
  await enterFamily(fid);
}

/* ---------- shared recipes between families (library/<familie>_<opskrift>) ---------- */
const STRIP=["kids","rating","stars","uses","lastUsed","history","createdAt","shared"];
async function libraryCount(){try{const s=await fs.collection("library").get();return s.docs.length;}catch(e){return 0;}}
async function copyLibrary(progress,onlyNew){
  const lib=await fs.collection("library").get();
  let have=new Set();if(onlyNew){const mine=await famCol("recipes").get();mine.docs.forEach(d=>{const r=d.data();have.add(low(r.title)+"|"+(r.source||""));});}
  const seen=new Set();let n=0;const jobs=[];
  lib.docs.forEach(d=>{const r=d.data();if(r.familyId===S.fid)return;const k=low(r.title)+"|"+(r.source||"");if(seen.has(k)||have.has(k))return;seen.add(k);jobs.push(r);});
  let ix=0;const worker=async()=>{while(ix<jobs.length){const r=Object.assign({},jobs[ix++]);["familyId","ownerUid","sharedBy","sharedAt","libId","shared"].forEach(f=>delete r[f]);r.createdAt=Date.now();r.fromLibrary=true;
      await famCol("recipes").doc("lib"+rid()).set(r);n++;if(progress)progress("Henter opskrifter… "+n+" af "+jobs.length);}};
  await Promise.all(Array.from({length:6},worker));return n;}
/* one rule only: a recipe is in the library exactly when the family is in the community AND the recipe is marked "shared".
   Copies fetched from others can't be re-shared. */
function libCopy(id,data){const r=Object.assign({},data);STRIP.forEach(f=>delete r[f]);delete r.id;
  return Object.assign(r,{familyId:S.fid,ownerUid:S.user.uid,sharedBy:S.family.name,sharedAt:Date.now(),libId:S.fid+"_"+id});}
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h);};
let syncT=0,recSnap=null,recUnsub=null;
let libUnsub=null;
function feedCommunity(sn){/* other families' recipes we don't already have */
  const mine=((window.__appState&&window.__appState().recipes)||[]);const have=new Set(mine.map(r=>low(r.title)+"|"+(r.source||"")));const seen=new Set();
  const list=[];sn.docs.forEach(d=>{const r=d.data();if(r.familyId===S.fid)return;const k=low(r.title)+"|"+(r.source||"");if(have.has(k)||seen.has(k))return;seen.add(k);list.push(Object.assign({},r,{libId:d.id}));});
  window.__communityList=list;if(window.__setCommunity)window.__setCommunity(list);}
function watchCommunity(){
  if(recUnsub){recUnsub();recUnsub=null;}
  if(libUnsub){libUnsub();libUnsub=null;}
  window.__communityOn=!!(S.family&&S.family.community);
  if(!window.__communityOn){window.__communityList=[];if(window.__setCommunity)window.__setCommunity([]);return;}
  let lastLib=null;libUnsub=fs.collection("library").onSnapshot(sn=>{lastLib=sn;feedCommunity(sn);},()=>{});
  recUnsub=famCol("recipes").onSnapshot(sn=>{recSnap=sn;clearTimeout(syncT);syncT=setTimeout(syncLibrary,4000);if(lastLib)setTimeout(()=>feedCommunity(lastLib),300);},()=>{});
}
async function syncLibrary(){
  if(!S.family||!S.family.community||!recSnap)return;
  const key="mp_libsync_"+S.fid;let done={};try{done=JSON.parse(localStorage.getItem(key)||"{}");}catch(e){}
  const want={};recSnap.docs.forEach(d=>{const r=d.data();if(r.shared===true&&!r.fromLibrary)want[S.fid+"_"+d.id]=[d.id,r];});
  let lib;try{lib=await fs.collection("library").where("familyId","==",S.fid).get();}catch(e){return;}
  const have=new Set(lib.docs.map(d=>d.id));
  for(const d of lib.docs){if(!want[d.id]){try{await d.ref.delete();}catch(e){}delete done[d.id];}}
  for(const [lid,[id,r]] of Object.entries(want)){const c=libCopy(id,r);const h=hash(JSON.stringify(Object.assign({},c,{sharedAt:0,ownerUid:""})));
    if(have.has(lid)&&done[lid]===h)continue;try{await fs.collection("library").doc(lid).set(c);done[lid]=h;}catch(e){}}
  try{localStorage.setItem(key,JSON.stringify(done));}catch(e){}
}
async function unshareRecipes(){const s=await fs.collection("library").where("familyId","==",S.fid).get();for(const d of s.docs){try{await d.ref.delete();}catch(e){}}try{localStorage.removeItem("mp_libsync_"+S.fid);}catch(e){}return s.docs.length;}
async function setCommunity(on){await fs.doc("families/"+S.fid).update({community:!!on});if(!on)await unshareRecipes();}
async function joinFamily(inv,myName){
  const uid=S.user.uid,fid=inv.familyId,mail=low(S.user.email);let pid=inv.personId||"";
  if(!pid)pid="p"+rid();
  await fs.doc("families/"+fid).update({["members."+uid]:{name:myName,email:mail,role:"member",personId:pid,joinedAt:Date.now()},["invites."+ikey(mail)]:firebase.firestore.FieldValue.delete()});
  await fs.doc("users/"+uid).set({familyId:fid});
  const sref=fs.doc("families/"+fid+"/meta/settings");
  await fs.runTransaction(async t=>{const d=await t.get(sref);const kids=((d.exists&&d.data().kids)||[]).slice();
    const k=kids.find(x=>x.id===pid);if(k)k.name=myName;else kids.push({id:pid,name:myName});t.set(sref,{kids},{merge:true});});
  try{await fs.doc("invites/"+mail).delete();}catch(e){}
  await enterFamily(fid);
}
async function findInvite(){try{const d=await fs.doc("invites/"+low(S.user.email)).get();return d.exists?d.data():null;}catch(e){return null;}}
async function enterFamily(fid){
  const snap=await fs.doc("families/"+fid).get();
  if(!snap.exists||!(snap.data().members||{})[S.user.uid]){return false;}
  S.fid=fid;S.family=snap.data();S.me=S.family.members[S.user.uid];window.__mePerson=S.me.personId;window.__family={id:fid,name:S.family.name};
  if(S.famUnsub)S.famUnsub();
  /* thumbs: a person linked to another login can only be rated by that login */
  const syncLock=()=>{const mine=S.me&&S.me.personId;window.__lockedPersons=new Set(Object.entries(S.family.members||{}).filter(([uid,m])=>uid!==S.user.uid&&m.personId&&m.personId!==mine).map(([,m])=>m.personId));};
  syncLock();
  const syncInv=()=>{S.invites=Object.values(S.family.invites||{}).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));};syncInv();
  S.famUnsub=fs.doc("families/"+fid).onSnapshot(d=>{if(!d.exists)return;if(!(d.data().members||{})[S.user.uid]){location.reload();return;}/* removed from the family */const wasC=!!(S.family&&S.family.community);S.family=d.data();syncInv();S.me=S.family.members[S.user.uid]||S.me;if(S.me)window.__mePerson=S.me.personId;syncLock();if(wasC!==!!S.family.community)watchCommunity();drawFamCard();},err=>{if(err&&err.code==="permission-denied")location.reload();});
  window.__onSettings=()=>drawFamCard();
  hide();ready();
  watchImports();mountFamCard();watchCommunity();setTimeout(offerHomeScreen,1500);
  return true;
}
const isAdmin=()=>S.me&&S.me.role==="admin";

/* ---------- settings card: members, invites, import ---------- */
function persons(){try{return (window.__appState&&window.__appState().settings.kids)||[];}catch(e){return [];}}
function mountFamCard(){
  const host=$("#v-butikker");if(!host||$("#famCard"))return;
  const c=document.createElement("div");c.className="card stack";c.id="famCard";
  const first=host.querySelector(".card");if(first)first.parentNode.insertBefore(c,first);else host.appendChild(c);
  drawFamCard();
  window.addEventListener("hashchange",()=>{if(/butikker/.test(location.hash))drawFamCard();});
}
function drawFamCard(){
  const c=$("#famCard");if(!c||!S.family)return;if(c.contains(document.activeElement)&&document.activeElement.tagName!=="BUTTON")return;
  const mem=Object.entries(S.family.members||{}).sort((a,b)=>(a[1].joinedAt||0)-(b[1].joinedAt||0));
  const ps=persons();const pName=id=>(ps.find(p=>p.id===id)||{}).name;
  const linked=new Set(mem.map(([,m])=>m.personId).concat(S.invites.map(i=>i.personId).filter(Boolean)));
  const free=ps.filter(p=>!linked.has(p.id));
  c.innerHTML='<h3>Familie og login</h3><p class="small muted" style="margin:0">'+esc(S.family.name)+'. Alle med login deler kogebog, madplan og indkøbsliste, og alle personer kan give 👍 og 👎.</p>'+
    mem.map(([uid,m])=>'<div class="fm-row"><div><b>'+esc(m.name)+(uid===S.user.uid?' (dig)':'')+'</b><small>'+esc(m.email)+(pName(m.personId)&&pName(m.personId)!==m.name?' · vurderer som '+esc(pName(m.personId)):'')+'</small></div><span class="fm-tag">'+(m.role==="admin"?"Administrator":"Medlem")+'</span>'+(isAdmin()&&uid!==S.user.uid?'<button type="button" class="linkbtn" data-unmem="'+esc(uid)+'" style="margin-left:8px">Fjern</button>':'')+'</div>').join("")+
    S.invites.map(i=>'<div class="fm-row"><div><b>'+esc(i.name||i.email)+'</b><small>'+esc(i.email)+' · inviteret, ikke logget ind endnu</small></div>'+(isAdmin()?'<button type="button" class="linkbtn" data-uninv="'+esc(i.email)+'">Træk tilbage</button>':'')+'</div>').join("")+
    (isAdmin()?'<form id="invForm"><b style="margin-top:6px">Invitér til familien</b><input type="email" id="invMail" placeholder="Mail" autocomplete="off" inputmode="email">'+
      '<select id="invPerson"><option value="">Ny person i familien</option>'+free.map(p=>'<option value="'+esc(p.id)+'">Er '+esc(p.name)+' (overtager '+esc(p.name)+'s 👍)</option>').join("")+'</select>'+
      '<input id="invName" placeholder="Navn (fx Bettina)"><button class="btn small" type="submit" style="align-self:flex-start">Send invitation</button><div class="fm-msg" id="invMsg">'+esc(S.invMsg||"")+'</div></form>':'')+
    '<div class="fm-row"><div><b>Dig i tommel-vurderingen</b><small>Bruges som standard i Opskrift Tinder</small></div><select id="mePerson">'+ps.filter(p=>!(window.__lockedPersons&&window.__lockedPersons.has(p.id))).map(p=>'<option value="'+esc(p.id)+'"'+(S.me&&S.me.personId===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join("")+'</select></div>'+
    '<div class="fm-comm"><b>Opskriftsfællesskab</b>'+
      '<label class="fm-opt"><input type="radio" name="comm" value="on"'+(S.family.community?' checked':'')+(isAdmin()?'':' disabled')+'><span><b>Med i fællesskabet</b><small>Fællesskabets opskrifter dukker automatisk op i Kogebogen og Opskrift Tinder. Nye opskrifter, I laver, deles også, men hver opskrift kan gøres privat med knappen 🔒 i opskriften. Tommelvurderinger, madplaner og indkøbsliste deles aldrig.</small></span></label>'+
      '<label class="fm-opt"><input type="radio" name="comm" value="off"'+(S.family.community?'':' checked')+(isAdmin()?'':' disabled')+'><span><b>Lukket kogebog</b><small>Intet deles, og I ser kun jeres egne opskrifter.</small></span></label>'+
      (isAdmin()?'':'<small>Kun administratoren kan ændre det.</small>')+
      '<div class="fm-msg" id="libMsg">'+esc(S.libMsg||"")+'</div></div>'+
    (isAdmin()?'<div class="fm-row"><div><b>Læs data ind fra Claude-appen</b><small>Vælg filen fra "Eksportér alle data"</small></div><label class="btn ghost small" style="cursor:pointer"><input type="file" accept="application/json,.json" id="impFile" hidden>Vælg fil</label></div><div class="fm-msg" id="impMsg">'+esc(S.impMsg||"")+'</div>':'')+
    '<div class="fm-row"><div><b>Anbefal Madro til en anden familie</b><small>Send et link på mail eller besked. De opretter deres egen familie</small></div><button type="button" class="btn ghost small" id="tellFriend">Send</button></div>'+
    '<button type="button" class="btn plain small" id="logOut" style="align-self:flex-start">Log ud ('+esc(S.user.email)+')</button>';
  const sel=c.querySelector("#invPerson"),nm=c.querySelector("#invName");
  if(sel)sel.onchange=()=>{const p=ps.find(x=>x.id===sel.value);nm.hidden=!!p;if(p)nm.value=p.name;else nm.value="";};
  const f=c.querySelector("#invForm");if(f)f.onsubmit=async e=>{e.preventDefault();await sendInvite(low(c.querySelector("#invMail").value),sel.value,nm.value.trim());};
  c.querySelectorAll("[data-unmem]").forEach(b=>b.onclick=async()=>{const id=b.dataset.unmem,m=(S.family.members||{})[id];if(!m)return;
    if(!confirm("Fjern "+m.name+" fra familien?\n\n"+m.name+" kan ikke længere logge ind i jeres Madro, og "+m.name+"s 👍 og 👎 fjernes fra tommelvurderingen. Kogebog, madplan og indkøbsliste er urørt."))return;
    b.disabled=true;
    try{await fs.doc("families/"+S.fid).update({["members."+id]:firebase.firestore.FieldValue.delete()});
      try{await fs.doc("invites/"+low(m.email)).delete();}catch(e){}
      const still=Object.entries(S.family.members||{}).some(([u,x])=>u!==id&&x.personId===m.personId);
      if(m.personId&&!still&&window.__removePerson)await window.__removePerson(m.personId);
    }catch(err){b.disabled=false;alert(errText(err));}});
  c.querySelectorAll("[data-uninv]").forEach(b=>b.onclick=async()=>{const em=b.dataset.uninv;try{await fs.doc("families/"+S.fid).update({["invites."+ikey(em)]:firebase.firestore.FieldValue.delete()});await fs.doc("invites/"+em).delete();}catch(err){alert(errText(err));}});
  const mp=c.querySelector("#mePerson");if(mp)mp.onchange=async()=>{try{await fs.doc("families/"+S.fid).update({["members."+S.user.uid+".personId"]:mp.value});try{localStorage.removeItem("mp_who");}catch(e){}}catch(err){alert(errText(err));}};
  const libSay=t=>{S.libMsg=t;const m=$("#libMsg");if(m)m.textContent=t;};
  const lg=c.querySelector("#libGet");if(lg)lg.onclick=async()=>{lg.disabled=true;try{const n=await copyLibrary(libSay,true);libSay(n?n+" nye opskrifter er lagt i Kogebogen.":"I har allerede alle de delte opskrifter.");}catch(err){libSay(errText(err));}lg.disabled=false;};
  c.querySelectorAll('input[name="comm"]').forEach(r=>r.onchange=async()=>{const on=r.value==="on";
    if(!on&&!confirm("Gøre kogebogen lukket? De opskrifter, I har delt, fjernes fra fællesskabet. Familier, der allerede har hentet dem, beholder deres egen kopi.")){drawFamCard();return;}
    try{libSay(on?"Melder jer ind…":"Fjerner jeres delte opskrifter…");await setCommunity(on);libSay(on?"I er med i fællesskabet. Del en opskrift med knappen 🌍 i opskriften.":"Kogebogen er nu lukket.");}catch(err){libSay(errText(err));}});
  const fi=c.querySelector("#impFile");if(fi)fi.onchange=()=>{if(fi.files[0])importFile(fi.files[0]);fi.value="";};
  c.querySelector("#tellFriend").onclick=async()=>{const url=linkURL();const me=(S.me&&S.me.name)||"";
    const text="Hej! Jeg bruger Madro til madplan, kogebog og indkøbsliste. Prøv den her: "+url+"\n\nSkriv din mail, få et login-link, og opret jeres egen familie."+(me?"\n\nHilsen "+me:"");
    try{if(navigator.share){await navigator.share({title:"Madro",text});return;}}catch(e){if(e&&e.name==="AbortError")return;}
    location.href="mailto:?subject="+encodeURIComponent("Prøv Madro – madplan, kogebog og indkøbsliste")+"&body="+encodeURIComponent(text);};
  c.querySelector("#logOut").onclick=async()=>{if(confirm("Log ud af Madro?")){await auth.signOut();location.reload();}};
}
async function sendInvite(mail,personId,name){
  const say=t=>{S.invMsg=t;const m=$("#invMsg");if(m)m.textContent=t;};
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){say("Skriv en gyldig mail.");return;}
  if(Object.values(S.family.members||{}).some(x=>x.email===mail)){say("Personen er allerede med i familien.");return;}
  const p=persons().find(x=>x.id===personId);name=p?p.name:name;if(!name){say("Skriv personens navn.");return;}
  say("Sender…");
  try{
    const inv={email:mail,familyId:S.fid,familyName:S.family.name,invitedBy:S.user.uid,invitedByName:S.me.name,personId:personId||"",name,createdAt:Date.now()};
    await fs.doc("families/"+S.fid).update({["invites."+ikey(mail)]:inv});
    await fs.doc("invites/"+mail).set(inv);
    let mailed=true;try{await auth.sendSignInLinkToEmail(mail,{url:linkURL(),handleCodeInApp:true});}catch(e){mailed=false;}
    say(mailed?"Invitation sendt til "+mail+". "+name+" skal åbne linket i mailen.":"Invitationen er gemt, men mailen kunne ikke sendes. Bed "+name+" åbne "+linkURL()+" og logge ind med "+mail+".");
    const f=$("#invForm");if(f){f.reset();}
  }catch(err){say(errText(err));}
}

/* ---------- import of the export file from the Claude version ---------- */
async function importFile(file){
  const say=t=>{S.impMsg=t;const m=$("#impMsg");if(m)m.textContent=t;};
  let data;try{data=JSON.parse(await file.text());}catch(e){say("Filen kunne ikke læses.");return;}
  if(!data||data.app!=="madplan"||!data.collections){say("Det er ikke en eksport fra Madplan-appen.");return;}
  if(!confirm("Læs data ind i familien "+S.family.name+"? Opskrifter, madplaner og indkøbsliste med samme id bliver overskrevet."))return;
  let n=0,bad=[];const cols=["recipes","plans","lists","archive","imports","meta"];
  const total=cols.reduce((a,c)=>a+Object.keys(data.collections[c]||{}).length,0);
  /* several writes at a time: each one waits for the server, so one-by-one is slow with pictures */
  const jobs=[];for(const c of cols){for(const [id,doc] of Object.entries(data.collections[c]||{})){if(c==="meta"&&id==="offers")continue;if(c==="recipes"&&doc&&/^\/_blob\//.test(doc.image||""))doc.image="img/blob/"+doc.image.slice(7)+".jpg";jobs.push([c,id,doc]);}}
  let next=0;const worker=async()=>{while(next<jobs.length){const [c,id,d]=jobs[next++];
      try{await famCol(c).doc(id).set(d);}catch(e){bad.push(c+"/"+id+" ("+((e&&e.code)||"fejl")+")");}
      n++;say("Læser ind… "+n+" af "+total);}};
  await Promise.all(Array.from({length:6},worker));
  // members whose person no longer exists: offer the first unlinked person with the same name
  const ps=(data.collections.meta&&data.collections.meta.settings&&data.collections.meta.settings.kids)||[];
  for(const [uid,mm] of Object.entries(S.family.members||{})){if(ps.some(p=>p.id===mm.personId))continue;const same=ps.find(p=>low(p.name)===low(mm.name));
    if(same){try{await fs.doc("families/"+S.fid).update({["members."+uid+".personId"]:same.id});}catch(e){}}}
  say("Færdig: "+(n-bad.length)+" af "+total+" dokumenter."+(bad.length?" Fejlede: "+bad.slice(0,4).join(", "):"")+" Tjek \"Dig i tommel-vurderingen\" herover.");
}

/* ---------- recipe links: the import task leaves finished recipes in inbox/<id>.json ---------- */
let impUnsub=null;const tried={};
function watchImports(){
  if(impUnsub)impUnsub();
  impUnsub=famCol("imports").onSnapshot(s=>{s.docs.forEach(d=>{const v=d.data();
      if(v.status==="venter"){pullInbox(d.id);if(v.auto!=="fejl")autoImport(d.id,v);}
      else if(v.status==="henter"&&Date.now()-(v.claimedAt||0)>180000)autoImport(d.id,v,true);});},()=>{});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")Object.keys(tried).forEach(k=>{if(tried[k]!=="done")tried[k]=0;});});
}
async function pullInbox(id){
  const now=Date.now();if(tried[id]==="done"||(tried[id]&&now-tried[id]<60000))return;tried[id]=now;
  let res;try{res=await fetch("inbox/"+encodeURIComponent(id)+".json",{cache:"no-store"});}catch(e){return;}
  if(!res.ok)return;let j;try{j=await res.json();}catch(e){return;}
  const ref=famCol("imports").doc(id);
  try{
    if(j.status==="fejl"){await ref.set({status:"fejl",error:j.error||"Kunne ikke hentes"},{merge:true});tried[id]="done";return;}
    const r=j.recipe||j;if(!r||!r.title)return;
    if(r.image&&/^inbox\//.test(r.image)){r.image=await toDataURL(r.image);}
    const cur=await ref.get();if(!cur.exists||cur.data().status!=="venter"){tried[id]="done";return;}
    if(!r.image&&cur.data().image)r.image=cur.data().image;
    const nid="imp"+rid();await famCol("recipes").doc(nid).set(Object.assign({createdAt:Date.now()},r,(S.family&&S.family.community&&r.shared===undefined)?{shared:true}:{}));await ref.delete();tried[id]="done";
  }catch(e){}
}
/* fetch the recipe straight away in the app; if the page can't be read, it stays in the queue for Claude */
const autoBusy={};
async function autoImport(id,v,stale){
  if(!window.MadroImporter||autoBusy[id])return;autoBusy[id]=1;
  const ref=famCol("imports").doc(id);
  try{
    const claimed=await fs.runTransaction(async t=>{const d=await t.get(ref);if(!d.exists)return false;const x=d.data();
      const free=x.status==="venter"&&x.auto!=="fejl";const old=x.status==="henter"&&Date.now()-(x.claimedAt||0)>180000;
      if(!free&&!old)return false;t.update(ref,{status:"henter",claimedBy:S.user.uid,claimedAt:Date.now()});return true;});
    if(!claimed)return;
    let r;try{r=await window.MadroImporter.importRecipe(v.url);}
    catch(err){await ref.set({status:"venter",auto:"fejl",autoError:String((err&&err.message)||err).slice(0,120)},{merge:true});return;}
    if(!r.image&&v.image)r.image=v.image;
    if(S.family&&S.family.community&&r.shared===undefined)r.shared=true;
    await famCol("recipes").doc("imp"+rid()).set(r);await ref.delete();
    try{const t=document.getElementById("toast");if(t){t.textContent="Lagt i Kogebogen: "+r.title;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),3500);}}catch(e){}
  }catch(e){try{await ref.set({status:"venter",auto:"fejl",autoError:"Fejl: "+String((e&&(e.code||e.message))||e).slice(0,100)},{merge:true});}catch(e2){}}finally{delete autoBusy[id];}
}
async function toDataURL(u){try{const r=await fetch(u);if(!r.ok)return "";const b=await r.blob();
  const bmp=await createImageBitmap(b);const sc=Math.min(1,720/Math.max(bmp.width,bmp.height));const cv=document.createElement("canvas");cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);
  cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);return cv.toDataURL("image/jpeg",0.72);}catch(e){return "";}}

/* ---------- first visit on a phone: suggest adding Madro to the home screen ---------- */
let installEvt=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;});
function offerHomeScreen(){
  const standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
  const ua=navigator.userAgent||"";const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);const android=/Android/i.test(ua);
  let seen=null;try{seen=localStorage.getItem("mp_a2hs");}catch(e){}
  if(standalone||seen||!(ios||android)||$("#a2hs"))return;
  const st=document.createElement("style");st.textContent=`
#a2hs{position:fixed;inset:0;z-index:2147483000;background:rgba(20,16,12,.45);display:flex;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))}
#a2hs .box{background:var(--bg,#fff);color:var(--ink,#222);border-radius:22px;padding:22px 20px 18px;max-width:420px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:12px}
#a2hs img.ic{width:56px!important;height:56px!important;max-width:56px!important;position:static!important;border-radius:14px;align-self:center;object-fit:cover}
#a2hs h2{font-family:var(--serif,Georgia,serif);font-size:26px;margin:0;text-align:center;line-height:1.1}
#a2hs p{margin:0;color:var(--muted,#666);line-height:1.45;text-align:center}
#a2hs ol{margin:0;padding-left:22px;line-height:1.6}
#a2hs .sh{display:inline-block;vertical-align:-4px}`;
  document.head.appendChild(st);
  const share='<svg class="sh" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="Del"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const steps=ios?'<ol><li>Tryk på '+share+' <b>Del</b> nederst i Safari.</li><li>Rul ned, og vælg <b>Føj til hjemmeskærm</b>.</li><li>Tryk <b>Tilføj</b>.</li></ol><p style="font-size:13px">Log derefter ind i appen på hjemmeskærmen med din mail og adgangskode.</p>'
    :(installEvt?'':'<ol><li>Tryk på menuen <b>⋮</b> øverst i Chrome.</li><li>Vælg <b>Føj til startskærm</b> eller <b>Installer app</b>.</li></ol>');
  const w=document.createElement("div");w.id="a2hs";w.setAttribute("role","dialog");w.setAttribute("aria-modal","true");w.setAttribute("aria-label","Gem Madro på hjemmeskærmen");
  w.innerHTML='<div class="box"><img class="ic" src="img/icon-192.png" alt=""><h2>Gem Madro på din telefon</h2><p>Så åbner Madro som en rigtig app med ét tryk, uden adresselinje.</p>'+steps+
    (android&&installEvt?'<button class="au-btn" type="button" id="a2Install">Installér Madro</button>':'')+
    '<button class="au-btn'+(android&&installEvt?' plain':'')+'" type="button" id="a2Ok">'+(android&&installEvt?'Ikke nu':'Forstået')+'</button></div>';
  document.body.appendChild(w);
  const close=()=>{try{localStorage.setItem("mp_a2hs","1");}catch(e){}w.remove();};
  w.querySelector("#a2Ok").onclick=close;w.addEventListener("click",e=>{if(e.target===w)close();});
  const ib=w.querySelector("#a2Install");if(ib)ib.onclick=async()=>{try{installEvt.prompt();await installEvt.userChoice;}catch(e){}close();};
}

/* ---------- new version available: a small banner with "Opdater" ---------- */
let verShown=false;
async function checkVersion(){
  if(verShown||!window.__appVersion)return;
  try{const r=await fetch("version.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)return;const j=await r.json();
    if(j&&j.v&&String(j.v)!==String(window.__appVersion))showUpdate();}catch(e){}
}
function showUpdate(){if(verShown)return;verShown=true;
  const st=document.createElement("style");st.textContent=`#mdUpd{position:fixed;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:2147482000;display:flex;align-items:center;gap:12px;
    background:var(--ink,#221d33);color:var(--bg,#fff);border-radius:16px;padding:12px 12px 12px 16px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:520px;margin:0 auto}
    #mdUpd span{flex:1;font-weight:600;line-height:1.3}#mdUpd button{font:inherit;font-weight:800;border:0;border-radius:999px;padding:9px 16px;cursor:pointer;background:var(--bg,#fff);color:var(--ink,#221d33)}
    #mdUpd .x{background:transparent;color:inherit;opacity:.7;padding:6px 8px;font-size:18px}`;document.head.appendChild(st);
  const b=document.createElement("div");b.id="mdUpd";b.setAttribute("role","status");
  b.innerHTML='<span>Der er en ny version af Madro</span><button type="button" id="mdUpdGo">Opdater</button><button type="button" class="x" aria-label="Senere">×</button>';
  document.body.appendChild(b);
  b.querySelector("#mdUpdGo").onclick=()=>{const u=location.pathname+"?u="+Date.now()+location.hash;location.replace(u);};
  b.querySelector(".x").onclick=()=>{b.remove();verShown=false;setTimeout(checkVersion,30*60000);};
}
setTimeout(checkVersion,8000);setInterval(checkVersion,5*60000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")checkVersion();});

/* ---------- boot ---------- */
function boot(){
  mountUI();
  if(!configOK||!auth){screenSetup();return;}
  if(auth.isSignInWithEmailLink(location.href)){
    let m="";try{m=localStorage.getItem("mp_loginMail")||"";}catch(e){}
    if(m)finishLink(m);else screenLinkMail();
  }
  auth.onAuthStateChanged(async u=>{
    S.user=u;
    if(!u){if(!auth.isSignInWithEmailLink(location.href)){let m="";try{m=localStorage.getItem("mp_loginMail")||"";}catch(e){}screenLogin(m);}return;}
    show(head("Madro","Et øjeblik…",""));
    const go=async()=>{
      let fid=null;try{const d=await fs.doc("users/"+u.uid).get();fid=d.exists?d.data().familyId:null;}catch(e){}
      if(fid&&await enterFamily(fid).catch(()=>false))return;
      screenNoFamily(await findInvite());
    };
    let via=false;try{via=sessionStorage.getItem("mp_viaLink")==="1";}catch(e){}
    if(via)screenPassword(go);else go();
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
