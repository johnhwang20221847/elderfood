import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const KEY = "caq_total_v1";
const PKEY = "caq_profile_v1";
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
  assessMode: "intro",
  profile: loadProfile(),
};

function load(){ const v = localStorage.getItem(KEY); return v==null?null:parseInt(v,10); }
function save(t){ localStorage.setItem(KEY, String(t)); }
function loadProfile(){ try{ return JSON.parse(localStorage.getItem(PKEY)) || {}; }catch(e){ return {}; } }
function saveProfile(p){ localStorage.setItem(PKEY, JSON.stringify(p)); }
function curStage(){ return state.total==null ? null : stageFor(state.total); }

const app = document.getElementById("app");
const stageBadge = document.getElementById("stageBadge");

function setTab(t){
  state.tab = t;
  if(t==="assess") state.assessMode = "intro";
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===t));
  render();
}
document.querySelectorAll(".tab").forEach(b=> b.onclick = ()=> setTab(b.dataset.tab));

function render(){
  const s = curStage();
  stageBadge.textContent = s ? STAGE_INFO[s].title.split(" · ")[0] : "평가 전";
  if(state.tab==="home") renderHome();
  else if(state.tab==="camera") renderCamera();
  else if(state.tab==="foods") state.selectedFood!=null ? renderFoodDetail() : renderFoodList();
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
      <button class="btn btn-primary" onclick="setTab('assess')">평가 시작하기</button>
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

// ===== 재료 촬영 =====
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
  } else if(state.cam==="failed") frame = `<div class="big">⚠️</div><div style="font-weight:800;color:var(--navy)">재료가 잘 안 보여요</div>`;

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
function renderAssess(){
  if(state.assessMode==="form"){ renderProfileForm(); return; }
  if(state.assessMode==="quiz"){ renderQuiz(); return; }
  if(state.assessMode==="result"){ renderResult(); return; }
  // intro
  const s = curStage();
  let html = `<h1>저작능력 자가 평가</h1><p class="sub">CAQ-SE v1.0 · 15문항 · 5개 영역</p>`;
  if(s) html += stageCardHTML(STAGE_INFO[s]);
  html += `<button class="btn btn-primary" onclick="startProfile()">${s?"다시 평가하기":"평가 시작하기"}</button>
    <p class="note">※ 본 평가는 의료 진단을 대체하지 않습니다. 전문 평가가 필요하면 치과·재활의학과 전문의와 상담하세요.</p>`;
  app.innerHTML = html;
}

function startProfile(){ state.assessMode="form"; render(); }

function todayStr(){ const d=new Date(); return d.toISOString().slice(0,10); }

function renderProfileForm(){
  const p = state.profile || {};
  let html = `
  <div style="text-align:center;margin-bottom:6px">
    <h1 style="font-size:26px">고령자 식품 안전 앱</h1>
    <div style="color:var(--teal);font-weight:800;font-size:18px">저작능력 자가 평가지</div>
    <div style="color:#aab2bd;font-size:12px;letter-spacing:1px;margin-top:6px">CHEWING ABILITY SELF-ASSESSMENT QUESTIONNAIRE | CAQ-SE V1.0</div>
  </div>
  <div class="card">
    <div class="form-head"><span class="ic">🗒</span> 평가 대상자 정보 입력 (안전 분석용)</div>
    <div class="divider"></div>
    <div class="grid2">
      <div class="field"><label>성 함</label>
        <input id="pf_name" type="text" placeholder="이름을 입력하세요" value="${p.name||''}"></div>
      <div class="field"><label>평가 일자</label>
        <input id="pf_date" type="date" value="${p.date||todayStr()}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>생년월일</label>
        <div class="dob">
          <input id="pf_y" type="number" inputmode="numeric" placeholder="년" value="${p.y||''}">
          <input id="pf_m" type="number" inputmode="numeric" placeholder="월" value="${p.m||''}">
          <input id="pf_d" type="number" inputmode="numeric" placeholder="일" value="${p.d||''}">
        </div></div>
      <div class="field"><label>실제 평가자 구분</label>
        <select id="pf_by">
          <option ${p.by==='본인 스스로 작성'?'selected':''}>본인 스스로 작성</option>
          <option ${p.by==='보호자 작성'?'selected':''}>보호자 작성</option>
          <option ${p.by==='의료진 작성'?'selected':''}>의료진 작성</option>
        </select></div>
    </div>
  </div>
  <div class="notice">
    <span class="badge">안내</span>
    <div class="lead">본 질문지는 고령자의 씹기(저작) 능력을 정교하게 파악하여, 보다 안심할 수 있는 최적의 음식 크기와 손질 방법을 종합 안내하기 위한 신뢰도 기반 자가 분석 도구입니다.</div>
    <div class="desc">각 문항을 천천히 차근차근 읽고, 현재 어르신의 가장 일상적인 물리 조건에 가까운 답변을 편안하게 골라주세요. 정해진 모범 해설은 없으며, 일관성 있고 솔직한 응답만이 가장 정확한 결과를 드립니다.</div>
    <div class="warn">⚠︎ 본 평가는 자가 정보 취합이며 정식 임상 의료 진단을 대체하지 않습니다. 전문적 상태 개선이 필요하시면 치과 또는 인근 재활의학과 전문의와 상담하십시오.</div>
  </div>
  <button class="btn btn-primary" onclick="submitProfile()">평가 시작하기 (15문항) ›</button>
  <button class="btn-ghost" style="margin-top:8px" onclick="state.assessMode='intro';render()">‹ 뒤로</button>`;
  app.innerHTML = html;
}

function submitProfile(){
  const g = id => document.getElementById(id).value.trim();
  const name = g("pf_name");
  if(!name){ alert("성함을 입력해 주세요."); return; }
  state.profile = {
    name, date: g("pf_date"),
    y: g("pf_y"), m: g("pf_m"), d: g("pf_d"),
    by: document.getElementById("pf_by").value
  };
  saveProfile(state.profile);
  state.answers={}; state.qIndex=0; state.assessMode="quiz"; render();
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
  else html += `<button class="btn-ghost" style="margin-top:10px" onclick="state.assessMode='form';render()">‹ 정보 수정</button>`;
  app.innerHTML = html;
}
function pick(id,score){

  state.answers[id]=score;

  if(state.qIndex < QUESTIONS.length-1){

    state.qIndex++;

    render();

  }
  else{

    state.total = totalScore(state.answers);

    save(state.total);

    saveSurveyToFirebase();

    state.assessMode="result";

    render();

  }

}
function prevQ(){ if(state.qIndex>0){ state.qIndex--; render(); } }

function renderResult(){
  const t = state.total, s = stageFor(t), info = STAGE_INFO[s], p = state.profile||{};
  let who = "";
  if(p.name){
    const dob = (p.y&&p.m&&p.d)? ` · ${p.y}.${String(p.m).padStart(2,'0')}.${String(p.d).padStart(2,'0')}` : "";
    who = `<div class="who-line">${p.name}${dob} · ${p.by||''}</div>`;
  }
  let html = who + `<div class="card">
    <div class="result-score" style="color:${info.color}">${t}점</div>
    <div class="result-stage">${info.title}</div></div>`;
  html += stageCardHTML(info);
  html += `<h2>영역별 분석</h2>`;
  Object.keys(DOMAINS).forEach(d=>{
    const got = domainScore(d, state.answers), max = DOMAINS[d].max, pp = Math.round(got/max*100);
    const weak = pp<50;
    html += `<div class="card">
      <div class="dom-head"><span>${DOMAINS[d].label}</span><span style="color:var(--textS);font-weight:600">${got}/${max} · ${pp}%</span></div>
      <div class="bar"><span style="width:${pp}%;background:${weak?'var(--danger)':'var(--teal)'}"></span></div>
      ${weak?'<div class="warn-text">⚠︎ 취약 영역 — 주의가 필요합니다</div>':''}</div>`;
  });
  html += `<button class="btn btn-primary" onclick="state.selectedFood=null;setTab('foods')">내 단계에 맞는 손질 안내 보기</button>`;
  app.innerHTML = html;
}

render();
async function saveSurveyToFirebase(){

  try{

    const score = totalScore(state.answers);

    await addDoc(
      collection(db, "surveys"),
      {
        profile: state.profile,
        answers: state.answers,
        totalScore: score,
        stage: stageFor(score),
        createdAt: serverTimestamp()
      }
    );

    console.log("Firebase 저장 완료");

  }catch(error){

    console.error("Firebase 저장 실패:", error);

  }

}
