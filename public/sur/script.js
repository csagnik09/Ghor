const $=s=>document.querySelector(s);
const audio=new Audio();audio.preload="metadata";
let tracks=[],byId=new Map(),view="all",albumKey=null,cur=null,shuffle=false,repeat=0,filter="",shown=[];
let status="loading",libVersion=null; // loading | ready | error
let playlists=[],plId=null,likes=new Set();
try{playlists=JSON.parse(localStorage.getItem("sur.playlists")||"[]")}catch(e){playlists=[]}
try{likes=new Set(JSON.parse(localStorage.getItem("sur.liked")||"[]"))}catch(e){likes=new Set()}
const save=()=>{try{localStorage.setItem("sur.playlists",JSON.stringify(playlists))}catch(e){}};
const saveLikes=()=>{try{localStorage.setItem("sur.liked",JSON.stringify([...likes]))}catch(e){}};
const curPl=()=>playlists.find(p=>p.id===plId);
let tt;const toast=(m,ms=1800)=>{const e=$("#toast");e.textContent=m;e.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>e.classList.remove("on"),ms)};
function ask(title,val,confirm){return new Promise(res=>{
  const i=$("#di");$("#dt").textContent=title;$("#dok").textContent=confirm?"Delete":"Save";i.style.display=confirm?"none":"";i.value=val||"";$("#dlg").classList.add("on");
  if(!confirm)setTimeout(()=>{i.focus();i.select()},30);
  const done=v=>{$("#dlg").classList.remove("on");$("#dok").onclick=$("#dc").onclick=i.onkeydown=null;res(v)};
  $("#dok").onclick=()=>done(confirm?true:(i.value.trim()||null));$("#dc").onclick=()=>done(null);
  i.onkeydown=e=>{if(e.key==="Enter")$("#dok").click();if(e.key==="Escape")done(null)};
})}
const newPl=name=>{const p={id:Date.now()+Math.random().toString(36).slice(2,6),name,items:[]};playlists.push(p);save();return p};
function toggleIn(p,t){const i=p.items.indexOf(t.id);
  if(i<0){p.items.push(t.id);toast("Added to "+p.name)}else{p.items.splice(i,1);toast("Removed from "+p.name)}save();render()}
function closeMenu(){$("#menu").style.display="none"}
function openMenu(t,el){
  const m=$("#menu"),r=el.getBoundingClientRect();m.innerHTML="";
  playlists.forEach(p=>{const b=document.createElement("button");b.textContent=(p.items.includes(t.id)?"✓ ":"")+p.name;b.onclick=()=>{closeMenu();toggleIn(p,t)};m.append(b)});
  const n=document.createElement("button");n.className="new";n.textContent="+ New playlist";
  n.onclick=async()=>{closeMenu();const nm=await ask("New playlist","");if(nm)toggleIn(newPl(nm),t)};m.append(n);
  m.style.display="block";
  m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+"px";
  let y=r.bottom+4;if(y+m.offsetHeight>innerHeight-8)y=Math.max(8,r.top-m.offsetHeight-4);m.style.top=y+"px";
}
function renderPls(){
  const box=$("#pls");box.innerHTML="";
  playlists.forEach(p=>{const b=document.createElement("button");b.className="nav"+(view==="playlist"&&plId===p.id?" on":"");
    const i=document.createElement("span");i.className="pi";i.textContent="♫";
    const n=document.createElement("span");n.className="pn";n.textContent=p.name;b.append(i,n);
    b.onclick=()=>{view="playlist";plId=p.id;$("#list").scrollTop=0;render()};box.append(b)});
}
const P='<path d="M8 5v14l11-7z"/>',PA='<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
const fmtTotal=sec=>{if(sec<60)return"<1 min";const m=Math.round(sec/60),h=Math.floor(m/60),r=m%60;return h?h+" hr"+(r?" "+r+" min":""):m+" min"};
const fmt=s=>{if(!isFinite(s))return"–:––";s=Math.floor(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
const grad=s=>{const h=hue(s);return`linear-gradient(135deg,hsl(${h} 60% 45%),hsl(${(h+50)%360} 60% 28%))`};
const akey=t=>t.ak||(t.ak=t.album.toLowerCase());
const artOf=t=>(t&&t.art)||null;
const bg=t=>{const a=artOf(t);return a?`url('${a}') center/cover no-repeat`:grad(t.album+t.title)};

/* ---------- library (streamed from the server's music folder) ---------- */
const colA=new Intl.Collator(),colT=new Intl.Collator(undefined,{numeric:true});
const resort=()=>tracks.sort((a,b)=>colA.compare(a.album,b.album)||(a.trk??999)-(b.trk??999)||colT.compare(a.title,b.title));
async function loadLibrary(first){
  try{
    const r=await fetch("api/library",{cache:"no-cache"});
    if(!r.ok)throw new Error(r.status);
    const lib=await r.json();
    status="ready";
    if(lib.version===libVersion)return;
    libVersion=lib.version;
    const old=byId;
    tracks=lib.tracks.map(s=>{const o=old.get(s.id);
      return{id:s.id,url:"media/"+s.id,title:s.title,artist:s.artist,album:s.album,trk:s.trk,art:s.art,
        dur:s.dur==null?(o&&isFinite(o.dur)?o.dur:NaN):s.dur,ak:null,hay:null}});
    byId=new Map(tracks.map(t=>[t.id,t]));
    if(cur)cur=byId.get(cur.id)||cur; // keep the playing song if the list refreshes
    resort();render();
    if(!first)toast("Library updated");
  }catch(e){
    if(first||!tracks.length){status="error";render()}
  }
}
function visible(){
  let base;
  if(view==="playlist"){const p=curPl();base=p?p.items.map(k=>byId.get(k)).filter(Boolean):[]}
  else base=tracks.filter(t=>view==="liked"?likes.has(t.id):view==="album"?akey(t)===albumKey:true);
  if(!filter)return base;
  return base.filter(t=>(t.hay||(t.hay=(t.title+" "+t.artist+" "+t.album).toLowerCase())).includes(filter));
}
function groups(v){
  const m=new Map();
  v.forEach(t=>{const k=akey(t);if(!m.has(k))m.set(k,{key:k,name:t.album,tracks:[]});m.get(k).tracks.push(t)});
  return[...m.values()].map(g=>{
    const ar=[...new Set(g.tracks.map(t=>t.artist))];
    return{...g,artist:ar.length>1?"Various artists":ar[0],art:g.tracks.find(artOf)||g.tracks[0]};
  });
}

/* ---------- render ---------- */
const RH=60,BUF=6;
let vList=[],vTick=0,gShown=0,lastView="";
function rowHTML(t,i){
  const c=cur===t;
  return`<div class="row ${c?"cur":""} ${c&&!audio.paused?"playing":""}" data-id="${t.id}">
    <span class="n"><span class="num">${view==="album"&&t.trk?t.trk:i+1}</span><span class="bars"><i></i><i></i><i></i></span></span>
    <span class="t"><span class="art">${artOf(t)?"":"♪"}</span><div><b></b><span></span></div></span>
    <button class="addpl" data-m="${t.id}" aria-label="Add to playlist" title="Add to playlist">＋</button><button class="heart ${likes.has(t.id)?"on":""}" data-h="${t.id}" aria-label="Like"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.200-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.800-8 11-8 11z"/></svg></button>
    <span class="d">${fmt(t.dur)}</span></div>`;
}
function paintRows(force){
  const L=$("#list"),box=$("#vrows");if(!box)return;
  const v=vList,n=v.length;
  const top=box.getBoundingClientRect().top-L.getBoundingClientRect().top+L.scrollTop;
  let s=Math.floor((L.scrollTop-top)/RH)-BUF;s=Math.max(0,Math.min(s,Math.max(0,n-1)));
  const e=Math.min(n,s+Math.ceil(L.clientHeight/RH)+BUF*2);
  if(!force&&box.dataset.s==s&&box.dataset.e==e)return;
  box.dataset.s=s;box.dataset.e=e;
  box.style.paddingTop=s*RH+"px";box.style.paddingBottom=(n-e)*RH+"px";
  box.innerHTML=v.slice(s,e).map((t,k)=>rowHTML(t,s+k)).join("");
  [...box.children].forEach((r,k)=>{const t=v[s+k];r.querySelector("b").textContent=t.title;r.querySelector(".art").style.background=bg(t);r.querySelector(".t span:last-child").textContent=t.artist+(view==="album"?"":" · "+t.album)});
}
function appendCards(n){
  const grid=$("#list .grid");if(!grid||view!=="albums")return;
  const from=gShown,to=Math.min(shown.length,from+n);if(from>=to)return;
  grid.insertAdjacentHTML("beforeend",shown.slice(from,to).map((g,k)=>`<div class="card" data-a="${from+k}"><div class="art">${artOf(g.art)?"":"♪"}</div><b></b><span></span></div>`).join(""));
  const cards=grid.children;
  for(let i=from;i<to;i++){const c=cards[i],g=shown[i];c.querySelector("b").textContent=g.name;c.querySelector(".art").style.background=bg(g.art);c.querySelector("span").textContent=g.artist+" · "+g.tracks.length+" songs"}
  gShown=to;
}
function emptyMsg(h,msg,retry){
  $("#list").innerHTML=`<div id="empty"><h2></h2><p></p>${retry?'<button class="pill" id="retry">Try again</button>':""}</div>`;
  $("#empty h2").textContent=h;$("#empty p").textContent=msg;
  if(retry)$("#retry").onclick=()=>{status="loading";render();loadLibrary(true)};
}
function render(){
  const v=visible(),L=$("#list"),pv=lastView;
  if(view==="album"&&!tracks.some(t=>akey(t)===albumKey))view="albums";
  if(view==="playlist"&&!curPl())view="all";
  $("#plact").style.display=view==="playlist"?"flex":"none";
  bigIcon();
  $("#actions").style.display=(view==="albums"||view==="playlists")?"none":"";
  lastView=view;
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("on",b.dataset.v===view||(view==="album"&&b.dataset.v==="albums")||(view==="playlist"&&b.dataset.v==="playlists")));
  renderPls();
  const at=view==="album"?tracks.find(t=>akey(t)===albumKey):view==="playlist"?(v.find(artOf)||v[0]||null):null;
  $("#cover").style.display=at?"":"none";$("#cover").style.background=at?bg(at):"";$("#cover").textContent=at&&artOf(at)?"":"♪";
  document.documentElement.style.setProperty("--hue",(cur||at)?`hsl(${hue((cur||at).album)} 45% 24%)`:"#2a2550");
  $("#hero small").textContent=view==="album"?"Album":(view==="albums"||view==="playlists")?"Collection":view==="playlist"?"Playlist":"Library";
  $("#ttl").textContent=view==="playlists"?"Playlists":view==="playlist"?curPl().name:view==="album"?at.album:view==="albums"?"Albums":view==="liked"?"Liked Songs":"Your Library";
  const tot=v.reduce((s,t)=>s+(t.dur||0),0);
  $("#sub").textContent=(view==="albums"?groups(v).length+" albums · ":"")+v.length+" song"+(v.length==1?"":"s")+(tot?" · "+fmtTotal(tot):"");
  if(view==="playlists")$("#sub").textContent=playlists.length+" playlist"+(playlists.length==1?"":"s");
  if(view==="playlist"){const p=curPl(),miss=p.items.filter(k=>!byId.has(k)).length;if(miss)$("#sub").textContent+=" · "+miss+" no longer available"}
  if(status==="loading"&&!tracks.length)$("#sub").textContent="Loading…";
  if(cur){$("#nt").textContent=cur.title;$("#na").textContent=cur.artist+" · "+cur.album;
    const a=$("#nart");a.style.background=bg(cur);a.textContent=artOf(cur)?"":"♪"}
  if(view==="playlists"){
    shown=playlists.map(p=>{const ts=p.items.map(k=>byId.get(k)).filter(Boolean);return{p,art:ts.find(artOf)||ts[0]||null}});
    L.innerHTML=`<div class="grid"><div class="card" data-p="new"><div class="art" style="background:var(--hover);color:var(--muted)">＋</div><b>New playlist</b><span>Create one</span></div>`+shown.map((g,i)=>`<div class="card" data-p="${i}"><div class="art">${g.art&&artOf(g.art)?"":"♫"}</div><b></b><span></span></div>`).join("")+`</div>`;
    L.querySelectorAll(".card[data-p]").forEach(c=>{if(c.dataset.p==="new")return;const g=shown[+c.dataset.p];
      c.querySelector("b").textContent=g.p.name;c.querySelector("span").textContent=g.p.items.length+" songs";
      c.querySelector(".art").style.background=g.art?bg(g.art):grad(g.p.name)});
    return;
  }
  if(!tracks.length){
    if(status==="loading")emptyMsg("Loading your music…","");
    else if(status==="error")emptyMsg("Can't reach the music server","Check your connection and try again.",true);
    else emptyMsg("No music yet","The library is empty. Songs appear here automatically once they are added to the server's music folder.");
    return;
  }
  if(!v.length&&view==="playlist"){
    const p=curPl();emptyMsg(p.items.length?"Songs unavailable":"This playlist is empty",p.items.length?"The songs in this playlist are no longer in the library.":"Click the ＋ next to any song to add it here.");return}
  if(!v.length){
    emptyMsg("Nothing here",view==="liked"?"Tap the heart on a song to keep it here.":"No songs match this view.");return;
  }
  if(view==="albums"){
    shown=groups(v);
    const first=Math.max(48,pv==="albums"?gShown:0);
    L.innerHTML=`<div class="grid"></div>`;gShown=0;
    appendCards(first);
    return;
  }
  const st=L.scrollTop;
  L.innerHTML=`<div class="row head"><span class="n">#</span><span>Title</span><span></span><span></span><span class="d">Time</span></div><div id="vrows" style="height:${v.length*RH}px"></div>`;
  L.scrollTop=st;vList=v;paintRows(true);
}

/* ---------- playback ---------- */
function playT(t){
  cur=t;audio.src=t.url;audio.play().catch(()=>{});
  document.title=t.title+" · "+t.artist;
  if("mediaSession"in navigator){const a=artOf(t);navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album,artwork:a?[{src:a}]:[]})}
  render();
}
function step(d,auto){
  const v=visible();if(!v.length)return;
  const c=v.indexOf(cur);let n;
  if(shuffle&&v.length>1){do{n=Math.floor(Math.random()*v.length)}while(n===c)}
  else{n=c+d;if(n>=v.length){if(repeat===2||!auto)n=0;else{audio.pause();audio.currentTime=0;return}}if(n<0)n=v.length-1}
  playT(v[n]);
}
function toggle(){
  if(!cur){const v=visible();if(v.length)playT(shuffle?v[Math.floor(Math.random()*v.length)]:v[0]);return}
  audio.paused?audio.play():audio.pause();
}
function bigIcon(){
  const on=!audio.paused&&!!cur&&visible().includes(cur);
  $("#big").innerHTML=`<svg viewBox="0 0 24 24">${on?PA:P}</svg>`;
}
function ui(){
  const p=audio.paused;document.body.classList.toggle("playing",!p);
  $("#play").innerHTML=`<svg viewBox="0 0 24 24">${p?P:PA}</svg>`;
  bigIcon();
  const r=$("#list .row.cur");if(r)r.classList.toggle("playing",!p);
}
const setP=el=>el.style.setProperty("--p",(el.value-el.min)/(el.max-el.min)*100+"%");
audio.onplay=audio.onpause=ui;
audio.onended=()=>{repeat===1?(audio.currentTime=0,audio.play()):step(1,true)};
let seeking=false;const sk=$("#seek");
audio.ontimeupdate=()=>{if(seeking)return;sk.value=audio.duration?audio.currentTime/audio.duration*1000:0;setP(sk);$("#cur").textContent=fmt(audio.currentTime)};
audio.onloadedmetadata=()=>{
  $("#dur").textContent=fmt(audio.duration);
  // some formats (ogg, opus) carry no duration in their tags; learn it when the song is first played
  if(cur&&!isFinite(cur.dur)&&isFinite(audio.duration)){cur.dur=audio.duration;if(vList.length)paintRows(true)}
};
audio.onerror=()=>{if(cur)$("#na").textContent="Can't play this file format"};
sk.oninput=()=>{seeking=true;setP(sk);$("#cur").textContent=fmt(sk.value/1000*audio.duration)};
sk.onchange=()=>{if(audio.duration)audio.currentTime=sk.value/1000*audio.duration;seeking=false};
const vr=$("#vr");audio.volume=.8;setP(vr);
vr.oninput=()=>{audio.volume=vr.value/100;audio.muted=false;setP(vr)};
$("#mute").onclick=()=>{audio.muted=!audio.muted;vr.value=audio.muted?0:audio.volume*100;setP(vr)};
$("#play").onclick=toggle;
$("#big").onclick=()=>{const v=visible();if(cur&&v.length&&!v.includes(cur))playT(shuffle?v[Math.floor(Math.random()*v.length)]:v[0]);else toggle()};
$("#next").onclick=()=>step(1,false);
$("#prev").onclick=()=>{if(audio.currentTime>3)audio.currentTime=0;else step(-1,false)};
const setShuf=()=>["#shuf","#shuf2"].forEach(s=>$(s).classList.toggle("on",shuffle));
$("#shuf").onclick=$("#shuf2").onclick=()=>{shuffle=!shuffle;setShuf()};
$("#rep").onclick=()=>{repeat=(repeat+1)%3;const b=$("#rep");b.classList.toggle("on",repeat>0);b.classList.toggle("rep1",repeat===1)};

/* ---------- UI wiring ---------- */
$("#list").onclick=e=>{
  const pc=e.target.closest("[data-p]");
  if(pc){
    if(pc.dataset.p==="new")ask("New playlist","").then(n=>{if(n){const p=newPl(n);view="playlist";plId=p.id;render()}});
    else{plId=shown[+pc.dataset.p].p.id;view="playlist";$("#list").scrollTop=0;render()}
    return;
  }
  const c=e.target.closest(".card");
  if(c){albumKey=shown[+c.dataset.a].key;view="album";$("#list").scrollTop=0;render();return}
  const mb=e.target.closest("[data-m]");
  if(mb){openMenu(byId.get(mb.dataset.m),mb);return}
  const h=e.target.closest("[data-h]");
  if(h){const id=h.dataset.h;likes.has(id)?likes.delete(id):likes.add(id);saveLikes();render();e.stopPropagation();return}
  const r=e.target.closest(".row[data-id]");if(!r)return;
  const t=byId.get(r.dataset.id);
  cur===t?toggle():playT(t);
};
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{view=b.dataset.v;$("#list").scrollTop=0;render()});
document.addEventListener("click",e=>{if(!e.target.closest("#menu,.addpl"))closeMenu()});
$("#list").addEventListener("scroll",()=>{
  closeMenu();const L=$("#list");
  if(view==="albums"){if(gShown<shown.length&&L.scrollTop+L.clientHeight>L.scrollHeight-700)appendCards(48)}
  else if(vList.length&&!vTick)vTick=requestAnimationFrame(()=>{vTick=0;paintRows(false)});
});
addEventListener("resize",()=>{if(vList.length)paintRows(false)});
$("#newPl").onclick=async()=>{const n=await ask("New playlist","");if(n){const p=newPl(n);view="playlist";plId=p.id;render()}};
$("#plren").onclick=async()=>{const p=curPl(),n=await ask("Rename playlist",p.name);if(n){p.name=n;save();render()}};
$("#pldel").onclick=async()=>{const p=curPl();if(await ask("Delete “"+p.name+"”?","",true)){playlists=playlists.filter(x=>x!==p);save();view="all";render()}};
$("#now").onclick=()=>{if(cur&&matchMedia("(max-width:820px)").matches)$("#bar").classList.add("full")};
$("#npc").onclick=()=>$("#bar").classList.remove("full");
$("#q").oninput=e=>{filter=e.target.value.toLowerCase();render()};

// listeners only: a file dropped on the page must never navigate away from the player
addEventListener("dragover",e=>e.preventDefault());
addEventListener("drop",e=>e.preventDefault());
addEventListener("keydown",e=>{
  if(e.code==="Escape"&&$("#set").classList.contains("on")){closeSettings();return}
  if($("#set").classList.contains("on"))return;
  if(e.target.tagName==="INPUT"&&e.target.type!=="range")return;
  if(e.code==="Escape")$("#bar").classList.remove("full");
  if(e.code==="Space"){e.preventDefault();toggle()}
  else if(e.code==="ArrowRight"&&e.shiftKey)step(1,false);
  else if(e.code==="ArrowLeft"&&e.shiftKey)step(-1,false);
  else if(e.code==="ArrowRight")audio.currentTime+=5;
  else if(e.code==="ArrowLeft")audio.currentTime-=5;
});
if("mediaSession"in navigator){const m=navigator.mediaSession,H=(a,f)=>{try{m.setActionHandler(a,f)}catch(e){}};
  H("play",()=>audio.play());H("pause",()=>audio.pause());
  H("nexttrack",()=>step(1,false));H("previoustrack",()=>step(-1,false));
  H("seekto",d=>{if(d.seekTime!=null&&isFinite(audio.duration))audio.currentTime=d.seekTime});
  H("seekbackward",d=>{audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10))});
  H("seekforward",d=>{audio.currentTime=Math.min(audio.duration||1e9,audio.currentTime+(d.seekOffset||10))});
  const state=()=>{m.playbackState=audio.paused?"paused":"playing"};
  audio.addEventListener("play",state);audio.addEventListener("pause",state);
  let lastPos=0;
  const pos=()=>{if(!isFinite(audio.duration))return;try{m.setPositionState({duration:audio.duration,position:Math.min(audio.currentTime,audio.duration),playbackRate:audio.playbackRate||1})}catch(e){}};
  audio.addEventListener("loadedmetadata",pos);audio.addEventListener("seeked",pos);
  audio.addEventListener("timeupdate",()=>{const n=Date.now();if(n-lastPos>5000){lastPos=n;pos()}});}
// coming back to the page while a song should be playing: wake the audio engine if the system suspended it
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&actx&&actx.state!=="running"&&!audio.paused)actx.resume().catch(()=>{})});

/* ---------- settings: theme + equalizer ---------- */
const mq=matchMedia("(prefers-color-scheme:light)");
let themeMode="auto";
try{const m=localStorage.getItem("sur.theme");if(m==="light"||m==="dark")themeMode=m}catch(e){}
function applyTheme(){
  document.documentElement.dataset.theme=themeMode==="auto"?(mq.matches?"light":"dark"):themeMode;
  document.querySelectorAll("#seg button").forEach(b=>b.classList.toggle("on",b.dataset.m===themeMode));
}
function setThemeMode(m){themeMode=m;try{localStorage.setItem("sur.theme",m)}catch(e){}applyTheme()}
(mq.addEventListener?mq.addEventListener("change",()=>{if(themeMode==="auto")applyTheme()}):mq.addListener(()=>{if(themeMode==="auto")applyTheme()}));
document.querySelectorAll("#seg button").forEach(b=>b.onclick=()=>setThemeMode(b.dataset.m));

const BANDS=[32,64,125,250,500,1000,2000,4000,8000,16000];
const PRESETS={
  "Flat":[0,0,0,0,0,0,0,0,0,0],
  "Bass boost":[6,5,4,2,0,0,0,0,0,0],
  "Treble boost":[0,0,0,0,0,1,2,4,5,6],
  "Vocal":[-2,-2,-1,1,3,3,2,1,0,-1],
  "Rock":[5,4,2,-1,-2,-1,2,4,5,5],
  "Pop":[-1,1,3,4,3,0,-1,-1,1,2],
  "Classical":[0,0,0,0,0,0,-3,-3,-3,-5],
  "Electronic":[5,4,1,0,-2,2,1,2,4,5],
  "Hip hop":[5,5,2,3,-1,-1,2,0,2,3],
  "Acoustic":[4,4,3,1,2,2,3,3,2,1]
};
let eq={on:false,preset:"Flat",gains:PRESETS.Flat.slice()};
try{const r=JSON.parse(localStorage.getItem("sur.eq")||"null");
  if(r&&Array.isArray(r.gains)&&r.gains.length===10)eq={on:!!r.on,preset:r.preset||"Custom",gains:r.gains.map(n=>Math.max(-12,Math.min(12,+n||0)))}}catch(e){}
const saveEq=()=>{try{localStorage.setItem("sur.eq",JSON.stringify(eq))}catch(e){}};
/* iPhone/iPad stop any audio that goes through Web Audio the moment the screen locks, so the equalizer is switched off there. */
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
if(IOS)eq.on=false;
let actx=null,filters=[],pre=null,graphFailed=IOS;
function ensureGraph(){
  if(actx||graphFailed)return !!actx;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){graphFailed=true;return false}
  try{
    actx=new AC();
    const src=actx.createMediaElementSource(audio);
    filters=BANDS.map((f,i)=>{const n=actx.createBiquadFilter();n.type=i===0?"lowshelf":i===BANDS.length-1?"highshelf":"peaking";n.frequency.value=f;n.Q.value=1.1;n.gain.value=0;return n});
    pre=actx.createGain();
    // if the system suspends the audio engine (screen lock, call, another app) while a song is playing, wake it up again
    actx.onstatechange=()=>{if(actx.state!=="running"&&!audio.paused)actx.resume().catch(()=>{})};
    let node=src;filters.forEach(f=>{node.connect(f);node=f});node.connect(pre);pre.connect(actx.destination);
    return true;
  }catch(e){actx=null;graphFailed=true;return false}
}
function applyEq(){
  if(!actx)return;
  const g=eq.on?eq.gains:eq.gains.map(()=>0);
  filters.forEach((f,i)=>f.gain.value=g[i]);
  pre.gain.value=eq.on?Math.pow(10,-Math.max(0,...g)/20):1;
}
function eqUI(){
  $("#eqon").checked=eq.on;
  $("#eqb").classList.toggle("off",!eq.on);
  document.querySelectorAll(".eqs").forEach((r,i)=>{r.value=eq.gains[i];r.disabled=!eq.on;r.parentNode.querySelector(".g").textContent=(eq.gains[i]>0?"+":"")+eq.gains[i]});
  $("#eqpre").value=eq.preset;$("#eqpre").disabled=!eq.on;$("#eqreset").disabled=!eq.on;
  $("#eqon").disabled=graphFailed;
  $("#eqnote").textContent=IOS?"The equalizer isn't available on iPhone and iPad. iOS would stop the music whenever the screen locks.":graphFailed?"The equalizer isn't supported in this browser.":"Gains are in dB. Boosts lower the overall volume slightly to avoid distortion.";
}
function eqChanged(){saveEq();applyEq();eqUI()}
(function buildEq(){
  const pre=$("#eqpre");
  [...Object.keys(PRESETS),"Custom"].forEach(n=>{const o=document.createElement("option");o.value=o.textContent=n;pre.append(o)});
  const box=$("#eqb");
  BANDS.forEach((f,i)=>{
    const d=document.createElement("div");d.className="band";
    d.innerHTML='<span class="g">0</span><input type="range" class="eqs" min="-12" max="12" step="0.5" value="0" aria-label=""><span class="f"></span>';
    const r=d.querySelector("input");r.setAttribute("aria-label",(f>=1000?f/1000+" kHz":f+" Hz")+" gain");
    d.querySelector(".f").textContent=f>=1000?f/1000+"k":f;
    r.oninput=()=>{eq.gains[i]=+r.value;eq.preset="Custom";eqChanged()};
    box.append(d);
  });
  pre.onchange=()=>{eq.preset=pre.value;if(PRESETS[pre.value])eq.gains=PRESETS[pre.value].slice();eqChanged()};
})();
$("#eqon").onchange=e=>{
  eq.on=e.target.checked;
  if(eq.on&&!ensureGraph()){eq.on=false}
  if(actx&&actx.state==="suspended")actx.resume();
  eqChanged();
};
$("#eqreset").onclick=()=>{eq.preset="Flat";eq.gains=PRESETS.Flat.slice();eqChanged()};
audio.addEventListener("play",()=>{if(eq.on&&ensureGraph()){applyEq();if(actx.state==="suspended")actx.resume()}});

let setOpener=null;
function openSettings(){setOpener=document.activeElement;closeMenu();$("#set").classList.add("on");$("#setx").focus()}
function closeSettings(){$("#set").classList.remove("on");if(setOpener&&setOpener.focus)setOpener.focus()}
$("#setBtn").onclick=openSettings;$("#setx").onclick=closeSettings;
$("#set").addEventListener("click",e=>{if(e.target.id==="set")closeSettings()});
applyTheme();eqUI();
setP(sk);render();

/* ---------- go: load the library now, then pick up new songs automatically ---------- */
loadLibrary(true);
setInterval(()=>{if(!document.hidden)loadLibrary(false)},30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadLibrary(false)});
