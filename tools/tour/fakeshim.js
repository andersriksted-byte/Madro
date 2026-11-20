/* Demo-data til optagelse af starttutorialens klip. Ikke en del af appen. */
(function(){
window.__webApp=true;window.__communityOn=true;window.__family={id:"demo",name:"Familien Holm",anonymous:false};
try{localStorage.setItem("mp_tips","off");localStorage.setItem("mp_tour","1");localStorage.setItem("mp_seenVer","9999999999");localStorage.setItem("mp_a2hs","1");}catch(e){}
const now=Date.now();
function mon(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
function iso(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const n=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-n);const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return t.getUTCFullYear()+"-W"+String(Math.ceil(((t-y)/864e5+1)/7)).padStart(2,"0");}
const I=(amount,unit,name)=>({group:"",amount,unit,name,note:""});
const R={
 r1:{title:"Lasagne med oksekød",time:"1 t 15 min",servings:4,description:"Klassisk lasagne med kødsauce, bechamel og masser af ost.",meals:["Aftensmad"],tags:["Oksekød"],ingredients:[I(500,"g","hakket oksekød"),I(1,"","løg"),I(2,"fed","hvidløg"),I(1,"ds","hakkede tomater"),I(12,"","lasagneplader"),I(50,"g","smør"),I(5,"dl","mælk"),I(100,"g","revet ost")],steps:["Brun kødet med løg og hvidløg.","Tilsæt tomater og lad det simre.","Lav bechamel af smør, mel og mælk.","Lag kødsauce, plader og bechamel.","Drys med ost, og bag i 40 min ved 200°."],kids:{c1:true,c2:true,k3:true,k4:true}},
 r2:{title:"Kylling i karry",time:"30 min",servings:4,description:"Mild og cremet karryret med kylling, æble og ris.",meals:["Aftensmad"],tags:["Kylling"],ingredients:[I(600,"g","kyllingebryst"),I(1,"","løg"),I(1,"","æble"),I(2,"spsk","karry"),I(2,"dl","madlavningsfløde"),I(300,"g","ris"),I(1,"","broccoli")],steps:["Steg kyllingen gylden.","Tilsæt løg, æble og karry.","Hæld fløde ved, og lad det simre.","Server med ris og broccoli."],kids:{c1:true,c2:true,k3:true},shared:false},
 r3:{title:"Tacos med oksekød",time:"25 min",servings:4,description:"Fredagshygge med sprøde skaller og masser af fyld.",meals:["Aftensmad"],tags:["Oksekød"],ingredients:[I(400,"g","hakket oksekød"),I(1,"pk","tacoskaller"),I(1,"","agurk"),I(2,"","tomater"),I(1,"","avocado"),I(2,"dl","creme fraiche")],steps:["Brun kødet med krydderi.","Snit grøntsagerne.","Fyld skallerne."],kids:{c1:true,c2:true,k3:true,k4:true}},
 r4:{title:"Laks i ovn med kartofler",time:"35 min",servings:4,description:"Ovnbagt laks med citron og dild.",meals:["Aftensmad"],tags:["Fisk"],ingredients:[I(600,"g","laksefilet"),I(1,"kg","kartofler"),I(1,"","citron"),I(1,"bdt","dild")],steps:["Bag kartoflerne.","Læg laksen på, og bag 15 min."],kids:{c1:true,c2:true,k3:false}},
 r5:{title:"Pasta med pesto og broccoli",time:"20 min",servings:4,description:"Hurtig hverdagspasta.",meals:["Aftensmad"],tags:["Vegetar"],ingredients:[I(400,"g","pasta"),I(1,"","broccoli"),I(1,"glas","pesto"),I(50,"g","parmesan")],steps:["Kog pasta og broccoli.","Vend med pesto."],kids:{c1:true,k4:true}},
 r6:{title:"Frikadeller med kartofler",time:"45 min",servings:4,description:"Mormors frikadeller med brun sovs.",meals:["Aftensmad"],tags:["Svinekød"],ingredients:[I(500,"g","hakket svine- og kalvekød"),I(1,"","løg"),I(1,"","æg"),I(1,"kg","kartofler")],steps:["Rør farsen.","Steg frikadellerne."],kids:{c1:true,c2:true,k3:true,k4:true}},
 r7:{title:"Grøntsagssuppe",time:"40 min",servings:4,description:"Varmende suppe med rodfrugter.",meals:["Aftensmad"],tags:["Vegetar"],ingredients:[I(4,"","gulerødder"),I(1,"","porre"),I(500,"g","kartofler")],steps:["Snit og kog."],kids:{c1:true,c2:false}},
 r8:{title:"Pandekager",time:"30 min",servings:4,description:"Tynde pandekager med syltetøj.",meals:["Dessert"],tags:[],ingredients:[I(3,"","æg"),I(5,"dl","mælk"),I(2,"dl","hvedemel")],steps:["Pisk dejen.","Bag pandekagerne."],kids:{c1:true,c2:true,k3:true,k4:true}}
};
const recipes={};Object.entries(R).forEach(([id,r],i)=>recipes[id]=Object.assign({servings:4,themes:[],rating:0,image:"",source:"",createdAt:now-i*864e5,author:"Familien Holm"},r));
const wk=mon(new Date()),key=iso(wk);
const data={recipes,imports:{},discover:{},archive:{},
 plans:{[key]:{entries:[{id:"e1",day:0,recipeId:"r6",servings:4},{id:"e2",day:2,recipeId:"r4",servings:4},{id:"e3",day:4,recipeId:"r3",servings:4}]}},
 lists:{shopping:{items:[]}},
 meta:{settings:{kids:[{id:"c1",name:"Mor"},{id:"c2",name:"Far"},{id:"k3",name:"Emma"},{id:"k4",name:"Oskar"}],stores:["Netto","Rema 1000","Meny"],primary:"Rema 1000",maxStores:2,customStores:[],schedule:{offers:"daily",recipes:"manual"}}}};
window.__demoData=data;
const subs={};
function snap(c){return {docs:Object.entries(data[c]||{}).map(([id,v])=>({id,data:()=>JSON.parse(JSON.stringify(v))}))};}
function emit(c){(subs[c]||[]).forEach(cb=>setTimeout(()=>cb(snap(c)),0));}
const db={collection:c=>({doc:id=>({set:async v=>{data[c]=data[c]||{};data[c][id]=JSON.parse(JSON.stringify(v));emit(c);},delete:async()=>{if(data[c])delete data[c][id];emit(c);},get:async()=>({exists:!!(data[c]&&data[c][id]),data:()=>data[c][id]})}),
  onSnapshot:(cb)=>{(subs[c]=subs[c]||[]).push(cb);setTimeout(()=>cb(snap(c)),0);return ()=>{};}})};
window.claude={use:async n=>n==="db"?db:null};
const C=[["Shakshuka","25 min","Æg pocheret i krydret tomatsauce.","Familien Berg"],["Græsk salat","15 min","Sprød salat med feta og oliven.","Familien Lund"],["Thai kyllingesuppe","35 min","Kokos, citrongræs og lime.","Familien Dahl"],["Kartoffelsuppe med bacon","40 min","Cremet og mættende.","Familien Berg"],["Chili sin carne","45 min","Bønner, majs og røget paprika.","Familien Lund"]];
window.__communityList=C.map((c,i)=>({libId:"L"+i,title:c[0],time:c[1],description:c[2],author:c[3],sharedBy:c[3],servings:4,ingredients:[I(1,"","løg"),I(2,"","tomater")],steps:["Lav retten."],kids:{},meals:["Aftensmad"],tags:[],themes:[],image:"",createdAt:now-i*1e7}));
})();
