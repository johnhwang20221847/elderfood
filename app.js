const KEY = "caq_total_v1";
const state = {
  tab: "home",
  total: load(),
  answers: {},
  qIndex: 0,
  selectedFood: null,
  selectedStage: 1,
  cam: "idle",
  recog: null,
  conf: 0,
};

function load(){ const v = localStorage.getItem(KEY); return v==null?null:parseInt(v,10); }
function save(t){ localStorage.setItem(KEY, String(t)); }
function curStage(){ return state.total==null ? null : stageFor(state.total); }

const app = document.getElementById("app");
const stageBadge = document.getElementById("stageBadge");

function setTab(t){
  state.tab = t;
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===t));
  render();
}
document.querySelectorAll(".tab").forEach(b=> b.onclick = ()=> setTab(b.dataset.tab));

function render(){
  const s = curStage();
  stageBadge.textContent = s ? STAGE_INFO[s].title.split(" · ")[0] : "평가 전";
  if(state.tab==="home") renderHome();
  else if(state.tab==="camera") renderCamera();
  else if(state.tab==="foods") state.selectedFood ? renderFoodDetail() : renderFoodList();
  else if(state.tab==="assess") renderAssess();
  window.scrollTo(0,0);
}

function stageCardHTML(info){
  return `<div class="card">
    <div style="display:flex;align-items:center">
      <span class="dot" style="background:${info.color}"></span>
      <strong style="font-size:21px;color:var(--navy)">${info.title}</strong>
      <span style="margin-left:auto;font-size:13px;font-weight:700;color:${info.color};background:rgba(0,0,0,.04);padding:5px 10px;border-radius:14px">${info.mode}</span>
    </div>
    <p class="sub" style="margin-top:8px">${info.summary}</p>
    <div class="divider"></div>
    <div class="row"><span class="k">권장 형태</span><span class="v">${info.form}</span></div>
    <div class="row"><span class="k">음식 크기</span><span class="v">${info.size}</span></div>
    <div class="row"><span class="k">물성 기준</span><span class="v">${info.hardness}</span></div>
  </div>`;
}

function renderHome(){
  const s = curStage();
  let html = `<h1>고령자 식품 안전</h1>
    <p class="sub">저작능력에 맞춰 안전하게 먹을 수 있는\n음식 크기·형태·조리법을 안내합니다.</p>`;
  if(s){ html += stageCardHTML(STAGE_INFO[s]); }
  else {
    html += `<div class="card">
      <strong style="color:var(--danger);font-size:18px">⚠ 저작능력 평가가 필요합니다</strong>
      <p class="sub" style="margin:10px 0">먼저 15문항 자가 평가를 완료하면\n나에게 맞는 손질 기준이 적용됩니다.</p>
      <button class="btn btn-primary" onclick="goAssessStart()">평가 시작하기</button>
    </div>`;
  }
  html += `<h2>빠른 손질 안내</h2>`;
  FOODS.forEach((f,i)=>{
    html += `<div class="card food-item" onclick="openFood(${i})">
      <span class="emoji">${f.emoji}</span>
      <div><div class="name">${f.name}</div><div class="cat">${f.cat}</div></div>
      <span class="arrow">›</span></div>`;
  });
  app.innerHTML = html;
}

function renderFoodList(){
  let html = `<h1>손질 안내</h1>`;
  FOODS.forEach((f,i)=>{
    html += `<div class="card food-item" onclick="openFood(${i})">
      <span class="emoji">${f.emoji}</span>
      <div><div class="name">${f.name}</div><div class="cat">${f.cat}</div></div>
      <span class="arrow">›</span></div>`;
  });
  app.innerHTML = html;
}

function openFood(i){
  state.selectedFood = i;
  const s = curStage();
  state.selectedStage = s || 1;
  setTab("foods");
}

function renderFoodDetail(){
  const f = FOODS[state.selectedFood];
  const s = curStage();
  const st = state.selectedStage;
  const info = STAGE_INFO[st];
  const g = f.guides[st];
  let html = `<button class="btn-ghost" style="text-align:left;padding:0 0 10px" onclick="backToList()">‹ 목록</button>
    <h1>${f.emoji} ${f.name}</h1>`;
  if(s) html += `<p style="color:var(--safe);font-weight:700;font-size:15px">✓ 내 저작 단계: ${s}단계 기준으로 표시 중</p>`;
  html += `<div class="seg">` + [1,2,3,4].map(n=>
      `<button class="${n===st?'on':''}" onclick="setFoodStage(${n})">${n}단계</button>`).join("") + `</div>`;
  html += `<div class="card">
    <div style="display:flex;align-items:center">
      <span class="dot" style="background:${info.color}"></span>
      <strong style="font-size:20px;color:var(--navy)">${info.title}</strong>
    </div>
    <p style="color:${info.color};font-weight:700;font-size:13px;margin-top:4px">${info.hardness}</p>
    <div class="divider"></div>
    ${guideRow("✂️ 썰기/형태", g.cut)}
    ${guideRow("📏 크기/두께", g.size)}
    ${guideRow("🍳 조리법", g.cook)}
    ${guideRow("✅ 확인 기준", g.check)}
    ${g.caution? guideRow("⚠️ 주의/활용", g.caution):""}
  </div>
  <p class="note">출처: KS H 4897 고령친화식품 표준 · 일본 UDF(유니버설디자인푸드) 구분표 물성·크기 기준</p>`;
  app.innerHTML = html;
}
function guideRow(label,text){ return `<div class="guide-block"><div class="label">${label}</div><div class="text">${text}</div></div>`; }
function setFoodStage(n){ state.selectedStage=n; render(); }
function backToList(){ state.selectedFood=null; render(); }

// ===== 재료 촬영 (데모 시뮬레이션) =====
function renderCamera(){
  const s = curStage();
  let frame = "";
  if(state.cam==="idle") frame = `<div class="big">📷</div><div class="sub" style="text-align:center">재료를 촬영하면\n무엇인지 인식해 드려요</div>`;
  else if(state.cam==="analyzing") frame = `<div class="spinner"></div><div style="font-weight:800;color:var(--navy)">재료 분석 중...</div><div class="note">인식 → 단계 매칭 → 손질 안내</div>`;
  else if(state.cam==="done" && state.recog!=null){
    const f = FOODS[state.recog];
    const ok = state.conf>=70;
    frame = `<div class="big">${f.emoji}</div><div style="font-size:26px;font-weight:800;color:var(--navy)">${f.name}</div>
      <div class="conf" style="color:${ok?'var(--safe)':'var(--warn)'}">인식 확신도 ${state.conf}%</div>`;
  } else if(state.cam==="failed") frame = `<div class="big">⚠️</div><div style="font-weight:800;color:var(--navy)">재료가 잘 안 보여요</div><div class="note" style="text-align:center">밝은 곳에서 한 가지 재료만\n화면 가운데 두고 다시 찍어주세요</div>`;

  let html = `<h1>재료 촬영</h1><div class="cam-frame">${frame}</div>`;
  if(state.cam==="done" && state.recog!=null){
    html += `<button class="btn btn-primary" style="margin-bottom:10px" onclick="openFood(${state.recog})">${s?s+'단계':'내 단계'} 손질 안내 보기</button>`;
  }
  html += `<button class="btn btn-navy" onclick="simulate()">${state.cam==="idle"?"📷 재료 촬영":"다시 찍기"}</button>`;
  if(!s) html += `<p class="note" style="color:var(--warn)">※ 먼저 저작능력 평가를 완료하면 더 정확한 안내가 제공됩니다.</p>`;
  html += `<p class="note">실제 배포 시 이 화면은 카메라 + AI 인식 모델(TensorFlow.js / 서버 추론)로 연결됩니다. 현재는 동작 흐름 데모입니다.</p>`;
  app.innerHTML = html;
}
function simulate(){
  state.cam="analyzing"; state.recog=null; render();
  setTimeout(()=>{
    state.recog = Math.floor(Math.random()*FOODS.length);
    state.conf = 72 + Math.floor(Math.random()*25);
    state.cam = "done";
    if(navigator.vibrate) navigator.vibrate(40);
    render();
  }, 1400);
}

// ===== 저작 평가 =====
function goAssessStart(){ state.answers={}; state.qIndex=0; state.assessMode="quiz"; setTab("assess"); }
function renderAssess(){
  const s = curStage();
  if(state.assessMode==="quiz"){ renderQuiz(); return; }
  if(state.assessMode==="result"){ renderResult(); return; }
  let html = `<h1>저작능력 자가 평가</h1><p class="sub">CAQ-SE v1.0 · 15문항 · 5개 영역</p>`;
  if(s) html += stageCardHTML(STAGE_INFO[s]);
  html += `<button class="btn btn-primary" onclick="goAssessStart()">${s?"다시 평가하기":"평가 시작하기"}</button>
    <p class="note">※ 본 평가는 의료 진단을 대체하지 않습니다. 전문 평가가 필요하면 치과·재활의학과 전문의와 상담하세요.</p>`;
  app.innerHTML = html;
}
function renderQuiz(){
  const q = QUESTIONS[state.qIndex];
  const pct = (state.qIndex/QUESTIONS.length)*100;
  let html = `<div class="progress"><span style="width:${pct}%"></span></div>
    <div class="qmeta">${state.qIndex+1} / ${QUESTIONS.length} · ${DOMAINS[q.dom].label}</div>
    <div class="qtext">${q.text}</div>`;
  q.choices.forEach(([text,score])=>{
    const on = state.answers[q.id]===score;
    html += `<div class="choice ${on?'on':''}" onclick="pick(${q.id},${score})">
      <span>${text}</span>${on?'<span class="ck">✓</span>':''}</div>`;
  });
  if(state.qIndex>0) html += `<button class="btn-ghost" style="margin-top:10px" onclick="prevQ()">‹ 이전</button>`;
  app.innerHTML = html;
}
function pick(id,score){
  state.answers[id]=score;
  if(state.qIndex < QUESTIONS.length-1){ state.qIndex++; render(); }
  else { state.total = totalScore(state.answers); save(state.total); state.assessMode="result"; render(); }
}
function prevQ(){ if(state.qIndex>0){ state.qIndex--; render(); } }
function renderResult(){
  const t = state.total, s = stageFor(t), info = STAGE_INFO[s];
  let html = `<div class="card">
    <div class="result-score" style="color:${info.color}">${t}점</div>
    <div class="result-stage">${info.title}</div></div>`;
  html += stageCardHTML(info);
  html += `<h2>영역별 분석</h2>`;
  Object.keys(DOMAINS).forEach(d=>{
    const got = domainScore(d, state.answers), max = DOMAINS[d].max, p = Math.round(got/max*100);
    const weak = p<50;
    html += `<div class="card">
      <div class="dom-head"><span>${DOMAINS[d].label}</span><span style="color:var(--textS);font-weight:600">${got}/${max} · ${p}%</span></div>
      <div class="bar"><span style="width:${p}%;background:${weak?'var(--danger)':'var(--teal)'}"></span></div>
      ${weak?'<div class="warn-text">⚠︎ 취약 영역 — 주의가 필요합니다</div>':''}</div>`;
  });
  html += `<button class="btn btn-primary" onclick="state.selectedFood=null;setTab('foods')">내 단계에 맞는 손질 안내 보기</button>`;
  app.innerHTML = html;
}

render();
