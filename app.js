/* ============================================================
   Actionables v3 — clean hierarchy:
   Project → SPOC/Owner → Line Item → Description → ETA → Status
   SPOC = Owner (same concept, no separate Owner entity)
   ============================================================ */
'use strict';
var A=window.Android||null;

/* ---- STATUS CONFIG ---- */
var ST_META=[
  ['In Progress','In Progress','b-ip'],
  ['On Hold',    'On Hold',    'b-ar'],
  ['Dependency', 'Dependency', 'b-asg'],
  ['Completed',  'Completed',  'b-dn']
];
var STATUSES=ST_META.map(function(r){return r[0];});
/* legacy statuses collapse onto the new four */
var STATUS_MAP={
  'Pending':'In Progress','Pending Testing':'In Progress',
  'Awaiting Response':'Dependency','Awaiting Bank':'Dependency',
  'Awaiting Signoff':'Dependency','Awaiting Confirmation':'Dependency',
  'Scheduled':'On Hold','Cancelled':'Completed'
};
/* "AWAITS" now means blocked on a dependency */
var AWAITS=['Dependency'];
function stShort(s){for(var i=0;i<ST_META.length;i++)if(ST_META[i][0]===s)return ST_META[i][1];return s;}
function stCls(s){for(var i=0;i<ST_META.length;i++)if(ST_META[i][0]===s)return ST_META[i][2];return 'b-pn';}

var ETA_KINDS=[['none','No ETA'],['tbd','TBD \u2014 to be confirmed'],['date','Specific date'],['range','Date range']];
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

/* ---- APPEARANCE: accent palettes + font presets ---- */
var ACCENTS={
  orange: {c:'#F97316', d:'rgba(249,115,22,.15)', name:'Orange'},
  blue:   {c:'#3B82F6', d:'rgba(59,130,246,.14)',  name:'Blue'},
  violet: {c:'#8B5CF6', d:'rgba(139,92,246,.14)',  name:'Violet'},
  indigo: {c:'#6366F1', d:'rgba(99,102,241,.14)',  name:'Indigo'},
  teal:   {c:'#14B8A6', d:'rgba(20,184,166,.14)',  name:'Teal'},
  emerald:{c:'#10B981', d:'rgba(16,185,129,.14)',  name:'Emerald'},
  amber:  {c:'#F59E0B', d:'rgba(245,158,11,.14)',  name:'Amber'},
  rose:   {c:'#F43F5E', d:'rgba(244,63,94,.14)',   name:'Rose'},
  slate:  {c:'#64748B', d:'rgba(100,116,139,.14)', name:'Graphite'}
};
var FONT_STACK={
  default:  "system-ui, 'Roboto', 'Segoe UI', sans-serif",
  apple:    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Roboto, sans-serif",
  modern:   "'Segoe UI', 'sans-serif-medium', 'Inter', system-ui, sans-serif",
  pro:      "Georgia, 'Noto Serif', 'Times New Roman', serif",
  condensed:"'sans-serif-condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif",
  mono:     "'Roboto Mono', 'SF Mono', Consolas, monospace"
};
var FONTS=[['default','Default'],['apple','Apple'],['modern','Modern'],['pro','Professional'],['condensed','Condensed'],['mono','Mono']];

/* ---- UTILS ---- */
function $(s,r){return (r||document).querySelector(s);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function pad(n){return (n<10?'0':'')+n;}
function todayISO(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function isoToDate(iso){var p=iso.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function addDaysISO(iso,n){var p=iso.split('-');var d=new Date(+p[0],+p[1]-1,+p[2]+n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function diffDays(a,b){return Math.round((isoToDate(a)-isoToDate(b))/86400000);}
function fmtD(iso){if(!iso)return '';var p=iso.split('-');return (+p[2])+' '+MON[+p[1]-1];}
function fmtDY(iso){if(!iso)return '';var p=iso.split('-');return (+p[2])+' '+MON[+p[1]-1]+' '+p[0];}
function fmtTs(ts){var d=new Date(ts);return pad(d.getDate())+' '+MON[d.getMonth()]+' '+pad(d.getHours())+':'+pad(d.getMinutes());}
function toast(msg,action){
  var w=$('#toastwrap');
  var html='<div class="toast">'+esc(msg);
  if(action&&action.label)html+='<button class="toast-act">'+esc(action.label)+'</button>';
  html+='</div>';
  w.innerHTML=html;
  var t=w.firstChild;
  if(action&&action.fn){var ab=w.querySelector('.toast-act');if(ab)ab.addEventListener('click',function(){try{action.fn();}catch(e){}t.classList.remove('in');setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},200);});}
  requestAnimationFrame(function(){t.classList.add('in');});
  var dur=action?5200:2300;
  setTimeout(function(){t.classList.remove('in');setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},250);},dur);
}

/* ---- ICONS ---- */
var IC={
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>',
  spark:'<path d="M12 3l1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7z"/><path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  play:'<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  pause:'<path d="M8 5.5h3v13H8zM13 5.5h3v13h-3z" fill="currentColor" stroke="none"/>',
  tag:'<path d="M4 12.6V4h8.6L20 11.4 12.6 19z"/><circle cx="15.4" cy="8.6" r="1.3"/>',
  board:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  items:'<rect x="3.5" y="4" width="6.5" height="6.5" rx="1.7"/><path d="M5.6 7.2l1.3 1.3 2.3-2.6"/><path d="M13.5 7.2h7"/><rect x="3.5" y="13.5" width="6.5" height="6.5" rx="1.7"/><path d="M13.5 16.7h7"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.3"/><path d="M3.5 9.5h17M8 3.2v3.6M16 3.2v3.6"/>',
  proj:'<path d="M4.5 20.5V5.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15"/><path d="M14.5 9.5h4a1 1 0 0 1 1 1v10"/><path d="M3 20.5h18"/>',
  dots:'<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  plus:'<path d="M12 5.5v13M5.5 12h13"/>',
  search:'<circle cx="11" cy="11" r="6.6"/><path d="M20.2 20.2l-3.5-3.5"/>',
  bell:'<path d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.6 1.9 5.7 1.9 5.7H4.3s1.9-1.1 1.9-5.7"/><path d="M10.6 19.3a1.7 1.7 0 0 0 2.8 0"/>',
  filter:'<path d="M4.5 5.5h15l-5.6 6.6v4.9l-3.8 2v-6.9z"/>',
  dl:'<path d="M12 4v10M7.8 10.2 12 14.4l4.2-4.2M4.8 19.5h14.4"/>',
  back:'<path d="M14.8 5.8 8.6 12l6.2 6.2"/>',
  chevR:'<path d="M9.2 5.8 15.4 12l-6.2 6.2"/>',
  x:'<path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/>',
  check:'<path d="M4.8 12.6l4.7 4.7L19.2 7"/>',
  trash:'<path d="M4.8 7h14.4M9.7 7V4.8h4.6V7M6.9 7l.9 12.7h8.4L17.1 7"/>',
  edit:'<path d="M4.8 19.2h3.9L19.1 8.8a2 2 0 0 0-2.9-2.9L5.8 16.3l-1 2.9z"/>',
  alert:'<path d="M12 4 3.2 19.4h17.6L12 4z"/><path d="M12 9.8v4.4M12 16.9h.02"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7.8V12l3 1.9"/>',
  person:'<circle cx="12" cy="8.2" r="3.4"/><path d="M5.5 19.5c.9-3.4 3.4-5.1 6.5-5.1s5.6 1.7 6.5 5.1"/>',
  people:'<circle cx="9" cy="8.6" r="3.1"/><path d="M3.4 19.3c.8-3 3-4.6 5.6-4.6s4.8 1.6 5.6 4.6"/><path d="M15.2 5.9a3.1 3.1 0 0 1 0 5.4M17.3 14.9c1.9.5 3 1.9 3.4 4.4"/>',
  doc:'<path d="M6.5 3.8h7.2l4 4v12.4h-11.2z"/><path d="M13.5 3.8V8h4.2M9.2 12.6h5.6M9.2 16h5.6"/>',
  sliders:'<path d="M4.5 7.5h8.7M16.6 7.5h2.9M14.6 5.4v4.2M4.5 16.5h2.9M10.9 16.5h8.6M8.9 14.4v4.2"/>',
  ext:'<path d="M13.8 5.2h5v5M18.8 5.2l-8 8M18.5 13.8v4.9a.8.8 0 0 1-.8.8H5.8a.8.8 0 0 1-.8-.8V6.8a.8.8 0 0 1 .8-.8h4.9"/>',
  sun:'<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/>',
  moon:'<path d="M21 12.8a9 9 0 1 1-9.8-9.8A7 7 0 0 0 21 12.8z"/>',
  cloud:'<path d="M7 18h9.5a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.2 9.5 3.75 3.75 0 0 0 7 18z"/>',
  star:'<path d="M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.6l-5.08 2.7.98-5.68L3.75 9.6l5.7-.83z"/>',
  refresh:'<path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/>'
};
function I(name,cls){return '<svg class="'+(cls||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+IC[name]+'</svg>';}

/* ---- STATE ---- */
var S=null;
var view={name:'list',params:{}};
var history_=[];
var sheetStack=[];
var filters=defaultFilters();
var peopleView={sort:'open',filt:'all',mode:'people'};
var tagDropOpen=false;
var calState=null;
var exportSel={projId:'',from:'',to:'',preset:'all'};
var globalSearchState={q:''};
var bulkSel={};

function defaultFilters(){
  return{q:'',quick:'all',sort:'smart',project:[],spoc:[],status:[],from:'',to:'',fOd:false,fFu:false,fTk:false,tags:[],group:'none'};
}

function loadState(){
  var raw='';
  try{if(A&&A.loadData)raw=A.loadData()||'';}catch(e){raw='';}
  if(!raw){try{raw=localStorage.getItem('act_data')||'';}catch(e){raw='';}}
  if(raw){
    try{var p=JSON.parse(raw);if(p&&p.actionables){if(p.actionables.length===0){var _rv=newestNonEmptyVersion();if(_rv){S=_rv;ensureDefaults();snapshot('Recovered from restore point');saveState();return;}}S=p;ensureDefaults();snapshot('Opened');return;}}catch(e){}
  }
  S=window.buildSeed(Date.now());
  ensureDefaults();
  snapshot('First run');
  saveState();
}

function ensureDefaults(){
  /* v2 → v3 migration: owners become projects */
  if(S.owners&&!S.version){
    S.projects=S.owners.map(function(o){return{id:o.id,name:o.name,code:o.code||o.name.split(' ')[0]};});
    (S.people||[]).forEach(function(u){u.projectId=u.ownerId||u.projectId;delete u.ownerId;});
    S.actionables.forEach(function(a){a.projectId=a.ownerId||a.projectId;delete a.ownerId;});
    delete S.owners;S.version=3;
  }
  S.version=S.version||3;
  S.version=Math.max(S.version,9);
  S.exportPrefs=S.exportPrefs||{projId:'',from:'',to:'',preset:'all'};
  S.settings=S.settings||{};
  var d={userName:'Yash',notifEnabled:true,notifHour:9,notifMinute:0,notifSeenDate:'',theme:'dark',accent:'orange',font:'default',density:'comfortable'};
  for(var k in d)if(S.settings[k]===undefined)S.settings[k]=d[k];
  if(!Array.isArray(S.taskTypes)||!S.taskTypes.length)S.taskTypes=['Activity','Development','Testing','Deployment','Meeting','Follow-up','Documentation'];
  if(S.taskTypes.indexOf('Activity')<0)S.taskTypes.unshift('Activity');
  S.people=S.people||[];S.projects=S.projects||[];S.projects.forEach(ensureProjectCategories);
  /* SPOCs are global now — drop any legacy project binding */
  S.people.forEach(function(u){if(u.projectId!==undefined)delete u.projectId;});
  /* built-in Personal project for quick self tasks */
  if(!S.projects.some(function(p){return p.id==='__personal';}))
    S.projects.push({id:'__personal',name:'Personal',code:'ME'});
  S.actionables.forEach(function(a){
    a.comments=a.comments||[];a.activity=a.activity||[];a.spocIds=a.spocIds||[];delete a.parentId;a.archived=!!a.archived;if(a.assignedAt===undefined)a.assignedAt=a.spocIds.length?(a.createdAt||Date.now()):null;
    if(!a.rem)a.rem={on:false,date:'',time:'',note:'',done:false,waitingFor:'',requestedOn:'',expectedBy:''};
  a.rem.waitingFor=a.rem.waitingFor||'';a.rem.requestedOn=a.rem.requestedOn||'';a.rem.expectedBy=a.rem.expectedBy||'';
    if(a.etaKind===undefined)a.etaKind=a.eta?'date':'none';
    if(a.etaEnd===undefined)a.etaEnd='';
    if(a.ticketUrl===undefined)a.ticketUrl='';
    if(a.important===undefined)a.important=false;
    if(!Array.isArray(a.tags))a.tags=[];
    if(!a.type)a.type='Activity';
    if(STATUS_MAP[a.status]){a.status=STATUS_MAP[a.status];if(a.status==='Completed'&&!a.completedAt)a.completedAt=a.updatedAt||Date.now();}
  });
  S.actionables.forEach(function(a){if(a.type&&S.taskTypes.indexOf(a.type)<0)S.taskTypes.push(a.type);});
}

function notifState(){try{return (A&&A.notifState)?A.notifState():'web';}catch(e){return 'web';}}
window.__permChanged=function(){if(view.name==='settings')render();};
function saveState(){
  var json=JSON.stringify(S);
  try{localStorage.setItem('act_data',json);}catch(e){}
  try{if(A&&A.saveData)A.saveData(json);}catch(e){}
  try{if(window.Cloud&&window.Cloud.push)window.Cloud.push();}catch(e){}
}

function applyTheme(){
  if(!document.documentElement)return;
  var s=(S&&S.settings)?S.settings:{};
  var root=document.documentElement;
  var _theme=s.theme||'dark';
  root.className=(_theme==='light'?'light-theme ':(_theme==='high-contrast'?'high-contrast-theme ':''))+((s.density||'comfortable')==='compact'?'density-compact':'');
  var acc=ACCENTS[s.accent||'orange']||ACCENTS.orange;
  root.style.setProperty('--acc',acc.c);
  root.style.setProperty('--acc-dim',acc.d);
  root.style.setProperty('--font',FONT_STACK[s.font||'default']||FONT_STACK.default);
  try{
    if(A&&A.setStatusBar){
      var _lt=(s.theme||'dark')==='light';
      var _bg=(getComputedStyle(root).getPropertyValue('--bg')||'').trim()||(_lt?'#F0F4F8':'#07090D');
      A.setStatusBar(_bg,_lt);
    }
  }catch(e){}
}

/* ---- LOOKUPS ---- */
function projById(id){for(var i=0;i<S.projects.length;i++)if(S.projects[i].id===id)return S.projects[i];return null;}
function projName(id){var p=projById(id);return p?p.name:'\u2014';}
function projCode(id){var p=projById(id);return p?(p.code||p.name):'\u2014';}
var DEFAULT_CATEGORIES=['Compliance','Development','Testing','UAT','Production','Documentation','Bank Coordination'];
function ensureProjectCategories(p){if(!p)return;if(!Array.isArray(p.categories)||!p.categories.length){var ns=p.id==='__personal'?['General']:DEFAULT_CATEGORIES.slice();p.categories=ns.map(function(n,i){return{id:uid('cat'),name:n,archived:false,order:i};});}else p.categories=p.categories.map(function(c,i){return typeof c==='string'?{id:uid('cat'),name:c,archived:false,order:i}:Object.assign({id:uid('cat'),name:'Category',archived:false,order:i},c);});p.categories.sort(function(a,b){return(a.order||0)-(b.order||0);});}
function activeCategories(pid){var p=projById(pid);ensureProjectCategories(p);return(p&&p.categories||[]).filter(function(c){return !c.archived;});}
function categoryName(pid,cid){if(!cid)return 'Uncategorised';var p=projById(pid);ensureProjectCategories(p);var c=(p&&p.categories||[]).filter(function(x){return x.id===cid;})[0];return c?c.name:'Uncategorised';}
function categoryById(pid,cid){var p=projById(pid);ensureProjectCategories(p);return(p&&p.categories||[]).filter(function(x){return x.id===cid;})[0]||null;}
function renderCategoryManager(rec,pid){var p=projById(pid);if(!p)return;ensureProjectCategories(p);var rows=p.categories.filter(function(c){return !c.archived;}).sort(function(a,b){return a.order-b.order;});var h='<div class="shead"><h2>Manage categories</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div><div class="sbody"><div class="note" style="padding:0 0 12px">Organise actionables inside <b>'+esc(p.name)+'</b>. Archive a category instead of deleting it.</div><div class="list">';rows.forEach(function(c,i){h+='<div class="cmt" style="display:flex;align-items:center;gap:6px"><div style="flex:1"><b>'+esc(c.name)+'</b></div><button class="btn ghost mini" data-act="cat-up" data-id="'+c.id+'"'+(i===0?' disabled':'')+'>↑</button><button class="btn ghost mini" data-act="cat-down" data-id="'+c.id+'"'+(i===rows.length-1?' disabled':'')+'>↓</button><button class="btn ghost mini" data-act="cat-rename" data-id="'+c.id+'">Rename</button><button class="btn ghost mini" data-act="cat-archive" data-id="'+c.id+'">Archive</button></div>';});h+='</div><button class="btn pri" style="width:100%;margin-top:12px" data-act="cat-add" data-id="'+pid+'">+ Add category</button></div>';rec.sheet.querySelector('.sbody').innerHTML=h;}

function personById(id){for(var i=0;i<S.people.length;i++)if(S.people[i].id===id)return S.people[i];return null;}
function personName(id){var u=personById(id);return u?u.name:'?';}
function peopleSorted(){return S.people.slice().sort(function(a,b){return a.name.toLowerCase()<b.name.toLowerCase()?-1:1;});}
function personProjectCodes(pid){
  var seen={},codes=[];
  S.actionables.forEach(function(a){if(a.spocIds.indexOf(pid)>=0){var c=projCode(a.projectId);if(!seen[c]){seen[c]=1;codes.push(c);}}});
  return codes;
}
function actById(id){for(var i=0;i<S.actionables.length;i++)if(S.actionables[i].id===id)return S.actionables[i];return null;}
function mainActs(){return S.actionables.filter(function(a){return a.projectId!=='__personal'&&!a.archived;});}
function isOpen(a){return a.status!=='Completed';}
function spocLabel(a){if(!a.spocIds.length)return 'To be assigned';return a.spocIds.map(function(id){return personName(id);}).join(' & ');}
function spocKey(a){return a.spocIds.length?a.spocIds.slice().sort().join('+'):'__tbc';}
function myIds(){var ids={};S.people.forEach(function(u){if(u.name===S.settings.userName)ids[u.id]=1;});return ids;}
function isMine(a,ids){for(var i=0;i<a.spocIds.length;i++)if(ids[a.spocIds[i]])return true;return false;}

/* ---- ETA HELPERS ---- */
function endEta(a){if(a.etaKind==='range')return a.etaEnd||a.eta||'';if(a.etaKind==='date')return a.eta||'';return '';}
function isOver(a,t){if(!isOpen(a))return false;var e=endEta(a);return !!e&&e<t;}
function coversDay(a,d){if(a.etaKind==='date')return a.eta===d;if(a.etaKind==='range')return a.eta&&a.etaEnd?(a.eta<=d&&d<=a.etaEnd):(a.eta===d||a.etaEnd===d);return false;}
function fmtEta(a){if(a.etaKind==='tbd')return 'TBD';if(a.etaKind==='none'||!a.eta)return 'No ETA';if(a.etaKind==='range')return fmtD(a.eta)+'\u2013'+fmtDY(a.etaEnd||a.eta);return fmtDY(a.eta);}
function plainEta(a){if(a.etaKind==='tbd')return 'TBD';if(a.etaKind==='none'||!a.eta)return '';if(a.etaKind==='range')return a.eta+' to '+(a.etaEnd||a.eta);return a.eta;}
function relEta(a){
  if(a.status==='Completed')return{t:'Done',cls:'dc-done'};
  if(a.etaKind==='tbd')return{t:'TBD',cls:'dc-tbd'};
  if(a.etaKind==='none'||!a.eta)return{t:'No ETA',cls:'dc-none'};
  var end=endEta(a),t=todayISO(),k=diffDays(end,t);
  var cls=k<0?'dc-od':k===0?'dc-today':k<=3?'dc-soon':'dc-fut';
  if(a.etaKind==='range'){if(k<0)return{t:'OD '+(-k)+'d',cls:'dc-od'};if(k===0)return{t:'Ends today',cls:'dc-today'};return{t:fmtD(a.eta)+'\u2013'+fmtD(end),cls:cls};}
  if(k<0)return{t:'OD '+(-k)+'d',cls:'dc-od'};
  if(k===0)return{t:'Today',cls:'dc-today'};
  if(k===1)return{t:'Tmrw',cls:'dc-soon'};
  if(k<=7)return{t:fmtD(end)+' \u00b7 '+k+'d',cls:cls};
  return{t:fmtD(end),cls:cls};
}
function remDue(a,t){return isOpen(a)&&a.rem&&a.rem.on&&!a.rem.done&&a.rem.date&&a.rem.date<=t;}
function createdDateISO(a){return a&&a.createdAt?isoFromMs(a.createdAt):'';}
function assignedDateISO(a){return a&&a.assignedAt?isoFromMs(a.assignedAt):'';}
function updatedDateISO(a){return a&&a.updatedAt?isoFromMs(a.updatedAt):'';}
function agingDays(a,asOf){var start=assignedDateISO(a)||createdDateISO(a)||todayISO(),end=a&&a.status==='Completed'&&a.completedAt?isoFromMs(a.completedAt):(asOf||todayISO());return start&&end?Math.max(0,diffDays(end,start)):0;}
function staleDays(a,asOf){if(!a||a.status==='Completed')return 0;var u=updatedDateISO(a)||createdDateISO(a);return u?Math.max(0,diffDays(asOf||todayISO(),u)):0;}
function staleChip(a){var d=staleDays(a);return d>=7?'<span class="stale-chip">No update '+d+'d</span>':'';}
function agingBucket(days){if(days<=3)return{label:'0–3 days',cls:'age-good'};if(days<=7)return{label:'4–7 days',cls:'age-watch'};if(days<=14)return{label:'8–14 days',cls:'age-warn'};return{label:'15+ days',cls:'age-bad'};}
function ageChip(a){var ag=agingDays(a),b=agingBucket(ag);return '<span class="agechip '+b.cls+'">Age '+ag+'d</span>';}
function followupAgeDays(a,t){var r=a&&a.rem;if(!r||!r.on||r.done)return 0;var start=r.requestedOn||createdDateISO(a);return start?Math.max(0,diffDays(t||todayISO(),start)):0;}
function followupAgeLabel(a,t){var d=followupAgeDays(a,t);return d+' day'+(d===1?'':'s');}
function bulkCount(){return Object.keys(bulkSel).filter(function(id){return bulkSel[id]&&actById(id);}).length;}

/* ---- METRICS ---- */
function metrics(){
  var t=todayISO(),mine=myIds();
  var m={open:[],overdue:[],today:[],week:[],tomorrow:[],mine:[],
    awaitAll:[],ip:[],sc:[],done30:[],remDueL:[],remToday:[]};
  var cutoff=Date.now()-30*86400000;
  mainActs().forEach(function(a){
    if(a.status==='Completed'){if(a.completedAt&&a.completedAt>=cutoff)m.done30.push(a);return;}
    m.open.push(a);
    var end=endEta(a);
    if(end){var k=diffDays(end,t);
      if(k<0)m.overdue.push(a);
      else if(k===0)m.today.push(a);
      if(k>=0&&k<=7)m.week.push(a);
      if(k===1)m.tomorrow.push(a);
    }else if(a.etaKind==='range'&&coversDay(a,t))m.today.push(a);
    if(a.status==='Dependency')m.awaitAll.push(a);
    else if(a.status==='In Progress')m.ip.push(a);
    else if(a.status==='On Hold')m.sc.push(a);
    if(isMine(a,mine))m.mine.push(a);
    if(remDue(a,t))m.remDueL.push(a);
    if(a.rem&&a.rem.on&&!a.rem.done&&a.rem.date===t)m.remToday.push(a);
  });
  return m;
}
function projStats(pid){
  var t=todayISO(),st={open:0,od:0,wait:0,week:0,fu:0,done30:0};
  var cutoff=Date.now()-30*86400000;
  S.actionables.forEach(function(a){
    if(a.projectId!==pid)return;
    if(isOpen(a)){st.open++;if(isOver(a,t))st.od++;if(AWAITS.indexOf(a.status)>=0)st.wait++;
      var end=endEta(a);if(end){var k=diffDays(end,t);if(k>=0&&k<=7)st.week++;}
      if(remDue(a,t))st.fu++;
    }else if(a.status==='Completed'&&a.completedAt>=cutoff)st.done30++;
  });
  return st;
}
function personStats(pid){
  var t=todayISO(),st={open:0,od:0,fu:0,week:0};
  mainActs().forEach(function(a){
    if(!isOpen(a))return;
    var hit=pid==='__tbc'?a.spocIds.length===0:a.spocIds.indexOf(pid)>=0;
    if(!hit)return;
    st.open++;if(isOver(a,t))st.od++;if(remDue(a,t))st.fu++;
    var end=endEta(a);if(end){var k=diffDays(end,t);if(k>=0&&k<=7)st.week++;}
  });
  return st;
}

/* ---- SORTING & FILTERING ---- */
function smartCmp(a,b,t){
  if(!!a.important!==!!b.important)return a.important?-1:1;
  var ea=endEta(a),eb=endEta(b);
  var oa=ea&&ea<t?0:1,ob=eb&&eb<t?0:1;
  if(oa!==ob)return oa-ob;
  var ka=ea?diffDays(ea,t):(a.etaKind==='tbd'?9000:9500);
  var kb=eb?diffDays(eb,t):(b.etaKind==='tbd'?9000:9500);
  if(ka!==kb)return ka-kb;
  var ra=a.rem&&a.rem.on&&!a.rem.done&&a.rem.date?a.rem.date:'9999';
  var rb=b.rem&&b.rem.on&&!b.rem.done&&b.rem.date?b.rem.date:'9999';
  if(ra!==rb)return ra<rb?-1:1;
  return(b.updatedAt||0)-(a.updatedAt||0);
}
function sortActs(list,mode){
  var t=todayISO(),arr=list.slice();mode=mode||filters.sort||'smart';
  if(mode==='eta'){arr.sort(function(a,b){var ea=endEta(a)||(a.etaKind==='tbd'?'9998':'9999'),eb=endEta(b)||(b.etaKind==='tbd'?'9998':'9999');if(ea!==eb)return ea<eb?-1:1;return smartCmp(a,b,t);});}
  else if(mode==='ticket'){arr.sort(function(a,b){var ta=a.ticket||'\uffff',tb=b.ticket||'\uffff';if(ta!==tb)return ta<tb?-1:1;return smartCmp(a,b,t);});}
  else if(mode==='project'){arr.sort(function(a,b){var na=projName(a.projectId),nb=projName(b.projectId);if(na!==nb)return na<nb?-1:1;return smartCmp(a,b,t);});}
  else if(mode==='updated'){arr.sort(function(a,b){return(b.updatedAt||0)-(a.updatedAt||0);});}
  else{arr.sort(function(a,b){return smartCmp(a,b,t);});}
  return arr;
}
function quickPass(a,q,t,mine){
  switch(q){
    case 'everything':return true;
    case 'all':return isOpen(a);
    case 'mine':return isOpen(a)&&isMine(a,mine);
    case 'today':return isOpen(a)&&(coversDay(a,t)||endEta(a)===t);
    case 'week':{if(!isOpen(a))return false;var e=endEta(a);if(!e)return false;var k=diffDays(e,t);return k>=0&&k<=7;}
    case 'overdue':return isOver(a,t);
    case 'followup':return remDue(a,t);
    case 'important':return isOpen(a)&&!!a.important;
    case 'awaiting':case 'dep':return isOpen(a)&&a.status==='Dependency';
    case 'inprog':return a.status==='In Progress';
    case 'onhold':return a.status==='On Hold';
    case 'completed':return a.status==='Completed';
    default:return true;
  }
}
function filteredActs(){
  var t=todayISO(),mine=myIds(),q=filters.q.trim().toLowerCase();
  var list=mainActs().filter(function(a){
    if(!quickPass(a,filters.quick,t,mine))return false;
    if(filters.project.length&&filters.project.indexOf(a.projectId)<0)return false;
    if(filters.spoc.length){var hit=false;for(var i=0;i<filters.spoc.length;i++){var sid=filters.spoc[i];if(sid==='__tbc'?a.spocIds.length===0:a.spocIds.indexOf(sid)>=0){hit=true;break;}}if(!hit)return false;}
    if(filters.status.length&&filters.status.indexOf(a.status)<0)return false;
    if(filters.tags&&filters.tags.length){var _at=(a.tags||[]).map(function(x){return x.toLowerCase();}),_hit=false;for(var _fi=0;_fi<filters.tags.length;_fi++){if(_at.indexOf(filters.tags[_fi].toLowerCase())>=0){_hit=true;break;}}if(!_hit)return false;}
    if(filters.fOd&&!isOver(a,t))return false;
    if(filters.fFu&&!remDue(a,t))return false;
    if(filters.fTk&&!a.ticket)return false;
    if(filters.from||filters.to){var e=endEta(a);if(!e)return false;if(filters.from&&e<filters.from)return false;if(filters.to&&e>filters.to)return false;}
    if(q){var hay=(a.ticket+' '+a.lineItem+' '+a.task+' '+a.notes+' '+projName(a.projectId)+' '+categoryName(a.projectId,a.categoryId)+' '+spocLabel(a)+' '+a.status).toLowerCase();if(hay.indexOf(q)<0)return false;}
    return true;
  });
  if(filters.quick==='completed')return list.sort(function(a,b){return(b.completedAt||0)-(a.completedAt||0);});
  if(filters.quick==='everything'){var t2=todayISO();return list.sort(function(a,b){var ca=isOpen(a)?0:1,cb=isOpen(b)?0:1;if(ca!==cb)return ca-cb;if(ca===1)return(b.completedAt||b.updatedAt||0)-(a.completedAt||a.updatedAt||0);return smartCmp(a,b,t2);});}
  return sortActs(list);
}
function advCount(){
  return filters.project.length+filters.spoc.length+filters.status.length+
    (filters.from?1:0)+(filters.to?1:0)+(filters.fOd?1:0)+(filters.fFu?1:0)+(filters.fTk?1:0)+((filters.tags&&filters.tags.length)?1:0)+(filters.sort!=='smart'?1:0);
}

/* ---- RECURRING TASKS ---- */
function recurrenceLabel(r){
  if(!r||!r.enabled)return 'None';
  if(r.freq==='daily')return r.interval===1?'Daily':'Every '+r.interval+' days';
  if(r.freq==='weekly')return r.interval===1?'Weekly':'Every '+r.interval+' weeks';
  if(r.freq==='monthly')return r.interval===1?'Monthly':'Every '+r.interval+' months';
  return 'Every '+(r.interval||1)+' '+(r.unit||'week')+((r.interval||1)===1?'':'s');
}
function nextRecurringDates(a){
  var r=a.recurrence;if(!r||!r.enabled)return null;
  var base=endEta(a)||a.eta;if(!base)return null;
  var n=1*(r.interval||1),next;
  if(r.freq==='daily')next=addDaysISO(base,n);
  else if(r.freq==='weekly')next=addDaysISO(base,7*n);
  else if(r.freq==='monthly'){var p=base.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);d.setMonth(d.getMonth()+n);next=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  else if((r.unit||'week')==='day')next=addDaysISO(base,n);
  else if((r.unit||'week')==='month'){var pp=base.split('-'),dd=new Date(+pp[0],+pp[1]-1,+pp[2]);dd.setMonth(dd.getMonth()+n);next=dd.getFullYear()+'-'+pad(dd.getMonth()+1)+'-'+pad(dd.getDate());}
  else next=addDaysISO(base,7*n);
  if(r.endDate&&next>r.endDate)return null;
  var start=next,end='';
  if(a.etaKind==='range'&&a.eta&&a.etaEnd){var dur=diffDays(a.etaEnd,a.eta);start=addDaysISO(a.eta,n);if(r.freq==='weekly')start=addDaysISO(a.eta,7*n);else if(r.freq==='monthly'){var p2=a.eta.split('-'),d2=new Date(+p2[0],+p2[1]-1,+p2[2]);d2.setMonth(d2.getMonth()+n);start=d2.getFullYear()+'-'+pad(d2.getMonth()+1)+'-'+pad(d2.getDate());}else if(r.freq==='custom'&&r.unit==='month'){var p3=a.eta.split('-'),d3=new Date(+p3[0],+p3[1]-1,+p3[2]);d3.setMonth(d3.getMonth()+n);start=d3.getFullYear()+'-'+pad(d3.getMonth()+1)+'-'+pad(d3.getDate());}else if(r.freq==='custom'&&r.unit==='week')start=addDaysISO(a.eta,7*n);else if(r.freq==='custom'&&r.unit==='day')start=addDaysISO(a.eta,n);end=addDaysISO(start,dur);}
  return {eta:start,etaEnd:end};
}
function scheduleNextOccurrence(a){
  var r=a.recurrence;if(!r||!r.enabled||a.status!=='Completed')return null;
  var dates=nextRecurringDates(a);if(!dates)return null;
  var series=r.seriesId||a.id;
  var exists=S.actionables.some(function(x){return x.id!==a.id&&x.recurrence&&x.recurrence.enabled&&x.recurrence.seriesId===series&&x.eta===dates.eta&&x.status!=='Completed';});
  if(exists)return null;
  var now=Date.now();
  var nr={enabled:true,freq:r.freq,interval:r.interval||1,unit:r.unit||'week',endDate:r.endDate||'',seriesId:series};
  var na={id:uid('a'),projectId:a.projectId,ticket:a.ticket,ticketUrl:a.ticketUrl,lineItem:a.lineItem,task:a.task,spocIds:a.spocIds.slice(),etaKind:a.etaKind==='range'?'range':'date',eta:dates.eta,etaEnd:dates.etaEnd,status:'In Progress',important:a.important,tags:(a.tags||[]).slice(),rem:{on:false,date:'',time:'',note:'',done:false,waitingFor:'',requestedOn:'',expectedBy:''},notes:a.notes,comments:[],activity:[],createdAt:now,updatedAt:now,completedAt:null,recurrence:nr,type:a.type||'Activity'};
  logAct(na,'Created (recurring)');
  S.actionables.unshift(na);
  logAct(a,'Next recurring occurrence created','',fmtEta(na));
  return na;
}

/* ---- MUTATIONS ---- */
function logAct(a,event,from,to){a.activity.push({ts:Date.now(),user:S.settings.userName||'You',event:event,from:from||'',to:to||''});}
var FIELD_LABEL={status:'Status',projectId:'Project',ticket:'Ticket ID',ticketUrl:'Ticket link',lineItem:'Line item',task:'Description',notes:'Remarks',type:'Type'};
function fieldVal(f,v){if(f==='projectId')return projName(v);if(f==='categoryId')return categoryName(v===undefined?'':v, '');return v||'None';}
function updateAct(id,patch){
  var a=actById(id);if(!a)return false;
  var changed=false,completedTransition=false,etaResetByAssigned=false,preAssignedEtaKind=a.etaKind,preAssignedEta=a.eta,preAssignedEtaEnd=a.etaEnd;
  ['projectId','categoryId','ticket','ticketUrl','lineItem','task','status','notes','type'].forEach(function(f){
    if(patch[f]===undefined||patch[f]===a[f])return;
    var lbl=FIELD_LABEL[f];
    if(f==='task'||f==='notes'||f==='lineItem'||f==='ticketUrl')logAct(a,lbl+' updated');
    else if(f==='categoryId')logAct(a,lbl+' changed',categoryName(a.projectId,a.categoryId),categoryName(patch.projectId||a.projectId,patch.categoryId));
    else logAct(a,lbl+' changed',fieldVal(f,a[f]),fieldVal(f,patch[f]));
    var wasStatus=a.status;
    a[f]=patch[f];changed=true;
    if(f==='status'){if(patch[f]==='Completed'){completedTransition=wasStatus!=='Completed';a.completedAt=Date.now();if(a.important){a.important=false;logAct(a,'Unmarked important (completed)');}}else if(a.completedAt)a.completedAt=null;}
  });
  if(patch.important!==undefined&&!!patch.important!==!!a.important){a.important=!!patch.important;logAct(a,patch.important?'Marked important':'Unmarked important');changed=true;}
  if(patch.rem!==undefined){var oldRem=JSON.stringify(a.rem||{}),newRem=JSON.stringify(patch.rem||{});if(oldRem!==newRem){a.rem=patch.rem;logAct(a,'Follow-up updated');changed=true;}}
  if(patch.recurrence!==undefined){var oldRec=JSON.stringify(a.recurrence||{}),newRec=JSON.stringify(patch.recurrence||{});if(oldRec!==newRec){a.recurrence=patch.recurrence;logAct(a,'Recurrence updated');changed=true;}}
  if(patch.tags!==undefined){var okt=(a.tags||[]).slice().sort().join('\u0001'),nkt=patch.tags.slice().sort().join('\u0001');if(okt!==nkt){a.tags=patch.tags.slice();logAct(a,'Tags updated','',patch.tags.join(', '));changed=true;}}
  if(patch.spocIds!==undefined){
    var oldK=a.spocIds.slice().sort().join(','),newK=patch.spocIds.slice().sort().join(',');
    if(oldK!==newK){logAct(a,'Owner/SPOC changed',spocLabel(a),patch.spocIds.length?patch.spocIds.map(function(i2){return personName(i2);}).join(' & '):'To be assigned');a.spocIds=patch.spocIds.slice();if(patch.spocIds.length&&!a.assignedAt)a.assignedAt=Date.now();changed=true;}
  }
  if(patch.assignedAt!==undefined){var nad=patch.assignedAt||null;if(nad!==a.assignedAt){var ab=assignedDateISO(a)||createdDateISO(a)||'N/A',an=nad?isoFromMs(nad):'N/A';a.assignedAt=nad;logAct(a,'Assigned date changed',ab,an);changed=true;
    var currentEta=endEta(a);
    if(nad&&currentEta&&currentEta<nad){var oldEta=fmtEta(a);a.etaKind='none';a.eta='';a.etaEnd='';etaResetByAssigned=true;logAct(a,'ETA reset after assigned date change',oldEta,'No ETA');addSystemComment(a,'Assigned date changed from '+ab+' to '+an+'. ETA was reset because it was earlier than the new assigned date.');}
  }}
  var ek=patch.etaKind!==undefined?patch.etaKind:a.etaKind,ev=patch.eta!==undefined?patch.eta:a.eta,ee=patch.etaEnd!==undefined?patch.etaEnd:a.etaEnd;
  if(etaResetByAssigned && ek===preAssignedEtaKind && ev===preAssignedEta && ee===preAssignedEtaEnd){ek='none';ev='';ee='';}
  if(ek!=='range')ee='';if(ek==='none'||ek==='tbd'){ev='';ee='';}
  if(ek!==a.etaKind||ev!==a.eta||ee!==a.etaEnd){var before=fmtEta(a);a.etaKind=ek;a.eta=ev;a.etaEnd=ee;logAct(a,'ETA changed',before,fmtEta(a));changed=true;}
  if(changed){a.updatedAt=Date.now();if(completedTransition)scheduleNextOccurrence(a);saveState();}
  return changed;
}
function remPatch(id,patch,ev){
  var a=actById(id);if(!a)return;
  if(!a.rem)a.rem={on:false,date:'',time:'',note:'',done:false,waitingFor:'',requestedOn:'',expectedBy:''};
  a.rem.waitingFor=a.rem.waitingFor||'';a.rem.requestedOn=a.rem.requestedOn||'';a.rem.expectedBy=a.rem.expectedBy||'';
  for(var k in patch)a.rem[k]=patch[k];
  if(ev)logAct(a,ev.e,ev.f||'',ev.t||'');
  a.updatedAt=Date.now();saveState();
}
function addComment(id,text){
  var a=actById(id);if(!a)return;
  a.comments.push({ts:Date.now(),user:S.settings.userName||'You',text:text});
  logAct(a,'Comment added');a.updatedAt=Date.now();saveState();
}
function addSystemComment(a,text){
  if(!a)return;
  a.comments=a.comments||[];
  a.comments.push({ts:Date.now(),user:'System',text:text,system:true});
  logAct(a,'System comment added','',text);a.updatedAt=Date.now();
}
function dataQualityCheck(scopeProject){
  var issues=[],seen={};
  var items=S.actionables.filter(function(a){return !a.archived&&(!scopeProject||a.projectId===scopeProject);});
  items.forEach(function(a){
    var label=(a.ticket?a.ticket+' — ':'')+(a.lineItem||'Untitled');
    var assigned=assignedDateISO(a),end=endEta(a),open=a.status!=='Completed';
    if(a.etaKind==='range'&&a.eta&&a.etaEnd&&a.etaEnd<a.eta)issues.push({sev:'high',id:a.id,title:label,reason:'ETA range ends before it starts.',field:'ETA'});
    if(assigned&&end&&end<assigned)issues.push({sev:'high',id:a.id,title:label,reason:'ETA is earlier than the assigned date.',field:'Assigned date / ETA'});
    if(open&&!a.spocIds.length)issues.push({sev:'medium',id:a.id,title:label,reason:'No SPOC/owner is assigned.',field:'SPOC'});
    if(open&&(a.etaKind==='none'||a.etaKind==='tbd'||!a.eta))issues.push({sev:'medium',id:a.id,title:label,reason:'No specific ETA is set.',field:'ETA'});
    if(open&&a.rem&&a.rem.on&&!a.rem.date)issues.push({sev:'medium',id:a.id,title:label,reason:'Follow-up reminder is enabled but has no date.',field:'Follow-up'});
    if(a.status==='Completed'&&!a.completedAt)issues.push({sev:'medium',id:a.id,title:label,reason:'Task is marked Completed but has no completion timestamp.',field:'Status'});
    var key=(a.projectId||'')+'|'+String(a.lineItem||'').trim().toLowerCase();
    if(a.lineItem&&open){if(seen[key])issues.push({sev:'medium',id:a.id,title:label,reason:'Possible duplicate open task with “'+seen[key]+'”.',field:'Line item'});else seen[key]=label;}
  });
  var order={high:0,medium:1,low:2};issues.sort(function(a,b){return order[a.sev]-order[b.sev]||a.title.localeCompare(b.title);});
  return {items:items.length,issues:issues};
}

/* ---- HTML HELPERS ---- */
function fuChip(a,t){if(!(a.rem&&a.rem.on&&!a.rem.done))return '';var due=remDue(a,t);return '<span class="fu'+(due?' due':'')+'">'+I('bell')+(a.rem.date?fmtD(a.rem.date):'FU')+'</span>';}
function ttlHtml(a){return a.ticket?'<span class="tk">'+esc(a.ticket)+'</span> \u2014 '+esc(a.lineItem):esc(a.lineItem);}

/* actRow: shows in list view — includes truncated description */
function actRow(a,opts){
  opts=opts||{};var t=todayISO();
  var st=etaState(a),od=(st==='over'||st==='severe'),severe=(st==='severe'),done=a.status==='Completed';
  var desc=a.task?(a.task.length>110?a.task.slice(0,110)+'\u2026':a.task):'';
  return '<button class="arow trow'+(od?' od':'')+(severe?' severe':'')+(done?' done':'')+(a.important?' imp':'')+(a.projectId==='__personal'?' personal':'')+'" data-act="open" data-id="'+a.id+'">'+
    '<span class="bulk-check" onclick="event.stopPropagation()"><input type="checkbox" data-chg="bulk-select" data-id="'+a.id+'" '+(bulkSel[a.id]?'checked':'')+' aria-label="Select '+esc(a.lineItem)+'"></span>'+
    '<div class="row-main">'+
      '<div class="row-title">'+ttlHtml(a)+'</div>'+
      (desc?'<div class="row-desc">'+esc(desc)+'</div>':'')+
      '<div class="row-meta"><span class="badge '+stCls(a.status)+'">'+esc(stShort(a.status))+'</span>'+typeChip(a)+
        '<span class="who'+(a.spocIds.length?'':' un')+'">'+esc(spocLabel(a))+'</span>'+
        '<span class="date-meta">Assigned '+esc(fmtDY(assignedDateISO(a)||createdDateISO(a)))+'</span>'+ageChip(a)+staleChip(a)+fuChip(a,t)+(a.categoryId?'<span class="chipmini">'+esc(categoryName(a.projectId,a.categoryId))+'</span>':'')+tagsHtml(a)+'</div>'+
    '</div>'+
    '<div class="row-side">'+etaView(a)+(a.important?'<div class="row-prio">'+I('star')+'Important</div>':'')+'</div>'+
  '</button>';
}

/* boardRow: shows in project board — includes truncated description */
function boardRow(a){
  var t=todayISO();
  var st=etaState(a),od=(st==='over'||st==='severe'),severe=(st==='severe'),done=a.status==='Completed';
  var desc=a.task?(a.task.length>90?a.task.slice(0,90)+'\u2026':a.task):'';
  return '<button class="orow trow'+(od?' od':'')+(severe?' severe':'')+(done?' done':'')+(a.important?' imp':'')+(a.projectId==='__personal'?' personal':'')+'" data-act="open" data-id="'+a.id+'">'+
    '<div class="row-main">'+
      '<div class="row-title">'+ttlHtml(a)+'</div>'+
      (desc?'<div class="row-desc">'+esc(desc)+'</div>':'')+
      '<div class="row-meta"><span class="badge '+stCls(a.status)+'">'+esc(stShort(a.status))+'</span>'+typeChip(a)+fuChip(a,t)+(a.categoryId?'<span class="chipmini">'+esc(categoryName(a.projectId,a.categoryId))+'</span>':'')+tagsHtml(a)+'</div>'+
    '</div>'+
    '<div class="row-side">'+etaView(a)+(a.important?'<div class="row-prio">'+I('star')+'Important</div>':'')+'</div>'+
  '</button>';
}

function emptyBox(t1,t2){return '<div class="empty"><div class="t1">'+esc(t1)+'</div><div class="t2">'+esc(t2)+'</div></div>';}
function topbar(title,sub,leftBack,rightHtml){
  return '<header class="topbar">'+
    (leftBack?'<button class="iconbtn" data-act="back">'+I('back')+'</button>':'')+
    '<div class="tt"><h1>'+esc(title)+'</h1>'+(sub?'<div class="sub">'+sub+'</div>':'')+' </div>'+
    (rightHtml||'')+'</header>';
}
function grouped(list){
  var keys=[],map={};
  list.forEach(function(a){var k=spocKey(a);if(!map[k]){map[k]={key:k,label:spocLabel(a),items:[]};keys.push(k);}map[k].items.push(a);});
  var groups=keys.map(function(k){return map[k];});
  groups.sort(function(x,y){var tx=x.key==='__tbc'?1:0,ty=y.key==='__tbc'?1:0;if(tx!==ty)return tx-ty;if(x.items.length!==y.items.length)return y.items.length-x.items.length;return x.label<y.label?-1:1;});
  return groups;
}

/* ---- RENDER ROOT ---- */
function render(){
  var app=$('#app');
  var html='';
  switch(view.name){
    case 'home':html=vHome();break;
    case 'list':html=vList();break;
    case 'calendar':html=vCalendar();break;
    case 'projects':html=vProjects();break;
    case 'projectDetail':html=vProjectDetail(view.params.id);break;
    case 'people':html=vPeople();break;
    case 'workload':html=vWorkload();break;
    case 'personDetail':html=vPersonDetail(view.params.id);break;
    case 'reports':html=vReports();break;
    case 'notifications':html=vNotifications();break;
    case 'settings':html=vSettings();break;
    case 'brief':html=vBrief();break;
    case 'ai':html=vAI();break;
  }
  var fabViews=['home','list','calendar','projects','projectDetail','people','personDetail','workload'];
  app.innerHTML='<div class="screen">'+html+'</div>'+tabbar()+
    (fabViews.indexOf(view.name)>=0?'<button class="fab" data-act="add">'+I('plus')+'Add</button>':'');
  bindViewInputs();
}
function nav(name,params,noHist){
  if(!noHist&&(view.name!==name||JSON.stringify(view.params)!==JSON.stringify(params||{}))){history_.push({name:view.name,params:view.params});if(history_.length>30)history_.shift();}
  view={name:name,params:params||{}};render();
  window.scrollTo(0,0);try{var appEl=$('#app');if(appEl)appEl.scrollTop=0;}catch(e){}
}
function tabbar(){
  var m=metrics(),badge=notifBadgeOn(m);
  var moreViews=['projects','projectDetail','reports','notifications','settings','brief','workload'];
  function tab(k,ic,lbl){
    var on=(k==='more')?(moreViews.indexOf(view.name)>=0):(k==='ai')?(view.name==='ai'):(view.name!=='ai'&&moreViews.indexOf(view.name)<0);
    return '<button class="tab'+(on?' on':'')+'" data-act="tab" data-tab="'+k+'">'+I(ic)+'<span>'+lbl+'</span>'+(k==='more'&&badge?'<span class="dot"></span>':'')+'</button>';
  }
  return '<nav class="tabbar tabbar-3">'+
    '<div class="railbrand"><span class="rb-ic">'+I('check')+'</span><span class="rb-tx"><b>Actionables</b><i>Stay on top of what matters</i></span></div>'+
    tab('list','items','Actionables')+tab('ai','spark','AI')+tab('more','dots','More')+
    '<div class="railtip">'+railTipHtml()+'</div>'+
    '<div class="railcredit">Developed by <b>Vishal</b> \u00b7 personal use only</div>'+
  '</nav>';
}
function notifBadgeOn(m){var n=m.overdue.length+m.today.length+m.remDueL.length;return n>0&&S.settings.notifSeenDate!==todayISO();}

/* ====== VIEWS ====== */

/* ---- HOME (board) ---- */
function vHome(){
  var m=metrics(),t=todayISO(),d=new Date();
  var dateLine=DOW[(d.getDay()+6)%7]+', '+fmtDY(t);
  var pills=['<button class="sumpill" data-act="kpi" data-q="all">'+m.open.length+' open</button>'];
  var impN=m.open.filter(function(a){return a.important;}).length;
  if(impN)             pills.push('<button class="sumpill sp-imp"   data-act="kpi" data-q="important">'+impN+' important</button>');
  if(m.mine.length)    pills.push('<button class="sumpill sp-mine"  data-act="kpi" data-q="mine">'+m.mine.length+' mine</button>');
  if(m.overdue.length) pills.push('<button class="sumpill sp-od"    data-act="kpi" data-q="overdue">'+m.overdue.length+' overdue</button>');
  if(m.today.length)   pills.push('<button class="sumpill sp-today" data-act="kpi" data-q="today">'+m.today.length+' due today</button>');
  if(m.week.length)    pills.push('<button class="sumpill sp-week"  data-act="kpi" data-q="week">'+m.week.length+' due this week</button>');
  if(m.awaitAll.length)pills.push('<button class="sumpill sp-wait"  data-act="kpi" data-q="awaiting">'+m.awaitAll.length+' dependency</button>');
  if(m.remDueL.length) pills.push('<button class="sumpill sp-fu"    data-act="kpi" data-q="followup">'+m.remDueL.length+' follow-ups due</button>');
  var _theme=S.settings.theme||'dark';
  var themeBtn='<button class="iconbtn" data-act="theme-toggle" title="Switch theme · current: '+themeLabel(_theme)+'">'+I(_theme==='dark'?'sun':'moon')+'</button>';
  var bell='<button class="iconbtn" data-act="go-notif">'+I('bell')+(notifBadgeOn(m)?'<span class="dot"></span>':'')+' </button>';
  var search='<button class="search-pill" data-act="go-search" title="Global Search · Ctrl+K">'+I('search')+'<span>Search anything…</span><kbd>Ctrl K</kbd></button>';
  var h=topbar('Actionables',esc(dateLine),false,cloudSyncBtnHtml()+cloudBadgeHtml()+themeBtn+search+bell);
  h+='<div class="sumstrip">'+pills.join('')+'</div>';
  h+='<section class="home-focus"><div class="home-focus-head"><div><div class="eyebrow" style="margin:0">Today’s focus</div><h2>What needs your attention?</h2></div><button class="btn ghost mini" data-act="brief-go">Open briefing</button></div>'+intelligenceSection()+'</section>';
  h+='<div class="selfrow">'+
    '<button class="quickadd" data-act="quick-new">'+I('plus')+'Quick task for myself</button>'+
    '<button class="quickadd viewself" data-act="view-personal">'+I('person')+'View your tasks</button>'+
    '</div>';
  if(m.remDueL.length){
    var fus=sortActs(m.remDueL,'smart');
    h+='<div class="eyebrow">Follow-ups due<button class="lnk" data-act="kpi" data-q="followup">All '+fus.length+'</button></div>';
    h+='<div class="list">'+fus.slice(0,5).map(function(a){
      return '<button class="notif n-fu" data-act="open" data-id="'+a.id+'">'+
        '<span class="ic">'+I('bell')+'</span><span class="w">'+
        '<div class="h">'+ttlHtml(a)+'</div>'+
        '<div class="b">'+esc(a.rem.note||'Follow up')+'</div>'+
        '<div class="b" style="color:var(--tx3)">'+esc(spocLabel(a))+' \u00b7 '+esc(projCode(a.projectId))+'</div>'+
        '</span>'+etaView(a)+'</button>';
    }).join('')+'</div>';
  }
  h+='<div class="eyebrow">Project &amp; Owner/SPOC<span style="font-size:.7rem;color:var(--tx3);font-weight:500;letter-spacing:0;text-transform:none">'+m.open.length+' open</span></div>';
  h+='<div class="board-grid">';
  S.projects.forEach(function(o){
    if(o.id==='__personal')return;
    var items=sortActs(m.open.filter(function(a){return a.projectId===o.id;}),'smart');
    if(!items.length)return;
    h+='<div class="proj-block'+(o.id==='__personal'?' personal':'')+'"><button class="ownhead" data-act="proj-filter" data-id="'+o.id+'">'+
      '<h3>'+esc(o.name)+'</h3><span class="cnt">'+items.length+' open</span>'+
      '<span class="sp"></span>'+I('filter')+'</button>';
    grouped(items).forEach(function(g){
      h+='<div class="grp'+(g.key==='__tbc'?' tbc':'')+'">'+I('person')+
        esc(g.key==='__tbc'?'Owner/SPOC to be assigned':g.label)+
        '<span class="n">\u00b7 '+g.items.length+'</span></div>';
      h+='<div class="brows">'+g.items.map(boardRow).join('')+'</div>';
    });
    h+='</div>';
  });
  h+='</div>';
  if(!m.open.length)h+=emptyBox('No open actionables','Add your first actionable with the + button below.');
  return h;
}

/* ---- ACTIONABLES LIST ---- */
var QUICKS=[
  ['all','All open'],['important','Important'],['mine','Mine'],['followup','Follow-up due'],
  ['overdue','Overdue'],['today','Due today'],['week','This week'],
  ['inprog','In progress'],['onhold','On hold'],['dep','Dependency'],['completed','Completed'],['everything','Everything']
];
function vList(){
  var list=filteredActs(),t=todayISO(),mine=myIds();
  var h=topbar('Actionables',list.length+' shown',false,
    cloudSyncBtnHtml()+cloudBadgeHtml()+
    '<button class="iconbtn" data-act="go-calendar" title="Calendar">'+I('cal')+'</button>'+
    '<button class="iconbtn" data-act="go-people" title="Owners / SPOCs">'+I('people')+'</button>'+
    '<button class="iconbtn" data-act="go-notif" title="Notifications">'+I('bell')+(notifBadgeOn(metrics())?'<span class="dot"></span>':'')+'</button>'+
    '<button class="iconbtn" data-act="export-list-excel" title="Export Excel">'+I('dl')+'</button>');
  h+='<div class="selfrow"><button class="quickadd" data-act="quick-new">'+I('plus')+'Add my task</button><button class="quickadd viewself" data-act="view-personal">'+I('person')+'View my tasks</button></div>';
  h+='<div class="searchrow"><input id="srch" type="search" placeholder="Search project, line item, owner\u2026" value="'+esc(filters.q)+'">'+
    '<button class="sqbtn" data-act="open-filters">'+I('filter')+(advCount()?'<span class="cnt">'+advCount()+'</span>':'')+' </button></div>';
  var _cp=filters.project.length===1?filters.project[0]:'__all';
  var _cs=filters.spoc.length===1?filters.spoc[0]:'__all';
  var _projs=S.projects.filter(function(o){return o.id!=='__personal';});
  var _seen={},_sids=[];mainActs().forEach(function(a){if(_cp!=='__all'&&a.projectId!==_cp)return;(a.spocIds||[]).forEach(function(id){if(!_seen[id]){_seen[id]=1;_sids.push(id);}});});
  _sids.sort(function(x,y){return personName(x).toLowerCase()<personName(y).toLowerCase()?-1:1;});
  if(_cs!=='__all'&&_cs!=='__tbc'&&_sids.indexOf(_cs)<0)_cs='__all';
  h+='<div class="viewsel">'+
     '<div class="vs-field"><span class="vs-l">Project</span><div class="vs-sel"><select data-chg="lst-proj"><option value="__all"'+(_cp==='__all'?' selected':'')+'>All projects</option>'+_projs.map(function(o){return '<option value="'+o.id+'"'+(_cp===o.id?' selected':'')+'>'+esc(o.name)+'</option>';}).join('')+'</select>'+I('chevR')+'</div></div>'+
     '<div class="vs-field"><span class="vs-l">SPOC / Owner</span><div class="vs-sel"><select data-chg="lst-spoc"><option value="__all"'+(_cs==='__all'?' selected':'')+'>All SPOCs</option>'+_sids.map(function(id){return '<option value="'+id+'"'+(_cs===id?' selected':'')+'>'+esc(personName(id))+'</option>';}).join('')+'<option value="__none"'+(_cs==='__tbc'?' selected':'')+'>Unassigned</option></select>'+I('chevR')+'</div></div>'+
     '</div>';
  h+='<div class="chips">'+QUICKS.map(function(q){
    var n=mainActs().filter(function(a){return quickPass(a,q[0],t,mine);}).length;
    return '<button class="chip'+(filters.quick===q[0]?' on':'')+(q[0]==='overdue'?' warn':'')+
      '" data-act="quick" data-q="'+q[0]+'">'+q[1]+'<span class="n">'+n+'</span></button>';
  }).join('')+'</div>';
  var bc=bulkCount();
  if(bc){h+='<div class="bulkbar"><b>'+bc+' selected</b><button class="btn ghost mini" data-act="bulk-open">Bulk actions</button><button class="btn ghost mini" data-act="bulk-clear">Clear</button></div>';}
  var _tags=(function(){var seen={},o=[];mainActs().forEach(function(a){(a.tags||[]).forEach(function(t){var k=t.toLowerCase();if(!seen[k]){seen[k]=1;o.push(t);}});});return o.sort();})();
  if(_tags.length){
    var _sel=filters.tags||[];
    var _lbl=_sel.length?(_sel.length===1?('#'+_sel[0]):(_sel.length+' tags selected')):'All tags';
    h+='<div class="tagrow"><span class="gl">Tags</span><div class="tagdrop">'+
      '<button class="tagdrop-btn'+(_sel.length?' has':'')+(tagDropOpen?' open':'')+'" data-act="tagdrop-toggle">'+I('tag')+'<span class="td-l">'+esc(_lbl)+'</span>'+(_sel.length?'<span class="td-n">'+_sel.length+'</span>':'')+I('chevR')+'</button>'+
      (tagDropOpen?('<div class="tagdrop-scrim" data-act="tagdrop-toggle"></div><div class="tagdrop-panel">'+_tags.map(function(tg){var on=_sel.some(function(x){return x.toLowerCase()===tg.toLowerCase();});return '<button class="tagopt'+(on?' on':'')+'" data-act="tag-toggle" data-tag="'+esc(tg)+'"><span class="chk">'+(on?I('check'):'')+'</span>#'+esc(tg)+'</button>';}).join('')+(_sel.length?'<button class="tagopt clr" data-act="tags-clear">Clear selection</button>':'')+'</div>'):'')+
      '</div></div>';
  }
  var body;
  if(!list.length){body=emptyBox('No actionables found',filters.q||advCount()?'Try different search or filters.':'Add your first actionable.');}
  else {
    var byP2={},ord2=[];list.forEach(function(a){if(!byP2[a.projectId]){byP2[a.projectId]=[];ord2.push(a.projectId);}byP2[a.projectId].push(a);});
    ord2.sort(function(x,y){return projName(x).toLowerCase()<projName(y).toLowerCase()?-1:1;});
    body=ord2.map(function(pid){var its=byP2[pid];var inner=grouped(its).map(function(g){return '<div class="grp grp-sub">'+I('person')+'<span class="gt">'+esc(g.label)+'</span><span class="n">'+g.items.length+'</span></div><div class="list">'+g.items.map(function(a){return actRow(a);}).join('')+'</div>';}).join('');return '<div class="grp grp-proj">'+I('proj')+'<span class="gt">'+esc(projName(pid))+'</span><span class="n">'+its.length+'</span></div>'+inner;}).join('');
  }
  h+=body;
  return h;
}

/* ---- CALENDAR ---- */
function isoOf(y,m,d){var dt=new Date(y,m,d);return dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());}
function vCalendar(){
  if(!calState){var n=new Date();calState={y:n.getFullYear(),m:n.getMonth()};}
  var y=calState.y,mth=calState.m,t=todayISO();
  var first=new Date(y,mth,1),startIdx=(first.getDay()+6)%7,daysIn=new Date(y,mth+1,0).getDate();
  var daysPrev=new Date(y,mth,0).getDate();
  var byDay={};
  mainActs().forEach(function(a){
    if(a.etaKind==='date'&&a.eta)(byDay[a.eta]=byDay[a.eta]||[]).push(a);
    else if(a.etaKind==='range'){if(a.eta)(byDay[a.eta]=byDay[a.eta]||[]).push(a);if(a.etaEnd&&a.etaEnd!==a.eta)(byDay[a.etaEnd]=byDay[a.etaEnd]||[]).push(a);}
  });
  var cells='',total=Math.ceil((startIdx+daysIn)/7)*7;
  for(var i=0;i<total;i++){
    var dnum,iso,dim=false;
    if(i<startIdx){dnum=daysPrev-startIdx+1+i;iso=isoOf(y,mth-1,dnum);dim=true;}
    else if(i>=startIdx+daysIn){dnum=i-startIdx-daysIn+1;iso=isoOf(y,mth+1,dnum);dim=true;}
    else{dnum=i-startIdx+1;iso=isoOf(y,mth,dnum);}
    var items=byDay[iso]||[],openItems=items.filter(isOpen);
    var dots='';
    if(items.length){var col=!openItems.length?'var(--grn)':iso<=t?'var(--red)':diffDays(iso,t)<=3?'var(--amb)':'var(--acc)';var nd=Math.min(3,items.length);dots='<span class="dots">';for(var d2=0;d2<nd;d2++)dots+='<i style="background:'+col+'"></i>';dots+='</span>';}
    cells+='<button class="cell'+(dim?' dim':'')+(iso===t?' today':'')+'" data-act="day" data-d="'+iso+'"><span class="d">'+dnum+'</span>'+dots+(items.length>3?'<span class="cnt">'+items.length+'</span>':'')+' </button>';
  }
  var h=topbar('Calendar','Actionables by ETA',true,'<button class="caltoday" data-act="cal-today">Today</button>');
  h+='<div class="calhead"><button class="calnav" data-act="cal-prev">'+I('back')+'</button><div class="m" style="text-align:center">'+MON[mth]+' '+y+'</div><button class="calnav" data-act="cal-next">'+I('chevR')+'</button></div>';
  h+='<div class="dow">'+DOW.map(function(dd){return '<span>'+dd[0]+dd[1]+'</span>';}).join('')+'</div>';
  h+='<div class="calgrid">'+cells+'</div>';
  var monthKey=y+'-'+pad(mth+1);
  var inMonth=sortActs(mainActs().filter(function(a){return(a.eta&&a.eta.indexOf(monthKey)===0)||(a.etaEnd&&a.etaEnd.indexOf(monthKey)===0);}),'eta');
  h+='<div class="eyebrow">Scheduled in '+MON[mth]+'</div>';
  h+=inMonth.length?'<div class="list">'+inMonth.map(function(a){return actRow(a);}).join('')+'</div>':emptyBox('Nothing scheduled','No ETAs in '+MON[mth]+' '+y+'.');
  return h;
}

/* ---- PROJECTS ---- */
function stStat(v,l,k){return '<div class="stat" style="--k:'+k+'"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>';}
function vProjects(){
  var _projs=S.projects.filter(function(o){return o.id!=='__personal';});
  var h=topbar('Projects',_projs.length+' projects',false,
    '<button class="iconbtn" data-act="add-project">'+I('plus')+'</button>');
  h+='<div style="height:12px"></div><div class="list">'+_projs.map(function(o){
    var st=projStats(o.id);
    return '<button class="arow" data-act="proj-nav" data-id="'+o.id+'">'+
      '<div class="r1"><span class="ttl">'+esc(o.name)+'</span><span class="own">'+esc(o.code||'')+'</span><span class="sp"></span>'+I('chevR')+'</div>'+
      '<div class="r2" style="margin-top:7px">'+
      '<span class="datechip dc-fut">'+st.open+' open</span>'+
      (st.od?'<span class="datechip dc-od">'+st.od+' overdue</span>':'')+
      (st.wait?'<span class="datechip dc-soon">'+st.wait+' awaiting</span>':'')+
      (st.fu?'<span class="fu due">'+I('bell')+st.fu+'</span>':'')+
      '</div></button>';
  }).join('')+'</div>';
  h+='<div class="note">Tap a project to see Owner/SPOC breakdown. Tap + to add a project.</div>';
  return h;
}
function vProjectDetail(pid){
  var o=projById(pid);if(!o)return topbar('Project','',true,'');
  var t=todayISO(),st=projStats(pid),seg=view.params.seg||'open';
  var pool=S.actionables.filter(function(a){return a.projectId===pid;});
  if(view.params.tag){var _ptl=view.params.tag.toLowerCase();pool=pool.filter(function(a){return (a.tags||[]).some(function(t){return t.toLowerCase()===_ptl;});});}
  if(view.params.category)pool=pool.filter(function(a){return(a.categoryId||'')===view.params.category;});
  var list;
  if(seg==='open')list=pool.filter(isOpen);
  else if(seg==='awaiting')list=pool.filter(function(a){return isOpen(a)&&AWAITS.indexOf(a.status)>=0;});
  else if(seg==='overdue')list=pool.filter(function(a){return isOver(a,t);});
  else list=pool.filter(function(a){return a.status==='Completed';});
  list=seg==='done'?list.sort(function(x,y){return(y.completedAt||0)-(x.completedAt||0);}):sortActs(list,'smart');
  var h=topbar(o.name,o.code+' \u00b7 project view',true,
    '<button class="iconbtn" data-act="manage-categories" data-id="'+pid+'" title="Manage categories">'+I('tag')+'</button><button class="iconbtn" data-act="edit-proj" data-id="'+pid+'">'+I('edit')+'</button>');
  h+='<div class="stats">'+stStat(st.open,'Open','var(--acc)')+stStat(st.od,'Overdue','var(--red)')+stStat(st.wait,'Dependency','var(--amb)')+stStat(st.week,'Due this wk','var(--amb)')+stStat(st.fu,'Follow-ups','var(--pur)')+stStat(st.done30,'Done \u00b7 30d','var(--grn)')+'</div>';
  var segs=[['open','Open'],['awaiting','Dependency'],['overdue','Overdue'],['done','Completed']];
  h+='<div class="chips" style="padding-top:16px">'+segs.map(function(s2){
    return '<button class="chip'+(seg===s2[0]?' on':'')+'" data-act="proj-seg" data-id="'+pid+'" data-seg="'+s2[0]+'">'+s2[1]+'</button>';
  }).join('')+'</div>';
  var _ptags=(function(){var seen={},o=[];S.actionables.forEach(function(a){if(a.projectId!==pid)return;(a.tags||[]).forEach(function(t){var k=t.toLowerCase();if(!seen[k]){seen[k]=1;o.push(t);}});});return o.sort();})();  var _cats=activeCategories(pid);h+='<div class="chips tagchips"><button class="chip'+(!view.params.category?' on':'')+'" data-act="proj-category" data-id="'+pid+'" data-cat="">All categories</button>'+_cats.map(function(c){return '<button class="chip'+(view.params.category===c.id?' on':'')+'" data-act="proj-category" data-id="'+pid+'" data-cat="'+c.id+'">'+esc(c.name)+'</button>';}).join('')+'</div>';
  if(_ptags.length)h+='<div class="chips tagchips">'+_ptags.map(function(tg){var on=view.params.tag&&view.params.tag.toLowerCase()===tg.toLowerCase();return '<button class="chip tagf'+(on?' on':'')+'" data-act="proj-tag" data-id="'+pid+'" data-tag="'+esc(tg)+'">#'+esc(tg)+'</button>';}).join('')+'</div>';
  if(!list.length){h+=emptyBox('Nothing here','No actionables in this view.');}
  else if(seg==='open'){
    var byCat={},catOrder=[];
    list.forEach(function(a){var cid=a.categoryId||'__uncat';if(!byCat[cid]){byCat[cid]=[];catOrder.push(cid);}byCat[cid].push(a);});
    catOrder.sort(function(x,y){if(x==='__uncat')return 1;if(y==='__uncat')return -1;return categoryName(pid,x).localeCompare(categoryName(pid,y));});
    h+='<div class="project-category-sections">';
    catOrder.forEach(function(cid){var items=byCat[cid],label=cid==='__uncat'?'Uncategorised':categoryName(pid,cid);h+='<details class="category-section" open><summary><span class="cat-title">'+I('tag')+esc(label)+'</span><span class="cat-count">'+items.length+'</span><span class="cat-chevron">'+I('chevR')+'</span></summary><div class="category-section-body">'+grouped(items).map(function(g){return '<div class="grp compact-grp'+(g.key==='__tbc'?' tbc':'')+'>'+I('person')+esc(g.key==='__tbc'?'Owner/SPOC to be assigned':g.label)+'<span class="n">· '+g.items.length+'</span></div><div class="brows">'+g.items.map(boardRow).join('')+'</div>';}).join('')+'</div></details>';});
    h+='</div>';
  }else{h+='<div class="list">'+list.map(function(a){return actRow(a);}).join('')+'</div>';}
  return h;
}

/* ---- SMART WORKLOAD ---- */
function vWorkload(){
  var t=todayISO(),rows=peopleSorted().map(function(u){
    var acts=mainActs().filter(function(a){return isOpen(a)&&a.spocIds.indexOf(u.id)>=0;});
    var due=acts.filter(function(a){var e=endEta(a);return e&&diffDays(e,t)>=0&&diffDays(e,t)<=7;});
    var high=due.filter(function(a){return !!a.important;});
    var od=acts.filter(function(a){return isOver(a,t);});
    return {u:u,open:acts.length,due:due.length,high:high.length,od:od.length};
  });
  var max=Math.max(1,rows.reduce(function(m,r){return Math.max(m,r.open);},0));
  rows.sort(function(a,b){return b.open-a.open||b.high-a.high||a.u.name.localeCompare(b.u.name);});
  var h=topbar('Smart workload','Open work by owner',true,'');
  h+='<div class="chips" style="margin-top:6px"><button class="chip" data-act="people-mode">People</button><button class="chip on">Workload</button></div>';
  h+='<div class="workload-list">'+rows.map(function(r){return '<div class="workload-row"><div class="wl-head"><b>'+esc(r.u.name)+'</b><span>'+r.open+' open · '+r.due+' due this week'+(r.high?' · '+r.high+' high priority':'')+'</span></div><div class="wl-bar"><i style="width:'+Math.round((r.open/max)*100)+'%"></i></div><div class="wl-meta">'+(r.od?'<span class="hot">'+r.od+' overdue</span>':'<span>0 overdue</span>')+(r.high?'<span class="hot">'+r.high+' high priority due</span>':'')+'</div></div>';}).join('')+'</div>';
  if(rows.some(function(r){return r.high>0;}))h+='<div class="note">High-priority tasks due this week are highlighted so you can rebalance work before deadlines slip.</div>';
  return h;
}

/* ---- PEOPLE / SPOCs ---- */
function vPeople(){
  var pv=peopleView;
  var ppl=peopleSorted().slice();
  var freq={};ppl.forEach(function(u){var k=u.name.toLowerCase();freq[k]=(freq[k]||0)+1;});
  var rows=ppl.map(function(u){
    var st=personStats(u.id),sub='';
    if(freq[u.name.toLowerCase()]>1){var codes=personProjectCodes(u.id);sub=codes.length?codes[0]:('#'+String(u.id).slice(-4));}
    return {id:u.id,name:u.name,sub:sub,st:st,tbc:false};
  });
  var tb=personStats('__tbc');
  if(tb.open||tb.od||tb.fu)rows.push({id:'__tbc',name:'To be assigned',sub:'',st:tb,tbc:true});
  rows=rows.filter(function(r){
    if(pv.filt==='open')return r.st.open>0;
    if(pv.filt==='overdue')return r.st.od>0;
    if(pv.filt==='followup')return r.st.fu>0;
    return true;
  });
  var key={open:'open',overdue:'od',followup:'fu'}[pv.sort];
  if(pv.sort==='az')rows.sort(function(a,b){return a.name.toLowerCase()<b.name.toLowerCase()?-1:1;});
  else rows.sort(function(a,b){return (b.st[key]-a.st[key])||(b.st.open-a.st.open)||(a.name.toLowerCase()<b.name.toLowerCase()?-1:1);});
  var filts=[['all','All'],['open','Open'],['overdue','Overdue'],['followup','Follow-up']];
  var sorts=[['open','Highest Open'],['overdue','Highest Overdue'],['followup','Highest Follow-up'],['az','A\u2013Z']];
  var h=topbar('Owners / SPOCs',ppl.length+' people',true,'<button class="iconbtn" data-act="add-person">'+I('plus')+'</button>');
  h+='<div class="chips" style="margin-top:6px"><button class="chip on">People</button><button class="chip" data-act="workload-mode">Workload</button></div>';
  h+='<div class="chips" style="margin-top:6px">'+filts.map(function(x){return '<button class="chip'+(pv.filt===x[0]?' on':'')+'" data-act="pfilt" data-k="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
  h+='<div class="sortrow"><span>Sort by</span><select data-chg="psort">'+sorts.map(function(x){return '<option value="'+x[0]+'"'+(pv.sort===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div>';
  h+=rows.length?('<div class="list plist">'+rows.map(function(r){
    return '<button class="prow'+(r.tbc?' tbc':'')+'" data-act="person" data-id="'+r.id+'">'+
      '<span class="p-ic">'+I('person')+'</span>'+
      '<span class="p-name">'+esc(r.name)+(r.sub?'<span class="p-sub">'+esc(r.sub)+'</span>':'')+'</span>'+
      '<span class="p-stats">'+
        '<span class="p-stat p-open"><b>'+r.st.open+'</b><i>Open</i></span>'+
        '<span class="p-stat'+(r.st.od?' hot':' z')+'"><b>'+r.st.od+'</b><i>Overdue</i></span>'+
        '<span class="p-stat'+(r.st.fu?' warm':' z')+'"><b>'+r.st.fu+'</b><i>Follow-up</i></span>'+
      '</span></button>';
  }).join('')+'</div>'):emptyBox('No matches','No owners match this filter.');
  h+='<div class="note">Owner / SPOC = the person responsible for a line item. Counts exclude personal tasks.</div>';
  return h;
}

function vPersonDetail(pid){
  var isTbc=pid==='__tbc';
  var u=isTbc?{name:'To be assigned'}:personById(pid);
  if(!u)return topbar('Owner/SPOC','',true,'');
  var st=personStats(pid);
  var list=sortActs(mainActs().filter(function(a){if(!isOpen(a))return false;return isTbc?a.spocIds.length===0:a.spocIds.indexOf(pid)>=0;}),'smart');
  var codes=isTbc?[]:personProjectCodes(pid);
  var sub=isTbc?'Unassigned items':(codes.length?'Owner/SPOC \u00b7 '+codes.join(', '):'Owner/SPOC \u00b7 no active projects');
  var h=topbar(u.name,sub,true,'');
  h+='<div class="stats">'+stStat(st.open,'Open','var(--acc)')+stStat(st.od,'Overdue','var(--red)')+stStat(st.fu,'Follow-ups','var(--pur)')+'</div><div style="height:14px"></div>';
  h+=list.length?'<div class="list">'+list.map(function(a){return actRow(a);}).join('')+'</div>':emptyBox('All caught up','No open actionables here.');
  return h;
}

/* ---- REPORTS ---- */
function reportData(projId,inclPersonal,range){
  var t=todayISO(),range=range||{};
  var base=inclPersonal?S.actionables:mainActs();
  var pool=projId?base.filter(function(a){return a.projectId===projId;}):base.slice();
  if(range.from||range.to){pool=pool.filter(function(a){var d=isOpen(a)?endEta(a):isoFromMs(a.completedAt||a.updatedAt);if(!d)return false;if(range.from&&d<range.from)return false;if(range.to&&d>range.to)return false;return true;});}
  var open=pool.filter(isOpen);
  return{
    open:open,
    overdue:sortActs(open.filter(function(a){return isOver(a,t);}),'smart'),
    awaiting:sortActs(open.filter(function(a){return AWAITS.indexOf(a.status)>=0;}),'smart'),
    week:sortActs(open.filter(function(a){var e=endEta(a);return e&&diffDays(e,t)>=0&&diffDays(e,t)<=7;}),'eta'),
    upcoming:sortActs(open.filter(function(a){var e=endEta(a);return e&&diffDays(e,t)>=0&&diffDays(e,t)<=14;}),'eta'),
    fu:sortActs(open.filter(function(a){return remDue(a,t);}),'smart'),
    completed:pool.filter(function(a){return a.status==='Completed';}).sort(function(a,b){return (b.completedAt||0)-(a.completedAt||0);}),
    doneWeek:pool.filter(function(a){return a.status==='Completed'&&a.completedAt&&a.completedAt>=Date.now()-7*86400000;})
  };
}
function rn(v,l,col){return '<div class="rn"><div class="v"'+(col?' style="color:'+col+'"':'')+'>'+v+'</div><div class="l">'+l+'</div></div>';}
function vReports(){
  var d=reportData(exportSel.projId||null,false,exportSel);
  var h=topbar('Reports','Status & export',false,'');
  h+='<div class="eyebrow" style="margin-top:12px">Summary \u00b7 '+esc(fmtDY(todayISO()))+'</div>';
  h+='<div class="pane"><div class="repnum">'+rn(d.open.length,'Open')+rn(d.overdue.length,'Overdue',d.overdue.length?'var(--red)':'')+''+rn(d.awaiting.length,'Dependency',d.awaiting.length?'var(--amb)':'')+''+rn(d.fu.length,'Follow-ups',d.fu.length?'var(--pur)':'')+'</div>'+
    '<div style="font-size:.78rem;color:var(--tx2)">Due in 7 days: <b class="num">'+d.week.length+'</b> \u00b7 Completed this week: <b class="num">'+d.doneWeek.length+'</b></div></div>';
  h+='<div class="eyebrow">Export report</div>';
  h+='<div class="sect"><div class="note" style="padding:0 0 10px">Choose project and timeline before downloading. Open items use ETA; completed items use completion date.</div>'+
    '<div class="meta"><div class="fld wide"><label>Project scope</label><select data-chg="rep-proj"><option value="">All Projects</option>'+S.projects.map(function(o){return '<option value="'+o.id+'"'+(exportSel.projId===o.id?' selected':'')+'>'+esc(o.name)+'</option>';}).join('')+'</select></div>'+
    '<div class="fld wide"><label>Timeline</label><select data-chg="rep-preset"><option value="all"'+(exportSel.preset==='all'?' selected':'')+'>All dates</option><option value="today"'+(exportSel.preset==='today'?' selected':'')+'>Today</option><option value="7"'+(exportSel.preset==='7'?' selected':'')+'>Next 7 days</option><option value="30"'+(exportSel.preset==='30'?' selected':'')+'>Next 30 days</option><option value="custom"'+(exportSel.preset==='custom'?' selected':'')+'>Custom range</option></select></div>'+
    (exportSel.preset==='custom'?'<div class="fld"><label>From</label><input type="date" data-chg="rep-from" value="'+esc(exportSel.from)+'"></div><div class="fld"><label>To</label><input type="date" data-chg="rep-to" value="'+esc(exportSel.to)+'"></div>':'')+
    '</div><div class="btnrow"><button class="btn pri" data-act="do-export-pdf">'+I('dl')+'Export PDF</button><button class="btn ghost" data-act="do-export-xlsx">'+I('dl')+'Export Excel</button></div></div>';
  function section(title,list,emptyMsg){
    h+='<div class="eyebrow">'+title+' \u00b7 '+list.length+'</div>';
    h+=list.length?'<div class="list">'+list.slice(0,8).map(function(a){return actRow(a);}).join('')+'</div>':emptyBox(emptyMsg,'');
  }
  section('Overdue / Breached',d.overdue,'Nothing overdue.');
  section('Blocked \u00b7 dependency',d.awaiting,'Nothing blocked on a dependency.');
  section('Follow-ups due',d.fu,'No follow-ups due.');
  section('Upcoming ETAs \u00b7 14 days',d.upcoming,'Nothing scheduled soon.');
  return h;
}

/* ---- NOTIFICATIONS ---- */
function vNotifications(){
  var m=metrics(),t=todayISO();
  var total=m.overdue.length+m.today.length+m.remDueL.length;
  var h=topbar('Notifications',total?total+' need attention':'All clear',true,total?'<button class="iconbtn" data-act="notif-read" title="Mark read">'+I('check')+'</button>':'');
  h+='<div style="height:12px"></div>';
  var any=false;
  function block(title,cls,icon,items,subFn){
    if(!items.length)return;any=true;
    h+='<div class="eyebrow">'+title+' \u00b7 '+items.length+'</div><div class="list">'+
      items.map(function(a){return '<button class="notif '+cls+'" data-act="open" data-id="'+a.id+'">'+
        '<span class="ic">'+I(icon)+'</span><span class="w">'+
        '<div class="h">'+ttlHtml(a)+'</div>'+
        '<div class="b">'+esc(subFn(a))+'</div>'+
        '<div class="b" style="color:var(--tx3)">'+esc(spocLabel(a))+' \u00b7 '+esc(projCode(a.projectId))+'</div>'+
        '</span>'+etaView(a)+'</button>';}).join('')+'</div>';
  }
  block('Overdue / Breached','n-od','alert',sortActs(m.overdue,'smart'),function(a){return 'Was due '+fmtD(endEta(a));});
  block('Due today','n-due','clock',m.today,function(a){return a.task;});
  block('Follow-ups due','n-fu','bell',sortActs(m.remDueL,'smart'),function(a){return a.rem.note||'Follow up';});
  block('Due tomorrow','n-due','clock',m.tomorrow,function(a){return a.task;});
  if(!any)h+=emptyBox('All caught up','No overdue items, due dates or follow-ups today.');
  h+='<div class="note">Daily brief fires at '+pad(S.settings.notifHour)+':'+pad(S.settings.notifMinute)+'. Change in Settings.</div>';
  return h;
}

function themeLabel(t){return t==='light'?'Light':t==='high-contrast'?'High Contrast':'Dark AMOLED';}
function themeNext(t){return t==='dark'?'light':(t==='light'?'high-contrast':'dark');}

/* ---- SETTINGS ---- */
function vSettings(){
  var s=S.settings;
  var names=[];S.people.forEach(function(u){if(names.indexOf(u.name)<0)names.push(u.name);});
  if(names.indexOf(s.userName)<0)names.unshift(s.userName);
  var theme=s.theme||'dark';
  var h=topbar('Settings','Actionables v'+(A&&A.version?A.version():'2.0')+' \u00b7 offline',true,'');
  h+='<div style="height:12px"></div>';
  h+='<div class="eyebrow">Appearance</div><div class="pane">'+
    '<div class="fld"><label>Theme</label><select data-chg="set-theme">'+
      '<option value="dark"'+(theme==='dark'?' selected':'')+'>Dark AMOLED · normal</option>'+
      '<option value="light"'+(theme==='light'?' selected':'')+'>Light · normal</option>'+
      '<option value="high-contrast"'+(theme==='high-contrast'?' selected':'')+'>High Contrast · maximum visibility</option>'+
    '</select><div class="hint">High Contrast increases text, border and focus visibility for daily updates.</div></div>'+
    '<div class="theme-preview-row"><span class="theme-preview-swatch" data-theme-preview="'+esc(theme)+'"></span><span><b>'+themeLabel(theme)+'</b><small>Current appearance</small></span></div>'+
    '<div class="fld" style="margin-top:16px"><label>Accent colour</label>'+
    '<div class="swatches">'+Object.keys(ACCENTS).map(function(k){var a=ACCENTS[k];var on=(s.accent||'orange')===k;return '<button class="swatch'+(on?' on':'')+'" data-act="set-accent" data-k="'+k+'" style="--sw:'+a.c+'" title="'+a.name+'">'+(on?I('check'):'')+'</button>';}).join('')+'</div></div>'+
    '<div class="fld" style="margin-top:16px"><label>Daily update density</label><select data-chg="set-density"><option value="comfortable"'+((s.density||'comfortable')==='comfortable'?' selected':'')+'>Comfortable · easier reading</option><option value="compact"'+(s.density==='compact'?' selected':'')+'>Compact · more tasks on screen</option></select><div class="hint">Compact is useful for daily bulk review.</div></div>'+
    '<div class="fld" style="margin-top:16px"><label>Font style</label>'+
    '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:4px">'+FONTS.map(function(fo){var on=(s.font||'default')===fo[0];return '<button class="chip'+(on?' on':'')+'" data-act="set-font" data-k="'+fo[0]+'" style="font-family:'+FONT_STACK[fo[0]]+'">'+fo[1]+'</button>';}).join('')+'</div></div>'+
    '</div>';
  h+='<div class="eyebrow">You</div><div class="pane">'+
    '<div class="fld"><label>Your name \u00b7 drives \u201cMine\u201d filter</label>'+
    '<select data-chg="set-name">'+names.map(function(n){return '<option'+(s.userName===n?' selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select></div></div>';
  h+='<div class="eyebrow">Daily brief</div><div class="pane">'+
    '<div class="togglerow"><span class="t">Notify about overdue, due &amp; follow-ups</span>'+
    '<button class="switch'+(s.notifEnabled?' on':'')+'" data-act="toggle-notif"><i></i></button></div>'+
    '<div class="fld" style="margin-top:10px"><label>Brief time</label>'+
    '<input type="time" data-chg="set-time" value="'+pad(s.notifHour)+':'+pad(s.notifMinute)+'"'+(s.notifEnabled?'':' disabled')+'></div></div>';
  if(A&&A.notifState){
    var ns=notifState();
    var nsL=ns==='granted'?'Allowed':(ns==='denied'?'Not allowed':(ns==='na'?'On \u00b7 manage in system settings':'Browser-managed'));
    var nsC=ns==='granted'?'var(--grn)':(ns==='denied'?'var(--amb)':'var(--tx2)');
    h+='<div class="eyebrow">Permissions</div><div class="pane">'+
      '<div class="togglerow"><span class="t" style="display:flex;align-items:center;gap:7px">'+I('bell')+'Notifications \u00b7 <b style="color:'+nsC+'">'+nsL+'</b></span>'+
      (ns==='denied'?'<button class="btn pri mini" data-act="perm-notif">Allow</button>':'')+'</div>'+
      '<div class="note" style="padding:9px 0 2px;line-height:1.55">Actionables only needs <b>notification</b> access \u2014 for the daily brief and follow-up reminders. It does <b>not</b> use microphone, camera, location, contacts or accessibility. Internet access (for sync &amp; AI) is a normal permission Android doesn\u2019t list separately.</div>'+
      '<div class="btnrow" style="margin-top:8px"><button class="btn ghost" data-act="perm-test">'+I('bell')+'Send test notification</button>'+
      '<button class="btn ghost" data-act="perm-appinfo">'+I('sliders')+'Open app info</button></div>'+
      '</div>';
  }
  h+='<div class="eyebrow">Data</div><div class="pane">'+
    '<button class="rowline" data-act="backup">'+I('dl')+'<span class="t">Back up data<br><span class="s">Export all data to JSON file (Downloads)</span></span>'+I('chevR')+'</button>'+
    '<button class="rowline" data-act="import">'+I('edit')+'<span class="t">Import backup<br><span class="s">Restore from a JSON backup file</span></span>'+I('chevR')+'</button>'+
    '<button class="rowline" data-act="tmpl-download">'+I('dl')+'<span class="t">Download data template (Excel)<br><span class="s">Export all data to an editable .xlsx</span></span>'+I('chevR')+'</button>'+
    '<button class="rowline" data-act="tmpl-import">'+I('doc')+'<span class="t">Update from template<br><span class="s">Load an edited .xlsx to update &amp; add items</span></span>'+I('chevR')+'</button>'+
    '<button class="rowline" data-act="tag-manage">'+I('filter')+'<span class="t">Manage tags<br><span class="s">Rename or delete tags across all tasks</span></span>'+I('chevR')+'</button>'+
    '<button class="rowline" data-act="versions-open">'+I('clock')+'<span class="t">Version history<br><span class="s">Roll back to a recent saved state</span></span>'+I('chevR')+'</button>'+
    '<button class="rowline" data-act="reseed">'+I('doc')+'<span class="t">Reset to original data<br><span class="s">Replace all data with the BCP / ICICI / SCB demo set</span></span>'+I('chevR')+'</button>'+
    '</div>';
  /* Sync (Firebase) */
  var cloudOn=!!(window.Cloud&&window.Cloud.configured&&window.Cloud.configured());
  var cst=(window.Cloud&&window.Cloud.status)?window.Cloud.status():{configured:false};
  h+='<div class="eyebrow">Sync</div><div class="pane">';
  if(cloudOn){
    h+='<div class="togglerow"><span class="t">'+I('cloud')+' Cloud sync \u00b7 <b style="color:var(--acc)">'+esc(cst.label||'')+'</b></span>'+
      (cst.signedIn?'<button class="btn ghost mini" data-act="cloud-signout">Sign out</button>':'')+'</div>'+
      (cst.email?'<div class="note" style="padding:8px 0 0">Signed in as '+esc(cst.email)+'. Changes sync across every device signed in with this account.</div>'
        :'<div class="note" style="padding:8px 0 0">Sign in on the cloud screen to start syncing.</div>');
  }else{
    h+='<div class="togglerow"><span class="t">'+I('cloud')+' Cloud sync \u00b7 <b>off</b></span></div>'+
      '<div class="note" style="padding:8px 0 0">Data is stored on this device only. To sync across browsers and devices, add your Firebase config in <b>firebase-config.js</b> and reload — see the hosting README.</div>';
  }
  h+='</div>';
  h+='<div class="note">Actionables \u00b7 '+(cloudOn?'offline-first with cloud sync':'fully offline \u00b7 data stays on this device')+'.</div>';
  h+='<div class="appcredit">Developed by <b>Vishal</b><span>For personal use only</span></div>';
  return h;
}

/* ====== SHEETS / OVERLAYS ====== */
function openSheet(html,opts){
  opts=opts||{};
  var wrap=$('#sheets');
  var scrim=document.createElement('div');scrim.className='scrim';
  var sh=document.createElement('div');sh.className='sheet'+(opts.full?' full':'');
  sh.innerHTML=(opts.full?'':'<div class="grab"></div>')+html;
  wrap.appendChild(scrim);wrap.appendChild(sh);
  requestAnimationFrame(function(){scrim.classList.add('in');sh.classList.add('in');});
  var rec={scrim:scrim,sheet:sh,tag:opts.tag||'',data:opts.data||null};
  scrim.addEventListener('click',function(){closeSheet(rec);});
  sheetStack.push(rec);return rec;
}
function closeSheet(rec){
  var idx=sheetStack.indexOf(rec===undefined?sheetStack[sheetStack.length-1]:rec);
  if(idx<0)return;rec=sheetStack[idx];sheetStack.splice(idx,1);
  rec.scrim.classList.remove('in');rec.sheet.classList.remove('in');
  setTimeout(function(){if(rec.scrim.parentNode)rec.scrim.parentNode.removeChild(rec.scrim);if(rec.sheet.parentNode)rec.sheet.parentNode.removeChild(rec.sheet);},210);
}
function closeTop(){if(sheetStack.length)closeSheet(sheetStack[sheetStack.length-1]);}
function sheetFor(tag){for(var i=sheetStack.length-1;i>=0;i--)if(sheetStack[i].tag===tag)return sheetStack[i];return null;}
function confirmSheet(title,msg,okLabel,danger,cb){
  var rec=openSheet('<div class="shead"><h2>'+esc(title)+'</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody"><p style="color:var(--tx2);font-size:.86rem">'+esc(msg)+'</p>'+
    '<div class="btnrow"><button class="btn ghost" data-act="close-sheet">Cancel</button>'+
    '<button class="btn '+(danger?'danger':'pri')+'" data-act="confirm-ok">'+esc(okLabel)+'</button></div></div>',{tag:'confirm'});
  rec.onOk=cb;
}
function inputSheet(title,placeholder,cb){
  var rec=openSheet('<div class="shead"><h2>'+esc(title)+'</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody"><input id="inpS" placeholder="'+esc(placeholder)+'" autocomplete="off">'+
    '<div class="btnrow"><button class="btn ghost" data-act="close-sheet">Cancel</button>'+
    '<button class="btn pri" data-act="input-ok">Save</button></div></div>',{tag:'input'});
  rec.onOk=cb;setTimeout(function(){var i=$('#inpS',rec.sheet);if(i)i.focus();},260);
}
function personSheet(cb){
  var rec=openSheet('<div class="shead"><h2>New Owner/SPOC</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody"><div class="fld"><label>Name</label><input id="npName" placeholder="Person\u2019s name" autocomplete="off"></div>'+
    '<div class="note" style="padding:10px 0 0">SPOCs are global \u2014 the same person can be assigned across any project.</div>'+
    '<div class="btnrow"><button class="btn ghost" data-act="close-sheet">Cancel</button>'+
    '<button class="btn pri" data-act="person-ok">Add Owner/SPOC</button></div></div>',{tag:'newperson'});
  rec.onOk=cb;setTimeout(function(){var i=$('#npName',rec.sheet);if(i)i.focus();},260);
}

/* ---- DETAIL SHEET ---- */
function openDetail(id){
  var rec=openSheet('<div class="shead"><h2></h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div><div class="sbody"></div>',
    {full:true,tag:'detail',data:{id:id}});
  renderDetail(rec);
}
function renderDetail(rec){
  var a=actById(rec.data.id);if(!a){closeSheet(rec);return;}
  var t=todayISO(),od=isOver(a,t);
  $('.shead h2',rec.sheet).innerHTML=ttlHtml(a);
  var b='';
  b+='<button class="impbtn'+(a.important?' on':'')+'" data-act="d-important">'+I('star')+(a.important?'Marked important':'Mark important')+'</button>';
  b+='<div class="nextact'+(od?' od':'')+(etaState(a)==='severe'?' severe':'')+'">'+
    '<div class="na-head"><span class="na-l">'+(od?'OVERDUE':'DESCRIPTION / TASK')+'</span>'+etaView(a)+'</div>'+
    '<div class="t">'+esc(a.task)+'</div>'+
    (a.ticketUrl?'<a class="linkchip" href="'+esc(a.ticketUrl)+'">'+I('ext')+'Open ticket</a>':'')+
    '</div>';
  b+='<div class="eyebrow" style="padding:2px 0 8px">Details</div><div class="meta">'+
    '<div class="fld"><label>Project</label><div class="kv">'+esc(projName(a.projectId))+'</div></div>'+
    '<div class="fld"><label>Ticket / Ref ID</label><div class="kv num">'+esc(a.ticket||'N/A')+'</div></div>'+
    '<div class="fld wide"><label>Line item</label><div class="kv">'+esc(a.lineItem)+'</div></div>'+
    '<div class=\"fld\"><label>Assigned date</label><input type=\"date\" class=\"date-edit\" data-chg=\"d-assigned\" value=\"'+esc(assignedDateISO(a)||createdDateISO(a))+'\"></div>'+
    '<div class=\"fld\"><label>Age</label><div class=\"kv\"><span class=\"agechip '+agingBucket(agingDays(a)).cls+'\">'+agingDays(a)+' day'+(agingDays(a)===1?'':'s')+'</span></div></div>'+
    '<div class=\"fld\"><label>Last updated</label><div class=\"kv\">'+esc(fmtDY(updatedDateISO(a)||createdDateISO(a)))+'</div></div>'+
    '</div>';
  if(staleDays(a)>=7)b+='<div class="stale-note">'+I('clock')+' No update for '+staleDays(a)+' days. Review this actionable.</div>';
  b+='<div class="eyebrow" style="padding:16px 0 8px">Owner / SPOC</div>';
  var _assigned=a.spocIds.map(function(id){return '<button class="ownchip sel" data-act="d-spoc" data-id="'+id+'">'+I('check')+'<span>'+esc(personName(id))+'</span><b>\u00d7</b></button>';}).join('');
  var _avail=peopleSorted().filter(function(u){return a.spocIds.indexOf(u.id)<0;});
  b+='<div class="ownsel"><div class="ownchips">'+(_assigned||'<span class="ownchip tbc">'+I('person')+'<span>To be assigned</span></span>')+'</div>'+
    '<select class="dspoc-sel" data-chg="d-spoc-add"><option value="">+ Add owner\u2026</option>'+_avail.map(function(u){return '<option value="'+u.id+'">'+esc(u.name)+'</option>';}).join('')+'<option value="__new">+ New person\u2026</option></select></div>';
  b+='<div class="eyebrow" style="padding:16px 0 8px">Category</div><div class="meta"><div class="fld wide"><select data-chg="d-category"><option value="">Uncategorised</option>'+activeCategories(a.projectId).map(function(c){return '<option value="'+c.id+'"'+(a.categoryId===c.id?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select></div></div>';
  b+='<div class="eyebrow" style="padding:16px 0 8px">Tags</div>'+tagEditHtml(a.tags,'d-tag-del','d-tag-add','d-tag-addbuf','dTagIn');
  b+='<div class="eyebrow" style="padding:16px 0 8px">Timeline</div><div class="meta">'+
    '<div class="fld"><label>Status</label><select data-chg="d-status">'+
    STATUSES.map(function(s){return '<option'+(s===a.status?' selected':'')+'>'+s+'</option>';}).join('')+
    '</select></div>'+
    '<div class="fld"><label>Type</label><select data-chg="d-type">'+
    (S.taskTypes.indexOf(a.type||'Activity')<0?'<option value="'+esc(a.type)+'" selected>'+esc(a.type)+'</option>':'')+S.taskTypes.map(function(tp){return '<option value="'+esc(tp)+'"'+((a.type||'Activity')===tp?' selected':'')+'>'+esc(tp)+'</option>';}).join('')+'<option value="__newtype">+ New\u2026</option></select></div>'+
    '<div class="fld"><label>ETA type</label><select data-chg="d-etakind">'+
    ETA_KINDS.map(function(k){return '<option value="'+k[0]+'"'+(a.etaKind===k[0]?' selected':'')+'>'+k[1]+'</option>';}).join('')+
    '</select></div>'+
    (a.etaKind==='date'?'<div class="fld wide"><label>ETA date</label><input type="date" onclick="try{this.showPicker()}catch(_){}" data-chg="d-eta" value="'+esc(a.eta)+'"></div>':'')+
    (a.etaKind==='range'?'<div class="fld"><label>From</label><input type="date" onclick="try{this.showPicker()}catch(_){}" data-chg="d-eta" value="'+esc(a.eta)+'"></div><div class="fld"><label>To</label><input type="date" onclick="try{this.showPicker()}catch(_){}" data-chg="d-etaend" value="'+esc(a.etaEnd)+'"></div>':'')+
    '</div>';
  if(a.recurrence&&a.recurrence.enabled)b+='<div class="eyebrow" style="padding:16px 0 8px">Recurrence</div><div class="note" style="padding:0">'+esc(recurrenceLabel(a.recurrence))+(a.recurrence.endDate?' · ends '+esc(fmtDY(a.recurrence.endDate)):'')+' · next occurrence is created when this item is completed.</div>';
  var r=a.rem||{on:false};
  if(r.on){
    var due=remDue(a,t);
    b+='<div class="remcard'+(due?' due':'')+(r.done?' done':'')+'">'+
      '<div class="rh">'+I('bell')+(r.done?'Follow-up completed':due?'Follow-up due':'Follow-up reminder')+(r.waitingFor&&!r.done?'<span class="agechip age-watch" style="margin-left:auto">Waiting '+followupAgeLabel(a,t)+'</span>':'')+'</div>';
    if(r.done){
      b+='<div style="font-size:.8rem;color:var(--tx2);margin-top:8px">'+esc(r.note||'Follow-up')+'</div>'+
        '<div class="btnrow" style="margin-top:10px"><button class="btn ghost mini" data-act="rem-react">Reactivate</button><button class="btn ghost mini" data-act="rem-remove">Remove</button></div>';
    }else{
      b+='<div class="remgrid"><div class="fld wide"><label>Waiting for</label><input data-chg="rem-waiting" value="'+esc(r.waitingFor||'')+'" placeholder="e.g. ICICI Bank / Kumar"></div>'+
        '<div class="fld"><label>Requested on</label><input type="date" data-chg="rem-requested" value="'+esc(r.requestedOn||'')+'"></div>'+
        '<div class="fld"><label>Expected by</label><input type="date" data-chg="rem-expected" value="'+esc(r.expectedBy||'')+'"></div>'+
        '<div class="fld"><label>Next follow-up</label><input type="date" data-chg="rem-date" value="'+esc(r.date)+'"></div>'+
        '<div class="fld"><label>Time</label><input type="time" data-chg="rem-time" value="'+esc(r.time)+'"></div>'+
        '<div class="fld wide"><label>Follow-up note</label><input data-chg="rem-note" value="'+esc(r.note)+'" placeholder="What to chase…"></div></div>'+
        '<div class="btnrow" style="margin-top:10px"><button class="btn ok mini" data-act="rem-done">'+I('check')+'Done</button>'+
        '<button class="btn ghost mini" data-act="rem-snooze" data-n="1">+1d</button><button class="btn ghost mini" data-act="rem-snooze" data-n="3">+3d</button>'+
        '<button class="btn ghost mini" data-act="rem-snooze" data-n="7">+1w</button><button class="btn ghost mini" data-act="rem-remove">'+I('x')+'</button></div>';
    }
    b+='</div>';
  }else{b+='<div class="btnrow"><button class="btn ghost" data-act="rem-add">'+I('bell')+'Add follow-up reminder</button></div>';}
  if(a.notes)b+='<div class="fld wide" style="margin-top:14px"><label>Remarks</label><div class="kv" style="align-items:flex-start;white-space:pre-wrap;font-size:.8rem;line-height:1.5">'+esc(a.notes)+'</div></div>';
  b+='<div class="btnrow">'+(a.status==='Completed'?'<button class="btn ghost" data-act="d-reopen">Reopen</button>':'<button class="btn ok" data-act="d-complete">'+I('check')+'Mark completed</button>')+
    '<button class="btn ghost" data-act="d-edit">'+I('edit')+'Edit</button></div>';
  b+='<div class="eyebrow" style="margin:20px 0 8px;padding:0">Comments \u00b7 '+a.comments.length+'</div>';
  b+='<div class="cmtcompose"><input id="cmtIn" placeholder="Add a comment\u2026"><div class="cmtbtns"><button class="btn ghost mini" data-act="d-cmt-rephrase">'+I('spark')+'Rephrase</button><button class="btn pri mini" data-act="d-comment">Add</button></div></div>';
  b+=a.comments.map(function(c,idx){return {c:c,i:idx};}).reverse().map(function(o){
    var c=o.c,ci=o.i,edt=(c.edited?' \u00b7 edited':'');
    if(rec.data.editCmt===ci){
      return '<div class="cmt editing"><div class="h"><b>'+esc(c.user)+'</b><span class="num">'+fmtTs(c.ts)+edt+'</span></div><textarea id="cmtEdit" class="cmtedit-ta">'+esc(c.text)+'</textarea><div class="cmtbtns"><button class="btn ghost mini" data-act="d-cmt-editcancel">Cancel</button><button class="btn pri mini" data-act="d-cmt-editsave" data-i="'+ci+'">Save</button></div></div>';
    }
    return '<div class="cmt"><div class="h"><b>'+esc(c.user)+'</b><span class="num">'+fmtTs(c.ts)+edt+'</span><span class="cmt-acts"><button class="cmt-ic" data-act="d-cmt-edit" data-i="'+ci+'" title="Edit">'+I('edit')+'</button><button class="cmt-ic" data-act="d-cmt-del" data-i="'+ci+'" title="Delete">'+I('trash')+'</button></span></div><div class="b">'+esc(c.text)+'</div></div>';
  }).join('');
  b+='<div class=\"btnrow\" style=\"margin-top:16px\"><button class=\"btn ghost mini\" data-act=\"d-restore-point\">'+I('clock')+'Create restore point</button><button class=\"btn ghost mini\" data-act=\"versions-open\">View restore history</button></div>';

  b+='<button class="actitoggle" data-act="d-act-toggle"><span>Activity \u00b7 '+a.activity.length+'</span><span class="chev">'+(rec.data.actOpen?'\u25be':'\u25b8')+'</span></button>';
  if(rec.data.actOpen){
    b+='<div class="timeline" style="margin-top:8px">'+a.activity.slice().reverse().map(function(ev){
      var chg=ev.from||ev.to?'<div class="chg">'+(ev.from?'<span class="fr">'+esc(ev.from)+'</span>':'')+esc(ev.to)+'</div>':'';
      return '<div class="tl"><span class="dot2"></span><div class="w"><div class="e"><b>'+esc(ev.event)+'</b> \u00b7 '+esc(ev.user)+'</div>'+chg+'<div class="ts">'+fmtTs(ev.ts)+'</div></div></div>';
    }).join('')+'</div>';
  }
  b+='<div class="btnrow" style="margin-top:18px"><button class="btn danger" data-act="d-delete">'+I('trash')+'Delete</button></div>';
  b+='<div class="note" style="margin:12px 0 0;padding:0">Created '+fmtTs(a.createdAt)+(a.completedAt?' \u00b7 completed '+fmtTs(a.completedAt):'')+' </div>';
  $('.sbody',rec.sheet).innerHTML=b;
}

/* ---- ADD / EDIT FORM ---- */
function openForm(id,prefill){
  var a=id?actById(id):null,f;
  var quick=!!(prefill&&prefill.quick);
  if(a){
    f={projectId:a.projectId,ticket:a.ticket,ticketUrl:a.ticketUrl,lineItem:a.lineItem,task:a.task,
      spocIds:a.spocIds.slice(),assignedAt:a.assignedAt||null,etaKind:a.etaKind,eta:a.eta,etaEnd:a.etaEnd,
      remOn:a.rem&&a.rem.on,remDate:a.rem?a.rem.date:'',remTime:a.rem?a.rem.time:'',remNote:a.rem?a.rem.note:'',remWaiting:a.rem?a.rem.waitingFor:'',remRequested:a.rem?a.rem.requestedOn:'',remExpected:a.rem?a.rem.expectedBy:'',
      recurrence:a.recurrence||{enabled:false,freq:'weekly',interval:1,unit:'week',endDate:'',seriesId:a.id},
      status:a.status,notes:a.notes,important:!!a.important,tags:(a.tags||[]).slice(),type:a.type||'Activity',categoryId:a.categoryId||'',quick:false};
  }else{
    var P=prefill||{};
    var proj=quick?'__personal':(P.projectId||(S.projects[0]?S.projects[0].id:''));
    f={projectId:proj,ticket:P.ticket||'',ticketUrl:'',lineItem:P.lineItem||'',task:P.task||'',spocIds:P.spocIds?P.spocIds.slice():[],
      assignedAt:P.assignedAt!==undefined?P.assignedAt:Date.now(),etaKind:P.etaKind||(P.eta?'date':'none'),eta:P.eta||'',etaEnd:P.etaEnd||'',
      remOn:false,remDate:'',remTime:'',remNote:'',remWaiting:'',remRequested:'',remExpected:'',recurrence:P.recurrence||{enabled:false,freq:'weekly',interval:1,unit:'week',endDate:'',seriesId:''},status:P.status||'In Progress',notes:P.notes||'',
      important:!!P.important,tags:(P.tags||[]).slice(),type:P.type||'Activity',categoryId:P.categoryId||'',quick:quick};
  }
  if(a&&prefill&&prefill.aiPatch){var ap=prefill.aiPatch;Object.keys(ap).forEach(function(k){if(k==='spocIds')f.spocIds=(ap[k]||[]).slice();else if(k==='tags')f.tags=(ap[k]||[]).slice();else if(k==='important')f.important=!!ap[k];else if(Object.prototype.hasOwnProperty.call(f,k))f[k]=ap[k];});}
  var title=id?'Edit actionable':(quick?'Quick task':'Add actionable');
  var isAIReview=!!(prefill&&prefill.aiReview);
  var rec=openSheet('<div class="shead"><h2>'+title+'</h2>'+
    '<button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody"></div>'+
    '<div class="sfoot">'+
    (isAIReview?'<button class="btn ghost" data-act="ai-review-reject">Reject</button>':'<button class="btn ghost" data-act="close-sheet">Cancel</button>')+
    '<button class="btn pri" data-act="form-save">'+(isAIReview?'Save change':'Save')+'</button></div>',
    {full:!quick,tag:'form',data:{id:id||'',f:f,aiReview:isAIReview,aiReviewSource:(prefill&&prefill.aiReviewSource)||'',
      aiPendingKind:(prefill&&prefill.aiPendingKind)||'',aiPendingIndex:(prefill&&prefill.aiPendingIndex),
      aiPendingItem:(prefill&&prefill.aiPendingItem)||null}});
  renderForm(rec);
}
function renderForm(rec){
  var f=rec.data.f;
  f.spocIds=f.spocIds.filter(function(id){return !!personById(id);});
  var impToggle='<div class="togglerow"><span class="t" style="display:flex;align-items:center;gap:7px">'+I('star')+'Mark as important</span><button class="switch imp'+(f.important?' on':'')+'" data-act="f-important"><i></i></button></div>';
  if(f.quick){
    var bq='<div class="meta">'+
      '<div class="fld wide"><label>Task <span class="req">*</span></label><input data-chg="f-line" placeholder="e.g. Prepare weekly status deck" value="'+esc(f.lineItem)+'"></div>'+
      '<div class="fld wide"><label>Type</label>'+typePickHtml(f)+'</div>'+
      '<div class="fld wide"><label>Status</label>'+statusPickHtml(f,false)+'</div>'+
      '<div class="fld wide"><label>ETA</label>'+etaPickHtml(f)+'</div>'+
      '<div class="fld wide"><label>Priority</label>'+impToggle+'</div>'+
      '<div class="fld wide"><label>Tags</label>'+tagEditHtml(f.tags,'f-tag-del','f-tag-add','f-tag-addbuf','fTagIn')+'</div>'+
      '<div class="fld wide"><label>Notes \u00b7 optional</label><textarea data-chg="f-task" placeholder="Any details\u2026">'+esc(f.task)+'</textarea></div>'+
      '</div>'+
      '<div class="note">Personal task \u00b7 no owner. Filed under the <b>Personal</b> project.</div>';
    $('.sbody',rec.sheet).innerHTML=bq;updateSaveBtn(rec,f);wireOwnerSearch(rec);return;
  }
  var aiReviewBanner=rec.data.aiReview?'<div class="ai-review-banner"><span>'+I('spark')+'</span><div><b>AI suggested changes — review before saving</b><small>Review the pre-filled values and edit any field you want. Nothing is saved until you click Save.</small></div></div>':'';
  var b=
    aiReviewBanner+
    '<div class="sech first">Basic details</div><div class="meta">'+
      '<div class="fld wide"><label>1 \u00b7 Line item <span class="req">*</span></label><input data-chg="f-line" placeholder="e.g. ORP-3902 Downtime requirement" value="'+esc(f.lineItem)+'"></div>'+
      '<div class="fld wide"><label>2 \u00b7 Description \u00b7 latest update <span class="req">*</span></label><textarea data-chg="f-task" placeholder="e.g. Bank to confirm downtime of 3\u20135 days.">'+esc(f.task)+'</textarea></div>'+
      '<div class="fld wide"><label>3 \u00b7 Project <span class="req">*</span></label><select data-chg="f-proj">'+
        S.projects.map(function(o){return '<option value="'+o.id+'"'+(f.projectId===o.id?' selected':'')+'>'+esc(o.name)+'</option>';}).join('')+'<option value="__new">+ New project\u2026</option></select></div>'+
      '<div class="fld wide"><label>Category</label><select data-chg="f-category"><option value="">Uncategorised</option>'+activeCategories(f.projectId).map(function(c){return '<option value="'+c.id+'"'+(f.categoryId===c.id?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select><div class="hint">Organise this actionable inside the selected project.</div></div>'+
      '<div class="fld wide"><label>Type</label>'+typePickHtml(f)+'</div>'+
      '<div class="fld"><label>4 \u00b7 Ticket / Ref ID</label><input data-chg="f-ticket" placeholder="e.g. ORP-3902" value="'+esc(f.ticket)+'" autocapitalize="characters"></div>'+
      '<div class="fld"><label>Ticket link \u00b7 optional</label><input data-chg="f-url" inputmode="url" placeholder="https://\u2026" value="'+esc(f.ticketUrl)+'"></div>'+
    '</div>'+
    '<div class="sech">Assignment</div><div class="meta">'+
      '<div class="fld wide"><label>5 \u00b7 Owner / SPOC</label>'+ownerSelHtml(f)+'</div>'+
      '<div class="fld"><label>Assigned date</label><input type="date" data-chg="f-assigned" value="'+esc(f.assignedAt?isoFromMs(f.assignedAt):todayISO())+'"></div>'+
      '<div class="fld"><label>Age</label><div class="kv readonly-calc">'+(rec.data.id?agingDays(actById(rec.data.id)):'0')+' days · calculated</div></div>'+
      '<div class="fld wide"><label>6 \u00b7 Priority</label>'+impToggle+'</div>'+
      '<div class="fld wide"><label>7 \u00b7 Tags</label>'+tagEditHtml(f.tags,'f-tag-del','f-tag-add','f-tag-addbuf','fTagIn')+'</div>'+
    '</div>'+
    '<div class="sech">Schedule</div><div class="meta">'+
      '<div class="fld wide"><label>8 \u00b7 Status <span class="req">*</span></label>'+statusPickHtml(f,!!rec.data.id)+'</div>'+
      '<div class="fld wide"><label>9 \u00b7 ETA</label>'+etaPickHtml(f)+'</div>'+
      '<div class="fld wide"><label>10 · Follow-up management</label><select data-chg="f-remon"><option value=""'+(f.remOn?'':' selected')+'>No follow-up</option><option value="1"'+(f.remOn?' selected':'')+'>Track follow-up</option></select></div>'+
      (f.remOn?'<div class="fld wide"><label>Waiting for</label><input data-chg="f-remwaiting" placeholder="e.g. ICICI Bank / Kumar" value="'+esc(f.remWaiting)+'"></div><div class="fld"><label>Requested on</label><input type="date" data-chg="f-remrequested" value="'+esc(f.remRequested)+'"></div><div class="fld"><label>Expected by</label><input type="date" data-chg="f-remexpected" value="'+esc(f.remExpected)+'"></div><div class="fld"><label>Next follow-up</label><input type="date" data-chg="f-remdate" value="'+esc(f.remDate)+'"></div><div class="fld"><label>Time · optional</label><input type="time" data-chg="f-remtime" value="'+esc(f.remTime)+'"></div><div class="fld wide"><label>Follow-up note</label><input data-chg="f-remnote" placeholder="What to chase…" value="'+esc(f.remNote)+'"></div>':'')+
      '<div class="fld wide"><label>11 · Recurrence</label><select data-chg="f-recur"><option value="none"'+(!f.recurrence.enabled?' selected':'')+'>Does not repeat</option><option value="daily"'+(f.recurrence.enabled&&f.recurrence.freq==='daily'?' selected':'')+'>Daily</option><option value="weekly"'+(f.recurrence.enabled&&f.recurrence.freq==='weekly'?' selected':'')+'>Weekly</option><option value="monthly"'+(f.recurrence.enabled&&f.recurrence.freq==='monthly'?' selected':'')+'>Monthly</option><option value="custom"'+(f.recurrence.enabled&&f.recurrence.freq==='custom'?' selected':'')+'>Custom</option></select></div>'+
      (f.recurrence.enabled?'<div class="fld"><label>Every</label><input type="number" min="1" max="365" data-chg="f-recur-int" value="'+esc(String(f.recurrence.interval||1))+'"></div>'+(f.recurrence.freq==='custom'?'<div class="fld"><label>Unit</label><select data-chg="f-recur-unit"><option value="day"'+(f.recurrence.unit==='day'?' selected':'')+'>Days</option><option value="week"'+(f.recurrence.unit==='week'?' selected':'')+'>Weeks</option><option value="month"'+(f.recurrence.unit==='month'?' selected':'')+'>Months</option></select></div>':'')+'<div class="fld"><label>End date · optional</label><input type="date" data-chg="f-recur-end" value="'+esc(f.recurrence.endDate||'')+'"></div>':'')+
      '<div class="fld wide"><label>12 · Remarks</label><textarea data-chg="f-notes" placeholder="Background, context, remarks…">'+esc(f.notes)+'</textarea></div>'+
    '</div>';
  $('.sbody',rec.sheet).innerHTML=b;updateSaveBtn(rec,f);wireOwnerSearch(rec);
}

function aiPendingFinish(kind,index,accepted,createdId){
  var p=aiState.pending;
  if(!p||p.kind!==kind||index===undefined||index===null)return;
  if(!p.items[index])return;
  p.items.splice(index,1);
  if(!p.items.length){
    aiState.pending=null;
    aiChatPush('ai',accepted?'Change saved. No other AI changes remain to review.':'Rejected. No other AI changes remain to review.',{type:'review-complete'});
  }else{
    var remaining=p.items.length;
    aiChatPush('ai',accepted?'Change saved. '+remaining+' AI change'+(remaining===1?'':'s')+' remain for review.':'Rejected. '+remaining+' AI change'+(remaining===1?'':'s')+' remain for review.',{type:'pending',pending:p});
  }
}
function aiOpenPendingItem(index){
  var p=aiState.pending;if(!p||!p.items||!p.items[index])return;
  var it=p.items[index];
  if(p.kind==='add'){
    var fu=it.followup||{};
    openForm(null,{projectId:it.projectId,categoryId:it.categoryId||'',spocIds:(it.spocIds||[]).slice(),
      lineItem:it.lineItem,task:it.task,status:it.status,etaKind:it.etaKind,eta:it.eta,etaEnd:it.etaEnd,
      tags:(it.tags||[]).slice(),important:!!it.important,recurrence:it.recurrence,
      remOn:!!fu.on,remDate:fu.date||'',remTime:fu.time||'',remNote:fu.note||'',remWaiting:fu.waitingFor||'',
      remRequested:fu.requestedOn||'',remExpected:fu.expectedBy||'',
      aiReview:true,aiReviewSource:'AI add',aiPendingKind:'add',aiPendingIndex:index,aiPendingItem:it});
  }else if(p.kind==='update'){
    var a=actById(it.id);if(!a){p.items.splice(index,1);render();return;}
    openForm(a.id,{aiReview:true,aiReviewSource:'AI update',aiPatch:it.patch||{},
      aiPendingKind:'update',aiPendingIndex:index,aiPendingItem:it});
  }
}
function aiRejectPendingItem(rec){
  var kind=rec.data.aiPendingKind,index=rec.data.aiPendingIndex;
  if(!kind||index===undefined||index===null){closeSheet(rec);return;}
  closeSheet(rec);
  aiPendingFinish(kind,index,false,'');
  render();
  toast('AI change rejected');
}

function saveForm(rec){
  var f=rec.data.f;
  var _goPersonal=false, _createdId='';
  f.tags=f.tags||[];var _ti=$('#fTagIn',rec.sheet);if(_ti&&_ti.value){parseTagList(_ti.value).forEach(function(t){addTagTo(f.tags,t);});_ti.value='';}
  if(!f.projectId){toast('Pick a project');return;}
  if(!f.lineItem||!f.lineItem.trim()){toast(f.quick?'Add a task':'Add a line item');return;}
  if(!f.quick&&(!f.task||!f.task.trim())){toast('Add a description');return;}
  f.lineItem=cap(f.lineItem.trim(),200);f.task=cap((f.task||'').trim(),4000);f.notes=cap(f.notes||'',4000);f.ticket=cap(f.ticket||'',80);
  if(f.etaKind==='date'&&!f.eta)f.etaKind='tbd';
  if(f.etaKind==='range'&&!f.eta&&!f.etaEnd)f.etaKind='tbd';
  if(f.etaKind==='range'&&f.eta&&f.etaEnd&&f.etaEnd<f.eta){var tmp=f.eta;f.eta=f.etaEnd;f.etaEnd=tmp;}
  f.recurrence=f.recurrence||{enabled:false,freq:'weekly',interval:1,unit:'week',endDate:'',seriesId:''};
  f.recurrence.interval=Math.max(1,Math.min(365,parseInt(f.recurrence.interval,10)||1));
  if(f.recurrence.enabled&&!f.eta)f.recurrence.enabled=false;
  if(f.recurrence.enabled&&!f.recurrence.seriesId)f.recurrence.seriesId=rec.data.id||uid('series');
  if(rec.data.id){
    var a0=actById(rec.data.id);
    updateAct(rec.data.id,{projectId:f.projectId,ticket:f.ticket.trim(),ticketUrl:f.ticketUrl.trim(),lineItem:f.lineItem,task:f.task,type:f.type||'Activity',spocIds:f.spocIds,assignedAt:f.assignedAt||null,etaKind:f.etaKind,eta:f.eta,etaEnd:f.etaEnd,status:f.status,notes:f.notes,important:f.important,tags:f.tags,recurrence:f.recurrence,categoryId:f.categoryId||''});
    if(a0){
      var was=a0.rem&&a0.rem.on;
      if(f.remOn&&!was)remPatch(rec.data.id,{on:true,date:f.remDate,time:f.remTime,note:f.remNote,waitingFor:f.remWaiting,requestedOn:f.remRequested,expectedBy:f.remExpected,done:false},{e:'Follow-up set',t:f.remDate?fmtDY(f.remDate):''});
      else if(!f.remOn&&was)remPatch(rec.data.id,{on:false,done:false},{e:'Reminder removed'});
      else if(f.remOn&&was&&(a0.rem.date!==f.remDate||a0.rem.time!==f.remTime||a0.rem.note!==f.remNote||a0.rem.waitingFor!==f.remWaiting||a0.rem.requestedOn!==f.remRequested||a0.rem.expectedBy!==f.remExpected))remPatch(rec.data.id,{date:f.remDate,time:f.remTime,note:f.remNote,waitingFor:f.remWaiting,requestedOn:f.remRequested,expectedBy:f.remExpected},{e:'Follow-up updated',t:f.remDate?fmtDY(f.remDate):''});
    }
    toast('Saved');
  }else{
    var now=Date.now();
    var a={id:uid('a'),projectId:f.projectId,ticket:f.ticket.trim(),ticketUrl:f.ticketUrl.trim(),
      lineItem:f.lineItem,task:f.task,type:f.type||'Activity',spocIds:f.spocIds.slice(),etaKind:f.etaKind,eta:f.eta,etaEnd:f.etaEnd,
      status:f.status,important:!!f.important,tags:(f.tags||[]).slice(),rem:{on:!!f.remOn,date:f.remDate,time:f.remTime,note:f.remNote,waitingFor:f.remWaiting,requestedOn:f.remRequested,expectedBy:f.remExpected,done:false},
      recurrence:f.recurrence,
      notes:f.notes,comments:[],activity:[],createdAt:now,updatedAt:now,completedAt:null,archived:false,categoryId:f.categoryId||'',assignedAt:f.assignedAt||now};
    logAct(a,'Created');
    if(a.spocIds.length)logAct(a,'Owner/SPOC assigned','',spocLabel(a));
    if(a.rem.on)logAct(a,'Reminder set','',a.rem.date?fmtDY(a.rem.date):'');
    S.actionables.unshift(a);saveState();_createdId=a.id;toast(f.projectId==='__personal'?'Added to your tasks':'Actionable created');_goPersonal=(f.projectId==='__personal');
  }
  if(rec.data.aiReview&&rec.data.aiPendingKind){
    aiPendingFinish(rec.data.aiPendingKind,rec.data.aiPendingIndex,true,_createdId||rec.data.id||'');
  }
  closeSheet(rec);var det=sheetFor('detail');if(det)renderDetail(det);render();
  if(_goPersonal)nav('projectDetail',{id:'__personal',seg:'open'});
}

/* ---- FILTERS ---- */
function openFilters(){
  var rec=openSheet('<div class="shead"><h2>Filter &amp; sort</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody"></div>'+
    '<div class="sfoot"><button class="btn ghost" data-act="filters-clear">Clear all</button><button class="btn pri" data-act="close-sheet">Done</button></div>',
    {tag:'filters'});
  renderFilters(rec);
}
function chipGroup(label,items,sel,kind){
  return '<div class="fld wide" style="margin-bottom:14px"><label>'+label+'</label>'+
    '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:2px">'+
    items.map(function(it){var on=sel.indexOf(it[0])>=0;
      return '<button class="chip'+(on?' on':'')+'" data-act="flt-toggle" data-kind="'+kind+'" data-v="'+esc(it[0])+'">'+esc(it[1])+'</button>';
    }).join('')+'</div></div>';
}
function renderFilters(rec){
  var b='<div class="fld wide" style="margin-bottom:14px"><label>Sort by</label><select data-chg="flt-sort">'+
    [['smart','Smart \u00b7 overdue \u2192 ETA \u2192 follow-up'],['eta','ETA'],['ticket','Ticket / Ref ID'],['project','Project'],['updated','Recently updated']]
      .map(function(s){return '<option value="'+s[0]+'"'+(filters.sort===s[0]?' selected':'')+'>'+s[1]+'</option>';}).join('')+
    '</select></div>'+
    chipGroup('Project',S.projects.map(function(o){return[o.id,o.name];}),filters.project,'project')+
    chipGroup('Owner / SPOC',peopleSorted().map(function(u){return[u.id,u.name];}).concat([['__tbc','To be assigned']]),filters.spoc,'spoc')+
    chipGroup('Status',STATUSES.map(function(s){return[s,s];}),filters.status,'status')+
    (allTags().length?'<div class="fld wide" style="margin-bottom:14px"><label>Tag</label><select class="tagdd" data-chg="flt-tag"><option value="">All tags</option>'+allTags().map(function(t){return '<option value="'+esc(t)+'"'+(filters.tags.indexOf(t)>=0?' selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select></div>':'')+
    '<div class="fld wide" style="margin-bottom:14px"><label>Flags</label>'+
    '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:2px">'+
    '<button class="chip'+(filters.fOd?' on':'')+'" data-act="flt-flag" data-f="fOd">Overdue only</button>'+
    '<button class="chip'+(filters.fFu?' on':'')+'" data-act="flt-flag" data-f="fFu">Follow-up due</button>'+
    '<button class="chip'+(filters.fTk?' on':'')+'" data-act="flt-flag" data-f="fTk">Has ticket ID</button>'+
    '</div></div>'+
    '<div class="meta"><div class="fld"><label>ETA from</label><input type="date" onclick="try{this.showPicker()}catch(_){}" data-chg="flt-from" value="'+esc(filters.from)+'"></div>'+
    '<div class="fld"><label>ETA to</label><input type="date" onclick="try{this.showPicker()}catch(_){}" data-chg="flt-to" value="'+esc(filters.to)+'"></div></div>';
  $('.sbody',rec.sheet).innerHTML=b;
}

/* ---- DAY SHEET ---- */
function openDay(iso){
  var items=sortActs(mainActs().filter(function(a){return coversDay(a,iso);}), 'smart');
  var fus=mainActs().filter(function(a){return isOpen(a)&&a.rem&&a.rem.on&&!a.rem.done&&a.rem.date===iso;});
  openSheet('<div class="shead"><h2>'+esc(fmtDY(iso))+' \u00b7 '+items.length+' due</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody">'+
    (items.length?items.map(function(a){return actRow(a);}).join('<div style="height:8px"></div>'):emptyBox('Nothing due','No actionables have this ETA.'))+
    (fus.length?'<div class="eyebrow" style="padding:16px 0 8px">Follow-ups \u00b7 '+fus.length+'</div>'+fus.map(function(a){return actRow(a);}).join('<div style="height:8px"></div>'):'')+
    '<div class="btnrow"><button class="btn ghost" data-act="add-for-day" data-d="'+iso+'">'+I('plus')+'Add for this date</button></div>'+
    '</div>',{tag:'day'});
}

/* ---- GLOBAL SEARCH ---- */
function globalSearchMatches(q){
  q=(q||'').trim().toLowerCase();
  if(!q)return [];
  var out=[];
  S.actionables.forEach(function(a){
    var hay=[a.ticket,a.lineItem,a.task,a.notes,projName(a.projectId),projCode(a.projectId),spocLabel(a),(a.tags||[]).join(' '),
      (a.comments||[]).map(function(c){return c.text||'';}).join(' ')].join(' ').toLowerCase();
    if(hay.indexOf(q)>=0)out.push({kind:'task',id:a.id,title:(a.ticket?a.ticket+' — ':'')+a.lineItem,meta:(a.projectId==='__personal'?'Personal':projName(a.projectId))+' · '+spocLabel(a)+' · '+a.status,sub:plainEta(a)||'No ETA'});
  });
  S.projects.forEach(function(pr){
    var hay=[pr.name,pr.code].join(' ').toLowerCase();
    if(hay.indexOf(q)>=0)out.push({kind:'project',id:pr.id,title:pr.name,meta:'Project'+(pr.code?' · '+pr.code:''),sub:''});
  });
  S.people.forEach(function(pe){
    if((pe.name||'').toLowerCase().indexOf(q)>=0)out.push({kind:'person',id:pe.id,title:pe.name,meta:'Owner / SPOC',sub:''});
  });
  return out.slice(0,50);
}
function renderGlobalSearch(rec){
  var q=globalSearchState.q||'';
  var results=globalSearchMatches(q);
  var b='<div class="shead"><h2>Global Search</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody global-search-body">'+
    '<div class="global-search-input"><span>'+I('search')+'</span><input id="globalSearchInput" type="search" placeholder="Search tasks, projects, people, tickets…" value="'+esc(q)+'" autocomplete="off"></div>';
  if(!q)b+='<div class="global-search-hint">Search across <b>Actionables</b>, projects, owners/SPOCs, tickets, notes, tags and comments.</div>';
  else if(!results.length)b+=emptyBox('No matches found','Try a ticket ID, project, person, task or keyword.');
  else {
    b+='<div class="global-search-count">'+results.length+(results.length===50?'+':'')+' result'+(results.length===1?'':'s')+'</div><div class="global-search-results">';
    results.forEach(function(r){
      if(r.kind==='task')b+='<button class="global-result" data-act="open" data-id="'+r.id+'"><span class="gr-ic">'+I('items')+'</span><span class="gr-main"><b>'+esc(r.title)+'</b><span>'+esc(r.meta)+'</span></span><span class="gr-side">'+esc(r.sub)+'</span></button>';
      else if(r.kind==='project')b+='<button class="global-result" data-act="proj-nav" data-id="'+r.id+'"><span class="gr-ic">'+I('proj')+'</span><span class="gr-main"><b>'+esc(r.title)+'</b><span>'+esc(r.meta)+'</span></span></button>';
      else b+='<button class="global-result" data-act="person" data-id="'+r.id+'"><span class="gr-ic">'+I('person')+'</span><span class="gr-main"><b>'+esc(r.title)+'</b><span>'+esc(r.meta)+'</span></span></button>';
    });
    b+='</div>';
  }
  b+='</div>';
  rec.sheet.innerHTML='<div class="grab"></div>'+b;
  setTimeout(function(){var inp=$('#globalSearchInput',rec.sheet);if(inp){inp.focus();try{inp.setSelectionRange(inp.value.length,inp.value.length);}catch(e){}}},20);
}
function openGlobalSearch(){
  globalSearchState.q='';
  var rec=openSheet('',{full:true,tag:'globalsearch'});
  renderGlobalSearch(rec);
}

/* ---- DAILY BRIEFING ---- */
function workloadCountFor(id){return id?personStats(id).open:0;}
function bestOwnerSuggestion(a){
  if(a.spocIds&&a.spocIds.length)return '';
  var candidates=peopleSorted().map(function(u){return{id:u.id,name:u.name,open:workloadCountFor(u.id)};});
  if(!candidates.length)return '';
  candidates.sort(function(x,y){return x.open-y.open||x.name.localeCompare(y.name);});
  return candidates[0];
}
function intelligenceReason(a){
  var t=todayISO(),reasons=[];var e=endEta(a),k=e?diffDays(e,t):9999;
  if(isOver(a,t))reasons.push('overdue by '+(-k)+' day'+((-k)===1?'':'s'));
  else if(k===0)reasons.push('due today');
  else if(k>0&&k<=3)reasons.push('due in '+k+' day'+(k===1?'':'s'));
  if(a.important)reasons.push('high priority');
  if(remDue(a,t))reasons.push('follow-up due');
  if(a.status==='Dependency')reasons.push('waiting on a dependency');
  var ag=agingDays(a);if(ag>=15)reasons.push('aged '+ag+' days');
  var owner=(a.spocIds||[])[0],wo=owner?workloadCountFor(owner):0;if(owner&&wo>=8)reasons.push(personName(owner)+' has '+wo+' open tasks');
  if(!owner){var sug=bestOwnerSuggestion(a);if(sug)reasons.push('unassigned · '+sug.name+' has '+sug.open+' open tasks');}
  return reasons.slice(0,3);
}
function actionableIntelligence(){
  var t=todayISO(),all=mainActs().filter(isOpen);
  var rows=all.map(function(a){var e=endEta(a),k=e?diffDays(e,t):9999,ag=agingDays(a),score=0;
    if(k<0)score+=45+Math.min(20,-k*3);else if(k===0)score+=35;else if(k<=3)score+=20;else if(k<=7)score+=10;
    if(a.important)score+=20;if(remDue(a,t))score+=30;if(a.status==='Dependency')score+=22;if(ag>=15)score+=25;else if(ag>=8)score+=12;
    if(!a.spocIds||!a.spocIds.length)score+=8;else if(workloadCountFor(a.spocIds[0])>=8)score+=8;
    return{a:a,score:score,reason:intelligenceReason(a)};
  }).sort(function(x,y){return y.score-x.score||smartCmp(x.a,y.a,t);});
  return rows.slice(0,3);
}
function intelligenceSection(){
  var top=actionableIntelligence();
  var h='<div class="brief-section intel-section"><div class="brief-sec-head"><span>Actionable Intelligence · What should you do first?</span><b>'+top.length+'</b></div>';
  if(!top.length)return h+'<div class="brief-empty">No urgent actions. You are in a good position.</div></div>';
  h+='<div class="intel-list">'+top.map(function(r,i){var sug=bestOwnerSuggestion(r.a);return '<div class="intel-card"><button class="intel-main" data-act="open" data-id="'+r.a.id+'"><span class="intel-rank">'+(i+1)+'</span><span class="intel-body"><b>'+esc((r.a.ticket?r.a.ticket+' — ':'')+r.a.lineItem)+'</b><span>'+esc(r.reason.length?r.reason.join(' · '):'High attention item')+'</span>'+(sug?'<em>Suggested owner: '+esc(sug.name)+' · '+sug.open+' open</em>':'')+'</span><span class="brief-eta">'+esc(fmtEta(r.a))+'</span></button></div>';}).join('')+'</div></div>';
  return h;
}
function briefData(){
  var t=todayISO(),m=metrics();
  return {
    overdue:sortActs(m.overdue,'smart'),
    today:sortActs(m.today,'smart'),
    followups:sortActs(m.remDueL,'smart'),
    deps:sortActs(m.awaitAll,'smart'),
    week:sortActs(m.week,'smart'),
    done30:sortActs(m.done30,'smart')
  };
}
function briefSection(title,list,empty,limit){
  var h='<div class="brief-section"><div class="brief-sec-head"><span>'+esc(title)+'</span><b>'+list.length+'</b></div>';
  if(!list.length)h+='<div class="brief-empty">'+esc(empty)+'</div>';
  else h+='<div class="brief-list">'+list.slice(0,limit||6).map(function(a){return '<button class="brief-item" data-act="open" data-id="'+a.id+'"><span class="brief-dot '+(isOver(a,todayISO())?'bad':a.status==='Dependency'?'wait':a.status==='Completed'?'done':'')+'"></span><span class="brief-main"><b>'+esc((a.ticket?a.ticket+' — ':'')+a.lineItem)+'</b><span>'+esc((a.projectId==='__personal'?'Personal':projName(a.projectId))+' · '+spocLabel(a)+(a.rem&&a.rem.on&&!a.rem.done&&a.rem.requestedOn?' · Waiting '+followupAgeLabel(a,todayISO()):''))+'</span></span><span class="brief-eta">'+esc(fmtEta(a))+'</span></button>';}).join('')+'</div>';
  if(list.length>(limit||6))h+='<button class="brief-more" data-act="brief-view-all">View all '+list.length+'</button>';
  return h+'</div>';
}
function vBrief(){
  var d=briefData(),m=metrics(),h=topbar('Daily briefing',fmtDY(todayISO()),true,'<button class="search-pill compact" data-act="go-search" title="Global Search · Ctrl+K">'+I('search')+'<span>Search</span><kbd>Ctrl K</kbd></button><button class="iconbtn" data-act="theme-toggle" title="Switch theme · current: '+themeLabel(S.settings.theme||'dark')+'">'+I((S.settings.theme||'dark')==='dark'?'sun':'moon')+'</button>');
  h+='<div class="brief-wrap">'+
    intelligenceSection()+
    '<div class="brief-kpis"><div><b>'+m.overdue.length+'</b><span>Overdue</span></div><div><b>'+m.today.length+'</b><span>Due today</span></div><div><b>'+m.remDueL.length+'</b><span>Follow-ups</span></div><div><b>'+m.awaitAll.length+'</b><span>Dependencies</span></div></div>'+
    '<div class="brief-actions"><button class="btn pri" data-act="brief-ai"'+(aiConfigured()?'':' disabled')+'>'+I('spark')+' AI summary</button><button class="btn ghost" data-act="brief-mark">Mark reviewed</button></div>'+
    briefSection('Needs attention · overdue',d.overdue,'Nothing overdue.',7)+
    briefSection('Due today',d.today,'Nothing due today.',7)+
    briefSection('Follow-ups due',d.followups,'No follow-ups due.',6)+
    briefSection('Waiting / dependencies',d.deps,'Nothing is blocked.',6)+
    briefSection('Due this week',d.week,'Nothing else due this week.',7)+
    briefSection('Recently completed',d.done30,'No recent completions.',5)+
    '</div>';
  return h;
}

/* ---- MORE MENU ---- */
function openMore(){
  openSheet('<div class="shead"><h2>More</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody more-nav" style="padding-top:6px">'+
    '<div class="nav-group-label">WORK</div>'+
    moreRow('list','items','Actionables','All tasks, filters and quick actions')+
    moreRow('brief','doc','Daily briefing','Today’s priorities, overdue work and follow-ups')+
    '<div class="nav-group-label">PROJECTS</div>'+
    moreRow('projects','proj','Projects','Projects and categories')+
    '<div class="nav-group-label">INSIGHTS</div>'+
    moreRow('workload','chart','Smart workload','Capacity, due work and overload')+
    moreRow('reports','doc','Reports & exports','PDF / Excel with project selection')+
    '<div class="nav-group-label">SYSTEM</div>'+
    moreRow('settings','sliders','Settings','Theme, name, daily brief, backup')+
    '<div class="appcredit">Developed by <b>Vishal</b><span>For personal use only</span></div>'+
    '</div>',{tag:'more'});
}
function moreRow(v,ic,t,s){return '<button class="rowline" data-act="go" data-v="'+v+'">'+I(ic)+'<span class="t">'+t+'<br><span class="s">'+esc(s)+'</span></span>'+I('chevR')+'</button>';}

/* ---- IMPORT ---- */
function openImport(){
  openSheet('<div class="shead"><h2>Import Backup</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody">'+
    '<p style="color:var(--tx2);font-size:.83rem;margin-bottom:12px">Choose a JSON backup file or paste its contents below. This replaces all current data.</p>'+
    '<div class="btnrow" style="margin-bottom:12px">'+
    '<button class="btn ghost" data-act="import-file">'+I('doc')+'Choose JSON file</button></div>'+
    '<input id="impFileInput" type="file" accept=".json,application/json" style="display:none">'+
    '<textarea id="impTxt" style="min-height:120px;font-family:var(--mono);font-size:.72rem" placeholder="Paste backup JSON here\u2026"></textarea>'+
    '<div class="btnrow"><button class="btn ghost" data-act="close-sheet">Cancel</button>'+
    '<button class="btn pri" data-act="import-ok">Restore</button></div></div>',{tag:'import'});
}

/* ---- EXPORTS ---- */
function xlsxReady(){return typeof XLSX!=='undefined';}
function pdfReady(){return window.jspdf&&window.jspdf.jsPDF;}
function stamp(){var d=new Date();return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());}
/* ---- Native save-file bridge (Android/SAF) -----------------------------
   A.saveFile() cannot block waiting for the user to pick a folder in the
   system file picker, so it returns "PENDING:<requestId>" immediately and
   the native side later calls window.__actionablesResolveSave(requestId,
   success, messageOrName) once the picker flow finishes. We keep a small
   registry of pending requestId -> resolver here so deliverFile() can stay
   a plain function call (no await) at all export call sites, matching how
   the app already used it. */
var __pendingSaveResolvers={};
window.__actionablesResolveSave=function(requestId,success,messageOrName){
  var resolver=__pendingSaveResolvers[requestId];
  if(!resolver)return;
  delete __pendingSaveResolvers[requestId];
  resolver(success,messageOrName);
};
function deliverFile(b64,name,mime){
  if(A&&A.saveFile){
    var r=A.saveFile(b64,name,mime);
    if(r&&r.indexOf('PENDING:')===0){
      var requestId=r.slice(8);
      __pendingSaveResolvers[requestId]=function(success,messageOrName){
        if(success)toast('Saved \u2192 '+messageOrName);
        else if(messageOrName==='ERR_CANCELLED')toast('Save cancelled');
        else toast('Export failed \u2014 '+(messageOrName||'unknown error').replace(/^ERR_?/,''));
      };
      return;
    }
    if(r&&r.indexOf('ERR')===0){toast('Export failed \u2014 '+r.slice(4));return;}
    toast('Saved \u2192 '+r);return;
  }
  try{var bin=atob(b64),arr=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);var blob=new Blob([arr],{type:mime});var u=URL.createObjectURL(blob);var aEl=document.createElement('a');aEl.href=u;aEl.download=name;aEl.click();setTimeout(function(){URL.revokeObjectURL(u);},4000);}catch(e){toast('Export not available in this environment');}
}

/* Excel: Project | Line Item | Description | Owner | ETA | Status | Remarks */
function exportRangeFilter(range){return range&&((range.from||'')||(range.to||''))?range:null;}
function exportExcel(projId,projLabel,listOverride,range){
  if(!xlsxReady()){toast('Export engine loading \u2014 try again');return;}
  var list=listOverride?listOverride.slice():(projId?S.actionables.filter(function(a){return a.projectId===projId&&((range&&(range.from||range.to))||isOpen(a));}):S.actionables.filter(function(a){return (range&&(range.from||range.to))||isOpen(a);}));
  if(range&&(range.from||range.to))list=list.filter(function(a){var d=isOpen(a)?endEta(a):isoFromMs(a.completedAt||a.updatedAt);return d&&(!range.from||d>=range.from)&&(!range.to||d<=range.to);});
  list=sortActs(list,'project');
  var head=['Project','Category','Line Item','Description','Owner / SPOC','Assigned Date','Aging','ETA','Status','Remarks','Comments (date-wise)'];
  var rows=list.map(function(a){var cmt=(a.comments||[]).map(function(c){var d=new Date(c.ts);return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()+(c.user?(' ('+c.user+')'):'')+': '+(c.text||'');}).join('\n');return[projName(a.projectId),categoryName(a.projectId,a.categoryId),a.lineItem,a.task,spocLabel(a),assignedDateISO(a)||createdDateISO(a),agingDays(a)+' days',plainEta(a)||(a.etaKind==='tbd'?'TBD':''),a.status,a.notes||'',cmt];});
  var ws=XLSX.utils.aoa_to_sheet([head].concat(rows));
  ws['!cols']=[{wch:14},{wch:20},{wch:32},{wch:48},{wch:18},{wch:15},{wch:12},{wch:16},{wch:20},{wch:40},{wch:60}];
  /* Bold header row */
  for(var c=0;c<head.length;c++){var addr=XLSX.utils.encode_cell({r:0,c:c});if(ws[addr])ws[addr].s={font:{bold:true}};}
  for(var rr=1;rr<=rows.length;rr++){var ca=XLSX.utils.encode_cell({r:rr,c:8});if(ws[ca])ws[ca].s={alignment:{wrapText:true,vertical:'top'}};}
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,projLabel||'All Projects');
  var b64=XLSX.write(wb,{bookType:'xlsx',type:'base64'});
  deliverFile(b64,(projLabel||'All_Projects').replace(/\s+/g,'_')+'_Report_'+stamp()+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/* PDF: Project | Line Item | Description | Owner | Assigned | Aging | ETA | Status | Latest comment */
function exportPdf(projId,projLabel,range){
  if(!pdfReady()){toast('Export engine loading \u2014 try again');return;}
  var d=reportData(projId||null,true,range);
  var t=todayISO();
  var label=projLabel||'All Projects';
  var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'pt',format:'a4'});
  var W=doc.internal.pageSize.getWidth(),M=40,y=48;
  doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(20,26,36);
  doc.text(label.toUpperCase()+' \u2014 PROJECT STATUS REPORT',M,y);y+=18;
  doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(100,115,130);
  doc.text('Generated: '+fmtDY(t)+' \u00b7 '+d.open.length+' open items'+((range&&(range.from||range.to))?' \u00b7 '+(range.from?fmtDY(range.from):'')+' \u2192 '+(range.to?fmtDY(range.to):''):'') ,M,y);y+=18;
  doc.setDrawColor(220,226,234);doc.setLineWidth(.8);doc.line(M,y,W-M,y);y+=20;
  /* Summary */
  doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(20,26,36);doc.text('SUMMARY',M,y);y+=14;
  doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(45,55,70);
  var aged15=d.open.filter(function(a){return agingDays(a)>=15;}).length;
  var srows=[['Open items',d.open.length],['Overdue / Breached',d.overdue.length],['Dependency',d.awaiting.length],['Follow-ups due',d.fu.length],['Aged 15+ days',aged15],['Due this week',d.week.length],['Completed this week',d.doneWeek.length]];
  srows.forEach(function(r){doc.text(r[0]+': '+r[1],M,y);y+=14;});
  y+=8;
  /* Main table: Project | Line Item | Description | Owner | ETA | Status */
  function section(title,list,emptyMsg){
    if(y>720){doc.addPage();y=48;}
    doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(20,26,36);doc.text(title.toUpperCase(),M,y);y+=8;
    if(!list.length){doc.setFont('helvetica','italic');doc.setFontSize(9);doc.setTextColor(130,140,152);y+=12;doc.text(emptyMsg,M,y);y+=20;return;}
    doc.autoTable({
      startY:y+4,
      head:[['Project','Category','Line Item','Description','Owner','Assigned','Aging','ETA','Status','Latest comment']],
      body:list.map(function(a){var lc=(a.comments&&a.comments.length)?a.comments[a.comments.length-1]:null;var cd=lc?new Date(lc.ts):null;var lcs=lc?(cd.getDate()+' '+MON[cd.getMonth()]+' '+cd.getFullYear()+': '+(lc.text||'')):'';return[projCode(a.projectId),categoryName(a.projectId,a.categoryId),a.lineItem,a.task||'',spocLabel(a),fmtDY(assignedDateISO(a)||createdDateISO(a)),agingDays(a)+'d',fmtEta(a),a.status,lcs];}),
      margin:{left:M,right:M},
      styles:{fontSize:7.5,cellPadding:3.5,textColor:[45,55,70],lineColor:[225,232,240],lineWidth:.5,valign:'top'},
      headStyles:{fillColor:[17,24,38],textColor:255,fontStyle:'bold',fontSize:8},
      alternateRowStyles:{fillColor:[247,249,252]},
      columnStyles:{0:{cellWidth:30},1:{cellWidth:52},2:{cellWidth:60},3:{cellWidth:78},4:{cellWidth:46},5:{cellWidth:42},6:{cellWidth:30},7:{cellWidth:42},8:{cellWidth:48},9:{cellWidth:105}}
    });
    y=doc.lastAutoTable.finalY+20;
  }
  section('All Open Items ('+label+')',d.open,'No open items.');
  section('Overdue / Breached',d.overdue,'Nothing overdue.');
  section('Blocked \u00b7 dependency',d.awaiting,'Nothing blocked on a dependency.');
  /* Footer */
  var pages=doc.internal.getNumberOfPages();
  for(var p=1;p<=pages;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(150,158,170);doc.text(label+' \u00b7 Project Status Report \u00b7 '+fmtDY(t),M,818);doc.text('Page '+p+' / '+pages,W-M,818,{align:'right'});}
  var b64=doc.output('datauristring').split(',')[1];
  deliverFile(b64,label.replace(/\s+/g,'_')+'_Status_Report_'+stamp()+'.pdf','application/pdf');
}

function openBulkActions(){
  var ids=Object.keys(bulkSel).filter(function(x){return bulkSel[x]&&actById(x);});if(!ids.length){toast('Select at least one task');return;}
  var rec=openSheet('<div class="shead"><h2>Bulk actions</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div><div class="sbody">'+
    '<div class="note" style="padding:0 0 12px">Apply changes to <b>'+ids.length+'</b> selected actionables.</div>'+
    '<div class="meta"><div class="fld wide"><label>Status</label><select id="bulkStatus"><option value="">No change</option>'+STATUSES.map(function(x){return '<option>'+x+'</option>';}).join('')+'</select></div>'+
    '<div class="fld wide"><label>Owner / SPOC</label><select id="bulkOwner"><option value="">No change</option><option value="__none">Unassign</option>'+peopleSorted().map(function(u){return '<option value="'+u.id+'">'+esc(u.name)+'</option>';}).join('')+'</select></div>'+
    '<div class="fld"><label>ETA</label><input id="bulkEta" type="date"></div><div class="fld"><label>Priority</label><select id="bulkPriority"><option value="">No change</option><option value="1">Important</option><option value="0">Not important</option></select></div>'+
    '<div class="fld wide"><label>Add tag</label><input id="bulkTag" placeholder="Optional tag"></div></div>'+
    '<div class="btnrow"><button class="btn ghost" data-act="close-sheet">Cancel</button><button class="btn pri" data-act="bulk-apply">Apply changes</button></div>'+
    '<button class="btn danger" style="margin-top:10px;width:100%" data-act="bulk-delete">Delete selected</button></div>',{tag:'bulk'});
  rec.data={ids:ids};
}
function applyBulkActions(){
  var br=sheetFor('bulk');if(!br)return;var ids=br.data.ids||[],st=$('#bulkStatus',br.sheet),ow=$('#bulkOwner',br.sheet),et=$('#bulkEta',br.sheet),pr=$('#bulkPriority',br.sheet),tg=$('#bulkTag',br.sheet);var status=st?st.value:'',owner=ow?ow.value:'',eta=et?et.value:'',priority=pr?pr.value:'',tag=tg?(tg.value||'').trim():'';
  if(!status&&!owner&&!eta&&!priority&&!tag){toast('Choose at least one change');return;} snapshot('Before bulk update');var count=0;
  ids.forEach(function(id){var a=actById(id);if(!a||a.archived)return;var patch={};if(status)patch.status=status;if(owner)patch.spocIds=owner==='__none'?[]:[owner];if(eta){patch.etaKind='date';patch.eta=eta;patch.etaEnd='';}if(priority)patch.important=priority==='1';if(Object.keys(patch).length)updateAct(id,patch);if(tag){var ts=(a.tags||[]).slice();addTagTo(ts,tag);updateAct(id,{tags:ts});}count++;});saveState();bulkSel={};closeSheet(br);render();toast('Updated '+count+' task'+(count===1?'':'s'),{label:'Undo',fn:function(){restoreVersion(0);}});
}

/* ---- NOTIFICATIONS BRIDGE ---- */
function syncSchedule(){try{if(A&&A.scheduleDaily)A.scheduleDaily(S.settings.notifHour,S.settings.notifMinute,!!S.settings.notifEnabled);}catch(e){}}

/* ============================================================
   EVENTS
   ============================================================ */
// Comment controls use a dedicated delegated listener so they remain reliable
// even when the detail sheet is re-rendered after each comment action.
document.addEventListener('click',function(e){
  var btn=e.target.closest?e.target.closest('.cmt-ic,[data-act=\"d-cmt-editcancel\"],[data-act=\"d-cmt-editsave\"],[data-act=\"d-cmt-del\"]'):null;
  if(!btn)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  var rec=sheetFor('detail');
  if(!rec)return;
  var a=actById(rec.data.id);
  if(!a)return;
  var act=btn.getAttribute('data-act');
  var i=parseInt(btn.getAttribute('data-i'),10);
  if(act==='d-cmt-edit' && !isNaN(i) && a.comments[i]){ rec.data.editCmt=i; renderDetail(rec); return; }
  if(act==='d-cmt-editcancel'){ delete rec.data.editCmt; renderDetail(rec); return; }
  if(act==='d-cmt-editsave' && !isNaN(i) && a.comments[i]){
    var ta=$('#cmtEdit',rec.sheet),txt=ta?(ta.value||'').trim():'';
    if(!txt){toast('Comment cannot be empty');return;}
    a.comments[i].text=cap(txt,4000); a.comments[i].ts=Date.now(); a.comments[i].edited=true;
    logAct(a,'Comment edited'); a.updatedAt=Date.now(); saveState(); delete rec.data.editCmt;
    renderDetail(rec); render(); toast('Comment updated'); return;
  }
  if(act==='d-cmt-del' && !isNaN(i) && a.comments[i]){
    if(window.confirm('Delete this comment?')){
      a.comments.splice(i,1); logAct(a,'Comment deleted'); a.updatedAt=Date.now(); saveState();
      delete rec.data.editCmt; renderDetail(rec); render(); toast('Comment deleted');
    }
    return;
  }
},true);

document.addEventListener('click',function(e){
  var el=e.target.closest?e.target.closest('[data-act]'):null;
  if(!el)return;if(el.tagName==='A')return;
  var act=el.getAttribute('data-act'),id=el.getAttribute('data-id');
  switch(act){
    /* Navigation */
    case 'tab':{var tb=el.getAttribute('data-tab');if(tb==='more'){openMore();break;}if(tb==='list')history_=[];nav(tb,{});break;}
    case 'go':closeTop();nav(el.getAttribute('data-v'),{});break;
    case 'back':goBack();break;
    case 'kpi':{filters=defaultFilters();filters.quick=el.getAttribute('data-q');nav('list',{});break;}
    case 'quick':filters.quick=el.getAttribute('data-q');render();break;
    case 'view-personal':closeTop();filters=defaultFilters();nav('projectDetail',{id:'__personal',seg:'open'});break;
    case 'f-tag-del':{var fr1=sheetFor('form');if(fr1){var td=(el.getAttribute('data-tag')||'').toLowerCase();fr1.data.f.tags=(fr1.data.f.tags||[]).filter(function(x){return x.toLowerCase()!==td;});renderForm(fr1);}break;}
    case 'f-tag-add':{var fr2=sheetFor('form');if(fr2){fr2.data.f.tags=fr2.data.f.tags||[];addTagTo(fr2.data.f.tags,el.getAttribute('data-tag'));renderForm(fr2);}break;}
    case 'f-tag-addbuf':{var fr3=sheetFor('form');if(fr3){fr3.data.f.tags=fr3.data.f.tags||[];var fi=$('#fTagIn',fr3.sheet);if(fi&&fi.value){parseTagList(fi.value).forEach(function(t){addTagTo(fr3.data.f.tags,t);});fi.value='';}renderForm(fr3);}break;}
    case 'd-tag-del':{var dr1=sheetFor('detail');if(dr1){var a1=actById(dr1.data.id);if(a1){var dd=(el.getAttribute('data-tag')||'').toLowerCase();updateAct(dr1.data.id,{tags:(a1.tags||[]).filter(function(x){return x.toLowerCase()!==dd;})});renderDetail(dr1);render();}}break;}
    case 'd-tag-add':{var dr2=sheetFor('detail');if(dr2){var a2=actById(dr2.data.id);if(a2){var nt2=(a2.tags||[]).slice();addTagTo(nt2,el.getAttribute('data-tag'));updateAct(dr2.data.id,{tags:nt2});renderDetail(dr2);render();}}break;}
    case 'tag-manage':openTagManager();break;
    case 'versions-open':openVersions();break;
    case 'version-snap':{snapshot('Manual restore point');var _vr=sheetFor('versions');if(_vr)renderVersions(_vr);toast('Restore point saved');break;}
    case 'version-restore':{var _vi=parseInt(el.getAttribute('data-i'),10);var _va=loadVersions(),_vv=_va[_vi];if(_vv)confirmSheet('Restore this version?',esc(_vv.reason)+' \u2014 '+relTime(_vv.ts)+' \u00b7 '+_vv.count+' task'+(_vv.count===1?'':'s')+'. This replaces current data and syncs to your other device.','Restore',false,function(){restoreVersion(_vi);});break;}
    case 'tag-rename':{var tm=sheetFor('tagmgr');if(tm){var orig=el.getAttribute('data-tag'),inps=tm.sheet.querySelectorAll('input[data-tagorig]'),inp=null;for(var _i=0;_i<inps.length;_i++)if(inps[_i].getAttribute('data-tagorig')===orig){inp=inps[_i];break;}var nv=inp?inp.value:'';if(nv&&nv.trim()&&renameTag(orig,nv)){renderTagManager(tm);render();toast('Tag renamed');}else toast('Enter a new tag name');}break;}
    case 'tag-delete':{var tm2=sheetFor('tagmgr');if(tm2){var tgd=el.getAttribute('data-tag');confirmSheet('Delete tag?','Remove \u201c'+tgd+'\u201d from all tasks.','Delete',true,function(){deleteTag(tgd);renderTagManager(tm2);render();toast('Tag deleted');});}break;}
    case 'd-tag-addbuf':{var dr3=sheetFor('detail');if(dr3){var a3=actById(dr3.data.id);if(a3){var nt3=(a3.tags||[]).slice(),di=$('#dTagIn',dr3.sheet);if(di&&di.value){parseTagList(di.value).forEach(function(t){addTagTo(nt3,t);});di.value='';}updateAct(dr3.data.id,{tags:nt3});renderDetail(dr3);render();}}break;}
    case 'go-search':openGlobalSearch();break;
    case 'brief-go':nav('brief',{});break;
    case 'brief-ai':{aiState.input="Give me today's daily briefing and prioritize overdue, due today, dependencies and follow-ups.";aiChat=[];nav('ai',{});setTimeout(function(){aiSend();},40);break;}
    case 'brief-mark':S.settings.notifSeenDate=todayISO();saveState();render();toast('Daily briefing marked reviewed');break;
    case 'brief-view-all':filters=defaultFilters();filters.quick='all';nav('list',{});break;
    case 'go-notif':nav('notifications',{});break;
    case 'go-calendar':nav('calendar',{});break;
    case 'go-people':nav('people',{});break;
    case 'tagdrop-toggle':tagDropOpen=!tagDropOpen;render();break;
    case 'tag-toggle':{var _tt=el.getAttribute('data-tag')||'';var _ti2=-1;for(var _k=0;_k<filters.tags.length;_k++)if(filters.tags[_k].toLowerCase()===_tt.toLowerCase()){_ti2=_k;break;}if(_ti2>=0)filters.tags.splice(_ti2,1);else filters.tags.push(_tt);render();break;}
    case 'tags-clear':filters.tags=[];render();break;
    case 'notif-read':S.settings.notifSeenDate=todayISO();saveState();render();toast('Marked as read');break;
    /* Theme toggle — cycles Dark → Light → High Contrast */
    case 'theme-toggle':{
      S.settings.theme=themeNext(S.settings.theme||'dark');
      saveState();applyTheme();render();
      toast('Switched to '+themeLabel(S.settings.theme)+' theme');
      break;
    }
    case 'set-accent':{S.settings.accent=el.getAttribute('data-k');saveState();applyTheme();render();break;}
    case 'set-font':{S.settings.font=el.getAttribute('data-k');saveState();applyTheme();render();toast('Font: '+el.textContent);break;}
    case 'cloud-sync':{
      if(!(window.Cloud&&window.Cloud.syncNow)){toast('Sync isn\u2019t set up on this device');break;}
      el.classList.add('spin');
      window.Cloud.syncNow().then(function(r){
        el.classList.remove('spin');
        if(window.__cloudStatusChanged)window.__cloudStatusChanged();
        var el2=document.querySelector('.syncbadge');if(el2&&window.Cloud.status){var st=window.Cloud.status();el2.className='syncbadge '+syncCls(st.label);el2.title=st.label||'';}
        toast(r==='ok'?'Synced':(r==='signin'?'Sign in to sync (Settings \u2192 Sync)':'Can\u2019t reach the sync server \u2014 will sync when back online'));
      }).catch(function(){el.classList.remove('spin');});
      break;
    }
    case 'cloud-signout':{if(window.Cloud&&window.Cloud.signOut){confirmSheet('Sign out of sync?','This device will stop syncing until you sign in again. Your data stays saved locally.','Sign out',false,function(){window.Cloud.signOut();render();toast('Signed out of sync');});}break;}
    /* Actionables */
    case 'open':openDetail(id);break;
    case 'bulk-select':{var bid=el.getAttribute('data-id')||id;if(bid){if(el.checked)bulkSel[bid]=true;else delete bulkSel[bid];render();}break;}
    case 'bulk-clear':bulkSel={};render();break;
    case 'bulk-open':openBulkActions();break;
    case 'bulk-apply':applyBulkActions();break;
    case 'bulk-delete':{var ids=Object.keys(bulkSel).filter(function(x){return bulkSel[x]&&actById(x);});if(!ids.length)break;confirmSheet('Delete selected tasks?','Delete '+ids.length+' actionable'+(ids.length===1?'':'s')+'. A restore point will be created first.','Delete',true,function(){snapshot('Before bulk delete');S.actionables=S.actionables.filter(function(a){return ids.indexOf(a.id)<0;});saveState();bulkSel={};closeTop();render();toast('Deleted '+ids.length+' task'+(ids.length===1?'':'s'),{label:'Undo',fn:function(){restoreVersion(0);}});});break;}
    case 'add':openForm(null,view.name==='projectDetail'?{projectId:view.params.id}:null);break;
    case 'quick-new':openForm(null,{quick:true});break;
    case 'ai-tab':aiState.tab=el.getAttribute('data-k');aiState.out='';aiState.outKind='';aiState.items=null;aiState.edits=null;aiState.err='';aiState.input='';render();break;
    case 'ai-key-save':{var _k=$('#aiKeyInput');if(_k)aiSetKey(_k.value.trim());var _b=$('#aiBase');if(_b)S.settings.aiCustomBase=_b.value.trim();var _m=$('#aiModelId')||$('#aiModelPick');if(_m&&_m.value.trim())aiSetModel(_m.value.trim());if(!aiModel()){aiState.err='Enter or choose a model.';render();break;}aiState.editKey=false;aiState.err='';aiState.kModel='';saveState();render();break;}
    case 'ai-connect':case 'ai-reload-models':{var _k2=$('#aiKeyInput');if(_k2)aiSetKey(_k2.value.trim());var _b2=$('#aiBase');if(_b2)S.settings.aiCustomBase=_b2.value.trim();aiConnect();break;}
    case 'ai-key-edit':{aiState.editKey=true;aiState.err='';aiState.kModel=aiModel();if(aiKey()&&!aiModelsCache())aiConnect();else render();break;}
    case 'ai-parse':{var _e=$('#aiInput');if(_e)aiState.input=_e.value;aiParse();break;}
    case 'ai-extract':{var _e=$('#aiInput');if(_e)aiState.input=_e.value;aiExtract();break;}
    case 'ai-ask':{var _e=$('#aiInput');if(_e)aiState.input=_e.value;aiAsk();break;}
    case 'ai-brief':{var _e=$('#aiProject');if(_e)aiState.project=_e.value;aiBrief();break;}
    case 'ai-open-parsed':{var _p=aiState.parsed;if(_p)openForm(null,{projectId:_p.projectId,categoryId:_p.categoryId||'',spocIds:_p.spocIds,lineItem:_p.lineItem,task:_p.task,status:_p.status,etaKind:_p.etaKind,eta:_p.eta,etaEnd:_p.etaEnd,tags:_p.tags,important:!!_p.important,aiReview:true,aiReviewSource:'AI add'});break;}
    case 'ai-add-selected':aiAddSelected();break;
    case 'ai-send':{var _ai=$('#aiInput');if(_ai)aiState.input=_ai.value;aiSend();break;}
    case 'ai-voice':aiStartVoice();break;
    case 'ai-clear-chat':aiClearChat();break;
    case 'ai-apply-pending':aiApplyPending();break;
    case 'ai-cancel-pending':aiState.pending=null;aiChatPush('ai','Cancelled. No data was changed.');render();break;
    case 'ai-suggest':{aiState.input=el.getAttribute('data-q')||'';aiSend();break;}
    case 'ai-open':{openDetail(el.getAttribute('data-id'));break;}
    case 'ai-undo':{aiUndo(+el.getAttribute('data-i'));break;}
    case 'ai-copy-b':{aiCopyText(+el.getAttribute('data-i'));break;}
    case 'ai-pdf-b':{var _cm=aiChat[+el.getAttribute('data-i')];if(_cm)aiExportPDF('AI response',_cm.text||'');break;}
    case 'ai-edit':{var _ee=$('#aiInput');if(_ee)aiState.input=_ee.value;aiUpdate();break;}
    case 'ai-apply-edits':aiApplyEdits();break;
    case 'ai-cancel-edits':{aiState.edits=null;render();toast('AI updates rejected');break;}
    case 'ai-copy':aiCopy();break;
    case 'ai-pdf':aiExportPDF(aiState.outTitle||'AI response',aiState.out||'');break;
    case 'f-important':{var fri=sheetFor('form');if(fri){fri.data.f.important=!fri.data.f.important;renderForm(fri);}break;}
    case 'f-eta-quick':{var frq=sheetFor('form');if(frq){var fk=el.getAttribute('data-k'),ff=frq.data.f,tt=todayISO();if(fk==='today'){ff.etaKind='date';ff.eta=tt;ff.etaEnd='';}else if(fk==='tomorrow'){ff.etaKind='date';ff.eta=addDaysISO(tt,1);ff.etaEnd='';}else if(fk==='week'){ff.etaKind='date';ff.eta=endOfWeekISO(tt);ff.etaEnd='';}else if(fk==='custom'){ff.etaKind='date';ff.etaEnd='';}else{ff.etaKind='none';ff.eta='';ff.etaEnd='';}renderForm(frq);}break;}
    case 'f-status-set':{var frs=sheetFor('form');if(frs){frs.data.f.status=el.getAttribute('data-k');renderForm(frs);}break;}
    case 'pfilt':peopleView.filt=el.getAttribute('data-k');render();break;
    case 'workload-mode':peopleView.mode='workload';nav('workload',{});break;
    case 'people-mode':peopleView.mode='people';nav('people',{});break;
    case 'd-important':{var dri=sheetFor('detail');if(dri){var ai=actById(dri.data.id);if(ai){updateAct(dri.data.id,{important:!ai.important});renderDetail(dri);render();}}break;}
    case 'add-for-day':{var dIso=el.getAttribute('data-d');closeTop();openForm(null,{eta:dIso});break;}
    case 'open-filters':openFilters();break;
    case 'filters-clear':{var qk=filters.quick;filters=defaultFilters();filters.quick=qk;var fr=sheetFor('filters');if(fr)renderFilters(fr);render();break;}
    case 'flt-toggle':{var kind=el.getAttribute('data-kind'),v=el.getAttribute('data-v');var arr=filters[kind];var ix=arr.indexOf(v);if(ix>=0)arr.splice(ix,1);else arr.push(v);var fr2=sheetFor('filters');if(fr2)renderFilters(fr2);render();break;}
    case 'flt-flag':{var fk=el.getAttribute('data-f');filters[fk]=!filters[fk];var fr3=sheetFor('filters');if(fr3)renderFilters(fr3);render();break;}
    /* Projects */
    case 'proj-filter':{filters=defaultFilters();filters.project=[id];nav('list',{});break;}
    case 'proj-nav':nav('projectDetail',{id:id,seg:'open'});break;
    case 'proj-seg':nav('projectDetail',{id:id,seg:el.getAttribute('data-seg'),tag:view.params.tag||''},true);break;
    case 'proj-tag':{var _pt=el.getAttribute('data-tag')||'';nav('projectDetail',{id:id,seg:view.params.seg||'open',tag:(view.params.tag&&view.params.tag.toLowerCase()===_pt.toLowerCase())?'':_pt},true);break;}
    case 'proj-category':{var _pc=el.getAttribute('data-cat')||'';nav('projectDetail',{id:id,seg:view.params.seg||'open',tag:view.params.tag||'',category:_pc},true);break;}
    case 'manage-categories':{var cm=openSheet('<div class="shead"><h2>Manage categories</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div><div class="sbody"></div>',{tag:'catmgr'});cm.data={pid:id};renderCategoryManager(cm,id);break;}
    case 'cat-add':{var cm1=sheetFor('catmgr');if(cm1)inputSheet('New category','e.g. Compliance',function(name){var p=projById(cm1.data.pid);name=(name||'').trim();if(!p||!name)return;ensureProjectCategories(p);if(p.categories.some(function(c){return !c.archived&&c.name.toLowerCase()===name.toLowerCase();})){toast('Category already exists');return;}var mx=p.categories.reduce(function(m,c){return Math.max(m,c.order||0);},-1);p.categories.push({id:uid('cat'),name:name,archived:false,order:mx+1});saveState();renderCategoryManager(cm1,p.id);render();toast('Category added');});break;}
    case 'cat-rename':{var cm2=sheetFor('catmgr'),c2=cm2&&categoryById(cm2.data.pid,id);if(cm2&&c2)inputSheet('Rename category','New name',function(name){name=(name||'').trim();if(name){c2.name=name;saveState();renderCategoryManager(cm2,cm2.data.pid);render();toast('Category renamed');}});break;}
    case 'cat-archive':{var cm3=sheetFor('catmgr'),c3=cm3&&categoryById(cm3.data.pid,id);if(cm3&&c3)confirmSheet('Archive category?','Existing actionables keep their category history.','Archive',false,function(){c3.archived=true;saveState();renderCategoryManager(cm3,cm3.data.pid);render();toast('Category archived');});break;}
    case 'cat-up':case 'cat-down':{var cm4=sheetFor('catmgr'),p4=cm4&&projById(cm4.data.pid);if(cm4&&p4){ensureProjectCategories(p4);var ar=p4.categories.filter(function(c){return !c.archived;}).sort(function(a,b){return a.order-b.order;}),ix=ar.findIndex(function(c){return c.id===id;}),nx=act==='cat-up'?ix-1:ix+1;if(ix>=0&&nx>=0&&nx<ar.length){var tmp=ar[ix].order;ar[ix].order=ar[nx].order;ar[nx].order=tmp;saveState();renderCategoryManager(cm4,p4.id);render();}}break;}
    case 'add-project':inputSheet('New project','e.g. HDFC Bank / Internal Team',function(name){var np={id:uid('p'),name:name,code:name.split(/\s+/)[0].toUpperCase().slice(0,6)};ensureProjectCategories(np);S.projects.push(np);saveState();render();toast('Project added \u2014 now add owners/SPOCs');});break;
    case 'edit-proj':{var pp=projById(id);if(pp)inputSheet('Rename "'+pp.name+'"','New name',function(name){pp.name=name.trim()||pp.name;pp.code=pp.name.split(/\s+/)[0].toUpperCase().slice(0,6);saveState();render();toast('Project renamed');});break;}
    /* People */
    case 'person':nav('personDetail',{id:id});break;
    case 'add-person':personSheet(function(){render();});break;
    case 'person-ok':{var pr=sheetFor('newperson');if(pr){var nm=($('#npName',pr.sheet)||{}).value||'';nm=nm.trim();if(!nm){toast('Enter a name');break;}var u={id:uid('u'),name:nm};S.people.push(u);saveState();var cb0=pr.onOk;closeSheet(pr);if(cb0)cb0(u);else render();toast('Owner/SPOC added');}break;}
    /* Calendar */
    case 'day':openDay(el.getAttribute('data-d'));break;
    case 'cal-prev':calState.m--;if(calState.m<0){calState.m=11;calState.y--;}render();break;
    case 'cal-next':calState.m++;if(calState.m>11){calState.m=0;calState.y++;}render();break;
    case 'cal-today':{var n2=new Date();calState={y:n2.getFullYear(),m:n2.getMonth()};render();break;}
    /* Sheets */
    case 'close-sheet':closeTop();break;
    case 'form-save':{var frSave=sheetFor('form');if(frSave)saveForm(frSave);break;}
    case 'ai-review-reject':{var frReject=sheetFor('form');if(frReject)aiRejectPendingItem(frReject);break;}
    case 'ai-pending-open':{var piOpen=parseInt(el.getAttribute('data-i'),10);if(!isNaN(piOpen))aiOpenPendingItem(piOpen);break;}
    case 'ai-edit-proposal-open':{var eiOpen=parseInt(el.getAttribute('data-i'),10),ed=(aiState.edits||[])[eiOpen];if(ed)openForm(ed.id,{aiReview:true,aiReviewSource:'AI update',aiPatch:ed.patch||{}});break;}
    case 'confirm-ok':{var cs=sheetFor('confirm');if(cs){var cb=cs.onOk;closeSheet(cs);if(cb)cb();}break;}
    case 'input-ok':{var isRec=sheetFor('input');if(isRec){var val=($('#inpS',isRec.sheet)||{}).value||'';val=val.trim();if(!val){toast('Enter a value');break;}var cb2=isRec.onOk;closeSheet(isRec);if(cb2)cb2(val);}break;}
    /* Detail sheet */
    case 'd-delete':{
      var drDel=sheetFor('detail');
      if(drDel){
        var delA=actById(drDel.data.id);
        if(delA){
          confirmSheet('Delete task?','Delete “'+delA.lineItem+'”? This removes the task from the current dataset.','Delete',true,function(){
            snapshot('Before task deletion');
            var idx=S.actionables.findIndex(function(x){return x.id===delA.id;});
            if(idx>=0){S.actionables.splice(idx,1);saveState();closeSheet(drDel);render();toast('Task deleted');}
          });
        }
      }
      break;
    }
    case 'd-comment':{
      var drC=sheetFor('detail');
      if(drC){
        var ci=$('#cmtIn',drC.sheet),txt=ci?(ci.value||'').trim():'';
        if(!txt){toast('Write a comment first');break;}
        addComment(drC.data.id,cap(txt,4000));
        renderDetail(drC);render();toast('Comment added');
      }
      break;
    }
    case 'd-cmt-rephrase':{
      var drR=sheetFor('detail');
      if(drR)aiRephraseComment(drR);
      break;
    }
    case 'd-cmt-edit':{
      var drE=sheetFor('detail'),ei=parseInt(el.getAttribute('data-i'),10);
      if(drE&&!isNaN(ei)){drE.data.editCmt=ei;renderDetail(drE);}
      break;
    }
    case 'd-cmt-editcancel':{
      var drEC=sheetFor('detail');if(drEC){delete drEC.data.editCmt;renderDetail(drEC);}
      break;
    }
    case 'd-cmt-editsave':{
      var drES=sheetFor('detail'),esi=parseInt(el.getAttribute('data-i'),10);
      if(drES&&!isNaN(esi)){
        var ae=actById(drES.data.id),ta=$('#cmtEdit',drES.sheet),nt=ta?(ta.value||'').trim():'';
        if(ae&&ae.comments[esi]&&nt){ae.comments[esi].text=cap(nt,4000);ae.comments[esi].ts=Date.now();ae.comments[esi].edited=true;logAct(ae,'Comment edited');ae.updatedAt=Date.now();saveState();delete drES.data.editCmt;renderDetail(drES);render();toast('Comment updated');}
        else toast('Comment cannot be empty');
      }
      break;
    }
    case 'd-cmt-del':{
      var drCD=sheetFor('detail'),di=parseInt(el.getAttribute('data-i'),10);
      if(drCD&&!isNaN(di)){
        var ad=actById(drCD.data.id);
        if(ad&&ad.comments[di])confirmSheet('Delete comment?','Remove this comment?','Delete',true,function(){ad.comments.splice(di,1);logAct(ad,'Comment deleted');ad.updatedAt=Date.now();saveState();renderDetail(drCD);render();toast('Comment deleted');});
      }
      break;
    }
    case 'd-spoc':{var dr0=sheetFor('detail');if(dr0){var a0=actById(dr0.data.id);if(a0){var arr0=a0.spocIds.slice();var ix0=arr0.indexOf(id);if(ix0>=0)arr0.splice(ix0,1);else arr0.push(id);updateAct(dr0.data.id,{spocIds:arr0});renderDetail(dr0);render();}}break;}
    case 'd-spoc-new':{var drn=sheetFor('detail');if(drn){var an=actById(drn.data.id);if(an)personSheet(function(u){updateAct(drn.data.id,{spocIds:an.spocIds.concat([u.id])});renderDetail(drn);render();});}break;}
    case 'd-complete':{var dr=sheetFor('detail');if(dr){updateAct(dr.data.id,{status:'Completed'});var a2=actById(dr.data.id);if(a2){logAct(a2,'Completed');saveState();}renderDetail(dr);render();toast('Completed');}break;}
    case 'd-reopen':{var dr2=sheetFor('detail');if(dr2){updateAct(dr2.data.id,{status:'In Progress'});var a3=actById(dr2.data.id);if(a3){logAct(a3,'Reopened');saveState();}renderDetail(dr2);render();toast('Reopened');}break;}
    case 'd-edit':{var dr3=sheetFor('detail');if(dr3)openForm(dr3.data.id);break;}
    case 'd-act-toggle':{var drAct=sheetFor('detail');if(drAct){drAct.data.actOpen=!drAct.data.actOpen;renderDetail(drAct);}break;}
    case 'd-restore-point':{var drSnap=sheetFor('detail');if(drSnap){snapshot('Manual restore point');toast('Restore point saved');}break;}
    case 'rem-add':{var drRem=sheetFor('detail');if(drRem){var arRem=actById(drRem.data.id);if(arRem){var next=addDaysISO(todayISO(),1);remPatch(arRem.id,{on:true,date:next,time:'',note:'',done:false,waitingFor:'',requestedOn:todayISO(),expectedBy:''},{e:'Follow-up set',t:fmtDY(next)});renderDetail(drRem);render();toast('Follow-up reminder added');}}break;}
    case 'rem-done':{var drDone=sheetFor('detail');if(drDone){var arDone=actById(drDone.data.id);if(arDone&&arDone.rem&&arDone.rem.on){remPatch(arDone.id,{done:true},{e:'Follow-up completed'});renderDetail(drDone);render();toast('Follow-up completed');}}break;}
    case 'rem-react':{var drReact=sheetFor('detail');if(drReact){var arReact=actById(drReact.data.id);if(arReact&&arReact.rem){var rd=arReact.rem.date&&arReact.rem.date>todayISO()?arReact.rem.date:todayISO();remPatch(arReact.id,{on:true,done:false,date:rd},{e:'Follow-up reactivated',t:fmtDY(rd)});renderDetail(drReact);render();toast('Follow-up reactivated');}}break;}
    case 'rem-remove':{var drRem=sheetFor('detail');if(drRem){var arRemove=actById(drRem.data.id);if(arRemove&&arRemove.rem){remPatch(arRemove.id,{on:false,done:false},{e:'Follow-up removed'});renderDetail(drRem);render();toast('Follow-up removed');}}break;}
    case 'rem-snooze':{var drSnooze=sheetFor('detail');if(drSnooze){var arSnooze=actById(drSnooze.data.id);var days=Math.max(1,parseInt(el.getAttribute('data-n'),10)||1);if(arSnooze&&arSnooze.rem&&arSnooze.rem.on){var base=arSnooze.rem.date&&arSnooze.rem.date>todayISO()?arSnooze.rem.date:todayISO();var nd=addDaysISO(base,days);remPatch(arSnooze.id,{date:nd,done:false},{e:'Follow-up snoozed',f:arSnooze.rem.date||'',t:nd?fmtDY(nd):''});renderDetail(drSnooze);render();toast('Follow-up moved to '+fmtDY(nd));}}break;}
    case 'do-export-pdf':{
      var pid2=exportSel.projId||null,lbl2=pid2?projName(pid2):'All Projects';
      exportPdf(pid2,lbl2,exportRangeFilter(exportSel));break;
    }
    case 'do-export-xlsx':{
      var xpid=exportSel.projId||null,xlbl=xpid?projName(xpid):'All Projects';
      exportExcel(xpid,xlbl,null,exportRangeFilter(exportSel));break;
    }
    case 'export-list-excel':exportExcel(null,'All_Projects');break;
    /* Settings */
    case 'toggle-notif':{S.settings.notifEnabled=!S.settings.notifEnabled;saveState();syncSchedule();if(S.settings.notifEnabled&&A&&A.requestNotif&&notifState()==='denied')A.requestNotif();render();toast(S.settings.notifEnabled?'Daily brief on':'Daily brief off');break;}
    case 'backup':{try{var json=JSON.stringify(S,null,1);var b64=btoa(unescape(encodeURIComponent(json)));deliverFile(b64,'Actionables_Backup_'+stamp()+'.json','application/json');}catch(e2){toast('Backup failed');}break;}
    case 'import':openImport();break;
    case 'import-file':{
      /* Trigger native file picker */
      var ir0=sheetFor('import');
      if(!ir0)break;
      var inp0=$('#impFileInput',ir0.sheet);
      if(inp0){
        inp0.onchange=function(){
          var file=inp0.files&&inp0.files[0];
          if(!file)return;
          var fr=new FileReader();
          fr.onload=function(ev){
            var txt=$('#impTxt',ir0.sheet);
            if(txt)txt.value=ev.target.result;
            toast('File loaded \u2014 tap Restore to import');
          };
          fr.readAsText(file);
        };
        inp0.click();
      }
      break;
    }
    case 'import-ok':{
      var ir=sheetFor('import');
      if(ir){
        var raw=($('#impTxt',ir.sheet)||{}).value||'';
        try{
          var pp=JSON.parse(raw);
          if(!pp||!pp.actionables)throw new Error('bad');
          confirmSheet('Replace all data?','Current data will be overwritten with the backup.','Restore backup',true,function(){
            snapshot('Before restore');S=pp;ensureDefaults();saveState();applyTheme();closeSheet(ir);filters=defaultFilters();render();syncSchedule();toast('Backup restored successfully');
          });
        }catch(e3){toast('Not a valid backup JSON');}
      }
      break;
    }
    case 'tmpl-download':exportTemplate();break;
    case 'tmpl-import':openTemplateImport();break;
    case 'tmpl-file':{
      var trec=sheetFor('tmplimport');if(!trec)break;
      var tinp=$('#tmplFileInput',trec.sheet);if(!tinp)break;
      tinp.onchange=function(){
        var file=tinp.files&&tinp.files[0];if(!file)return;
        if(!xlsxReady()){toast('Import engine loading \u2014 try again');return;}
        var fr=new FileReader();
        fr.onload=function(ev){
          var wb;try{wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array'});}catch(e){toast('Could not read the Excel file');return;}
          var orig=S,clone;try{clone=JSON.parse(JSON.stringify(S));}catch(e){toast('Import failed');return;}
          S=clone;var c;
          try{c=runTemplateImport(wb);}
          catch(e){S=orig;toast(e&&e.message==='NO_SHEET'?'No \u201cActionables\u201d sheet found':'Could not process the template');return;}
          S=orig;
          var extra=(c.projNew||c.spocNew)?' \u00b7 '+c.projNew+' new project(s), '+c.spocNew+' new SPOC(s)':'';
          var st=$('#tmplStatus',trec.sheet);if(st)st.textContent='Preview \u2014 '+c.updated+' update \u00b7 '+c.added+' add \u00b7 '+c.deleted+' delete'+extra+'.';
          confirmSheet('Apply template update?',
            c.updated+' updated \u00b7 '+c.added+' added \u00b7 '+c.deleted+' deleted'+extra+'. Items not in the file are left unchanged.',
            'Apply update',c.deleted>0,function(){
              snapshot('Before template import');S=clone;ensureDefaults();saveState();applyTheme();closeSheet(trec);filters=defaultFilters();render();syncSchedule();toast('Data updated from template');
            });
        };
        fr.readAsArrayBuffer(file);
      };
      tinp.click();
      break;
    }
    case 'perm-notif':{if(A&&A.requestNotif)A.requestNotif();setTimeout(function(){render();},500);break;}
    case 'perm-test':{if(A&&A.testNotification){A.testNotification();toast('Test notification sent');}else toast('Only available in the installed app');break;}
    case 'perm-appinfo':{if(A&&A.openAppSettings)A.openAppSettings();else toast('Only available in the installed app');break;}
    case 'reseed':confirmSheet('Reset to demo data?','All current data will be replaced with the BCP / ICICI / SCB demo set.','Reset',true,function(){snapshot('Before reset');S=window.buildSeed(Date.now());saveState();applyTheme();filters=defaultFilters();render();syncSchedule();toast('Demo data restored');});break;
  }
});

document.addEventListener('change',function(e){
  var el=e.target,chg=el.getAttribute&&el.getAttribute('data-chg');
  if(!chg)return;var v=el.value;
  if(chg==='bulk-select'){var bid=el.getAttribute('data-id');if(bid){if(el.checked)bulkSel[bid]=true;else delete bulkSel[bid];render();}return;}
  if(chg.indexOf('d-')===0||chg.indexOf('rem-')===0){
    var dr=sheetFor('detail');if(!dr)return;var aid=dr.data.id;
    if(chg==='d-type'){if(v==='__newtype'){inputSheet('New type','Type name',function(name){name=(name||'').trim();if(name){if(S.taskTypes.indexOf(name)<0)S.taskTypes.push(name);updateAct(aid,{type:name});saveState();renderDetail(dr);render();}});return;}updateAct(aid,{type:v});renderDetail(dr);render();return;}
    if(chg==='d-spoc-add'){var aSp=actById(aid);if(v==='__new'){personSheet(function(u){var a2=actById(aid);if(a2)updateAct(aid,{spocIds:a2.spocIds.concat([u.id])});renderDetail(dr);render();});return;}if(v&&aSp&&aSp.spocIds.indexOf(v)<0)updateAct(aid,{spocIds:aSp.spocIds.concat([v])});renderDetail(dr);render();return;}
    if(chg==='d-tag-add-dd'){if(v){var aTg=actById(aid);var ntg=(aTg.tags||[]).slice();addTagTo(ntg,v);updateAct(aid,{tags:ntg});}renderDetail(dr);render();return;}
    if(chg==='d-assigned')updateAct(aid,{assignedAt:v?isoToDate(v).getTime():null});
    else if(chg==='d-status')updateAct(aid,{status:v});
    else if(chg==='d-etakind')updateAct(aid,{etaKind:v});
    else if(chg==='d-eta')updateAct(aid,{eta:v});
    else if(chg==='d-etaend')updateAct(aid,{etaEnd:v});
    else if(chg==='rem-date')remPatch(aid,{date:v},{e:'Reminder updated',t:v?fmtDY(v):''});
    else if(chg==='rem-time')remPatch(aid,{time:v});
    else if(chg==='rem-note')remPatch(aid,{note:v});
    else if(chg==='rem-waiting')remPatch(aid,{waitingFor:v});
    else if(chg==='rem-requested')remPatch(aid,{requestedOn:v});
    else if(chg==='rem-expected')remPatch(aid,{expectedBy:v});
    if(chg==='rem-note'||chg==='rem-time'){render();return;}
    renderDetail(dr);render();return;
  }
  if(chg.indexOf('f-')===0&&sheetFor('form')){
    var fr=sheetFor('form'),f=fr.data.f;
    switch(chg){
      case 'f-proj':
        if(v==='__new'){inputSheet('New project','Project name',function(name){var p={id:uid('p'),name:name,code:name.split(/\s+/)[0].toUpperCase().slice(0,6)};ensureProjectCategories(p);S.projects.push(p);saveState();f.projectId=p.id;renderForm(fr);});}
        else{f.projectId=v;f.categoryId='';renderForm(fr);}break;
      case 'f-ticket':f.ticket=v;break;case 'f-url':f.ticketUrl=v;break;case 'f-line':f.lineItem=v;break;case 'f-task':f.task=v;break;case 'f-category':f.categoryId=v;break;case 'f-assigned':f.assignedAt=v?isoToDate(v).getTime():null;break;
      case 'f-etakind':f.etaKind=v;renderForm(fr);break;case 'f-eta':f.eta=v;break;case 'f-etaend':f.etaEnd=v;break;
      case 'f-remon':f.remOn=!!v;if(f.remOn&&!f.remDate)f.remDate=todayISO();renderForm(fr);break;
      case 'f-remdate':f.remDate=v;break;case 'f-remtime':f.remTime=v;break;case 'f-remnote':f.remNote=v;break;case 'f-remwaiting':f.remWaiting=v;break;case 'f-remrequested':f.remRequested=v;break;case 'f-remexpected':f.remExpected=v;break;
      case 'f-recur':f.recurrence.enabled=v!=='none';f.recurrence.freq=v==='none'?'weekly':v;if(v==='custom'&&!f.recurrence.unit)f.recurrence.unit='week';if(f.recurrence.enabled&&!f.eta)f.eta=addDaysISO(todayISO(),1),f.etaKind='date';renderForm(fr);break;
      case 'f-recur-int':f.recurrence.interval=Math.max(1,parseInt(v,10)||1);break;case 'f-recur-unit':f.recurrence.unit=v;break;case 'f-recur-end':f.recurrence.endDate=v;break;
      case 'f-status':f.status=v;break;case 'f-notes':f.notes=v;break;
      case 'f-spoc-select':f.spocIds=v?[v]:[];break;
      case 'f-type':if(v==='__newtype'){inputSheet('New type','Type name',function(name){name=(name||'').trim();if(name){if(S.taskTypes.indexOf(name)<0)S.taskTypes.push(name);f.type=name;saveState();renderForm(fr);}});}else{f.type=v;renderForm(fr);}break;
      case 'f-tag-add-dd':if(v){f.tags=f.tags||[];addTagTo(f.tags,v);renderForm(fr);}break;
    }
    return;
  }
  if(chg==='lst-proj'){filters.project=(v==='__all')?[]:[v];filters.spoc=[];render();return;}
  if(chg==='lst-spoc'){filters.spoc=(v==='__all')?[]:(v==='__none'?['__tbc']:[v]);render();return;}
  if(chg==='global-search'){globalSearchState.q=v;var gs=sheetFor('globalsearch');if(gs)renderGlobalSearch(gs);return;}
  if(chg==='ai-pending-field'){var pi=+el.getAttribute('data-i'),pf=el.getAttribute('data-field'),pp=aiState.pending;if(pp&&pp.items[pi]){var it=pp.items[pi],val=v;if(pp.kind==='add'){if(pf==='lineItem')it.lineItem=val;else if(pf==='projectId'){it.projectId=val;it.categoryId='';it._projLabel=val?projName(val):'Pick project';}else if(pf==='categoryId')it.categoryId=val;else if(pf==='ownerId')it.spocIds=val?[val]:[];else if(pf==='status')it.status=val;else if(pf==='eta'){it.eta=val;it.etaKind=val?'date':'none';it.etaLabel=val?fmtDY(val):'No ETA';}else if(pf==='task')it.task=val;else if(pf==='important')it.important=val==='1';else if(pf==='tags')it.tags=parseTagList(val||'');}else if(pp.kind==='update'){it.patch=it.patch||{};if(pf==='lineItem')it.patch.lineItem=val;else if(pf==='projectId'){it.patch.projectId=val;it.patch.categoryId='';}else if(pf==='categoryId')it.patch.categoryId=val;else if(pf==='ownerId')it.patch.spocIds=val?[val]:[];else if(pf==='status')it.patch.status=val;else if(pf==='eta'){it.patch.etaKind=val?'date':'none';it.patch.eta=val;it.patch.etaEnd='';}else if(pf==='task')it.patch.task=val;else if(pf==='important')it.patch.important=val==='1';else if(pf==='tags')it.patch.tags=parseTagList(val||'');aiRebuildDiff(it);}render();}return;}
  if(chg==='ai-input'){aiState.input=v;return;}
  if(chg==='ai-project'){aiState.project=v;return;}
  if(chg==='ai-provider'){S.settings.aiProvider=v;aiState.kModel=aiModel();aiState.err='';saveState();render();return;}
  if(chg==='ai-base'){aiMigrate();S.settings.aiCustomBase=v;return;}
  if(chg==='ai-freeonly'){aiState.freeOnly=el.checked;render();return;}
  if(chg==='ai-kmodel'){aiState.kModel=v;return;}
  if(chg==='ai-kmodel-pick'){if(v){aiState.kModel=v;render();}return;}
  if(chg==='ai-item'){var _ii=+el.getAttribute('data-i');if(aiState.items&&aiState.items[_ii])aiState.items[_ii]._sel=el.checked;return;}
  if(chg==='ai-edit-tg'){var _ex=+el.getAttribute('data-i');if(aiState.edits&&aiState.edits[_ex])aiState.edits[_ex]._sel=el.checked;return;}
  if(chg==='psort'){peopleView.sort=v;render();return;}
  if(chg==='flt-tag'){filters.tags=v?[v]:[];var frt=sheetFor('filters');if(frt)renderFilters(frt);render();return;}
  if(chg==='flt-sort'){filters.sort=v;render();return;}
  if(chg==='flt-from'){filters.from=v;render();return;}
  if(chg==='flt-to'){filters.to=v;render();return;}
  if(chg==='rep-proj'){exportSel.projId=v;render();return;}
  if(chg==='rep-preset'){exportSel.preset=v;var t0=todayISO();if(v==='today'){exportSel.from=t0;exportSel.to=t0;}else if(v==='7'){exportSel.from=t0;exportSel.to=addDaysISO(t0,7);}else if(v==='30'){exportSel.from=t0;exportSel.to=addDaysISO(t0,30);}else if(v==='all'){exportSel.from='';exportSel.to='';}render();return;}
  if(chg==='rep-from'){exportSel.from=v;exportSel.preset='custom';render();return;}
  if(chg==='rep-to'){exportSel.to=v;exportSel.preset='custom';render();return;}
  if(chg==='set-theme'){S.settings.theme=(v==='light'||v==='high-contrast')?v:'dark';saveState();applyTheme();render();toast('Theme: '+themeLabel(S.settings.theme));return;}
  if(chg==='set-name'){S.settings.userName=v;saveState();render();return;}
  if(chg==='set-density'){S.settings.density=v==='compact'?'compact':'comfortable';saveState();applyTheme();render();return;}
  if(chg==='set-time'){var parts=v.split(':');if(parts.length===2){S.settings.notifHour=+parts[0];S.settings.notifMinute=+parts[1];saveState();syncSchedule();toast('Daily brief at '+v);}return;}
});

var _srchTimer=null;
function bindViewInputs(){
  var s=$('#srch');
  if(s){s.addEventListener('input',function(){filters.q=s.value;var val=s.value,sel=s.selectionStart;clearTimeout(_srchTimer);_srchTimer=setTimeout(function(){var scroll=window.scrollY;render();var s2=$('#srch');if(s2){s2.value=val;s2.focus();try{s2.setSelectionRange(sel,sel);}catch(e){}}window.scrollTo(0,scroll);},150);});}
}

document.addEventListener('input',function(e){
  var el=e.target;
  if(el&&el.id==='globalSearchInput'){globalSearchState.q=el.value;var gs=sheetFor('globalsearch');if(gs){clearTimeout(window.__gsTimer);window.__gsTimer=setTimeout(function(){renderGlobalSearch(gs);},90);}}
});

/* ---- BACK / LIFECYCLE ---- */
function goBack(){
  if(sheetStack.length){closeTop();return true;}
  if(history_.length){var prev=history_.pop();view=prev;render();window.scrollTo(0,0);return true;}
  if(view.name!=='list'){view={name:'list',params:{}};render();return true;}
  return false;
}
window.__handleBack=function(){return goBack()?'handled':'exit';};
window.__onResume=function(){render();};

/* ---- CLOUD SYNC BRIDGE (used by sync.js) ---- */
window.__getState=function(){return S;};
window.__applyCloudState=function(obj){
  if(!obj||!obj.actionables)return;
  if(obj.actionables.length===0&&S&&S.actionables&&S.actionables.length>0){
    if(window.Cloud&&window.Cloud.push)window.Cloud.push();   /* cloud is blank but we have data -> push ours up, don't self-wipe */
    return;
  }
  snapshot('Before sync');
  S=obj;ensureDefaults();
  try{localStorage.setItem('act_data',JSON.stringify(S));}catch(e){}
  applyTheme();
  render();                                   /* sheets live in #sheets, untouched by render() */
  var det=sheetFor('detail');if(det)renderDetail(det);
};
window.__cloudStatusChanged=function(){if(view.name==='settings')render();};

/* ---- BOOT ---- */
loadState();
applyTheme();
syncSchedule();
render();
try{if(window.Cloud&&window.Cloud.init)window.Cloud.init();}catch(e){}

/* ================= Excel round-trip template ================= */
function isoFromMs(ms){if(!ms)return '';var d=new Date(ms);function p(n){return(n<10?'0':'')+n;}return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
function dateToMs(iso){var p=String(iso).split('-');if(p.length!==3)return Date.now();return new Date(+p[0],+p[1]-1,+p[2],10,0,0).getTime();}
var TMPL_MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function parseTmplDate(v){
  if(v==null)return '';
  if(typeof v==='number'&&isFinite(v)){var dc=new Date(Math.round((v-25569)*86400000));if(!isNaN(dc)){function p(n){return(n<10?'0':'')+n;}return dc.getUTCFullYear()+'-'+p(dc.getUTCMonth()+1)+'-'+p(dc.getUTCDate());}}
  var s=String(v).trim();if(!s)return '';
  if(/^tbd$/i.test(s))return 'TBD';
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  var m=s.match(/^(\d{1,2})\s*(?:st|nd|rd|th)?\s*([A-Za-z]{3,})\.?\s*(\d{4})?$/);
  if(m){var mo=TMPL_MON[m[2].slice(0,3).toLowerCase()];if(mo){var yr=m[3]?+m[3]:(new Date()).getFullYear();function q(n){return(n<10?'0':'')+n;}return yr+'-'+q(mo)+'-'+q(+m[1]);}}
  var d2=new Date(s);if(!isNaN(d2)){function r(n){return(n<10?'0':'')+n;}return d2.getFullYear()+'-'+r(d2.getMonth()+1)+'-'+r(d2.getDate());}
  return '';
}
function hmap(rows){var h=(rows&&rows[0])||[],m={};for(var i=0;i<h.length;i++){var k=String(h[i]==null?'':h[i]).toLowerCase().replace(/[^a-z0-9]/g,'');if(k&&m[k]===undefined)m[k]=i;}return m;}
function hval(row,map,keys){for(var i=0;i<keys.length;i++){var idx=map[keys[i]];if(idx!==undefined){var v=row[idx];return v==null?'':v;}}return '';}
function ownersToIds(str,add){if(!str)return [];return String(str).split(/[,\/]/).map(function(x){return x.trim();}).filter(Boolean).map(function(n){return add(n);}).filter(Boolean);}
function findOrAddProject(name,c){name=String(name==null?'':name).trim();if(!name)return (S.projects[0]?S.projects[0].id:'');for(var i=0;i<S.projects.length;i++)if(S.projects[i].name.toLowerCase()===name.toLowerCase())return S.projects[i].id;var np={id:uid('p'),name:name,code:name.slice(0,4).toUpperCase()};S.projects.push(np);if(c)c.projNew++;return np.id;}
function findOrAddPerson(name,c){name=String(name==null?'':name).trim();if(!name)return null;for(var i=0;i<S.people.length;i++)if(S.people[i].name.toLowerCase()===name.toLowerCase())return S.people[i].id;var nu={id:uid('u'),name:name};S.people.push(nu);if(c)c.spocNew++;return nu.id;}
function sheetRows(wb,name){var ws=wb.Sheets[name];if(!ws)return [];return XLSX.utils.sheet_to_json(ws,{header:1,defval:''});}

function exportTemplate(){
  if(!xlsxReady()){toast('Export engine loading \u2014 try again');return;}
  var XU=XLSX.utils,wb=XU.book_new();
  var info=[
   ['Actionables \u2014 data template (round-trip)'],
   ['Edit this file, then load it back via Settings \u2192 Update from template.'],
   [''],
   ['ID','Do NOT change or clear the ID on existing rows \u2014 it is how the app matches & updates them. Leave ID blank for NEW rows.'],
   ['Delete?','On the Actionables tab, type Yes to remove that row on import. Blank = keep.'],
   ['Status','Allowed: In Progress / On Hold / Dependency / Completed. Anything else becomes In Progress.'],
   ['Owner / SPOC','Name(s) from the SPOCs tab, comma-separated. Blank = to be assigned. New names are created automatically.'],
   ['Project','Name from the Projects tab. New names are created automatically.'],
   ['Important','Yes / No.'],
   ['ETA / due date','A date YYYY-MM-DD, or TBD, or blank. For a range put the start here and the end in ETA end.'],
   ['Follow-up date','Optional YYYY-MM-DD (turns on a reminder). Follow-up note is optional.'],
   ['Completed date','Only for Completed items; blank = today.'],
   [''],
   ['Items not present in this file are left untouched \u2014 nothing is deleted unless Delete? = Yes.']
  ];
  var wsi=XU.aoa_to_sheet(info);wsi['!cols']=[{wch:16},{wch:104}];XU.book_append_sheet(wb,wsi,'Read me');
  var wsp=XU.aoa_to_sheet([['ID','Project name','Short code']].concat(S.projects.map(function(p){return [p.id,p.name,p.code||''];})));
  wsp['!cols']=[{wch:16},{wch:26},{wch:12}];XU.book_append_sheet(wb,wsp,'Projects');
  var wsu=XU.aoa_to_sheet([['ID','SPOC / Owner name']].concat(S.people.map(function(u){return [u.id,u.name];})));
  wsu['!cols']=[{wch:16},{wch:28}];XU.book_append_sheet(wb,wsu,'SPOCs');
  var aHead=['ID','Project','Ticket / Ref ID','Ticket link','Line item','Description / update','Owner / SPOC','Status','Important','ETA / due date','ETA end (range only)','Follow-up date','Follow-up note','Remarks / notes','Tags','Completed date','Delete?'];
  var aRows=S.actionables.map(function(a){
    var eta='',ee='';
    if(a.etaKind==='tbd')eta='TBD';
    else if(a.etaKind==='range'){eta=a.eta||'';ee=a.etaEnd||'';}
    else if(a.etaKind==='date')eta=a.eta||'';
    var rem=a.rem||{};
    return [a.id,projName(a.projectId),a.ticket||'',a.ticketUrl||'',a.lineItem||'',a.task||'',
      (a.spocIds||[]).map(function(id){return personName(id);}).join(', '),
      a.status,a.important?'Yes':'No',eta,ee,
      rem.on?(rem.date||''):'',rem.on?(rem.note||''):'',a.notes||'',(a.tags||[]).join(', '),
      (a.status==='Completed'&&a.completedAt)?isoFromMs(a.completedAt):'',''];
  });
  var wsa=XU.aoa_to_sheet([aHead].concat(aRows));
  wsa['!cols']=[{wch:20},{wch:14},{wch:16},{wch:22},{wch:34},{wch:46},{wch:22},{wch:14},{wch:10},{wch:15},{wch:16},{wch:14},{wch:28},{wch:40},{wch:20},{wch:15},{wch:8}];
  XU.book_append_sheet(wb,wsa,'Actionables');
  var b64=XLSX.write(wb,{bookType:'xlsx',type:'base64'});
  deliverFile(b64,'Actionables-Template-'+stamp()+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function openTemplateImport(){
  openSheet('<div class="shead"><h2>Update from template</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div>'+
    '<div class="sbody"><p style="color:var(--tx2);font-size:.83rem;line-height:1.5;margin-bottom:12px">Pick the edited Excel template (.xlsx). Existing rows are matched by their <b>ID</b> and updated; rows with a blank ID are added; set <b>Delete?</b> to Yes to remove a row. Items not in the file are left unchanged.</p>'+
    '<button class="btn ghost" data-act="tmpl-file">'+I('dl')+'Choose Excel file</button>'+
    '<input id="tmplFileInput" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none">'+
    '<div id="tmplStatus" class="note" style="padding:12px 0 0"></div></div>',{tag:'tmplimport'});
}

function runTemplateImport(wb){
  var c={updated:0,added:0,deleted:0,projNew:0,spocNew:0};
  var pr=sheetRows(wb,'Projects');
  if(pr.length){var pm=hmap(pr);for(var i=1;i<pr.length;i++){var r=pr[i];if(!r)continue;
    var pid=String(hval(r,pm,['id'])||'').trim(),pname=String(hval(r,pm,['projectname','project','name'])||'').trim(),pcode=String(hval(r,pm,['shortcode','code'])||'').trim();
    if(!pname)continue;var p=pid?projById(pid):null;
    if(!p)for(var j=0;j<S.projects.length;j++)if(S.projects[j].name.toLowerCase()===pname.toLowerCase()){p=S.projects[j];break;}
    if(p){p.name=pname;if(pcode)p.code=pcode;}else{S.projects.push({id:pid||uid('p'),name:pname,code:pcode||pname.slice(0,4).toUpperCase()});c.projNew++;}
  }}
  var ur=sheetRows(wb,'SPOCs');
  if(ur.length){var um=hmap(ur);for(var k=1;k<ur.length;k++){var u=ur[k];if(!u)continue;
    var uid2=String(hval(u,um,['id'])||'').trim(),uname=String(hval(u,um,['spocownername','spocname','ownername','name','spoc'])||'').trim();
    if(!uname)continue;var pu=uid2?personById(uid2):null;
    if(!pu)for(var j2=0;j2<S.people.length;j2++)if(S.people[j2].name.toLowerCase()===uname.toLowerCase()){pu=S.people[j2];break;}
    if(pu){pu.name=uname;}else{S.people.push({id:uid2||uid('u'),name:uname});c.spocNew++;}
  }}
  var ar=sheetRows(wb,'Actionables');
  if(!ar.length)throw new Error('NO_SHEET');
  var am=hmap(ar),now=Date.now();
  for(var x=1;x<ar.length;x++){var row=ar[x];if(!row)continue;
    var id=String(hval(row,am,['id'])||'').trim();
    var line=cap(String(hval(row,am,['lineitem','line','title'])||'').trim(),200);
    var del=String(hval(row,am,['delete','remove'])||'').trim().toLowerCase();
    if(del==='yes'||del==='y'||del==='x'||del==='true'||del==='1'){if(id&&actById(id)){S.actionables=S.actionables.filter(function(z){return z.id!==id;});c.deleted++;}continue;}
    if(!line)continue;
    var proj=findOrAddProject(hval(row,am,['project','projectname']),c);
    var spocIds=ownersToIds(hval(row,am,['ownerspoc','owner','spoc','owners']),function(n){return findOrAddPerson(n,c);});
    var stIn=String(hval(row,am,['status'])||'').trim();
    var status=STATUSES.indexOf(stIn)>=0?stIn:(STATUS_MAP[stIn]||'In Progress');
    var important=/^(yes|y|true|1)$/i.test(String(hval(row,am,['important'])||'').trim());
    var task=cap(String(hval(row,am,['descriptionupdate','description','update','task'])||'').trim(),4000);
    var ticket=cap(String(hval(row,am,['ticketrefid','ticket','refid','ticketref'])||'').trim(),80);
    var ticketUrl=String(hval(row,am,['ticketlink','link','url'])||'').trim();
    var notes=cap(String(hval(row,am,['remarksnotes','remarks','notes'])||'').trim(),4000);
    var tags=parseTagList(hval(row,am,['tags','tag']));
    var fdate=parseTmplDate(hval(row,am,['followupdate','followup']));if(fdate==='TBD')fdate='';
    var fnote=String(hval(row,am,['followupnote','followupnotes'])||'').trim();
    var cdate=parseTmplDate(hval(row,am,['completeddate','completed','completeddatew']));if(cdate==='TBD')cdate='';
    var e1=parseTmplDate(hval(row,am,['etaduedate','eta','due','etadate']));
    var e2=parseTmplDate(hval(row,am,['etaendrangeonly','etaend','end']));
    var ek,ev,ee;
    if(e1==='TBD'){ek='tbd';ev='';ee='';}
    else if(e1&&e2&&e2!=='TBD'){ek='range';ev=e1;ee=e2;}
    else if(e1){ek='date';ev=e1;ee='';}
    else{ek='none';ev='';ee='';}
    var a=id?actById(id):null;
    if(a){
      a.projectId=proj;a.ticket=ticket;a.ticketUrl=ticketUrl;a.lineItem=line;a.task=task;
      a.spocIds=spocIds.slice();a.etaKind=ek;a.eta=ev;a.etaEnd=ee;a.status=status;a.important=important;a.notes=notes;a.tags=tags;
      a.rem=a.rem||{on:false,date:'',time:'',note:'',done:false,waitingFor:'',requestedOn:'',expectedBy:''};
    a.rem.waitingFor=a.rem.waitingFor||'';a.rem.requestedOn=a.rem.requestedOn||'';a.rem.expectedBy=a.rem.expectedBy||'';
    a.recurrence=a.recurrence||{enabled:false,freq:'weekly',interval:1,unit:'week',endDate:'',seriesId:a.id};
    if(a.recurrence.enabled&&!a.recurrence.seriesId)a.recurrence.seriesId=a.id;
      a.rem.on=!!fdate;a.rem.date=fdate||'';a.rem.note=fnote;if(!fdate)a.rem.done=false;
      a.completedAt=(status==='Completed')?(cdate?dateToMs(cdate):(a.completedAt||now)):null;
      a.updatedAt=now;logAct(a,'Updated via template');c.updated++;
    }else{
      var na={id:uid('a'),projectId:proj,ticket:ticket,ticketUrl:ticketUrl,lineItem:line,task:task,
        spocIds:spocIds.slice(),etaKind:ek,eta:ev,etaEnd:ee,status:status,important:important,tags:tags,
        rem:{on:!!fdate,date:fdate||'',time:'',note:fnote,done:false},notes:notes,comments:[],
        activity:[{ts:now,user:(S.settings&&S.settings.userName)||'You',event:'Created',from:'',to:''}],
        createdAt:now,updatedAt:now,completedAt:(status==='Completed')?(cdate?dateToMs(cdate):now):null};
      if(na.spocIds.length)logAct(na,'Owner/SPOC assigned','',na.spocIds.map(function(id2){return personName(id2);}).join(' & '));
      S.actionables.unshift(na);c.added++;
    }
  }
  return c;
}

/* ================= Tags helpers ================= */
function normTag(s){return String(s==null?'':s).replace(/,/g,' ').replace(/\s+/g,' ').trim().slice(0,28);}
function allTags(){var seen={},out=[];S.actionables.forEach(function(a){(a.tags||[]).forEach(function(t){var k=t.toLowerCase();if(!seen[k]){seen[k]=1;out.push(t);}});});return out.sort(function(x,y){return x.toLowerCase()<y.toLowerCase()?-1:1;});}
function addTagTo(arr,t){t=normTag(t);if(!t)return;for(var i=0;i<arr.length;i++)if(arr[i].toLowerCase()===t.toLowerCase())return;arr.push(t);}
function parseTagList(str){var out=[];String(str==null?'':str).split(',').forEach(function(x){addTagTo(out,x);});return out;}
function typeChip(a){var tp=a.type||'Activity';return '<span class="rtype">'+esc(tp)+'</span>';}
function tagsHtml(a){if(!a.tags||!a.tags.length)return '';var sh=a.tags.slice(0,3).map(function(t){return '<span class="rtag">'+esc(t)+'</span>';}).join('');if(a.tags.length>3)sh+='<span class="rtag more">+'+(a.tags.length-3)+'</span>';return '<span class="rtags">'+sh+'</span>';}
function tagEditHtml(tags,delAct,addAct,addbufAct,inputId){
  tags=tags||[];
  var chips=tags.map(function(t){return '<button class="chip on tagpick" data-act="'+delAct+'" data-tag="'+esc(t)+'">'+esc(t)+' \u2715</button>';}).join('');
  var lower={};tags.forEach(function(t){lower[t.toLowerCase()]=1;});
  var avail=allTags().filter(function(t){return !lower[t.toLowerCase()];});
  var dd=avail.length?('<select class="tagdd" data-chg="'+addAct+'-dd"><option value="">+ Add existing tag\u2026</option>'+avail.map(function(t){return '<option value="'+esc(t)+'">'+esc(t)+'</option>';}).join('')+'</select>'):'';
  return '<div class="chips tagchips">'+(chips||'<span class="chip" style="border-style:dashed;color:var(--tx3)">No tags yet</span>')+'</div>'+dd+
    '<div class="cmtrow" style="margin-top:8px"><input id="'+inputId+'" placeholder="New tag\u2026"><button class="btn ghost" style="flex:none;width:64px;height:42px" data-act="'+addbufAct+'">Add</button></div>';
}

/* ================= Review additions: caps, sync-merge, sync badge, tag manager ================= */
function cap(s,n){s=String(s==null?'':s);return s.length>n?s.slice(0,n):s;}


/* Sync status dot in the home header (only when cloud sync is configured). */
function cloudBadgeHtml(){
  if(!(window.Cloud&&window.Cloud.status))return '';
  var st=window.Cloud.status();if(!st.configured)return '';
  return '<span class="syncbadge '+syncCls(st.label)+'" title="'+esc(st.label||'')+'"><i></i></span>';
}
function cloudSyncBtnHtml(){
  if(!(window.Cloud&&window.Cloud.status))return '';
  var st=window.Cloud.status();if(!st.configured)return '';
  return '<button class="iconbtn syncbtn" data-act="cloud-sync" title="Sync now">'+I('refresh')+'</button>';
}
function syncCls(lbl){lbl=lbl||'';if(/synced/i.test(lbl))return 'sy-ok';if(/error/i.test(lbl))return 'sy-err';if(/offline|cache|connect|load|sign|out/i.test(lbl))return 'sy-warn';return 'sy-idle';}
window.__cloudStatusChanged=function(){
  var el=document.querySelector('.syncbadge');if(!el||!(window.Cloud&&window.Cloud.status))return;
  var st=window.Cloud.status();el.className='syncbadge '+syncCls(st.label);el.title=st.label||'';
};

/* ---- Tag manager ---- */
function renameTag(oldT,newT){
  oldT=String(oldT);newT=normTag(newT);if(!newT)return false;
  var lo=oldT.toLowerCase();
  S.actionables.forEach(function(a){
    if(!a.tags||!a.tags.length)return;
    var hit=false,out=[];
    a.tags.forEach(function(t){if(t.toLowerCase()===lo)hit=true;else out.push(t);});
    if(hit){addTagTo(out,newT);a.tags=out;a.updatedAt=Date.now();}
  });
  saveState();return true;
}
function deleteTag(t){
  var lo=String(t).toLowerCase();
  S.actionables.forEach(function(a){if(!a.tags)return;var out=a.tags.filter(function(x){return x.toLowerCase()!==lo;});if(out.length!==a.tags.length){a.tags=out;a.updatedAt=Date.now();}});
  saveState();
}
function openTagManager(){var rec=openSheet('<div class="shead"><h2>Manage tags</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div><div class="sbody"></div>',{tag:'tagmgr'});renderTagManager(rec);}
function renderTagManager(rec){
  var tags=allTags(),counts={};
  S.actionables.forEach(function(a){(a.tags||[]).forEach(function(t){var k=t.toLowerCase();counts[k]=(counts[k]||0)+1;});});
  var body=tags.length?('<div class="taglist">'+tags.map(function(t){
    return '<div class="tagmrow"><input value="'+esc(t)+'" data-tagorig="'+esc(t)+'" maxlength="28"><span class="c">'+(counts[t.toLowerCase()]||0)+'</span>'+
      '<button class="btn ghost mini" data-act="tag-rename" data-tag="'+esc(t)+'">Rename</button>'+
      '<button class="btn danger mini" data-act="tag-delete" data-tag="'+esc(t)+'">Delete</button></div>';
  }).join('')+'</div>'):'<div class="note">No tags yet. Add tags to tasks and they\u2019ll appear here to rename or delete.</div>';
  $('.sbody',rec.sheet).innerHTML='<p style="color:var(--tx2);font-size:.83rem;margin-bottom:12px">Rename applies everywhere the tag is used; delete removes it from all tasks.</p>'+body;
}

/* ================= On-device version history (restore points) ================= */
var VERSIONS_KEEP=6;
function loadVersions(){try{return JSON.parse(localStorage.getItem('act_versions')||'[]');}catch(e){return [];}}
function newestNonEmptyVersion(){try{var arr=loadVersions();for(var i=0;i<arr.length;i++){var d=JSON.parse(arr[i].data);if(d&&d.actionables&&d.actionables.length>0)return d;}}catch(e){}return null;}
function snapshot(reason){
  try{
    if(!S||!S.actionables)return;
    var data=JSON.stringify(S);
    var arr=loadVersions();
    if(arr.length&&arr[0].data===data)return;           /* skip if nothing changed */
    arr.unshift({ts:Date.now(),reason:reason||'Restore point',count:S.actionables.length,data:data});
    while(arr.length>VERSIONS_KEEP)arr.pop();
    localStorage.setItem('act_versions',JSON.stringify(arr));
  }catch(e){}
}
function relTime(ts){
  var s=Math.max(0,Math.round((Date.now()-ts)/1000));
  if(s<60)return 'just now';
  var mn=Math.round(s/60);if(mn<60)return mn+' min ago';
  var hr=Math.round(mn/60);if(hr<24)return hr+' hr ago';
  var d=Math.round(hr/24);return d+' day'+(d>1?'s':'')+' ago';
}
function restoreVersion(i){
  var arr=loadVersions(),v=arr[i];if(!v)return;
  snapshot('Before restore');                            /* so the rollback itself is undoable */
  try{S=JSON.parse(v.data);}catch(e){toast('Could not read that version');return;}
  ensureDefaults();saveState();applyTheme();filters=defaultFilters();
  var vr=sheetFor('versions');if(vr)closeSheet(vr);
  render();if(window.syncSchedule)syncSchedule();
  toast('Restored version from '+relTime(v.ts));
}
function openVersions(){var rec=openSheet('<div class="shead"><h2>Version history</h2><button class="x" data-act="close-sheet">'+I('x')+'</button></div><div class="sbody"></div>',{tag:'versions'});renderVersions(rec);}
function renderVersions(rec){
  var arr=loadVersions();
  var rows=arr.length?('<div class="verlist">'+arr.map(function(v,i){
    return '<div class="verrow"><span class="w"><b>'+esc(v.reason)+'</b><span class="s">'+relTime(v.ts)+' \u00b7 '+v.count+' task'+(v.count===1?'':'s')+'</span></span>'+
      '<button class="btn ghost mini" data-act="version-restore" data-i="'+i+'">Restore</button></div>';
  }).join('')+'</div>'):'<div class="note">No restore points yet. They\u2019ll appear here as you use the app.</div>';
  $('.sbody',rec.sheet).innerHTML=
    '<p style="color:var(--tx2);font-size:.83rem;line-height:1.5;margin-bottom:12px">Up to '+VERSIONS_KEEP+' recent states are saved on this device \u2014 when you open the app, before a sync overwrites data, and before resets or imports. Restoring replaces current data and syncs it to your other device.</p>'+
    '<button class="btn ghost" style="margin-bottom:14px" data-act="version-snap">'+I('check')+'Create restore point now</button>'+
    rows;
}

/* ================= V2 reusable ETA component ================= */
function etaDate(iso){if(!iso)return '';var p=iso.split('-');return pad(+p[2])+' '+String(MON[(+p[1])-1]||'').toUpperCase();}
function etaState(a){
  if(a.status==='Completed')return 'done';
  if(a.etaKind==='tbd'||a.etaKind==='none'||!endEta(a))return 'none';
  var k=diffDays(endEta(a),todayISO());
  if(k>=2)return 'future';if(k===1)return 'tomorrow';if(k===0)return 'today';
  return (-k>=8)?'severe':'over';
}
function etaView(a){
  var st=etaState(a),d='',l='';
  if(st==='done'){var cd=a.completedAt?isoFromMs(a.completedAt):(endEta(a)||'');d=cd?etaDate(cd):'';l='COMPLETED';}
  else if(st==='none'){if(a.etaKind==='tbd'){d='TBD';l='Awaiting date';}else{d='NO ETA';l='Awaiting update';}}
  else{var end=endEta(a),k=diffDays(end,todayISO());d=etaDate(end);
    if(st==='future')l='Due in '+k+' day'+(k===1?'':'s');
    else if(st==='tomorrow')l='DUE TOMORROW';
    else if(st==='today')l='DUE TODAY';
    else{var late=-k;l=late+' DAY'+(late===1?'':'S')+' DELAYED';}}
  return '<div class="eta eta-'+st+'">'+(d?'<div class="eta-d">'+esc(d)+'</div>':'')+'<div class="eta-l">'+esc(l)+'</div></div>';
}

/* ================= Form helpers (V2.2) ================= */
function ownersByRecent(){
  var last={};
  S.actionables.forEach(function(a){(a.spocIds||[]).forEach(function(id){last[id]=Math.max(last[id]||0,a.updatedAt||0);});});
  return peopleSorted().slice().sort(function(a,b){var la=last[a.id]||0,lb=last[b.id]||0;if(la!==lb)return lb-la;return a.name.toLowerCase()<b.name.toLowerCase()?-1:1;});
}
function endOfWeekISO(t){var p=t.split('-');var d=new Date(+p[0],+p[1]-1,+p[2]);var add=(5-d.getDay()+7)%7;return addDaysISO(t,add);}
function etaPickHtml(f){
  var t=todayISO(),isDate=f.etaKind==='date',isRange=f.etaKind==='range';
  var today=isDate&&f.eta===t,tmr=isDate&&f.eta===addDaysISO(t,1),wk=isDate&&f.eta===endOfWeekISO(t);
  var custom=(isDate&&!today&&!tmr&&!wk)||isRange, none=(f.etaKind==='none'||f.etaKind==='tbd');
  function c(k,lab,on){return '<button class="etachip'+(on?' on':'')+'" data-act="f-eta-quick" data-k="'+k+'">'+lab+'</button>';}
  var chips='<div class="etapick">'+c('today','Today',today)+c('tomorrow','Tomorrow',tmr)+c('week','This week',wk)+c('custom','Custom date',custom)+c('none','No ETA',none)+'</div>';
  var inp='';
  if(isRange)inp='<div class="etadates"><div class="fld"><label>From</label><input type="date" onclick="try{this.showPicker()}catch(_){}" data-chg="f-eta" value="'+esc(f.eta)+'"></div><div class="fld"><label>To</label><input type="date" onclick="try{this.showPicker()}catch(_){}" data-chg="f-etaend" value="'+esc(f.etaEnd)+'"></div></div>';
  else if(isDate)inp='<div class="etadates"><div class="fld wide"><label>Pick a date</label><input type="date" onclick="try{this.showPicker()}catch(_){}" data-chg="f-eta" value="'+esc(f.eta)+'"></div></div>';
  return chips+inp;
}
function statusPickHtml(f,allowCompleted){
  return '<div class="statuspick">'+STATUSES.filter(function(s){return allowCompleted||s!=='Completed';}).map(function(s){
    var on=f.status===s;return '<button class="badge stpick '+stCls(s)+(on?' on':'')+'" data-act="f-status-set" data-k="'+esc(s)+'">'+esc(s)+'</button>';
  }).join('')+'</div>';
}
function ownerSelHtml(f){
  var cur=f.spocIds.length?f.spocIds[0]:'';
  var opts='<option value=""'+(!cur?' selected':'')+'>Unassigned</option>'+
    peopleSorted().map(function(u){return '<option value="'+esc(u.id)+'"'+(cur===u.id?' selected':'')+'>'+esc(u.name)+'</option>';}).join('');
  return '<div class="ownsel"><select data-chg="f-spoc-select">'+opts+'</select>'+    '<div class="hint">Select one SPOC for this task.</div></div>';
}

function formValid(f){return !!(f.lineItem&&f.lineItem.trim())&&(f.quick||!!(f.task&&f.task.trim()));}
function updateSaveBtn(rec,f){var sv=$('.sfoot .btn.pri',rec.sheet);if(sv){var ok=formValid(f);sv.disabled=!ok;if(ok)sv.classList.add('ready');else sv.classList.remove('ready');}}
function wireOwnerSearch(rec){var os=$('#fOwnerSearch',rec.sheet);if(!os)return;os.addEventListener('input',function(){var q=this.value.toLowerCase(),opts=rec.sheet.querySelectorAll('.own-opt');for(var i=0;i<opts.length;i++){if(opts[i].classList.contains('add'))continue;var nm=opts[i].getAttribute('data-name')||'';opts[i].style.display=(!q||nm.indexOf(q)>=0)?'':'none';}});}

/* ===== Home-screen widget hooks (Add / View all) ===== */
window.__widgetAdd=function(proj,spoc){try{var pf={};if(proj&&proj!=='__all')pf.projectId=proj;if(spoc&&spoc!=='__all'&&spoc!=='__none')pf.spocIds=[spoc];openForm(null,pf);}catch(e){}};
window.__widgetView=function(proj,spoc){try{filters=defaultFilters();filters.project=(proj&&proj!=='__all')?[proj]:[];filters.spoc=(!spoc||spoc==='__all')?[]:(spoc==='__none'?['__tbc']:[spoc]);nav('list',{});}catch(e){}};

/* ===== Row leading icon accent (project-coloured; red overdue / green done) ===== */
function projColor(pid){var P=['#4F7DEA','#8B5CF6','#0EA5A4','#E0863B','#D6598B','#3B9AE0','#6366F1','#14B8A6'];pid=String(pid||'');var h=0;for(var i=0;i<pid.length;i++)h=(h*31+pid.charCodeAt(i))>>>0;return P[h%P.length];}
function rowAccent(a){var st=etaState(a);if(st==='over'||st==='severe')return '#F0787C';if(st==='done')return '#63CC8D';return projColor(a.projectId);}

/* ===== Sidebar rail tip (desktop) ===== */
function railTipHtml(){
  var tips=[
    'Group by Owner to spot who\u2019s overloaded.',
    'Tap the calendar icon to review everything by ETA.',
    'Clear red (overdue) items before they pile up.',
    'Every line item deserves a clear owner and ETA.',
    'Use tags to slice work across projects.',
    'Set a follow-up reminder so nothing waits on you silently.',
    'Plan the week from \u201cThis week\u201d every Monday.',
    'One SPOC per line item keeps accountability clear.',
    'Switch to \u201cBy project\u201d to review delivery per client.'
  ];
  var d=new Date(),idx=(d.getFullYear()*372+d.getMonth()*31+d.getDate())%tips.length;
  return '<div class="rt-ic">'+I('star')+'</div><div class="rt-tx"><span class="rt-h">Tip</span>'+esc(tips[idx])+'</div>';
}

/* ================= AI features (Gemini) ================= */
var aiState={tab:'add',busy:false,input:'',out:'',outKind:'',err:'',items:null,parsed:null,edits:null,project:'__all',editKey:false,freeOnly:true,kModel:'',pending:null,voiceListening:false,voiceSupported:null};
var aiChat=[];
var AI_ROUTER_SYS='You are the command center for "Actionables", a delivery task tracker. The user types one natural-language request. Decide the single best action and respond with ONLY minified JSON (no prose, no code fences).\n'+
'Schema: {"action":"add|update|delete|search|report|answer|clarify","reply":string,'+
'"add":[{"lineItem":string,"task":string,"project":string,"category":string,"owners":string[],"etaKind":"none|tbd|date|range","eta":"YYYY-MM-DD","etaEnd":"YYYY-MM-DD","status":"In Progress|On Hold|Dependency|Completed","tags":string[],"important":boolean,"recurrence":{"freq":"daily|weekly|monthly|custom","interval":number,"unit":"day|week|month","endDate":"YYYY-MM-DD"},"followup":{"waitingFor":string,"requestedOn":"YYYY-MM-DD","expectedBy":"YYYY-MM-DD","nextFollowup":"YYYY-MM-DD","note":string}}],'+
'"update":[{"id":string,"project":string,"category":string,"status":string,"etaKind":string,"eta":string,"etaEnd":string,"owners":string[],"tags":string[],"important":boolean,"lineItem":string,"task":string,"followup":{"waitingFor":string,"requestedOn":"YYYY-MM-DD","expectedBy":"YYYY-MM-DD","nextFollowup":"YYYY-MM-DD","note":string}}],'+
'"delete":["id"],"search":{"filter":{"person":string,"text":string,"status":string,"overdue":boolean,"completed":boolean,"open":boolean,"mine":boolean,"important":boolean,"dueWithinDays":number,"project":string,"tag":string},"ids":["id"]},"report":{"filter":{},"ids":["id"],"format":"pdf|excel","label":string}}\n'+
'Rules:\n'+
'- For add/update/delete, return a proposed change only. The application will validate it and show an editable review before changing data. The user can correct proposed values before Apply. Never assume a mutation has already happened.\n'+
'- Use ids EXACTLY from the Actionables list provided. For update include only the fields that change.\n'+
'- "priority/high/urgent" => important=true; "low/normal priority" => important=false. There is no other priority field.\n'+
'- "waiting on X"/"blocked" => status "Dependency". "done/finished" => status "Completed".\n'+
'- Resolve relative dates (today, tomorrow, Friday, next Monday, this week, this month) using the given today date.\n'+
'- \"assigned to me\"/\"my tasks\"/\"for me\" => match owner to the given Current user.\n'+
'- For search and report PREFER "filter" (deterministic) over listing ids. Set only the criteria that apply: person (matches an owner OR anyone named in the task), text (keyword), status, overdue, completed (closed/done), open, mine (current user), important (high priority), dueWithinDays (this week=7, today=0), project, tag. Combine as needed \u2014 e.g. a task closed for someone = {"person":"Sanjay","completed":true}.\n'+
'- If the user asks whether/which/what tasks exist for a person or criteria ("any task for Sanjay I closed?", "what is assigned to me", "show tasks with X"), use action "search" with a filter so it is accurate \u2014 do NOT answer listing questions from memory.\n'+
'- Completed/closed tasks are in the data (status "Completed"); include them whenever the user mentions closed, completed, done, or recently.\n'+
'- Recurring requests such as \"every Friday\" or \"weekly\" => action add with recurrence.weekly and the next matching ETA.\n'+
'- Follow-up requests such as \"remind me to follow up with Kumar on Friday\" => action add, project Personal when no project is named, status Dependency, and followup.nextFollowup set to the resolved date.\n'+
'- report: choose format (default pdf; excel only if the user says excel/spreadsheet) and a short label.\n'+
'- Questions, summaries, greetings, or anything conversational => action "answer" with the answer in "reply" (use the data). Support follow-ups using the recent conversation.\n'+
'- Use "clarify" ONLY when you genuinely cannot tell which task is meant. Otherwise act.\n'+
'- Keep "reply" to 1-2 short sentences; for search/report mention the count.';


var AI_PROV={
  gemini:{name:'Google Gemini',kind:'gemini',free:true,hint:'AIza\u2026 key',url:'aistudio.google.com/apikey'},
  groq:{name:'Groq',kind:'openai',base:'https://api.groq.com/openai/v1',free:true,hint:'gsk_\u2026 key',url:'console.groq.com/keys'},
  openrouter:{name:'OpenRouter',kind:'openai',base:'https://openrouter.ai/api/v1',free:true,hint:'sk-or-\u2026 key',url:'openrouter.ai/keys'},
  xai:{name:'Grok (xAI)',kind:'openai',base:'https://api.x.ai/v1',hint:'xai-\u2026 key',url:'console.x.ai'},
  openai:{name:'OpenAI',kind:'openai',base:'https://api.openai.com/v1',hint:'sk-\u2026 key',url:'platform.openai.com/api-keys'},
  anthropic:{name:'Anthropic (Claude)',kind:'anthropic',hint:'sk-ant-\u2026 key',url:'console.anthropic.com'},
  custom:{name:'Custom (OpenAI-compatible)',kind:'openai',custom:true,hint:'API key',url:'any OpenAI-style base URL'}
};
function aiMigrate(){
  if(S.settings.aiKeys)return;
  S.settings.aiKeys={};S.settings.aiModelByProv={};S.settings.aiModelsByProv={};
  if(S.settings.aiKey)S.settings.aiKeys.gemini=S.settings.aiKey;
  if(S.settings.aiModel)S.settings.aiModelByProv.gemini=S.settings.aiModel;
  if(S.settings.aiModels)S.settings.aiModelsByProv.gemini=S.settings.aiModels;
  S.settings.aiProvider=S.settings.aiProvider||'gemini';
}
function aiProv(){aiMigrate();return S.settings.aiProvider||'gemini';}
function aiKey(){aiMigrate();return ((S.settings.aiKeys||{})[aiProv()]||'').trim();}
function aiCustomBase(){aiMigrate();return (S.settings.aiCustomBase||'').trim();}
function aiDefaultModel(prov){return ({gemini:'gemini-2.5-flash',groq:'llama-3.1-8b-instant',openrouter:'meta-llama/llama-3.1-8b-instruct:free',xai:'grok-2-latest',openai:'gpt-4o-mini',anthropic:'claude-3-5-haiku-latest',custom:''})[prov]||'';}
function aiModel(){aiMigrate();return (S.settings.aiModelByProv||{})[aiProv()]||aiDefaultModel(aiProv());}
function aiModelsCache(){aiMigrate();return (S.settings.aiModelsByProv||{})[aiProv()]||null;}
function aiSetKey(v){aiMigrate();S.settings.aiKeys[aiProv()]=v;}
function aiSetModel(v){aiMigrate();S.settings.aiModelByProv[aiProv()]=v;}
function aiSetModels(list){aiMigrate();S.settings.aiModelsByProv[aiProv()]=list;}
function aiConfigured(){var k=aiKey();if(aiProv()==='custom')return !!(k&&aiCustomBase());return !!k;}

function aiMd(t){
  t=esc(t||'');
  t=t.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  t=t.replace(/^\s*#{1,4}\s*(.+)$/gm,'<div class="ai-h2">$1</div>');
  t=t.replace(/^\s*[\-\u2022*]\s+(.+)$/gm,'<div class="ai-li">$1</div>');
  t=t.replace(/\n{2,}/g,'<br><br>').replace(/\n/g,'<br>');
  return t;
}

async function aiCall(prompt,sys){
  var prov=aiProv(),key=aiKey(),model=aiModel();
  if(!key)throw new Error('Add your '+AI_PROV[prov].name+' API key first.');
  if(!model)throw new Error('Choose a model in AI settings first.');
  var res,url,headers,body;
  try{
    if(prov==='gemini'){
      url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(key);
      headers={'Content-Type':'application/json'};
      body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.2}};
      if(sys)body.systemInstruction={parts:[{text:sys}]};
    }else if(prov==='anthropic'){
      url='https://api.anthropic.com/v1/messages';
      headers={'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
      body={model:model,max_tokens:2048,temperature:0.2,messages:[{role:'user',content:prompt}]};
      if(sys)body.system=sys;
    }else{
      var P=AI_PROV[prov]||{};var base=P.custom?aiCustomBase():P.base;
      if(!base)throw new Error('Set the base URL for this provider.');
      url=base.replace(/\/+$/,'')+'/chat/completions';
      headers={'Content-Type':'application/json','Authorization':'Bearer '+key};
      if(prov==='openrouter'){headers['HTTP-Referer']='https://actionables.local';headers['X-Title']='Actionables';}
      var msgs=[];if(sys)msgs.push({role:'system',content:sys});msgs.push({role:'user',content:prompt});
      body={model:model,messages:msgs,temperature:0.2};
    }
    res=await fetch(url,{method:'POST',headers:headers,body:JSON.stringify(body)});
  }catch(e){throw new Error('Network/CORS error \u2014 the request may be blocked on this network or by the provider.');}
  if(!res.ok){
    var msg='Request failed ('+res.status+')';
    try{var j=await res.json();if(j&&j.error&&j.error.message)msg=j.error.message;else if(j&&j.message)msg=j.message;}catch(_){}
    if(res.status===401||/api key/i.test(msg))msg='API key not valid for '+AI_PROV[prov].name+' \u2014 check the key.';
    if(res.status===404)msg='Model "'+model+'" not available. Open AI settings \u2192 Load my models, then pick one.';
    throw new Error(msg);
  }
  var data=await res.json();
  if(prov==='gemini'){
    var cand=(data.candidates||[])[0];
    if(!cand){if(data.promptFeedback&&data.promptFeedback.blockReason)throw new Error('Blocked by safety: '+data.promptFeedback.blockReason);throw new Error('Empty response from the model.');}
    return (((cand.content||{}).parts)||[]).map(function(pt){return pt.text||'';}).join('').trim();
  }else if(prov==='anthropic'){
    return ((data.content||[]).map(function(b){return b.text||'';}).join('')).trim();
  }else{
    var ch=(data.choices||[])[0];
    return ((ch&&ch.message&&ch.message.content)||'').trim();
  }
}
function aiJSON(text){
  var t=(text||'').replace(/```json/gi,'').replace(/```/g,'').trim();
  var oi=t.indexOf('{'),ai=t.indexOf('[');
  var start=(ai>=0&&(ai<oi||oi<0))?ai:oi;
  if(start>0)t=t.slice(start);
  var end=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']'));
  if(end>=0)t=t.slice(0,end+1);
  return JSON.parse(t);
}

function aiProjList(){return S.projects.filter(function(p){return p.id!=='__personal';}).map(function(p){return {id:p.id,name:p.name,code:p.code||''};});}
function aiPeopleList(){return peopleSorted().map(function(u){return {id:u.id,name:u.name};});}
function aiMapProject(q){
  if(!q)return '';q=(''+q).toLowerCase().trim();
  var ps=S.projects.filter(function(p){return p.id!=='__personal';});
  var i;for(i=0;i<ps.length;i++)if(ps[i].name.toLowerCase()===q||(ps[i].code||'').toLowerCase()===q)return ps[i].id;
  for(i=0;i<ps.length;i++){var n=ps[i].name.toLowerCase(),c=(ps[i].code||'').toLowerCase();if(n.indexOf(q)>=0||q.indexOf(n)>=0||(c&&q.indexOf(c)>=0))return ps[i].id;}
  return '';
}
function aiMapOwners(names){
  if(typeof names==='string')names=[names];
  var out=[],ppl=peopleSorted();
  (names||[]).forEach(function(nm){if(!nm)return;var q=(''+nm).toLowerCase().trim();for(var i=0;i<ppl.length;i++){var n=ppl[i].name.toLowerCase();if(n===q||n.indexOf(q)>=0||q.indexOf(n)>=0){if(out.indexOf(ppl[i].id)<0)out.push(ppl[i].id);return;}}});
  return out;
}
function aiNormalize(o){
  o=o||{};
  var pid=aiMapProject(o.project||o.projectName||o.projectCode||'');
  var catId='';var cn=String(o.category||o.categoryName||'').trim().toLowerCase();if(pid&&cn){var cats=activeCategories(pid);for(var ci=0;ci<cats.length;ci++){if(cats[ci].name.toLowerCase()===cn||cats[ci].name.toLowerCase().indexOf(cn)>=0){catId=cats[ci].id;break;}}}
  var owners=aiMapOwners(o.owners||o.owner||[]);
  var status=(STATUSES.indexOf(o.status)>=0)?o.status:'In Progress';
  var etaKind=o.etaKind,eta=o.eta||'',etaEnd=o.etaEnd||'';
  if(!etaKind)etaKind=eta?'date':'none';
  if(etaKind==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(eta)){etaKind=eta?'tbd':'none';eta='';}
  var etaLabel=etaKind==='date'?fmtDY(eta):(etaKind==='range'?(fmtD(eta)+'\u2013'+fmtDY(etaEnd||eta)):(etaKind==='tbd'?'TBD':'No ETA'));
  var rawProj=o.project||o.projectName||o.projectCode;
  var rawOwn=o.owners||o.owner;
  var rr=o.recurrence||null,fu=o.followup||null;
  var recurrence={enabled:false,freq:'weekly',interval:1,unit:'week',endDate:'',seriesId:''};
  if(rr){recurrence.enabled=true;recurrence.freq=rr.freq||'weekly';recurrence.interval=Math.max(1,parseInt(rr.interval,10)||1);recurrence.unit=rr.unit||'week';recurrence.endDate=rr.endDate||'';}
  var followup=fu?{on:true,date:fu.nextFollowup||'',time:'',note:fu.note||'',waitingFor:fu.waitingFor||'',requestedOn:fu.requestedOn||'',expectedBy:fu.expectedBy||'',done:false}:null;
  return {lineItem:(o.lineItem||o.title||'').toString().slice(0,200),task:(o.task||o.description||o.notes||'').toString().slice(0,4000),
    projectId:pid,categoryId:catId,spocIds:owners,status:status,etaKind:etaKind,eta:eta,etaEnd:etaEnd,tags:(o.tags||[]).slice(0,8),
    _projLabel:pid?projName(pid):(rawProj?('\u26A0 '+rawProj):'Pick project'),
    _ownerLabel:owners.length?owners.map(personName).join(' & '):(rawOwn?('\u26A0 '+[].concat(rawOwn).join(', ')):'Unassigned'),
    etaLabel:etaLabel,recurrence:recurrence,followup:followup};
}
function aiContext(projectId){
  var t=todayISO();
  var acts=mainActs().filter(function(a){return (projectId&&projectId!=='__all')?a.projectId===projectId:true;});
  return acts.map(function(a){
    var e=endEta(a);
    var o={project:projName(a.projectId),item:a.lineItem,owner:spocLabel(a),status:a.status,eta:plainEta(a)||'none'};
    if(isOver(a,t))o.overdue=true;
    if(e)o.due_in_days=diffDays(e,t);
    if(a.categoryId)o.category=categoryName(a.projectId,a.categoryId);
    if(a.tags&&a.tags.length)o.tags=a.tags;
    if(a.rem&&a.rem.on&&!a.rem.done){o.followup_on=a.rem.date||'set';if(a.rem.waitingFor)o.waiting_for=a.rem.waitingFor;if(a.rem.expectedBy)o.expected_by=a.rem.expectedBy;}
    if(a.recurrence&&a.recurrence.enabled)o.recurrence=recurrenceLabel(a.recurrence);
    if(a.task)o.note=a.task.slice(0,180);
    return o;
  });
}

/* ---- view ---- */
function aiResultBlock(){
  if(aiState.busy)return '<div class="ai-busy"><span class="spin"></span>Working with '+esc(AI_PROV[aiProv()].name)+'\u2026</div>';
  if(aiState.err)return '<div class="ai-err">'+I('alert')+'<span>'+esc(aiState.err)+'</span></div>';
  if(aiState.edits){
    if(!aiState.edits.length)return '<div class="ai-note">No matching task to update. Try naming the ticket, title, project or owner.</div>';
    return '<div class="ai-items">'+aiState.edits.map(function(e,i){return '<button class="ai-item ai-item-btn" data-act="ai-edit-proposal-open" data-i="'+i+'"><span class="ai-it-b"><span class="ai-it-t">'+esc(e.title)+'</span><span class="ai-it-m">'+esc(e.project)+' · Open edit</span><span class="ai-diff">'+e.diff.map(function(d){return '<span class="ai-dl"><b>'+esc(d[0])+'</b> '+(d[1]?'<s>'+esc(d[1])+'</s> → ':'')+'<i>'+esc(d[2])+'</i></span>';}).join('')+'</span></span></button>';}).join('')+
      '<div class="ai-actions"><button class="btn ghost" data-act="ai-cancel-edits">Reject all</button></div></div>';
  }
  if(aiState.items){
    if(!aiState.items.length)return '<div class="ai-note">No action items found in that text.</div>';
    var n=aiState.items.filter(function(x){return x._sel;}).length;
    return '<div class="ai-items">'+aiState.items.map(function(it,i){return '<label class="ai-item"><input type="checkbox" data-chg="ai-item" data-i="'+i+'"'+(it._sel?' checked':'')+'><span class="ai-it-b"><span class="ai-it-t">'+esc(it.lineItem||'(untitled)')+'</span><span class="ai-it-m">'+esc([it._projLabel,it._ownerLabel,it.etaLabel,it.status].filter(Boolean).join('  \u00b7  '))+'</span>'+(it.task?'<span class="ai-it-d">'+esc(it.task)+'</span>':'')+'</span></label>';}).join('')+
      '<div class="ai-actions"><button class="btn pri" data-act="ai-add-selected">Add '+n+' actionable'+(n===1?'':'s')+'</button></div></div>';
  }
  if(aiState.outKind==='parsed'&&aiState.parsed){
    var pv=aiState.parsed;
    return '<div class="ai-preview"><span class="ai-pv-l">Parsed</span><div class="ai-pv-t">'+esc(pv.lineItem||'(untitled)')+'</div><div class="ai-pv-m">'+esc([pv._projLabel,pv._ownerLabel,pv.etaLabel,pv.status].filter(Boolean).join('  \u00b7  '))+'</div>'+(pv.task?'<div class="ai-pv-d">'+esc(pv.task)+'</div>':'')+(pv.tags&&pv.tags.length?'<div class="ai-pv-tags">'+pv.tags.map(function(t){return '<span class="tagpill">#'+esc(t)+'</span>';}).join('')+'</div>':'')+
      '<div class="ai-actions"><button class="btn pri" data-act="ai-open-parsed">Review &amp; add</button></div></div>';
  }
  if(aiState.out)return '<div class="ai-out ai-md">'+aiMd(aiState.out)+'</div><div class="ai-actions ai-outacts"><button class="btn ghost" data-act="ai-copy">'+I('copy')+'Copy</button><button class="btn ghost" data-act="ai-pdf">'+I('dl')+'Export PDF</button></div>';
  return '';
}
/* ---- Native speech-to-text bridge (Android) ------------------------------
   Standard Android WebView has no SpeechRecognition/webkitSpeechRecognition
   API (unlike desktop Chrome), so voice input would silently be
   "unsupported" inside the installed app. When running inside the Android
   wrapper (A.startNativeSpeech exists), we use Android's own on-device
   android.speech.SpeechRecognizer via this bridge instead. The browser
   SpeechRecognition path below is kept as-is and still used when this app
   runs as a plain website. */
var __pendingSpeechRequestId=null;
window.__actionablesSpeechEvent=function(requestId,type,payload){
  if(requestId!==__pendingSpeechRequestId)return; // stale/cancelled session
  if(type==='result'){
    var txt=(payload&&payload.transcript)||'';
    aiState.input=txt.replace(/\s+/g,' ').trim();
    var inp=$('#aiInput');
    if(inp){inp.value=aiState.input;inp.focus();try{inp.setSelectionRange(inp.value.length,inp.value.length);}catch(e){}}
    if(payload&&payload.isFinal)render();
  }else if(type==='error'){
    aiState.voiceListening=false;__pendingSpeechRequestId=null;
    var reason=(payload&&payload.reason)||'voice-failed';
    var msg=reason==='not-allowed'?'Microphone permission was denied.':(reason==='no-speech'?'No speech detected. Try again.':(reason==='not-supported'?'Voice input is not supported on this device.':'Voice input failed. Try again.'));
    aiState.err=msg;render();
  }else if(type==='end'){
    aiState.voiceListening=false;__pendingSpeechRequestId=null;
    var inp2=$('#aiInput');if(inp2)inp2.value=aiState.input||'';
    render();
  }
};
function aiStartNativeVoice(){
  var requestId='sp_'+Date.now()+'_'+Math.floor(Math.random()*100000);
  __pendingSpeechRequestId=requestId;
  aiState.voiceSupported=true;
  aiState.voiceListening=true;
  aiState.err='';
  render();
  setTimeout(function(){var inp=$('#aiInput');if(inp){inp.focus();}},30);
  A.startNativeSpeech(requestId);
}
function aiStopNativeVoice(){
  try{if(A&&A.stopNativeSpeech)A.stopNativeSpeech();}catch(e){}
  __pendingSpeechRequestId=null;
  aiState.voiceListening=false;
}

function aiVoiceSupported(){
  if(A&&A.startNativeSpeech)return true;
  return !!(window.SpeechRecognition||window.webkitSpeechRecognition);
}
function aiStopVoice(){
  if(A&&A.startNativeSpeech){aiStopNativeVoice();return;}
  try{if(window.__aiRecognition){window.__aiRecognition.onend=null;window.__aiRecognition.stop();}}catch(e){}
  window.__aiRecognition=null;
  aiState.voiceListening=false;
}
function aiStartVoice(){
  if(aiState.busy){toast('Wait for the current AI request to finish');return;}
  if(aiState.voiceListening){aiStopVoice();render();return;}
  if(A&&A.startNativeSpeech){aiStartNativeVoice();return;}
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){aiState.voiceSupported=false;render();toast('Voice input is not supported in this browser');return;}
  aiState.voiceSupported=true;
  var base=(aiState.input||'').trim();
  var finalText=base?base+' ':'',rec;
  try{rec=new SR();}catch(e){toast('Could not start voice input');return;}
  rec.lang='en-IN';
  rec.continuous=false;
  rec.interimResults=true;
  window.__aiRecognition=rec;
  aiState.voiceListening=true;
  aiState.err='';
  render();
  setTimeout(function(){var inp=$('#aiInput');if(inp){inp.focus();}},30);
  rec.onresult=function(ev){
    var interim='';
    for(var i=ev.resultIndex;i<ev.results.length;i++){
      var txt=ev.results[i][0]&&ev.results[i][0].transcript||'';
      if(ev.results[i].isFinal)finalText+=txt+' ';else interim+=txt;
    }
    aiState.input=(finalText+interim).replace(/\s+/g,' ').trim();
    var inp=$('#aiInput');
    if(inp){inp.value=aiState.input;inp.focus();try{inp.setSelectionRange(inp.value.length,inp.value.length);}catch(e){}}
  };
  rec.onerror=function(ev){
    aiState.voiceListening=false;window.__aiRecognition=null;
    var msg=(ev&&ev.error==='not-allowed')?'Microphone permission was denied.':(ev&&ev.error==='no-speech'?'No speech detected. Try again.':'Voice input failed. Try again.');
    aiState.err=msg;render();
  };
  rec.onend=function(){
    aiState.voiceListening=false;window.__aiRecognition=null;
    var inp=$('#aiInput');if(inp)inp.value=aiState.input||'';
    render();
  };
  try{rec.start();}catch(e){aiStopVoice();render();toast('Could not start microphone');}
}
function aiClearChat(){
  if(!aiChat.length&&!aiState.pending){toast('AI chat is already clear');return;}
  if(aiState.voiceListening)aiStopVoice();
  var hasReview=!!(aiState.pending&&aiState.pending.items&&aiState.pending.items.length);
  var msg=hasReview?
    'This clears the AI conversation and removes the '+aiState.pending.items.length+' pending AI review item'+(aiState.pending.items.length===1?'':'s')+'. No task or project data will be changed.':
    'This clears the current AI conversation. Your Actionables, projects and other app data will not be changed.';
  confirmSheet('Clear AI chat?',msg,'Clear chat',true,function(){
    aiChat=[];aiState.pending=null;aiState.input='';aiState.out='';aiState.outKind='';aiState.outTitle='';aiState.items=null;aiState.parsed=null;aiState.edits=null;aiState.err='';render();toast('AI chat cleared');
  });
}

function vAI(){
  var h=topbar('Universal AI Assistant',esc(aiConfigured()?('via '+AI_PROV[aiProv()].name):'Command center'),true,'<button class="search-pill compact" data-act="go-search" title="Global Search · Ctrl+K">'+I('search')+'<span>Search</span><kbd>Ctrl K</kbd></button>'+'<button class="iconbtn" data-act="ai-clear-chat" title="Clear AI chat">'+I('trash')+'</button><button class="iconbtn" data-act="ai-key-edit" title="AI settings">'+I('sliders')+'</button>');
  h+='<div class="ai-safety-banner"><span class="ai-safe-icon">'+I('check')+'</span><div><b>Review before apply</b><span>AI proposes changes. You edit them, validation runs again, then you approve.</span></div></div>';
  if(!aiConfigured()||aiState.editKey){
    var prov=aiProv();
    var models=aiModelsCache();
    var curM=(aiState.kModel!==undefined&&aiState.kModel!=='')?aiState.kModel:aiModel();
    h+='<div class="aicard aikey"><div class="ai-h">'+I('sliders')+'AI settings</div>'+
      '<p class="ai-sub">Choose a provider, enter its API key and pick a model. Stored only on this device.</p>'+
      '<label class="ai-lbl">Provider</label>'+
      '<select id="aiProvSel" class="ai-in" data-chg="ai-provider">'+Object.keys(AI_PROV).map(function(k){return '<option value="'+k+'"'+(prov===k?' selected':'')+'>'+esc(AI_PROV[k].name)+(AI_PROV[k].free?' \u00b7 Free':'')+'</option>';}).join('')+'</select>';
    if(AI_PROV[prov].custom)h+='<label class="ai-lbl">Base URL</label><input id="aiBase" class="ai-in" placeholder="https://your-endpoint/v1" value="'+esc(aiCustomBase())+'" data-chg="ai-base">';
    h+='<label class="ai-lbl">API key</label>'+
      '<input id="aiKeyInput" type="password" class="ai-in" placeholder="'+esc(AI_PROV[prov].hint)+'" value="'+esc(aiKey())+'">'+
      '<label class="ai-lbl">Model</label>';
    if(aiState.busy){h+='<div class="ai-busy"><span class="spin"></span>Loading your models\u2026</div>';}
    else{
      var canFree=(prov==='openrouter'||prov==='custom');
      var mlist=(models||[]).slice();
      if(models&&canFree&&aiState.freeOnly){var ff=mlist.filter(function(x){return /:free$/i.test(x);});if(ff.length)mlist=ff;}
      if(canFree)h+='<label class="ck"><input type="checkbox" data-chg="ai-freeonly"'+(aiState.freeOnly?' checked':'')+'>Free models only</label>';
      if(models)h+='<select id="aiModelPick" class="ai-in" data-chg="ai-kmodel-pick"><option value="">\u2014 choose from '+mlist.length+' model'+(mlist.length===1?'':'s')+' \u2014</option>'+mlist.map(function(m){return '<option value="'+esc(m)+'"'+(curM===m?' selected':'')+'>'+esc(m)+'</option>';}).join('')+'</select>';
      h+='<input id="aiModelId" class="ai-in" style="margin-top:8px" placeholder="'+esc(aiDefaultModel(prov)||'model id')+'" value="'+esc(curM)+'" data-chg="ai-kmodel">';
      h+='<div class="ai-row" style="margin-top:10px"><button class="btn ghost" data-act="ai-connect">'+(models?'Reload models':'Load models')+'</button><button class="btn pri" data-act="ai-key-save">Save</button></div>';
    }
    if(aiState.err)h+='<div class="ai-err">'+I('alert')+'<span>'+esc(aiState.err)+'</span></div>';
    h+='<p class="ai-mini">Key: '+esc(AI_PROV[prov].url)+' \u00b7 Data is sent to the provider only when you run a command.</p></div>';
    return h;
  }
  h+='<div class="ai-cmdbar"><textarea id="aiInput" class="ai-cmd" rows="1" placeholder="Tell Actionables what you need…  (e.g. move Rahul’s ICICI task to tomorrow)" data-chg="ai-input" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();var b=document.querySelector(\'[data-act=ai-send]\');if(b)b.click();}">'+esc(aiState.input)+'</textarea><button class="ai-micbtn'+(aiState.voiceListening?' listening':'')+'" data-act="ai-voice" title="'+(aiState.voiceListening?'Stop listening':'Speak to AI')+'"'+(aiState.busy?' disabled':'')+'>'+I('mic')+'</button><button class="ai-sendbtn" data-act="ai-send"'+(aiState.busy||aiState.voiceListening?' disabled':'')+'>'+I('spark')+'</button></div>'+(aiState.voiceListening?'<div class="ai-voice-status"><span class="ai-voice-dot"></span>Listening… speak naturally. Your transcription will appear above; review it before sending.</div>':'')+(aiState.voiceSupported===false?'<div class="ai-voice-note">Voice input is not supported in this browser. Try Chrome or Edge.</div>':'');
  if(aiState.err)h+='<div class="ai-err" style="margin:0 16px 10px">'+I('alert')+'<span>'+esc(aiState.err)+'</span></div>';
  if(!aiChat.length){
    h+='<div class="ai-hello">'+I('spark')+'<div class="ai-hello-t">Universal AI Assistant</div><div class="ai-hello-s">Type anything \u2014 add, update, find, remove or report on tasks. I\u2019ll understand it, validate the change, ask for confirmation, then apply it.</div></div>';
    var sugg=['Check data quality and consistency','Show me all overdue tasks','Add a task to follow up with John tomorrow','Report of this month\u2019s completed tasks','What\u2019s assigned to me?','Change the ICICI task priority to high'];
    h+='<div class="ai-sugg">'+sugg.map(function(sg){return '<button class="ai-sg" data-act="ai-suggest" data-q="'+esc(sg)+'">'+esc(sg)+'</button>';}).join('')+'</div>';
    return h;
  }
  var ex=[],cur=null;
  aiChat.forEach(function(m){if(m.role==='user'){cur={u:m,a:null};ex.push(cur);}else{if(cur&&!cur.a){cur.a=m;}else{ex.push({u:null,a:m});}}});
  h+='<div class="aichat">';
  for(var i=ex.length-1;i>=0;i--){
    var e=ex[i];
    if(e.u)h+='<div class="ai-msg ai-user"><div class="ai-bub">'+esc(e.u.text)+'</div></div>';
    if(e.a)h+=aiBubble(e.a,aiChat.indexOf(e.a));
    else if(i===ex.length-1&&aiState.busy)h+='<div class="ai-msg ai-ai"><div class="ai-bub ai-thinking"><span class="spin"></span>Working\u2026</div></div>';
  }
  h+='</div>';
  return h;
}

/* ---- runners ---- */
function aiStart(){aiState.busy=true;aiState.err='';aiState.out='';aiState.outKind='';aiState.items=null;render();}
function aiDone(){aiState.busy=false;render();}
function aiFail(e){aiState.busy=false;aiState.err=(e&&e.message)?e.message:'Something went wrong.';render();}

async function aiParse(){
  var text=(aiState.input||'').trim();
  if(!text){aiState.err='Type a note to parse.';render();return;}
  aiStart();
  try{
    var sys='You convert a short note into ONE task. Output ONLY JSON, no prose. Schema: {"lineItem":string short title,"task":string details or "","project":string matching one of the given project names/codes if possible,"owners":string[] person names,"etaKind":"none"|"tbd"|"date"|"range","eta":"YYYY-MM-DD" when a deadline is implied (resolve relative dates like "next Fri" using today),"etaEnd":"YYYY-MM-DD" for range only,"status":"In Progress"|"On Hold"|"Dependency"|"Completed","tags":string[]}. If it is waiting on someone/something, use status "Dependency". Today is '+todayISO()+'.';
    var prompt='Known projects: '+JSON.stringify(aiProjList())+'\nKnown people: '+JSON.stringify(aiPeopleList())+'\nNote: """'+text+'"""';
    var obj=aiJSON(await aiCall(prompt,sys));
    aiState.parsed=aiNormalize(obj);aiState.outKind='parsed';aiState.out='ok';aiState.items=null;
    aiDone();
  }catch(e){aiFail(e);}
}
async function aiExtract(){
  var text=(aiState.input||'').trim();
  if(!text){aiState.err='Paste some notes or an email first.';render();return;}
  aiStart();
  try{
    var sys='Extract action items from the text. Output ONLY a JSON array (no prose). Each element: {"lineItem":string,"task":string context/details,"project":string matching a given project name/code if possible,"owners":string[] person names,"etaKind":"none"|"tbd"|"date"|"range","eta":"YYYY-MM-DD","status":"In Progress"|"On Hold"|"Dependency"|"Completed","tags":string[]}. Use "Dependency" when waiting on someone/something. Resolve relative dates using today='+todayISO()+'. Only include genuine action items. Return [] if none.';
    var prompt='Known projects: '+JSON.stringify(aiProjList())+'\nKnown people: '+JSON.stringify(aiPeopleList())+'\nText: """'+text+'"""';
    var arr=aiJSON(await aiCall(prompt,sys));
    if(!Array.isArray(arr))arr=[];
    aiState.items=arr.map(function(o){var n=aiNormalize(o);n._sel=true;return n;});
    aiDone();
  }catch(e){aiFail(e);}
}
async function aiAsk(){
  var q=(aiState.input||'').trim();
  if(!q){aiState.err='Type a question.';render();return;}
  aiStart();
  try{
    var sys='You answer questions about the user\u2019s delivery actionables using ONLY the provided data. Be concise and specific; refer to items by line item and project; name owners and dates. If the answer is not in the data, say so plainly. Use short paragraphs or "- " bullets.';
    var prompt='Actionables (JSON): '+JSON.stringify(aiContext('__all'))+'\n\nToday: '+todayISO()+'\nQuestion: '+q;
    aiState.out=await aiCall(prompt,sys);aiState.outKind='text';aiState.outTitle='AI answer';aiState.items=null;
    aiDone();
  }catch(e){aiFail(e);}
}
async function aiBrief(){
  aiStart();
  try{
    var pid=aiState.project||'__all';
    var ctx=aiContext(pid);
    if(!ctx.length){aiState.out='No open actionables'+(pid!=='__all'?' for this project':'')+' right now.';aiState.outKind='text';aiState.outTitle='Daily brief';aiDone();return;}
    var sys='You write a crisp daily focus brief for a delivery project manager. Group by project using "## Project" headers. For each project: one short status line, then 2\u20134 "- " bullets of what to focus on today, prioritizing overdue first, then due today/this week, then blockers/dependencies. Name owners. Keep it scannable; no filler. Add a one-line risk note per project only if warranted.';
    var prompt='Today: '+todayISO()+'\nActionables (JSON): '+JSON.stringify(ctx);
    aiState.out=await aiCall(prompt,sys);aiState.outKind='text';aiState.outTitle='Daily brief'+(pid!=='__all'?(' \u2014 '+projName(pid)):' \u2014 all projects');aiState.items=null;
    aiDone();
  }catch(e){aiFail(e);}
}

/* ---- create from extracted items ---- */
function aiCreate(it){
  var now=Date.now();
  var real=S.projects.filter(function(p){return p.id!=='__personal';});
  var pid=it.projectId||((real[0]||S.projects[0]||{}).id)||'';
  var a={id:uid('a'),projectId:pid,ticket:'',ticketUrl:'',lineItem:it.lineItem||'(untitled)',task:it.task||'',
    spocIds:(it.spocIds||[]).slice(),etaKind:it.etaKind||'none',eta:it.eta||'',etaEnd:it.etaEnd||'',
    status:it.status||'In Progress',important:false,tags:(it.tags||[]).slice(),categoryId:it.categoryId||'',
    rem:it.followup||{on:false,date:'',time:'',note:'',done:false,waitingFor:'',requestedOn:'',expectedBy:''},recurrence:it.recurrence||{enabled:false,freq:'weekly',interval:1,unit:'week',endDate:'',seriesId:''},notes:'',comments:[],activity:[],createdAt:now,updatedAt:now,completedAt:null};
  logAct(a,'Created (AI)');
  if(a.spocIds.length)logAct(a,'Owner/SPOC assigned','',spocLabel(a));
  a.type=it.type||'Activity';
  S.actionables.unshift(a);
  return a;
}
function aiAddSelected(){
  var sel=(aiState.items||[]).filter(function(x){return x._sel;});
  if(!sel.length){toast('Select at least one item');return;}
  aiState.pending={kind:'add',items:sel.map(function(x){return aiNormalize(x);}),errors:[]};
  aiState.items=null;aiChatPush('ai','I identified '+sel.length+' additions. Review each item before it is saved.',{type:'pending',pending:aiState.pending});render();
}

/* ---- model discovery (ListModels) ---- */
async function aiListModels(){
  var prov=aiProv(),key=aiKey();
  if(!key)throw new Error('Enter your API key first.');
  var res,url;
  try{
    if(prov==='gemini'){url='https://generativelanguage.googleapis.com/v1beta/models?key='+encodeURIComponent(key)+'&pageSize=1000';res=await fetch(url);}
    else if(prov==='anthropic'){url='https://api.anthropic.com/v1/models?limit=1000';res=await fetch(url,{headers:{'x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'}});}
    else{var P=AI_PROV[prov]||{};var base=P.custom?aiCustomBase():P.base;if(!base)throw new Error('Set the base URL first.');url=base.replace(/\/+$/,'')+'/models';var hh={'Authorization':'Bearer '+key};if(prov==='openrouter'){hh['HTTP-Referer']='https://actionables.local';hh['X-Title']='Actionables';}res=await fetch(url,{headers:hh});}
  }catch(e){throw new Error('Network/CORS error \u2014 could not reach the provider.');}
  if(!res.ok){var m='Could not load models ('+res.status+')';try{var j=await res.json();if(j&&j.error&&j.error.message)m=j.error.message;}catch(_){}throw new Error(m);}
  var data=await res.json(),out=[];
  if(prov==='gemini'){(data.models||[]).forEach(function(mo){var methods=mo.supportedGenerationMethods||mo.supportedActions||[];if(methods.indexOf('generateContent')<0)return;var id=(mo.name||'').replace(/^models\//,'');if(!id||/embedding|aqa/i.test(id))return;out.push(id);});}
  else{var arr=data.data||data.models||[];arr.forEach(function(mo){var id=mo.id||mo.name||mo;if(!id)return;id=(''+id).replace(/^models\//,'');if(/embed|whisper|tts|dall|image|moderation|audio|realtime|transcribe/i.test(id))return;if(prov==='openai'&&!/^(gpt|o[0-9]|chatgpt)/i.test(id))return;out.push(id);});}
  out.sort();return out;
}
function aiPickDefault(prov,models){
  if(!models.length)return '';
  if(prov==='gemini'){var c=models.filter(function(x){return /^gemini-[0-9.]+-flash$/.test(x);}).sort();if(c.length)return c[c.length-1];var f=models.filter(function(x){return /flash/.test(x);});if(f.length)return f[f.length-1];return models[0];}
  if(prov==='openai'){var mi=models.filter(function(x){return /mini/i.test(x);});if(mi.length)return mi[0];var g=models.filter(function(x){return /^gpt/i.test(x);});return g[0]||models[0];}
  if(prov==='anthropic'){var hk=models.filter(function(x){return /haiku/i.test(x);}).sort();if(hk.length)return hk[hk.length-1];return models[0];}
  if(prov==='groq'){var gi=models.filter(function(x){return /llama.*8b.*instant/i.test(x);});if(gi.length)return gi[0];var gl=models.filter(function(x){return /llama/i.test(x);});return gl[0]||models[0];}
  if(prov==='xai'){var gk=models.filter(function(x){return /^grok/i.test(x)&&!/(vision|image)/i.test(x);}).sort();return gk.length?gk[gk.length-1]:models[0];}
  if(prov==='openrouter'){var fr=models.filter(function(x){return /:free$/i.test(x);});var pool=fr.length?fr:models;var sm=pool.filter(function(x){return /(8b|9b|7b|mini|flash|instant|small|lite|haiku)/i.test(x);});return sm[0]||pool[0]||models[0];}
  return models[0];
}
async function aiConnect(){
  aiState.editKey=true;
  if(!aiKey()){aiState.err='Enter your API key first.';render();return;}
  aiState.busy=true;aiState.err='';render();
  try{
    var models=await aiListModels();
    if(!models.length)throw new Error('No compatible models for this key.');
    aiSetModels(models);
    if(models.indexOf(aiModel())<0)aiSetModel(aiPickDefault(aiProv(),models));
    if(models.indexOf(aiState.kModel)<0)aiState.kModel=aiModel();
    saveState();aiState.busy=false;render();
  }catch(e){aiState.busy=false;aiState.err=(e&&e.message)||'Could not load models.';render();}
}

/* ---- AI answer / brief: copy + export PDF ---- */
function aiCopy(){
  var t=aiState.out||'';if(!t){toast('Nothing to copy');return;}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){toast('Copied to clipboard');},function(){aiCopyFallback(t);});
  }else aiCopyFallback(t);
}
function aiCopyFallback(t){
  try{var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.top='-1000px';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();var ok=document.execCommand('copy');document.body.removeChild(ta);toast(ok?'Copied to clipboard':'Copy not supported here');}catch(e){toast('Copy not supported here');}
}
function aiExportPDF(title,text){
  if(!pdfReady()){toast('PDF engine loading \u2014 try again');return;}
  if(!text){toast('Nothing to export');return;}
  var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'pt',format:'a4'});
  var W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=48,y=54;
  doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(20,26,36);
  doc.splitTextToSize(title||'AI response',W-2*M).forEach(function(l){doc.text(l,M,y);y+=19;});
  y+=3;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(120,130,145);
  doc.text('Actionables \u00b7 '+fmtDY(todayISO()),M,y);y+=15;
  doc.setDrawColor(220,226,234);doc.setLineWidth(.8);doc.line(M,y,W-M,y);y+=20;
  String(text).split(/\n/).forEach(function(ln){
    var m1=ln.match(/^\s*#{1,4}\s*(.+)/),m2=ln.match(/^\s*[-\u2022*]\s+(.+)/);
    var bold=false,size=10.5,txt=ln,indent=0;
    if(m1){bold=true;size=12;txt=m1[1];}
    else if(m2){txt='\u2022  '+m2[1];indent=8;}
    txt=txt.replace(/\*\*(.+?)\*\*/g,'$1').replace(/\s+$/,'');
    if(!txt){y+=7;return;}
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
    doc.setTextColor(bold?20:45,bold?26:55,bold?36:70);
    if(bold&&y>60)y+=5;
    doc.splitTextToSize(txt,W-2*M-indent).forEach(function(w){if(y>H-M){doc.addPage();y=54;}doc.text(w,M+indent,y);y+=size*1.5;});
  });
  var fn=(title||'AI').replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,50)+'_'+stamp()+'.pdf';
  var b64=doc.output('datauristring').split(',')[1];
  deliverFile(b64,fn,'application/pdf');
}

/* ---- AI: update a task's status / details ---- */
function aiEtaLabel(ek,ev,ee){return ek==='date'?fmtDY(ev):(ek==='range'?(fmtD(ev)+'\u2013'+fmtDY(ee||ev)):(ek==='tbd'?'TBD':'No ETA'));}
function aiEditContext(){
  return S.actionables.map(function(a){
    var o={id:a.id,project:(a.projectId==='__personal'?'Personal':projName(a.projectId)),item:a.lineItem,owner:spocLabel(a),status:a.status,eta:plainEta(a)||'none'};
    if(a.ticket)o.ticket=a.ticket;
    if(a.tags&&a.tags.length)o.tags=a.tags;
    if(a.important)o.important=true;
    return o;
  });
}
async function aiUpdate(){
  var text=(aiState.input||'').trim();
  if(!text){aiState.err='Describe the change to make.';render();return;}
  aiStart();
  try{
    var sys='You update EXISTING actionables from an instruction. Output ONLY a JSON array (no prose) of items to change. Each element MUST include "id" (exactly from the provided list) and ONLY the fields that change: {"id":string,"status"?:"In Progress"|"On Hold"|"Dependency"|"Completed","etaKind"?:"none"|"tbd"|"date"|"range","eta"?:"YYYY-MM-DD","etaEnd"?:"YYYY-MM-DD","owners"?:string[] (person names, full replacement),"tags"?:string[] (full replacement),"important"?:boolean,"lineItem"?:string,"task"?:string}. Match the instruction to the right item(s) by ticket, title, project or owner. Resolve relative dates using today='+todayISO()+'. If nothing clearly matches, return [].';
    var prompt='Actionables (JSON): '+JSON.stringify(aiEditContext())+'\nKnown people: '+JSON.stringify(aiPeopleList())+'\nInstruction: """'+text+'"""';
    var arr=aiJSON(await aiCall(prompt,sys));
    if(!Array.isArray(arr))arr=[];
    var edits=[];
    arr.forEach(function(o){
      if(!o||!o.id)return; var a=actById(o.id); if(!a)return;
      var patch={},diff=[];
      if(o.status&&STATUSES.indexOf(o.status)>=0&&o.status!==a.status){patch.status=o.status;diff.push(['Status',a.status,o.status]);}
      if(o.etaKind!==undefined||o.eta!==undefined||o.etaEnd!==undefined){
        var ek=o.etaKind||(o.eta?'date':(o.etaEnd?'range':a.etaKind)),ev=(o.eta!==undefined?o.eta:a.eta)||'',ee=(o.etaEnd!==undefined?o.etaEnd:a.etaEnd)||'';
        if(ek==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(ev)){ek=ev?'tbd':'none';ev='';}
        if(ek!=='range')ee='';if(ek==='none'||ek==='tbd'){ev='';ee='';}
        if(ek!==a.etaKind||ev!==a.eta||ee!==a.etaEnd){patch.etaKind=ek;patch.eta=ev;patch.etaEnd=ee;diff.push(['ETA',aiEtaLabel(a.etaKind,a.eta,a.etaEnd),aiEtaLabel(ek,ev,ee)]);}
      }
      if(o.owners!==undefined){var ids=aiMapOwners(o.owners);var ok=a.spocIds.slice().sort().join(','),nk=ids.slice().sort().join(',');if(ok!==nk){patch.spocIds=ids;diff.push(['Owner',spocLabel(a),ids.length?ids.map(personName).join(' & '):'Unassigned']);}}
      if(o.tags!==undefined){var t2=(o.tags||[]).slice(0,8);var okt=(a.tags||[]).slice().sort().join('|'),nkt=t2.slice().sort().join('|');if(okt!==nkt){patch.tags=t2;diff.push(['Tags',(a.tags||[]).join(', ')||'\u2014',t2.join(', ')||'\u2014']);}}
      if(o.important!==undefined&&!!o.important!==!!a.important){patch.important=!!o.important;diff.push(['Important',a.important?'Yes':'No',o.important?'Yes':'No']);}
      if(o.lineItem&&o.lineItem!==a.lineItem){patch.lineItem=o.lineItem;diff.push(['Title',cap(a.lineItem,40),cap(o.lineItem,40)]);}
      if(o.task!==undefined&&(o.task||'')!==(a.task||'')){patch.task=o.task;diff.push(['Details',a.task?cap(a.task,40):'\u2014',o.task?cap(o.task,60):'\u2014']);}
      if(o.followup!==undefined){var fu=o.followup||{},nr={on:true,date:fu.nextFollowup||'',time:'',note:fu.note||'',waitingFor:fu.waitingFor||'',requestedOn:fu.requestedOn||'',expectedBy:fu.expectedBy||'',done:false};patch.rem=nr;diff.push(['Follow-up',a.rem&&a.rem.date||'None',nr.date||'Set']);}
      if(diff.length)edits.push({id:a.id,title:(a.ticket?a.ticket+' \u2014 ':'')+a.lineItem,project:(a.projectId==='__personal'?'Personal':projName(a.projectId)),patch:patch,diff:diff,_sel:true});
    });
    aiState.edits=edits;aiState.out='';aiState.outKind='';aiState.items=null;
    aiDone();
    if(edits.length===1){
      var onlyEdit=edits[0];
      setTimeout(function(){openForm(onlyEdit.id,{aiReview:true,aiReviewSource:'AI update',aiPatch:onlyEdit.patch||{}});},0);
    }
  }catch(e){aiFail(e);}
}
function aiApplyEdits(){
  toast('Open each AI update to review and save it individually');
}

/* ---- deep-link from the AI widget ---- */
window.__openAiTool=function(tool){
  var ok=['add','notes','edit','ask','brief'];
  if(ok.indexOf(tool)<0)tool='add';
  aiState.tab=tool;aiState.out='';aiState.outKind='';aiState.items=null;aiState.edits=null;aiState.err='';aiState.input='';
  try{nav('ai',{});}catch(e){}
};

/* ================= AI command center (unified) ================= */
function aiChatPush(role,text,card){ aiChat.push({role:role,text:text||'',card:card||null}); }

function fmtISO2(ts){var d=new Date(ts);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}

function aiSnapshot(){
  var t=todayISO();
  return S.actionables.map(function(a){
    var o={id:a.id,project:(a.projectId==='__personal'?'Personal':projName(a.projectId)),item:a.lineItem,owner:spocLabel(a),status:a.status,eta:plainEta(a)||'none'};
    if(a.ticket)o.ticket=a.ticket;
    if(a.tags&&a.tags.length)o.tags=a.tags;
    if(a.important)o.important=true;
    if(a.type&&a.type!=='Activity')o.type=a.type;
    if(a.task)o.detail=cap(a.task,90);
    if(!isOpen(a)){o.completed=true; if(a.completedAt)o.completedOn=fmtISO2(a.completedAt);}
    else if(isOver(a,t))o.overdue=true;
    return o;
  });
}

/* deterministic list matcher for search/report (reliable regardless of the model) */
function aiFilterList(f){
  f=f||{}; var t=todayISO(); var meIds=myIds();
  var q=f.person?String(f.person).toLowerCase():''; var qt=f.text?String(f.text).toLowerCase():'';
  var res=S.actionables.filter(function(a){
    if(f.completed===true && a.status!=='Completed')return false;
    if(f.open===true && a.status==='Completed')return false;
    if(f.status && a.status!==f.status)return false;
    if(f.overdue===true && !isOver(a,t))return false;
    if(f.important===true && !a.important)return false;
    if(f.mine===true && !a.spocIds.some(function(id){return meIds[id];}))return false;
    if(typeof f.dueWithinDays==='number'){ if(a.status==='Completed')return false; var e=endEta(a); if(!e)return false; var dd=diffDays(e,t); if(dd<0||dd>f.dueWithinDays)return false; }
    if(f.project){ var pl=(a.projectId==='__personal'?'personal':projName(a.projectId)).toLowerCase(),pc=projCode(a.projectId).toLowerCase(),pf=String(f.project).toLowerCase(); if(pl.indexOf(pf)<0&&pc.indexOf(pf)<0)return false; }
    if(f.tag){ var tf=String(f.tag).toLowerCase(); if(!(a.tags||[]).some(function(x){return x.toLowerCase().indexOf(tf)>=0;}))return false; }
    if(f.type){ if(String(a.type||'Activity').toLowerCase()!==String(f.type).toLowerCase())return false; }
    if(q){ var inOwner=a.spocIds.some(function(id){return personName(id).toLowerCase().indexOf(q)>=0;}); var inText=((a.lineItem||'')+' '+(a.task||'')+' '+(a.notes||'')).toLowerCase().indexOf(q)>=0; if(!inOwner&&!inText)return false; }
    if(qt){ var hay=((a.ticket||'')+' '+(a.lineItem||'')+' '+(a.task||'')+' '+(a.notes||'')+' '+categoryName(a.projectId,a.categoryId)+' '+(a.tags||[]).join(' ')).toLowerCase(); if(hay.indexOf(qt)<0)return false; }
    return true;
  });
  res.sort(function(x,y){var cx=isOpen(x)?0:1,cy=isOpen(y)?0:1;if(cx!==cy)return cx-cy;if(cx===1)return(y.completedAt||y.updatedAt||0)-(x.completedAt||x.updatedAt||0);return smartCmp(x,y,t);});
  return res;
}

/* compute a patch + inverse + human diff for one update instruction */
function aiPatchFor(a,c){
  var patch={},prev={},diff=[];
  if(c.status&&STATUSES.indexOf(c.status)>=0&&c.status!==a.status){patch.status=c.status;prev.status=a.status;diff.push(['Status',a.status,c.status]);}
  if(c.etaKind!==undefined||c.eta!==undefined||c.etaEnd!==undefined){
    var ek=c.etaKind||(c.eta?'date':(c.etaEnd?'range':a.etaKind)),ev=(c.eta!==undefined?c.eta:a.eta)||'',ee=(c.etaEnd!==undefined?c.etaEnd:a.etaEnd)||'';
    if(ek==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(ev)){ek=ev?'tbd':'none';ev='';}
    if(ek!=='range')ee=''; if(ek==='none'||ek==='tbd'){ev='';ee='';}
    if(ek!==a.etaKind||ev!==a.eta||ee!==a.etaEnd){patch.etaKind=ek;patch.eta=ev;patch.etaEnd=ee;prev.etaKind=a.etaKind;prev.eta=a.eta;prev.etaEnd=a.etaEnd;diff.push(['ETA',aiEtaLabel(a.etaKind,a.eta,a.etaEnd),aiEtaLabel(ek,ev,ee)]);}
  }
  if(c.project!==undefined||c.projectName!==undefined){var pn=String(c.project||c.projectName||'').toLowerCase(),ps=S.projects.filter(function(p){return p.id!=='__personal';}),pid2='';for(var pi=0;pi<ps.length;pi++){if(ps[pi].name.toLowerCase()===pn||ps[pi].name.toLowerCase().indexOf(pn)>=0||String(ps[pi].code||'').toLowerCase()===pn){pid2=ps[pi].id;break;}}if(pid2&&pid2!==a.projectId){patch.projectId=pid2;prev.projectId=a.projectId;diff.push(['Project',projName(a.projectId),projName(pid2)]);}}
  if(c.category!==undefined||c.categoryName!==undefined){var targetPid=patch.projectId||a.projectId,cn2=String(c.category||c.categoryName||'').trim().toLowerCase(),cats2=activeCategories(targetPid),cid2='';for(var ci2=0;ci2<cats2.length;ci2++){if(cats2[ci2].name.toLowerCase()===cn2||cats2[ci2].name.toLowerCase().indexOf(cn2)>=0){cid2=cats2[ci2].id;break;}}if(cid2!==(a.categoryId||'')){patch.categoryId=cid2;prev.categoryId=a.categoryId||'';diff.push(['Category',categoryName(targetPid,a.categoryId),cid2?categoryName(targetPid,cid2):'Uncategorised']);}}
  if(c.owners!==undefined){var ids=aiMapOwners(c.owners);var ok=a.spocIds.slice().sort().join(','),nk=ids.slice().sort().join(',');if(ok!==nk){patch.spocIds=ids;prev.spocIds=a.spocIds.slice();diff.push(['Owner',spocLabel(a),ids.length?ids.map(personName).join(' & '):'Unassigned']);}}
  if(c.tags!==undefined){var t2=(c.tags||[]).slice(0,8);var okt=(a.tags||[]).slice().sort().join('|'),nkt=t2.slice().sort().join('|');if(okt!==nkt){patch.tags=t2;prev.tags=(a.tags||[]).slice();diff.push(['Tags',(a.tags||[]).join(', ')||'\u2014',t2.join(', ')||'\u2014']);}}
  if(c.important!==undefined&&!!c.important!==!!a.important){patch.important=!!c.important;prev.important=!!a.important;diff.push(['Priority',a.important?'High':'Normal',c.important?'High':'Normal']);}
  if(c.lineItem&&c.lineItem!==a.lineItem){patch.lineItem=c.lineItem;prev.lineItem=a.lineItem;diff.push(['Title',cap(a.lineItem,36),cap(c.lineItem,36)]);}
  if(c.task!==undefined&&(c.task||'')!==(a.task||'')){patch.task=c.task;prev.task=a.task;diff.push(['Details',a.task?cap(a.task,32):'\u2014',c.task?cap(c.task,44):'\u2014']);}
  if(c.followup!==undefined){var fu=c.followup||{},nr={on:true,date:fu.nextFollowup||'',time:'',note:fu.note||'',waitingFor:fu.waitingFor||'',requestedOn:fu.requestedOn||'',expectedBy:fu.expectedBy||'',done:false};patch.rem=nr;prev.rem=JSON.parse(JSON.stringify(a.rem||{on:false,date:'',time:'',note:'',done:false,waitingFor:'',requestedOn:'',expectedBy:''}));diff.push(['Follow-up',prev.rem.date||'None',nr.date||'Set']);}
  return {patch:patch,prev:prev,diff:diff};
}

function aiValidatedUpdate(a,c){var pr=aiPatchFor(a,c||{}),errs=[];if(!Object.keys(pr.patch).length)errs.push('No actual change was identified');if(pr.patch.categoryId&& !categoryById(pr.patch.projectId||a.projectId,pr.patch.categoryId))errs.push('Category is not valid for the selected project');if(pr.patch.etaKind==='date'&&pr.patch.eta&&!/^\d{4}-\d{2}-\d{2}$/.test(pr.patch.eta))errs.push('ETA date is invalid');if(pr.patch.etaKind==='range'&&(!pr.patch.eta||!pr.patch.etaEnd||diffDays(pr.patch.etaEnd,pr.patch.eta)<0))errs.push('ETA range is invalid');return{patch:pr.patch,prev:pr.prev,diff:pr.diff,errors:errs};}
function aiValidateAdd(it){
  var errs=[];
  if(!it.lineItem||!it.lineItem.trim())errs.push('Task title is missing');
  if(!it.projectId)errs.push('Project could not be matched');
  if(it.categoryId&&!categoryById(it.projectId,it.categoryId))errs.push('Category is not valid for the selected project');
  if(it.etaKind==='date'&&(!it.eta||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(it.eta)))errs.push('ETA date is invalid');
  if(it.etaKind==='range'&&(!it.eta||!it.etaEnd||diffDays(it.etaEnd,it.eta)<0))errs.push('ETA range is invalid');
  if(it.recurrence&&it.recurrence.enabled&&it.etaKind!=='date'&&it.etaKind!=='range')errs.push('Recurring task needs an ETA');
  if(it.recurrence&&it.recurrence.enabled&&it.recurrence.endDate&&it.eta&&it.recurrence.endDate<it.eta)errs.push('Recurrence end date is before the ETA');
  if(it.followup&&it.followup.on&&(!it.followup.date||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(it.followup.date)))errs.push('Follow-up date is invalid');
  return errs;
}
function aiPendingField(p,i,field,label,value,kind){
  var v=value==null?'':value;
  if(kind==='status')return '<label class="fld"><span>'+esc(label)+'</span><select data-chg="ai-pending-field" data-i="'+i+'" data-field="'+field+'">'+STATUSES.map(function(x){return '<option value="'+esc(x)+'"'+(x===v?' selected':'')+'>'+esc(x)+'</option>';}).join('')+'</select></label>';
  if(kind==='project')return '<label class="fld"><span>'+esc(label)+'</span><select data-chg="ai-pending-field" data-i="'+i+'" data-field="'+field+'"><option value="">Unmatched</option>'+S.projects.map(function(x){return '<option value="'+x.id+'"'+(x.id===v?' selected':'')+'>'+esc(x.name)+'</option>';}).join('')+'</select></label>';
  if(kind==='category'){var pid=(p.kind==='add'?p.items[i].projectId:((p.items[i].patch&&p.items[i].patch.projectId)||(actById(p.items[i].id)||{}).projectId))||'';return '<label class="fld"><span>'+esc(label)+'</span><select data-chg="ai-pending-field" data-i="'+i+'" data-field="'+field+'"><option value="">Uncategorised</option>'+activeCategories(pid).map(function(x){return '<option value="'+x.id+'"'+(x.id===v?' selected':'')+'>'+esc(x.name)+'</option>';}).join('')+'</select></label>';}
  if(kind==='priority')return '<label class="fld"><span>'+esc(label)+'</span><select data-chg="ai-pending-field" data-i="'+i+'" data-field="'+field+'"><option value="0"'+(v!=='1'?' selected':'')+'>Normal</option><option value="1"'+(v==='1'?' selected':'')+'>High</option></select></label>';
    if(kind==='owner')return '<label class="fld"><span>'+esc(label)+'</span><select data-chg="ai-pending-field" data-i="'+i+'" data-field="'+field+'"><option value="">Unassigned</option>'+peopleSorted().map(function(x){var ids=(p.kind==='add'?p.items[i].spocIds:(p.items[i].patch&&p.items[i].patch.spocIds)||[]);return '<option value="'+x.id+'"'+(ids.indexOf(x.id)>=0?' selected':'')+'>'+esc(x.name)+'</option>';}).join('')+'</select></label>';
  return '<label class="fld"><span>'+esc(label)+'</span><input '+(kind==='date'?'type="date"':'')+' data-chg="ai-pending-field" data-i="'+i+'" data-field="'+field+'" value="'+esc(v)+'"></label>';
}
function aiRebuildDiff(it){if(it._kind==='add')return;var a=actById(it.id);if(!a)return;var pr=aiPatchFor(a,it.patch||{});it.patch=pr.patch;it.prev=pr.prev;it.diff=pr.diff;}
function aiRebuildDiff(it){if(it._kind==='add')return;var a=actById(it.id);if(!a)return;var pr=aiPatchFor(a,it.patch||{});it.patch=pr.patch;it.prev=pr.prev;it.diff=pr.diff;}
function aiPendingCard(p){
  var kindLabel=p.kind==='add'?'additions':(p.kind==='update'?'updates':'deletions');
  var h='<div class="ai-pending"><div class="ai-pending-head"><span>'+I('alert')+'</span><div><b>Review required · '+p.items.length+' '+kindLabel+'</b><small>Click any item to open the normal Actionable edit screen. Review, change anything you want, then Save or Reject.</small></div></div>';
  if(p.kind==='add'){
    h+='<div class="ai-pending-list">'+p.items.map(function(it,i){
      return '<button class="ai-pchg ai-pchg-btn" data-act="ai-pending-open" data-i="'+i+'"><span class="ai-pchg-top"><b>ADD</b><span class="ai-review-link">Open edit</span></span><strong>'+esc(it.lineItem||'(untitled)')+'</strong><span>'+esc([it._projLabel,it.categoryId?categoryName(it.projectId,it.categoryId):'',it._ownerLabel,it.etaLabel,it.status].filter(Boolean).join(' · '))+'</span>'+(it.task?'<em>'+esc(cap(it.task,150))+'</em>':'')+'</button>';
    }).join('')+'</div>';
  }else if(p.kind==='update'){
    h+='<div class="ai-pending-list">'+p.items.map(function(it,i){
      var a=actById(it.id);
      var diffs=(it.diff||[]).map(function(d){return d[0]+': '+(d[1]||'—')+' → '+(d[2]||'—');}).join(' · ');
      return '<button class="ai-pchg ai-pchg-btn" data-act="ai-pending-open" data-i="'+i+'"><span class="ai-pchg-top"><b>UPDATE</b><span class="ai-review-link">Open edit</span></span><strong>'+esc(it.title||((a&&a.lineItem)||'Actionable'))+'</strong><span>'+esc((a?(a.projectId==='__personal'?'Personal':projName(a.projectId)):'')+' · '+(a?spocLabel(a):''))+'</span>'+(diffs?'<em>'+esc(diffs)+'</em>':'')+'</button>';
    }).join('')+'</div>';
  }else if(p.kind==='delete'){
    h+='<div class="ai-pending-list">'+p.items.map(function(it){return '<div class="ai-pchg"><span class="ai-pchg-top"><b>DELETE</b></span><strong>'+esc(it.title)+'</strong><span>'+esc(it.meta||'Review deletion before applying.')+'</span></div>';}).join('')+'</div>';
  }
  if(p.errors&&p.errors.length)h+='<div class="ai-err" style="margin-top:10px">'+I('alert')+'<span>'+esc(p.errors.join(' · '))+'</span></div>';
  h+='<div class="ai-actions"><button class="btn ghost" data-act="ai-cancel-pending">Reject all</button></div></div>';
  return h;
}

function aiApplyPending(){
  if(aiState.pending)toast('Open each AI change to review and save it individually');
}

async function aiSend(){
  if(aiState.pending){toast('Review the proposed change first');return;}
  var text=(aiState.input||'').trim(); if(!text)return;
  aiChatPush('user',text);
  aiState.input=''; aiState.busy=true; aiState.err=''; render();
  try{
    var hist=aiChat.slice(0,-1).slice(-8).map(function(m){return (m.role==='user'?'User: ':'Assistant: ')+m.text;}).join('\n');
    var prompt='Today: '+todayISO()+'\nCurrent user: '+(S.settings.userName||'me')+'\nProjects: '+JSON.stringify(aiProjList())+'\nPeople: '+JSON.stringify(aiPeopleList())+'\nActionables: '+JSON.stringify(aiSnapshot())+(hist?('\nRecent conversation:\n'+hist):'')+'\nUser: """'+text+'"""';
    var obj=aiJSON(await aiCall(prompt,AI_ROUTER_SYS));
    aiExec(obj);
    aiState.busy=false; render();
  }catch(e){ aiState.busy=false; aiChatPush('ai','Sorry \u2014 '+((e&&e.message)||'something went wrong.')); render(); }
}

function aiExec(o){
  var act=(o&&o.action)||'answer';
  if(act==='add'){
    var items=(o.add||[]).map(aiNormalize).filter(function(x){return x.lineItem;});
    if(!items.length){aiChatPush('ai',(o&&o.reply)||'I could not find task details to add.');return;}
    var errors=[];items.forEach(function(it){errors=errors.concat(aiValidateAdd(it).map(function(e){return it.lineItem+': '+e;}));});
    if(items.length===1&&!errors.length){
      var one=items[0];
      aiChatPush('ai','I prepared this addition. It is open in Edit mode. Review, change anything you want, then Save or Reject.',{type:'edit-review',id:'__new',title:one.lineItem});
      openForm(null,Object.assign({},one,{aiReview:true,aiReviewSource:'AI add'}));
    }else{
      aiState.pending={kind:'add',items:items,errors:errors};
      aiChatPush('ai','I identified '+items.length+' additions. Review each item before it is saved.',{type:'pending',pending:aiState.pending});
    }
  } else if(act==='update'){
    var items2=[],errors2=[];
    (o.update||[]).forEach(function(c){if(!c||!c.id)return;var a=actById(c.id);if(!a){errors2.push('Task '+c.id+' was not found');return;}var pr=aiValidatedUpdate(a,c);if(pr.errors.length)errors2=errors2.concat(pr.errors.map(function(e){return a.lineItem+': '+e;}));else items2.push({id:a.id,title:(a.ticket?a.ticket+' — ':'')+a.lineItem,patch:pr.patch,prev:pr.prev,diff:pr.diff});});
    if(!items2.length){aiChatPush('ai',(o&&o.reply)||'I could not find a valid change to review.');return;}
    if(items2.length===1&&!errors2.length){
      var uone=items2[0];
      aiChatPush('ai','I prepared this update. It is open in Edit mode. Review, change anything you want, then Save or Reject.',{type:'edit-review',id:uone.id,title:uone.title});
      openForm(uone.id,{aiReview:true,aiReviewSource:'AI update',aiPatch:uone.patch});
    }else{
      aiState.pending={kind:'update',items:items2,errors:errors2};
      aiChatPush('ai','I identified '+items2.length+' updates. Review each item before it is saved.',{type:'pending',pending:aiState.pending});
    }
  } else if(act==='delete'){
    var items3=[],errors3=[];
    (o.delete||[]).forEach(function(id){var a=actById(id);if(!a){errors3.push('Task '+id+' was not found');return;}items3.push({id:a.id,title:(a.ticket?a.ticket+' — ':'')+a.lineItem,meta:(a.projectId==='__personal'?'Personal':projName(a.projectId))+' · '+spocLabel(a)});});
    if(!items3.length){aiChatPush('ai',(o&&o.reply)||'I could not find a valid task to delete.');return;}
    aiState.pending={kind:'delete',items:items3,errors:errors3};
    aiChatPush('ai','I identified '+items3.length+' deletions. Review them before anything is removed.',{type:'pending',pending:aiState.pending});
  } else if(act==='search'){
    var sids;
    if(o.search&&o.search.filter&&Object.keys(o.search.filter).length){sids=aiFilterList(o.search.filter).map(function(a){return a.id;});}
    else{sids=((o.search&&o.search.ids)||[]).filter(function(id){return !!actById(id);});}
    aiChatPush('ai',(o&&o.reply)||(sids.length?('Found '+sids.length+' task'+(sids.length===1?'':'s')+'.'):'No matching tasks found.'),sids.length?{type:'search',ids:sids}:null);
  } else if(act==='report'){
    var rlist;
    if(o.report&&o.report.filter&&Object.keys(o.report.filter).length)rlist=aiFilterList(o.report.filter);else rlist=((o.report&&o.report.ids)||[]).map(actById).filter(Boolean);
    if(!rlist.length){aiChatPush('ai',(o&&o.reply)||'No tasks matched that report.');return;}
    var fmt=((o.report&&o.report.format)||'pdf').toLowerCase(),label=(o.report&&o.report.label)||'AI report';
    if(fmt==='excel'||fmt==='xlsx')exportExcel(null,label,rlist);else aiReportPdf(rlist,label);
    aiChatPush('ai',(o&&o.reply)||('Downloaded a '+((fmt==='excel'||fmt==='xlsx')?'spreadsheet':'PDF')+' report of '+rlist.length+' task'+(rlist.length===1?'':'s')+'.'));
  } else if(act==='quality'){
    var qproj='';
    if(o&&o.project){var qn=String(o.project).toLowerCase();var qp=S.projects.filter(function(p){return p.id!=='__personal';});for(var qi=0;qi<qp.length;qi++){if(qp[qi].name.toLowerCase().indexOf(qn)>=0||String(qp[qi].code||'').toLowerCase()===qn){qproj=qp[qi].id;break;}}}
    var qr=dataQualityCheck(qproj), high=qr.issues.filter(function(x){return x.sev==='high';}).length, med=qr.issues.length-high;
    aiChatPush('ai',(o&&o.reply)||('Found '+qr.issues.length+' data-quality issue'+(qr.issues.length===1?'':'s')+' across '+qr.items+' task'+(qr.items===1?'':'s')+'.'),{type:'quality',issues:qr.issues,items:qr.items});
  } else if(act==='clarify'){
    aiChatPush('ai',(o&&o.reply)||'Could you clarify which task you mean?');
  } else {
    aiChatPush('ai',(o&&o.reply)||'—',{type:'answer'});
  }
}
function aiBubble(m,idx){
  return '<div class="ai-msg ai-ai"><div class="ai-bub ai-md">'+aiMd(m.text||'')+'</div>'+(m.card?aiCard(m.card,idx):'')+'</div>';
}
function aiCard(c,idx){
  if(!c)return '';
  if(c.type==='pending')return aiPendingCard(c.pending||aiState.pending||{});
  if(c.type==='edit-review')return '<div class="ai-rescard ai-review-result"><div class="ai-review-result-head">'+I('edit')+'<b>Review required</b></div><div class="ai-review-result-body">'+esc(c.title||'Actionable')+' is open in Edit mode. Review and change any field, then click <b>Save</b>.</div></div>';
  var undoBtn=(c.undo&&!c.undone)?'<button class="ai-undo" data-act="ai-undo" data-i="'+idx+'">Undo</button>':(c.undone?'<span class="ai-undone">\u2713 Undone</span>':'');
  if(c.type==='search'){
    var items=(c.ids||[]).map(actById).filter(Boolean);
    if(!items.length)return '';
    return '<div class="ai-rescard">'+items.slice(0,12).map(function(a){return '<button class="ai-resrow" data-act="ai-open" data-id="'+a.id+'"><span class="ai-rr-t">'+esc((a.ticket?a.ticket+' \u2014 ':'')+a.lineItem)+'</span><span class="ai-rr-m">'+esc((a.projectId==='__personal'?'Personal':projName(a.projectId))+' \u00b7 '+a.status+' \u00b7 '+(plainEta(a)||'no ETA'))+'</span></button>';}).join('')+(items.length>12?('<div class="ai-rr-more">+'+(items.length-12)+' more</div>'):'')+'</div>';
  }
  if(c.type==='added'){
    return '<div class="ai-rescard">'+(c.rows||[]).map(function(r){return '<div class="ai-chg"><b>'+esc(r.title)+'</b>'+(r.meta?'<span class="ai-dl2"><i>'+esc(r.meta)+'</i></span>':'')+'</div>';}).join('')+undoBtn+'</div>';
  }
  if(c.type==='updated'){
    return '<div class="ai-rescard">'+(c.rows||[]).map(function(r){return '<div class="ai-chg"><b>'+esc(r.title)+'</b>'+r.diff.map(function(d){return '<span class="ai-dl2">'+esc(d[0])+': '+(d[1]?'<s>'+esc(d[1])+'</s> \u2192 ':'')+'<i>'+esc(d[2])+'</i></span>';}).join('')+'</div>';}).join('')+undoBtn+'</div>';
  }
  if(c.type==='deleted'){
    return '<div class="ai-rescard">'+(c.rows||[]).map(function(r){return '<div class="ai-del-row">'+esc(r.title)+'</div>';}).join('')+undoBtn+'</div>';
  }
  if(c.type==='quality'){
    var qis=c.issues||[];
    if(!qis.length)return '<div class="ai-rescard"><div class="ai-chg"><b>✓ No data-quality issues found</b><span class="ai-dl2"><i>Checked '+esc(String(c.items||0))+' task'+((c.items||0)===1?'':'s')+'.</i></span></div></div>';
    return '<div class="ai-rescard">'+qis.slice(0,30).map(function(q){var badge=q.sev==='high'?'HIGH':'CHECK';return '<button class="ai-resrow" data-act="ai-open" data-id="'+esc(q.id)+'"><span class="ai-rr-t"><b>'+esc(badge)+'</b> '+esc(q.title)+'</span><span class="ai-rr-m">'+esc(q.field+' · '+q.reason)+'</span></button>';}).join('')+(qis.length>30?'<div class="ai-rr-more">+'+(qis.length-30)+' more</div>':'')+'</div>';
  }
  if(c.type==='answer'){
    return '<div class="ai-bubacts"><button class="ai-mini-btn" data-act="ai-copy-b" data-i="'+idx+'">Copy</button><button class="ai-mini-btn" data-act="ai-pdf-b" data-i="'+idx+'">Export PDF</button></div>';
  }
  return '';
}

function aiUndo(idx){
  var m=aiChat[idx]; if(!m||!m.card||!m.card.undo||m.card.undone)return;
  var u=m.card.undo;
  if(u.kind==='add'){ S.actionables=S.actionables.filter(function(a){return u.ids.indexOf(a.id)<0;}); }
  else if(u.kind==='update'){ u.changes.forEach(function(ch){ if(actById(ch.id))updateAct(ch.id,ch.patch); }); }
  else if(u.kind==='delete'){ u.removed.slice().sort(function(x,y){return x.ix-y.ix;}).forEach(function(r){ S.actionables.splice(Math.min(r.ix,S.actionables.length),0,r.a); }); }
  m.card.undone=true; saveState(); render(); toast('Undone');
}
function aiCopyText(idx){ var m=aiChat[idx]; if(!m)return; var t=m.text||''; if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){toast('Copied');},function(){aiCopyFallback(t);});} else aiCopyFallback(t); }

/* flat-list report PDF for AI-generated reports */
function aiReportPdf(list,label){
  if(!pdfReady()){toast('PDF engine loading \u2014 try again');return false;}
  var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'pt',format:'a4'});
  var W=doc.internal.pageSize.getWidth(),M=40,y=48;
  doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(20,26,36);
  doc.text((label||'Report').toUpperCase(),M,y);y+=17;
  doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(100,115,130);
  doc.text('Generated: '+fmtDY(todayISO())+' \u00b7 '+list.length+' item'+(list.length===1?'':'s'),M,y);y+=14;
  doc.setDrawColor(220,226,234);doc.setLineWidth(.8);doc.line(M,y,W-M,y);y+=12;
  doc.autoTable({
    startY:y+4,
    head:[['Project','Category','Line Item','Description','Owner','Assigned','Age','ETA','Status','Latest comment']],
    body:list.map(function(a){var lc=(a.comments&&a.comments.length)?a.comments[a.comments.length-1]:null;var cd=lc?new Date(lc.ts):null;var lcs=lc?(cd.getDate()+' '+MON[cd.getMonth()]+' '+cd.getFullYear()+': '+(lc.text||'')):'';return[projCode(a.projectId),categoryName(a.projectId,a.categoryId),a.lineItem,a.task||'',spocLabel(a),fmtDY(assignedDateISO(a)||createdDateISO(a)),agingDays(a)+'d',fmtEta(a),a.status,lcs];}),
    margin:{left:M,right:M},
    styles:{fontSize:7.5,cellPadding:3.5,textColor:[45,55,70],lineColor:[225,232,240],lineWidth:.5,valign:'top'},
    headStyles:{fillColor:[17,24,38],textColor:255,fontStyle:'bold',fontSize:8},
    alternateRowStyles:{fillColor:[247,249,252]},
    columnStyles:{0:{cellWidth:30},1:{cellWidth:52},2:{cellWidth:60},3:{cellWidth:78},4:{cellWidth:46},5:{cellWidth:42},6:{cellWidth:30},7:{cellWidth:42},8:{cellWidth:48},9:{cellWidth:105}}
  });
  var b64=doc.output('datauristring').split(',')[1];
  deliverFile(b64,(label||'report').replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,40)+'_'+stamp()+'.pdf','application/pdf');
  return true;
}

/* ---- Task type picker ---- */
function typePickHtml(f){
  var cur=f.type||'Activity';
  var have=S.taskTypes.indexOf(cur)>=0;
  var opts=(have?'':'<option value="'+esc(cur)+'" selected>'+esc(cur)+'</option>')+S.taskTypes.map(function(tp){return '<option value="'+esc(tp)+'"'+(cur===tp?' selected':'')+'>'+esc(tp)+'</option>';}).join('');
  return '<select data-chg="f-type">'+opts+'<option value="__newtype">+ New type\u2026</option></select>';
}

/* ---- AI: rephrase the comment being typed ---- */
async function aiRephraseComment(rec){
  var inp=$('#cmtIn',rec.sheet); if(!inp)return; var txt=(inp.value||'').trim();
  if(!txt){toast('Type a comment to rephrase');return;}
  if(!aiConfigured()){toast('Set up AI in the AI tab to rephrase');return;}
  var btn=$('[data-act=d-cmt-rephrase]',rec.sheet); if(btn){btn.disabled=true;btn.textContent='Rephrasing\u2026';}
  try{
    var out=await aiCall('Rephrase this project task comment to be clear, concise and professional. Keep the meaning and every specific (names, dates, ticket IDs, numbers). Return ONLY the rephrased comment text \u2014 no quotes, no preamble.\n\nComment: """'+txt+'"""','');
    out=(out||'').trim().replace(/^["\u201c\u2018']+|["\u201d\u2019']+$/g,'').trim();
    var inp2=$('#cmtIn',rec.sheet); if(inp2&&out){inp2.value=out;inp2.focus();}
    toast('Rephrased');
  }catch(e){toast('Rephrase failed \u2014 '+((e&&e.message)||'try again'));}
  var b2=$('[data-act=d-cmt-rephrase]',rec.sheet); if(b2){b2.disabled=false;b2.innerHTML=I('spark')+'Rephrase';}
}

/* Reading modes: persistent low-glare themes for long reading sessions. */
(function initReadingModes(){
  function applyReadingMode(mode){
    var body=document.body;
    if(!body) return;
    body.classList.remove("reading-warm","reading-sepia","reading-sage","reading-slate");
    if(mode && mode!=="default") body.classList.add("reading-"+mode);
    try{ localStorage.setItem("actionables-reading-mode", mode || "default"); }catch(e){}
  }
  function bind(){
    var select=document.getElementById("readingModeSelect");
    if(!select) return;
    var saved="default";
    try{ saved=localStorage.getItem("actionables-reading-mode") || "default"; }catch(e){}
    select.value=saved;
    applyReadingMode(saved);
    select.addEventListener("change",function(){ applyReadingMode(this.value); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bind);
  else bind();
})();
