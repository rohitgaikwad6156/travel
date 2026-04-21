// ===== STATE =====
const S={
  step:1,dest:null,route:null,routeDetails:{},
  days:3,startDate:null,teamSize:10,
  dayPlans:{},
  recipients:[],
  todayDay:1,
  company:JSON.parse(localStorage.getItem('tm_company')||'{}'),
  employees:JSON.parse(localStorage.getItem('tm_employees')||'[]'),
  plans:JSON.parse(localStorage.getItem('tm_plans')||'[]')
};

const LOADER_MSGS=[
  'Booking your seats','Preparing routes','Loading destination data',
  'Checking availability','Curating menus','Scanning locations',
  'Building itinerary','Preparing the map','Almost ready'
];

// ===== BOOT =====
document.addEventListener('DOMContentLoaded',()=>{
  // Initial loader
  const msgs=['Loading TripMate','Preparing your workspace','Fetching destinations'];
  let mi=0;
  const lmEl=document.getElementById('loader-msg');
  const lInt=setInterval(()=>{if(++mi<msgs.length)lmEl.textContent=msgs[mi];},700);
  setTimeout(()=>{clearInterval(lInt);document.getElementById('loader').classList.add('hidden');},2200);

  buildParticles();
  buildHomeDest();
  buildExplore();
  buildDestGrid();
  buildRouteGrid();
  buildProgressStrip();
  loadProfile();
  loadEmpList();
  setDefaultDate();
  loadPlans();
  updateStats();
  showPage('home');
  // Load saved EmailJS credentials after DOM is ready
  setTimeout(loadEjsCredentials,100);

  // nav shadow + scrolled class
  window.addEventListener('scroll',()=>{
    const nav=document.getElementById('nav');
    if(scrollY>10){
      nav.style.boxShadow='0 4px 20px rgba(11,16,34,0.1)';
      nav.classList.add('scrolled');
    } else {
      nav.style.boxShadow='';
      nav.classList.remove('scrolled');
    }
  });
});

// ===== GEOMETRIC PARTICLES =====
function buildParticles(){
  const el=document.getElementById('hero-particles');
  const colors=['rgba(200,151,58,0.5)','rgba(67,56,202,0.5)','rgba(109,40,217,0.4)','rgba(255,255,255,0.25)','rgba(200,151,58,0.35)'];
  for(let i=0;i<22;i++){
    const p=document.createElement('div');
    p.className='hparticle';
    const size=(2+Math.random()*4)+'px';
    const col=colors[Math.floor(Math.random()*colors.length)];
    p.style.cssText=`
      left:${Math.random()*100}%;
      bottom:${-5+Math.random()*20}%;
      width:${size};height:${size};
      background:${col};
      animation-duration:${10+Math.random()*14}s;
      animation-delay:${Math.random()*12}s;
    `;
    el.appendChild(p);
  }
}

// ===== STEP TRANSITION LOADER =====
let stepLoaderEl=null;
function showStepLoader(emoji,msg,cb){
  if(!stepLoaderEl){
    stepLoaderEl=document.createElement('div');
    stepLoaderEl.id='step-loader';
    stepLoaderEl.innerHTML=`<div class="sl-inner">
      <div class="sl-spinner"><span class="sl-emoji" id="sl-emoji"></span></div>
      <div class="sl-msg" id="sl-msg"></div>
    </div>`;
    document.body.appendChild(stepLoaderEl);
  }
  document.getElementById('sl-emoji').textContent=emoji;
  document.getElementById('sl-msg').textContent=msg;
  stepLoaderEl.classList.add('show');
  setTimeout(()=>{stepLoaderEl.classList.remove('show');if(cb)cb();},800);
}

// ===== PAGE NAV =====
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.npill').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.getElementById('np-'+id)?.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='myplans')loadPlans();
}

// ===== HOME DEST =====
function buildHomeDest(){
  const picks=['goa','manali','jaipur','udaipur','rishikesh','andaman'];
  document.getElementById('home-dest-grid').innerHTML=picks.map(id=>{
    const d=DESTINATIONS.find(x=>x.id===id);
    return `<div class="hd-card" onclick="quickPlan('${id}')">
      <div class="hd-img" style="background:${d.bg}">${d.emoji}</div>
      <div class="hd-body"><h4>${d.name}</h4><small>${d.state}</small><br/><span class="hd-vibe">${d.vibe}</span></div>
    </div>`;
  }).join('');
}
function quickPlan(id){showPage('planner');selectDest(id);}

// ===== EXPLORE =====
function buildExplore(){
  document.getElementById('explore-cards').innerHTML=DESTINATIONS.map(d=>`
    <div class="ec-card" id="ecc-${d.id}" data-tags="${d.tags.join(',')}">
      <div class="ec-img" style="background:${d.bg}">${d.emoji}</div>
      <div class="ec-body">
        <h3>${d.name}</h3>
        <div class="ec-loc">📍 ${d.state}</div>
        <div class="ec-tags">${d.tags.map(t=>`<span class="ec-tag">${t}</span>`).join('')}</div>
        <p style="font-size:0.8rem;color:var(--muted);margin-bottom:0.85rem">${d.desc}</p>
        <button class="ec-btn" onclick="quickPlan('${d.id}')">Plan a Trip Here</button>
      </div>
    </div>`).join('');
}
function filterDest(tag,btn){
  document.querySelectorAll('.fchip').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  document.querySelectorAll('.ec-card').forEach(c=>{
    c.classList.toggle('hidden',tag!=='all'&&!c.dataset.tags.includes(tag));
  });
}

// ===== PROGRESS STRIP =====
function buildProgressStrip(){
  const steps=[{n:1,lbl:'Destination',e:'🗺️'},{n:2,lbl:'Route',e:'✈️'},{n:3,lbl:'Duration',e:'📅'},{n:4,lbl:'Day Plans',e:'🏨'},{n:5,lbl:'Finish',e:'🎉'}];
  const el=document.getElementById('pp-steps');
  el.innerHTML=steps.map((s,i)=>`
    ${i>0?`<div class="pp-line" id="ppl${i}"></div>`:''}
    <div class="pp-step" id="pps${s.n}" onclick="safeGoStep(${s.n})">
      <div class="ps-circle">${s.n}</div>
      <div class="ps-label">${s.lbl}</div>
    </div>`).join('');
  updateProgress(1);
}
function updateProgress(n){
  for(let i=1;i<=5;i++){
    const el=document.getElementById('pps'+i);
    if(!el)continue;
    el.classList.remove('active','done');
    if(i<n)el.classList.add('done');
    else if(i===n)el.classList.add('active');
    if(i>1){const line=document.getElementById('ppl'+(i-1));if(line)line.classList.toggle('done',i<=n);}
  }
  document.getElementById('pp-fill').style.width=((n-1)/4*100)+'%';
}
function safeGoStep(n){if(n<=S.step)goStep(n);}

// ===== STEP NAV =====
const STEP_LOADERS=[null,['🗺️','Finding destinations'],['✈️','Preparing travel options'],['📅','Setting the calendar'],['🏨','Loading day planner'],['🎉','Building your journey map']];
function goStep(n){
  if(n>1&&n===2&&!S.dest){showToast('Select a destination first');return;}
  const loader=STEP_LOADERS[n];
  showStepLoader(loader[0],loader[1],()=>{
    document.querySelectorAll('.pstep').forEach(s=>s.classList.remove('active'));
    document.getElementById('step-'+n)?.classList.add('active');
    if(n===4)buildDayPlanner();
    if(n===5){buildJourneyMap();buildReview();buildTodaysPanel();}
    updateProgress(n);S.step=n;
    window.scrollTo({top:60,behavior:'smooth'});
  });
}

// ===== DEST =====
function buildDestGrid(){
  document.getElementById('dest-grid').innerHTML=DESTINATIONS.map(d=>`
    <div class="dest-card" id="dc-${d.id}" onclick="selectDest('${d.id}')">
      <div class="dc-img" style="background:${d.bg}">${d.emoji}</div>
      <div class="dc-body"><h4>${d.name}</h4><small>${d.state}</small></div>
    </div>`).join('');
}
function selectDest(id){
  S.dest=id;
  document.querySelectorAll('.dest-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('dc-'+id)?.classList.add('selected');
  const d=DESTINATIONS.find(x=>x.id===id);
  showToast(`${d.emoji} ${d.name} selected`);
  setTimeout(()=>goStep(2),450);
}

// ===== ROUTE =====
function buildRouteGrid(){
  document.getElementById('route-big-grid').innerHTML=ROUTES.map(r=>`
    <div class="route-card" id="rc-${r.id}" onclick="selectRoute('${r.id}')">
      <span class="rc-ico">${r.icon}</span>
      <h4>${r.name}</h4>
      <p>${r.desc}</p>
    </div>`).join('');
}
function selectRoute(id){
  S.route=id;
  document.querySelectorAll('.route-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('rc-'+id)?.classList.add('selected');
  const route=ROUTES.find(r=>r.id===id);
  const box=document.getElementById('route-detail');
  box.innerHTML=`<h4>${route.icon} ${route.name} — Travel Details</h4>
    <div class="rd-grid">${route.fields.map(f=>`
      <div class="rd-group">
        <label>${f.label}</label>
        ${f.type==='select'
          ?`<select id="rf-${f.id}">${f.options.map(o=>`<option>${o}</option>`).join('')}</select>`
          :`<input type="text" id="rf-${f.id}" placeholder="${f.placeholder||''}"/>`}
      </div>`).join('')}
    </div>
    <button class="btn-pop" onclick="confirmRoute('${id}')">Confirm Route ✦</button>`;
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function confirmRoute(id){
  const r=ROUTES.find(x=>x.id===id);
  r.fields.forEach(f=>{S.routeDetails[f.id]=document.getElementById('rf-'+f.id)?.value||'';});
  showToast('Route confirmed');goStep(3);
}

// ===== DURATION =====
function chDays(d){
  S.days=Math.max(1,Math.min(14,S.days+d));
  document.getElementById('days-n').textContent=S.days;
  document.getElementById('days-slider').value=S.days;
  updateReturn();
}
function sliderDays(v){
  S.days=parseInt(v);
  document.getElementById('days-n').textContent=S.days;
  updateReturn();
}
function setDays(n){
  S.days=n;document.getElementById('days-n').textContent=n;
  document.getElementById('days-slider').value=n;
  document.querySelectorAll('.dpreset').forEach(b=>b.classList.remove('sel'));
  updateReturn();
}
function chTeam(d){
  S.teamSize=Math.max(1,Math.min(500,S.teamSize+d));
  document.getElementById('team-n').textContent=S.teamSize;
}
function setDefaultDate(){
  const d=new Date();d.setDate(d.getDate()+14);
  document.getElementById('start-date').value=d.toISOString().split('T')[0];
  document.getElementById('start-date').addEventListener('change',updateReturn);
  updateReturn();
}
function updateReturn(){
  const v=document.getElementById('start-date')?.value;
  if(!v)return;
  const end=new Date(v);end.setDate(end.getDate()+S.days-1);
  document.getElementById('return-label').textContent=
    `↩ Return: ${end.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}`;
}

// ===== DAY PLANNER =====
function buildDayPlanner(){
  S.startDate=document.getElementById('start-date').value;
  const dest=DESTINATIONS.find(d=>d.id===S.dest);
  const acts=ACTIVITIES[S.dest]||[];
  const food=FOOD[S.dest]||DEFAULT_FOOD;
  const strip=document.getElementById('day-chips');
  const panels=document.getElementById('day-panels');
  strip.innerHTML='';panels.innerHTML='';
  for(let i=1;i<=S.days;i++){
    if(!S.dayPlans[i])S.dayPlans[i]={stay:null,tier:'midrange',acts:[],breakfast:null,lunch:null,dinner:null,notes:''};
    const chip=document.createElement('button');
    chip.className='day-chip'+(i===1?' active':'');
    chip.innerHTML=`Day ${i}`;chip.onclick=()=>switchDay(i);
    strip.appendChild(chip);
    const panel=document.createElement('div');
    panel.id='day-panel-'+i;panel.className='day-panel'+(i===1?' active':'');
    panel.innerHTML=buildDayHTML(i,dest,acts,food);
    panels.appendChild(panel);
  }
}
function buildDayHTML(i,dest,acts,food){
  const p=S.dayPlans[i];
  return `<div class="dp-card">
    <div class="dp-top">
      <div class="dp-daynum">${i}</div>
      <div><h3>${dest?dest.emoji+' '+dest.name:'Day'} — Day ${i}</h3><small>${getDateStr(i)}</small></div>
    </div>
    <div class="dp-sec">🏨 Accommodation</div>
    <div class="tier-row">
      ${['budget','midrange','luxury'].map(t=>`<button class="tier-btn${p.tier===t?' sel':''}" onclick="setTier(${i},'${t}',this)">${t==='budget'?'Budget 💰':t==='midrange'?'Mid-Range 🌟':'Luxury 👑'}</button>`).join('')}
    </div>
    <div class="opts-grid" id="stay-grid-${i}">${buildStayOpts(i,p.tier)}</div>
    <div class="dp-sec">🎯 Activities</div>
    <div class="acts-grid">${acts.map((a,idx)=>`
      <div class="act-card${p.acts.includes(idx)?' sel':''}" id="ac-${i}-${idx}" onclick="toggleAct(${i},${idx})">
        <div class="ai">${a.icon}</div><h5>${a.name}</h5><p>${a.desc}</p>
      </div>`).join('')}
    </div>
    <div class="dp-sec">🍽️ Food Menu</div>
    <div class="meal-lbl">🌅 Breakfast</div>
    <div class="food-grid">${food.breakfast.map((f,idx)=>`
      <div class="food-card${p.breakfast===idx?' sel':''}" id="fb-${i}-${idx}" onclick="pickFood(${i},'breakfast',${idx})">
        <div class="fi">${f.icon}</div><div class="fn">${f.name}</div><div class="fd">${f.desc}</div>
      </div>`).join('')}</div>
    <div class="meal-lbl">☀️ Lunch</div>
    <div class="food-grid">${food.lunch.map((f,idx)=>`
      <div class="food-card${p.lunch===idx?' sel':''}" id="fl-${i}-${idx}" onclick="pickFood(${i},'lunch',${idx})">
        <div class="fi">${f.icon}</div><div class="fn">${f.name}</div><div class="fd">${f.desc}</div>
      </div>`).join('')}</div>
    <div class="meal-lbl">🌙 Dinner</div>
    <div class="food-grid">${food.dinner.map((f,idx)=>`
      <div class="food-card${p.dinner===idx?' sel':''}" id="fd-${i}-${idx}" onclick="pickFood(${i},'dinner',${idx})">
        <div class="fi">${f.icon}</div><div class="fn">${f.name}</div><div class="fd">${f.desc}</div>
      </div>`).join('')}</div>
    <div class="dp-sec">📝 Notes</div>
    <textarea class="notes-ta" id="nt-${i}" placeholder="Any special instructions for this day..." onchange="S.dayPlans[${i}].notes=this.value">${p.notes}</textarea>
  </div>`;
}
function buildStayOpts(day,tier){
  return (STAY[tier]||STAY.midrange).map(s=>`
    <div class="opt-card${S.dayPlans[day].stay===s.id?' sel':''}" id="so-${day}-${s.id}" onclick="pickStay(${day},'${s.id}')">
      <div class="oi">${s.icon}</div><h5>${s.name}</h5><p>${s.desc}</p><div class="op">${s.price}</div>
    </div>`).join('');
}
function setTier(day,tier,btn){
  S.dayPlans[day].tier=tier;S.dayPlans[day].stay=null;
  btn.closest('.dp-card').querySelectorAll('.tier-btn').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  document.getElementById('stay-grid-'+day).innerHTML=buildStayOpts(day,tier);
}
function pickStay(day,id){
  S.dayPlans[day].stay=id;
  document.querySelectorAll(`[id^="so-${day}-"]`).forEach(e=>e.classList.remove('sel'));
  document.getElementById(`so-${day}-${id}`)?.classList.add('sel');
  document.querySelectorAll('.day-chip')[day-1]?.classList.add('done');
}
function toggleAct(day,idx){
  const a=S.dayPlans[day].acts,p=a.indexOf(idx);
  if(p===-1)a.push(idx);else a.splice(p,1);
  document.getElementById(`ac-${day}-${idx}`)?.classList.toggle('sel',a.includes(idx));
}
function pickFood(day,meal,idx){
  S.dayPlans[day][meal]=idx;
  const pre=meal==='breakfast'?'fb':meal==='lunch'?'fl':'fd';
  document.querySelectorAll(`[id^="${pre}-${day}-"]`).forEach(e=>e.classList.remove('sel'));
  document.getElementById(`${pre}-${day}-${idx}`)?.classList.add('sel');
}
function switchDay(i){
  document.querySelectorAll('.day-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.day-chip').forEach(c=>c.classList.remove('active'));
  document.getElementById('day-panel-'+i)?.classList.add('active');
  document.querySelectorAll('.day-chip')[i-1]?.classList.add('active');
}
function getDateStr(day){
  if(!S.startDate)return '';
  const d=new Date(S.startDate);d.setDate(d.getDate()+day-1);
  return d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

// ===== JOURNEY MAP =====
function buildJourneyMap(){
  const dest=DESTINATIONS.find(d=>d.id===S.dest);
  const route=ROUTES.find(r=>r.id===S.route);
  const food=FOOD[S.dest]||DEFAULT_FOOD;
  const acts=ACTIVITIES[S.dest]||[];
  const dayW=100;const pad=40;const totalW=Math.max(600,S.days*dayW+pad*2);
  const H=280;
  let nodes=[];
  for(let i=1;i<=S.days;i++){
    const p=S.dayPlans[i]||{};
    const stayOpts=STAY[p.tier||'midrange']||STAY.midrange;
    const stay=stayOpts.find(s=>s.id===p.stay);
    const actList=(p.acts||[]).map(idx=>acts[idx]?.name).filter(Boolean);
    const bf=p.breakfast!=null?food.breakfast[p.breakfast]:null;
    nodes.push({day:i,x:pad+(i-1)*dayW+dayW/2,stay,acts:actList,bf,date:getDateStr(i),p});
  }
  // Use refined colours
  const palette=['#4338ca','#c8973a','#0c8c7a','#2563eb','#6d28d9','#0891b2','#7c3aed'];
  const svgLines=nodes.slice(1).map((n,i)=>{
    const prev=nodes[i];
    return `<line x1="${prev.x}" y1="90" x2="${n.x}" y2="90" stroke="#dde3ed" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  }).join('');
  const svgNodes=nodes.map(n=>{
    const col=palette[(n.day-1)%palette.length];
    const stayTxt=n.stay?n.stay.name.split('/')[0].trim():'No stay';
    const actsTxt=n.acts.length?n.acts.slice(0,2).join(', ')+(n.acts.length>2?'…':''):'Free day';
    const bfTxt=n.bf?n.bf.name:'—';
    return `<g>
      <circle cx="${n.x}" cy="90" r="22" fill="${col}" opacity="0.1" stroke="${col}" stroke-width="1.5"/>
      <circle cx="${n.x}" cy="90" r="13" fill="${col}"/>
      <text x="${n.x}" y="94" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="Outfit,sans-serif">D${n.day}</text>
      <text x="${n.x}" y="132" text-anchor="middle" fill="#364156" font-size="9" font-weight="600" font-family="Outfit,sans-serif">${stayTxt.length>12?stayTxt.slice(0,12)+'…':stayTxt}</text>
      <text x="${n.x}" y="148" text-anchor="middle" fill="#718096" font-size="8" font-family="Outfit,sans-serif">${actsTxt.length>16?actsTxt.slice(0,16)+'…':actsTxt}</text>
      <text x="${n.x}" y="164" text-anchor="middle" fill="${col}" font-size="8" font-family="Outfit,sans-serif">${bfTxt.length>14?bfTxt.slice(0,14)+'…':bfTxt}</text>
      <line x1="${n.x}" y1="112" x2="${n.x}" y2="120" stroke="${col}" stroke-width="1" stroke-dasharray="2 2"/>
    </g>`;
  }).join('');
  const startX=20;const endX=totalW-20;
  const routeIcon=route?route.icon:'🚗';
  const destEmoji=dest?dest.emoji:'📍';
  const svg=`<svg class="jm-svg" viewBox="0 0 ${totalW} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${totalW}" height="${H}" fill="#f5f4f1" rx="10"/>
    <rect x="0" y="18" width="${totalW}" height="32" fill="#4338ca" opacity="0.05"/>
    <text x="${totalW/2}" y="40" text-anchor="middle" fill="#4338ca" font-size="11" font-weight="700" font-family="Outfit,sans-serif" letter-spacing="1">
      ${destEmoji} ${dest?dest.name:''}, ${dest?dest.state:''} — ${S.days} Day Trip ${routeIcon}
    </text>
    <text x="${startX+8}" y="95" font-size="16" text-anchor="middle">🏠</text>
    <line x1="${startX+18}" y1="90" x2="${nodes[0]?.x-22}" y2="90" stroke="#dde3ed" stroke-width="1.5" stroke-dasharray="5 4"/>
    ${svgLines}
    <line x1="${nodes[nodes.length-1]?.x+22}" y1="90" x2="${endX-18}" y2="90" stroke="#dde3ed" stroke-width="1.5" stroke-dasharray="5 4"/>
    ${svgNodes}
    <text x="${endX-8}" y="95" font-size="16" text-anchor="middle">🏠</text>
    <rect x="10" y="${H-36}" width="${totalW-20}" height="26" fill="white" rx="6" opacity="0.8"/>
    <text x="22" y="${H-19}" fill="#718096" font-size="8.5" font-family="Outfit,sans-serif">
      ● Node = Day  |  Label = Stay  |  Bottom = Breakfast  |  ${route?route.icon+' '+route.name:'Travel mode'}
    </text>
  </svg>`;
  document.getElementById('journey-map').innerHTML=svg;
}

// ===== REVIEW =====
function buildReview(){
  const dest=DESTINATIONS.find(d=>d.id===S.dest);
  const route=ROUTES.find(r=>r.id===S.route);
  const food=FOOD[S.dest]||DEFAULT_FOOD;
  const acts=ACTIVITIES[S.dest]||[];
  document.getElementById('review-header').innerHTML=`
    <div class="rhc-dest">${dest?dest.emoji+' '+dest.name:'Trip'}</div>
    <div class="rhc-meta">
      <div class="rhc-item"><small>Destination</small><span>${dest?dest.name+', '+dest.state:'—'}</span></div>
      <div class="rhc-item"><small>Start Date</small><span>${S.startDate?new Date(S.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'—'}</span></div>
      <div class="rhc-item"><small>Duration</small><span>${S.days} Days</span></div>
      <div class="rhc-item"><small>Travel</small><span>${route?route.icon+' '+route.name:'—'}</span></div>
    </div>`;
  let html='';
  const borderColors=['#4338ca','#c8973a','#0c8c7a','#2563eb','#6d28d9','#0891b2'];
  for(let i=1;i<=S.days;i++){
    const p=S.dayPlans[i]||{};
    const stayOpts=STAY[p.tier||'midrange']||STAY.midrange;
    const stay=stayOpts.find(s=>s.id===p.stay);
    const actNms=(p.acts||[]).map(idx=>acts[idx]?.name).filter(Boolean);
    const bf=p.breakfast!=null?food.breakfast[p.breakfast]:null;
    const ln=p.lunch!=null?food.lunch[p.lunch]:null;
    const dn=p.dinner!=null?food.dinner[p.dinner]:null;
    html+=`<div class="review-day-card" style="border-left-color:${borderColors[(i-1)%borderColors.length]}">
      <div class="rdc-head"><h4>Day ${i}</h4><span class="rdc-date">${getDateStr(i)}</span></div>
      <div class="tags">${stay?`<span class="rtag">${stay.icon} ${stay.name}</span>`:''}
        ${actNms.map(a=>`<span class="rtag">🎯 ${a}</span>`).join('')}
      </div>
      <div class="tags">
        ${bf?`<span class="rtag">🌅 ${bf.name}</span>`:''}
        ${ln?`<span class="rtag">☀️ ${ln.name}</span>`:''}
        ${dn?`<span class="rtag">🌙 ${dn.name}</span>`:''}
      </div>
      ${p.notes?`<div style="font-size:0.78rem;color:var(--muted);margin-top:0.4rem;font-style:italic">📝 ${p.notes}</div>`:''}
    </div>`;
  }
  document.getElementById('review-days').innerHTML=html;
}

// ===== TODAY'S UPDATE PANEL =====
function buildTodaysPanel(){
  const sel=document.getElementById('todays-day-select');
  sel.innerHTML=Array.from({length:S.days},(_,i)=>`
    <button class="tday-btn${i===0?' sel':''}" onclick="switchTodayDay(${i+1},this)">Day ${i+1}</button>`).join('');
  S.todayDay=1;
  renderTodaysMiniPanel(1);
}
function switchTodayDay(day,btn){
  S.todayDay=day;
  document.querySelectorAll('.tday-btn').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');
  renderTodaysMiniPanel(day);
}
function renderTodaysMiniPanel(day){
  if(!S.dayPlans[day])S.dayPlans[day]={stay:null,tier:'midrange',acts:[],breakfast:null,lunch:null,dinner:null,notes:''};
  const p=S.dayPlans[day];
  const dest=DESTINATIONS.find(d=>d.id===S.dest);
  const acts=ACTIVITIES[S.dest]||[];
  const food=FOOD[S.dest]||DEFAULT_FOOD;
  const stayOpts=STAY[p.tier||'midrange']||STAY.midrange;
  const currentStay=stayOpts.find(s=>s.id===p.stay);
  const currentActs=(p.acts||[]).map(i=>acts[i]?.name).filter(Boolean);
  const bf=p.breakfast!=null?food.breakfast[p.breakfast]:null;
  const ln=p.lunch!=null?food.lunch[p.lunch]:null;
  const dn=p.dinner!=null?food.dinner[p.dinner]:null;
  document.getElementById('todays-panel').innerHTML=`
    <div style="background:var(--bg);border-radius:12px;padding:1rem;font-size:0.85rem;">
      <div style="font-weight:700;color:var(--ink);margin-bottom:0.5rem">${dest?dest.emoji:''} Day ${day} — ${getDateStr(day)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div><span style="color:var(--muted);font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">🏨 Stay</span><br/>${currentStay?currentStay.name:'Not set'}</div>
        <div><span style="color:var(--muted);font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">🎯 Activities</span><br/>${currentActs.length?currentActs.join(', '):'None'}</div>
        <div><span style="color:var(--muted);font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">🍽️ Food</span><br/>${[bf?.name,ln?.name,dn?.name].filter(Boolean).join(' · ')||'Not set'}</div>
        <div><span style="color:var(--muted);font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">📝 Notes</span><br/>${p.notes||'—'}</div>
      </div>
      <div style="margin-top:0.85rem;font-size:0.72rem;color:var(--muted)">Modify today's plan in Step 4 — Day Plans, then return here to notify your team.</div>
    </div>`;
}

// ===== SEND TODAY'S UPDATE =====
async function sendTodaysUpdate(){
  const note=document.getElementById('todays-note').value.trim();
  const recipients=getAllRecipients();
  const creds=getCredentials();
  const status=document.getElementById('update-status');

  if(!creds.ok){
    status.className='update-status err';
    status.textContent='⚠️ '+creds.msg+' — Scroll down to the Send Panel to configure EmailJS.';
    return;
  }
  if(!recipients.length){
    status.className='update-status err';
    status.textContent='⚠️ No recipients. Add emails in the send panel or add employees in Profile.';
    return;
  }

  const day=S.todayDay;
  const p=S.dayPlans[day]||{};
  const dest=DESTINATIONS.find(d=>d.id===S.dest);
  const food=FOOD[S.dest]||DEFAULT_FOOD;
  const acts=ACTIVITIES[S.dest]||[];
  const stayOpts=STAY[p.tier||'midrange']||STAY.midrange;
  const stay=stayOpts.find(s=>s.id===p.stay);
  const actNms=(p.acts||[]).map(i=>acts[i]?.name).filter(Boolean);
  const bf=p.breakfast!=null?food.breakfast[p.breakfast]:null;
  const ln=p.lunch!=null?food.lunch[p.lunch]:null;
  const dn=p.dinner!=null?food.dinner[p.dinner]:null;

  const update=`📅 TODAY'S UPDATE — Day ${day} (${getDateStr(day)})\n`+
    `Destination: ${dest?dest.name:''}\n`+
    `━━━━━━━━━━━━━━━━━━━━━━━━\n`+
    `🏨 Stay: ${stay?stay.name:'Not set'}\n`+
    `🎯 Activities: ${actNms.length?actNms.join(', '):'None planned'}\n`+
    `🌅 Breakfast: ${bf?bf.name:'—'}\n`+
    `☀️ Lunch: ${ln?ln.name:'—'}\n`+
    `🌙 Dinner: ${dn?dn.name:'—'}\n`+
    (note?`\n📝 What changed: ${note}`:'');

  status.className='update-status sending';status.textContent=`Sending update to ${recipients.length} people…`;
  emailjs.init(creds.pub);
  let ok=0;
  for(const r of recipients){
    try{
      await emailjs.send(creds.svc,creds.tpl,{
        to_name:r.name||r.email.split('@')[0],to_email:r.email,
        from_name:S.company.name||'TripMate',
        destination:dest?dest.name:'—',
        duration:'Day '+day+' Update',
        start_date:getDateStr(day),
        travel_mode:'Daily Update',
        trip_plan:update,
        reply_to:S.company.email||''
      });ok++;
    }catch(e){console.error(e);}
  }
  if(ok>0){status.className='update-status ok';status.textContent=`Update sent to ${ok} people`;}
  else{status.className='update-status err';status.textContent='Failed to send. Check EmailJS credentials.';}
}

// ===== EMAIL PILLS =====
function addEmail(){
  const input=document.getElementById('new-email');
  const email=input.value.trim();
  if(!email||!email.includes('@')){showToast('Enter a valid email');return;}
  if(S.recipients.find(r=>r.email===email)){showToast('Already added');return;}
  const emp=S.employees.find(e=>e.email===email);
  const name=emp?emp.name:email.split('@')[0];
  S.recipients.push({email,name});
  input.value='';
  renderEmailPills();
  showToast(`${name} added`);
}
function removeRecipient(email){
  S.recipients=S.recipients.filter(r=>r.email!==email);
  renderEmailPills();
}
function renderEmailPills(){
  const el=document.getElementById('email-pills');
  if(!S.recipients.length){el.innerHTML=`<span style="font-size:0.8rem;color:var(--muted);padding:0.3rem 0">No recipients yet. Add emails above.</span>`;return;}
  el.innerHTML=S.recipients.map(r=>`
    <span class="epill">✉️ ${r.name} <button onclick="removeRecipient('${r.email}')" title="Remove">✕</button></span>`).join('');
}
function getAllRecipients(){
  const all=[...S.recipients];
  S.employees.forEach(e=>{if(!all.find(r=>r.email===e.email))all.push(e);});
  return all;
}

// ===== EMAILJS SETUP PANEL =====

// Load saved credentials from localStorage on boot
function loadEjsCredentials(){
  const saved=JSON.parse(localStorage.getItem('tm_ejs')||'null');
  if(!saved)return;
  document.getElementById('ejs-pubkey').value=saved.pub||'';
  document.getElementById('ejs-service').value=saved.svc||'';
  document.getElementById('ejs-template').value=saved.tpl||'';
  if(saved.pub&&saved.svc&&saved.tpl) updateEjsStatusBadge(true);
}

function toggleEjsPanel(){
  const panel=document.getElementById('ejs-panel');
  const btn=document.getElementById('ejs-toggle-btn');
  const isOpen=panel.classList.contains('open');
  if(isOpen){
    panel.classList.remove('open');
    btn.textContent='Show Setup ▾';
  } else {
    panel.classList.add('open');
    btn.textContent='Hide Setup ▴';
    liveValidateEjs();
  }
}

function updateEjsStatusBadge(isOk){
  const dot=document.getElementById('ejs-status-dot');
  const lbl=document.getElementById('ejs-status-label');
  const card=document.getElementById('ejs-setup-card');
  if(isOk){
    dot.className='ejs-status-dot ok';
    lbl.className='ejs-status-label ok';
    lbl.textContent='Configured ✓';
    card.classList.add('configured');
  } else {
    dot.className='ejs-status-dot err';
    lbl.className='ejs-status-label err';
    lbl.textContent='Not configured';
    card.classList.remove('configured');
  }
}

// Live field validation as user types
function liveValidateEjs(){
  const pub=(document.getElementById('ejs-pubkey')?.value||'').trim();
  const svc=(document.getElementById('ejs-service')?.value||'').trim();
  const tpl=(document.getElementById('ejs-template')?.value||'').trim();
  let allOk=true;

  // Public Key validation
  const pubInput=document.getElementById('ejs-pubkey');
  const pubErr=document.getElementById('err-pubkey');
  if(pub&&pub.includes('@')){
    pubInput.className='has-error';
    pubErr.textContent='⚠️ This looks like an email address. The Public Key is a random string from EmailJS → Account → General — NOT your email.';
    allOk=false;
  } else if(pub&&pub.length<8){
    pubInput.className='has-error';
    pubErr.textContent='Public Key is too short — it should be ~20 characters.';
    allOk=false;
  } else if(pub){
    pubInput.className='is-valid';
    pubErr.textContent='';
  } else {
    pubInput.className='';pubErr.textContent='';
  }

  // Service ID validation
  const svcInput=document.getElementById('ejs-service');
  const svcErr=document.getElementById('err-service');
  if(svc&&!svc.startsWith('service_')){
    svcInput.className='has-error';
    svcErr.textContent='Must start with "service_" — copy it exactly from EmailJS → Email Services.';
    allOk=false;
  } else if(svc){
    svcInput.className='is-valid';
    svcErr.textContent='';
  } else {
    svcInput.className='';svcErr.textContent='';
  }

  // Template ID validation
  const tplInput=document.getElementById('ejs-template');
  const tplErr=document.getElementById('err-template');
  if(tpl&&!tpl.startsWith('template_')){
    tplInput.className='has-error';
    tplErr.textContent='Must start with "template_" — copy it exactly from EmailJS → Email Templates.';
    allOk=false;
  } else if(tpl){
    tplInput.className='is-valid';
    tplErr.textContent='';
  } else {
    tplInput.className='';tplErr.textContent='';
  }

  return allOk;
}

function saveEjsCredentials(){
  const pub=(document.getElementById('ejs-pubkey')?.value||'').trim();
  const svc=(document.getElementById('ejs-service')?.value||'').trim();
  const tpl=(document.getElementById('ejs-template')?.value||'').trim();
  const status=document.getElementById('ejs-save-status');

  if(!pub||!svc||!tpl){
    status.className='ejs-save-status err';
    status.textContent='Fill in all 3 fields before saving.';
    return;
  }
  if(!liveValidateEjs()){
    status.className='ejs-save-status err';
    status.textContent='Fix the errors above before saving.';
    return;
  }

  localStorage.setItem('tm_ejs',JSON.stringify({pub,svc,tpl}));
  updateEjsStatusBadge(true);
  status.className='ejs-save-status ok';
  status.textContent='✓ Credentials saved to your browser. You won\'t need to enter them again.';
  showToast('EmailJS credentials saved');
}

function clearEjsCredentials(){
  localStorage.removeItem('tm_ejs');
  ['ejs-pubkey','ejs-service','ejs-template'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.value='';el.className='';}
  });
  ['err-pubkey','err-service','err-template'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.textContent='';
  });
  updateEjsStatusBadge(false);
  const status=document.getElementById('ejs-save-status');
  status.className='ejs-save-status info';
  status.textContent='Credentials cleared.';
  showToast('Credentials cleared');
}

async function testEjsConnection(){
  const pub=(document.getElementById('ejs-pubkey')?.value||'').trim();
  const svc=(document.getElementById('ejs-service')?.value||'').trim();
  const tpl=(document.getElementById('ejs-template')?.value||'').trim();
  const btn=document.getElementById('ejs-test-btn');
  const status=document.getElementById('ejs-save-status');

  if(!pub||!svc||!tpl){
    status.className='ejs-save-status err';
    status.textContent='Fill in all 3 fields to test.';
    return;
  }
  if(!liveValidateEjs()){
    status.className='ejs-save-status err';
    status.textContent='Fix the validation errors above first.';
    return;
  }

  btn.disabled=true;btn.textContent='Testing…';
  status.className='ejs-save-status testing';
  status.textContent='Sending a test email to verify your credentials…';

  try{
    emailjs.init(pub);
    // Send a test email to the HR email if available, otherwise first employee
    const testTo=S.company.email||S.employees[0]?.email||null;
    if(!testTo){
      status.className='ejs-save-status info';
      status.textContent='ℹ️ To test, first add an employee in Profile or save your HR email — then try again. Credentials look correctly formatted.';
      btn.disabled=false;btn.textContent='🔌 Test Connection';
      return;
    }
    await emailjs.send(svc,tpl,{
      to_name:'TripMate Test',
      to_email:testTo,
      from_name:'TripMate',
      destination:'Test Destination',
      duration:'Test',
      start_date:'Test',
      travel_mode:'Test',
      trip_plan:'This is a test email from TripMate to verify your EmailJS credentials are working correctly.',
      reply_to:''
    });
    status.className='ejs-save-status ok';
    status.textContent=`✓ Test email sent to ${testTo}. Check that inbox — your credentials are working!`;
    updateEjsStatusBadge(true);
    localStorage.setItem('tm_ejs',JSON.stringify({pub,svc,tpl}));
  }catch(e){
    const raw=e?.text||e?.message||String(e);
    let hint='';
    const low=raw.toLowerCase();
    if(low.includes('invalid user')||low.includes('public key')){
      hint='Public Key is wrong — go to emailjs.com → Account → General → copy the "Public Key" field.';
    } else if(low.includes('service')){
      hint='Service ID not found — verify the ID in emailjs.com → Email Services.';
    } else if(low.includes('template')){
      hint='Template ID not found — verify the ID in emailjs.com → Email Templates.';
    } else if(low.includes('network')||low.includes('failed to fetch')){
      hint='Network error — check your internet connection.';
    } else {
      hint=`EmailJS error: "${raw.slice(0,120)}"`;
    }
    status.className='ejs-save-status err';
    status.textContent='✕ Test failed. '+hint;
    updateEjsStatusBadge(false);
    console.error('EmailJS test error:',e);
  }
  btn.disabled=false;btn.textContent='🔌 Test Connection';
}

// ===== CREDENTIALS HELPER =====
function getCredentials(){
  // First try the input fields, then fall back to localStorage
  let pub=(document.getElementById('ejs-pubkey')?.value||'').trim();
  let svc=(document.getElementById('ejs-service')?.value||'').trim();
  let tpl=(document.getElementById('ejs-template')?.value||'').trim();

  // If fields are empty, try localStorage
  if(!pub||!svc||!tpl){
    const saved=JSON.parse(localStorage.getItem('tm_ejs')||'null');
    if(saved){pub=pub||saved.pub;svc=svc||saved.svc;tpl=tpl||saved.tpl;}
  }

  if(!pub&&!svc&&!tpl){
    return{ok:false,msg:'EmailJS is not configured yet. Click "Show Setup ▾" in the configuration section above and fill in your credentials.'};
  }
  if(!pub){return{ok:false,msg:'Public Key is missing. Find it at emailjs.com → Account → General.'};}
  if(pub.includes('@')){return{ok:false,msg:'Public Key cannot be an email address. It is a random string like "aBcDeFgH123" found at emailjs.com → Account → General.'};}
  if(!svc){return{ok:false,msg:'Service ID is missing. Find it at emailjs.com → Email Services.'};}
  if(!svc.startsWith('service_')){return{ok:false,msg:`Service ID must start with "service_" — you entered "${svc}". Copy it exactly from emailjs.com → Email Services.`};}
  if(!tpl){return{ok:false,msg:'Template ID is missing. Find it at emailjs.com → Email Templates.'};}
  if(!tpl.startsWith('template_')){return{ok:false,msg:`Template ID must start with "template_" — you entered "${tpl}". Copy it exactly from emailjs.com → Email Templates.`};}

  return{ok:true,pub,svc,tpl};
}

// ===== SEND EMAILS =====
async function sendEmails(){
  const creds=getCredentials();
  const recipients=getAllRecipients();
  const fb=document.getElementById('send-status');
  const btn=document.getElementById('send-lbl');

  if(!creds.ok){
    fb.className='send-status err';
    fb.textContent='⚠️ '+creds.msg;
    // Auto-open setup panel to help user fix it
    const panel=document.getElementById('ejs-panel');
    const toggleBtn=document.getElementById('ejs-toggle-btn');
    if(!panel.classList.contains('open')){
      panel.classList.add('open');
      toggleBtn.textContent='Hide Setup ▴';
    }
    return;
  }
  if(!recipients.length){
    fb.className='send-status err';
    fb.textContent='⚠️ No recipients. Add email addresses in the Recipients section above, or add employees in Profile.';
    return;
  }

  const dest=DESTINATIONS.find(d=>d.id===S.dest);
  const route=ROUTES.find(r=>r.id===S.route);
  const food=FOOD[S.dest]||DEFAULT_FOOD;
  const acts=ACTIVITIES[S.dest]||[];
  let plan=`TRIPMATE — CORPORATE TRIP PLAN\n${'═'.repeat(40)}\n`;
  plan+=`Company: ${S.company.name||'Your Company'}\n`;
  plan+=`📍 Destination: ${dest?dest.name+', '+dest.state:'—'}\n`;
  plan+=`✈️ Travel: ${route?route.name:'—'}\n`;
  plan+=`📅 Start: ${S.startDate?new Date(S.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'—'}\n`;
  plan+=`⏱️ Duration: ${S.days} Days\n\n`;
  for(let i=1;i<=S.days;i++){
    const p=S.dayPlans[i]||{};
    const stayOpts=STAY[p.tier||'midrange']||STAY.midrange;
    const stay=stayOpts.find(s=>s.id===p.stay);
    const actNms=(p.acts||[]).map(idx=>acts[idx]?.name).filter(Boolean);
    const bf=p.breakfast!=null?food.breakfast[p.breakfast]:null;
    const ln=p.lunch!=null?food.lunch[p.lunch]:null;
    const dn=p.dinner!=null?food.dinner[p.dinner]:null;
    plan+=`── Day ${i}: ${getDateStr(i)} ──\n`;
    plan+=`🏨 Stay: ${stay?stay.name+' ('+stay.price+')':'Not selected'}\n`;
    plan+=`🎯 Activities: ${actNms.length?actNms.join(', '):'None'}\n`;
    plan+=`🌅 Breakfast: ${bf?bf.name:'—'} | ☀️ Lunch: ${ln?ln.name:'—'} | 🌙 Dinner: ${dn?dn.name:'—'}\n`;
    if(p.notes)plan+=`📝 ${p.notes}\n`;
    plan+='\n';
  }

  try{ emailjs.init(creds.pub); }
  catch(e){ fb.className='send-status err';fb.textContent='⚠️ Failed to initialise EmailJS. Check your Public Key.';return; }

  fb.className='send-status sending';
  fb.textContent=`Sending to ${recipients.length} recipient${recipients.length>1?'s':''}…`;
  btn.textContent='Sending…';
  document.getElementById('send-btn').disabled=true;

  let ok=0,fail=0,lastErr='';
  for(const r of recipients){
    try{
      await emailjs.send(creds.svc,creds.tpl,{
        to_name:r.name||r.email.split('@')[0],
        to_email:r.email,
        from_name:S.company.name||'TripMate',
        destination:dest?dest.name+', '+dest.state:'—',
        duration:S.days+' Days',
        start_date:S.startDate?new Date(S.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'—',
        travel_mode:route?route.name:'—',
        trip_plan:plan,
        reply_to:S.company.email||''
      });
      ok++;
    }catch(e){
      lastErr=e?.text||e?.message||String(e);
      fail++;
      console.error('Send error for',r.email,e);
    }
  }

  document.getElementById('send-btn').disabled=false;
  btn.textContent='Send Plan to Everyone';

  if(fail===0){
    fb.className='send-status ok';
    fb.innerHTML=`✓ Plan sent to all <strong>${ok}</strong> ${ok===1?'person':'people'}. Ask them to check their inbox (and spam folder).`;
    launchConfetti();
    const saved={id:Date.now(),dest:dest?dest.name:'Unknown',days:S.days,startDate:S.startDate,sentTo:ok,date:new Date().toLocaleDateString('en-IN')};
    S.plans.unshift(saved);
    localStorage.setItem('tm_plans',JSON.stringify(S.plans.slice(0,20)));
    updateStats();loadPlans();
    // Also auto-save credentials on a successful send
    localStorage.setItem('tm_ejs',JSON.stringify({pub:creds.pub,svc:creds.svc,tpl:creds.tpl}));
  } else if(ok===0){
    const low=lastErr.toLowerCase();
    let hint='';
    if(low.includes('invalid user')||low.includes('public key')){
      hint='Your Public Key is invalid. This is NOT your email address — go to emailjs.com → Account → General and copy the "Public Key" value.';
    } else if(low.includes('service')){
      hint='Service ID not found. Verify it at emailjs.com → Email Services.';
    } else if(low.includes('template')){
      hint='Template ID not found. Verify it at emailjs.com → Email Templates.';
    } else if(low.includes('network')||low.includes('failed to fetch')){
      hint='Network error. Check your internet connection and try again.';
    } else {
      hint=`Error: "${lastErr.slice(0,120)}" — Check the browser console for details.`;
    }
    fb.className='send-status err';
    fb.innerHTML=`⚠️ All ${fail} failed.<br/><strong>Reason:</strong> ${hint}`;
    updateEjsStatusBadge(false);
  } else {
    fb.className='send-status err';
    fb.textContent=`⚠️ Partially sent: ${ok} succeeded, ${fail} failed. Check the browser console for details.`;
  }
}

// ===== PROFILE =====
function saveProfile(){
  S.company={name:document.getElementById('comp-name').value,industry:document.getElementById('comp-industry').value,email:document.getElementById('comp-email').value,city:document.getElementById('comp-city').value};
  localStorage.setItem('tm_company',JSON.stringify(S.company));
  const init=(S.company.name||'TC').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('co-ava').textContent=init;
  showToast('Profile saved');
}
function loadProfile(){
  const c=S.company;
  if(c.name)document.getElementById('comp-name').value=c.name;
  if(c.industry)document.getElementById('comp-industry').value=c.industry;
  if(c.email)document.getElementById('comp-email').value=c.email;
  if(c.city)document.getElementById('comp-city').value=c.city;
  const init=(c.name||'TC').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('co-ava').textContent=init;
}
function addEmployee(){
  const name=document.getElementById('emp-name').value.trim();
  const email=document.getElementById('emp-email').value.trim();
  if(!name||!email){showToast('Enter name and email');return;}
  if(!email.includes('@')){showToast('Invalid email');return;}
  S.employees.push({name,email});
  localStorage.setItem('tm_employees',JSON.stringify(S.employees));
  document.getElementById('emp-name').value='';document.getElementById('emp-email').value='';
  loadEmpList();updateStats();
  showToast(`${name} added`);
}
function removeEmployee(i){
  S.employees.splice(i,1);
  localStorage.setItem('tm_employees',JSON.stringify(S.employees));
  loadEmpList();updateStats();
}
function loadEmpList(){
  const el=document.getElementById('emp-list');
  if(!S.employees.length){el.innerHTML=`<p style="font-size:0.82rem;color:var(--muted);text-align:center;padding:1.5rem">No employees yet. Add some above.</p>`;return;}
  el.innerHTML=S.employees.map((e,i)=>`
    <div class="emp-item">
      <div class="emp-info"><strong>${e.name}</strong><span>${e.email}</span></div>
      <button class="emp-del" onclick="removeEmployee(${i})">✕</button>
    </div>`).join('');
}
function updateStats(){
  document.getElementById('ps-emp').textContent=S.employees.length;
  document.getElementById('ps-plans').textContent=S.plans.length;
}

// ===== MY PLANS =====
function loadPlans(){
  const el=document.getElementById('plans-list');if(!el)return;
  if(!S.plans.length){el.innerHTML=`<div class="empty-wrap"><span class="em-ico">🗺️</span><p>No plans yet. Start planning your first corporate trip.</p></div>`;return;}
  el.innerHTML=S.plans.map(p=>`
    <div class="plan-card">
      <div class="plan-card-dest">${DESTINATIONS.find(d=>d.name===p.dest)?.emoji||'✈️'} ${p.dest}</div>
      <div class="plan-card-meta">
        ${p.days} days · ${p.startDate?new Date(p.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—'}<br/>
        Sent to ${p.sentTo} people · ${p.date}
      </div>
      <span class="plan-card-badge">Sent</span>
    </div>`).join('');
}

// ===== CONFETTI =====
function launchConfetti(){
  const canvas=document.getElementById('confetti-canvas');
  canvas.style.display='block';
  const ctx=canvas.getContext('2d');
  canvas.width=innerWidth;canvas.height=innerHeight;
  // Refined colour palette
  const colors=['#4338ca','#c8973a','#0c8c7a','#2563eb','#6d28d9','#e8b86d','#a5b4fc'];
  const pieces=Array.from({length:160},()=>({
    x:Math.random()*canvas.width,y:-20,
    w:4+Math.random()*6,h:6+Math.random()*9,
    rot:Math.random()*360,
    color:colors[Math.floor(Math.random()*colors.length)],
    vx:(Math.random()-0.5)*3.5,vy:1.8+Math.random()*2.5,
    vr:1.5+Math.random()*3,life:1
  }));
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=false;
    pieces.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.life-=0.006;
      if(p.life>0&&p.y<canvas.height){
        alive=true;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
      }
    });
    if(alive)requestAnimationFrame(draw);
    else{ctx.clearRect(0,0,canvas.width,canvas.height);canvas.style.display='none';}
  }
  draw();
  showToast('Plan sent successfully');
}

// ===== TOAST =====
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(window._tt);window._tt=setTimeout(()=>t.classList.remove('show'),3000);
}
