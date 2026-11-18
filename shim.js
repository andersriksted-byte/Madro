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
.au-hr{height:1px;background:var(--line,#e3dfeb);margin:6px 0}
#famCard .fm-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid var(--line)}
#famCard .fm-row small{display:block;color:var(--muted);font-size:12px}
#famCard .fm-tag{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
#famCard form{display:flex;flex-direction:column;gap:8px}
#famCard input,#famCard select{font:inherit;font-size:16px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
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
    '<p>Første gang, inviteret eller glemt koden?</p><button class="au-btn plain" type="button" id="auSendLink">Send mig et login-link på mail</button>',
  box=>{
    box.querySelector("#auLogin").onsubmit=async e=>{e.preventDefault();const m=low(box.querySelector("#auMail").value),p=box.querySelector("#auPw").value;
      if(!m||!p){msg(box,"Skriv mail og adgangskode.");return;}msg(box,"Logger ind…",true);
      try{await auth.signInWithEmailAndPassword(m,p);}catch(err){msg(box,errText(err));}};
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
      try{await auth.currentUser.updatePassword(p);try{sessionStorage.removeItem("mp_viaLink");}catch(e){}next();}catch(err){msg(box,errText(err));}};
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
    '<button class="au-btn" type="button" id="auCreate">Opret familie</button><div class="au-msg"></div><p style="font-size:13px">Er du blevet inviteret? Så skal du logge ind med præcis den mail, invitationen blev sendt til.</p><button class="au-link" type="button" id="auOut">Log ud</button>',
  box=>{box.querySelector("#auCreate").onclick=async()=>{const fn=box.querySelector("#auFam").value.trim(),nm=box.querySelector("#auName").value.trim();
      if(!fn||!nm){msg(box,"Skriv både familiens og dit navn.");return;}msg(box,"Opretter…",true);
      try{await createFamily(fn,nm);}catch(err){msg(box,errText(err));}};
    box.querySelector("#auOut").onclick=()=>auth.signOut();});
}

/* ---------- family data ---------- */
async function createFamily(famName,myName){
  const uid=S.user.uid,fid="f"+rid(),pid="p"+rid();
  await fs.doc("families/"+fid).set({name:famName,createdAt:Date.now(),createdBy:uid,members:{[uid]:{name:myName,email:low(S.user.email),role:"admin",personId:pid,joinedAt:Date.now()}}});
  await fs.doc("families/"+fid+"/meta/settings").set({kids:[{id:pid,name:myName}],stores:["Netto","Rema 1000"],primary:"Netto",maxStores:2},{merge:true});
  await fs.doc("users/"+uid).set({familyId:fid});
  await enterFamily(fid);
}
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
  const syncInv=()=>{S.invites=Object.values(S.family.invites||{}).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));};syncInv();
  S.famUnsub=fs.doc("families/"+fid).onSnapshot(d=>{if(!d.exists)return;S.family=d.data();syncInv();S.me=S.family.members[S.user.uid]||S.me;if(S.me)window.__mePerson=S.me.personId;drawFamCard();},()=>{});
  window.__onSettings=()=>drawFamCard();
  hide();ready();
  watchImports();mountFamCard();
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
    mem.map(([uid,m])=>'<div class="fm-row"><div><b>'+esc(m.name)+(uid===S.user.uid?' (dig)':'')+'</b><small>'+esc(m.email)+(pName(m.personId)&&pName(m.personId)!==m.name?' · vurderer som '+esc(pName(m.personId)):'')+'</small></div><span class="fm-tag">'+(m.role==="admin"?"Administrator":"Medlem")+'</span></div>').join("")+
    S.invites.map(i=>'<div class="fm-row"><div><b>'+esc(i.name||i.email)+'</b><small>'+esc(i.email)+' · inviteret, ikke logget ind endnu</small></div>'+(isAdmin()?'<button type="button" class="linkbtn" data-uninv="'+esc(i.email)+'">Træk tilbage</button>':'')+'</div>').join("")+
    (isAdmin()?'<form id="invForm"><b style="margin-top:6px">Invitér til familien</b><input type="email" id="invMail" placeholder="Mail" autocomplete="off" inputmode="email">'+
      '<select id="invPerson"><option value="">Ny person i familien</option>'+free.map(p=>'<option value="'+esc(p.id)+'">Er '+esc(p.name)+' (overtager '+esc(p.name)+'s 👍)</option>').join("")+'</select>'+
      '<input id="invName" placeholder="Navn (fx Bettina)"><button class="btn small" type="submit" style="align-self:flex-start">Send invitation</button><div class="fm-msg" id="invMsg">'+esc(S.invMsg||"")+'</div></form>':'')+
    '<div class="fm-row"><div><b>Dig i tommel-vurderingen</b><small>Bruges som standard i Opskrift Tinder</small></div><select id="mePerson">'+ps.map(p=>'<option value="'+esc(p.id)+'"'+(S.me&&S.me.personId===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join("")+'</select></div>'+
    (isAdmin()?'<div class="fm-row"><div><b>Læs data ind fra Claude-appen</b><small>Vælg filen fra "Eksportér alle data"</small></div><label class="btn ghost small" style="cursor:pointer"><input type="file" accept="application/json,.json" id="impFile" hidden>Vælg fil</label></div><div class="fm-msg" id="impMsg">'+esc(S.impMsg||"")+'</div>':'')+
    '<button type="button" class="btn plain small" id="logOut" style="align-self:flex-start">Log ud ('+esc(S.user.email)+')</button>';
  const sel=c.querySelector("#invPerson"),nm=c.querySelector("#invName");
  if(sel)sel.onchange=()=>{const p=ps.find(x=>x.id===sel.value);nm.hidden=!!p;if(p)nm.value=p.name;else nm.value="";};
  const f=c.querySelector("#invForm");if(f)f.onsubmit=async e=>{e.preventDefault();await sendInvite(low(c.querySelector("#invMail").value),sel.value,nm.value.trim());};
  c.querySelectorAll("[data-uninv]").forEach(b=>b.onclick=async()=>{const em=b.dataset.uninv;try{await fs.doc("families/"+S.fid).update({["invites."+ikey(em)]:firebase.firestore.FieldValue.delete()});await fs.doc("invites/"+em).delete();}catch(err){alert(errText(err));}});
  const mp=c.querySelector("#mePerson");if(mp)mp.onchange=async()=>{try{await fs.doc("families/"+S.fid).update({["members."+S.user.uid+".personId"]:mp.value});try{localStorage.removeItem("mp_who");}catch(e){}}catch(err){alert(errText(err));}};
  const fi=c.querySelector("#impFile");if(fi)fi.onchange=()=>{if(fi.files[0])importFile(fi.files[0]);fi.value="";};
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
  const jobs=[];for(const c of cols){for(const [id,doc] of Object.entries(data.collections[c]||{})){if(c==="meta"&&id==="offers")continue;jobs.push([c,id,doc]);}}
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
  impUnsub=famCol("imports").onSnapshot(s=>{s.docs.forEach(d=>{const v=d.data();if(v.status==="venter")pullInbox(d.id);});},()=>{});
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
    const nid="imp"+rid();await famCol("recipes").doc(nid).set(Object.assign({createdAt:Date.now()},r));await ref.delete();tried[id]="done";
  }catch(e){}
}
async function toDataURL(u){try{const r=await fetch(u);if(!r.ok)return "";const b=await r.blob();
  const bmp=await createImageBitmap(b);const sc=Math.min(1,720/Math.max(bmp.width,bmp.height));const cv=document.createElement("canvas");cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);
  cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);return cv.toDataURL("image/jpeg",0.72);}catch(e){return "";}}

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
