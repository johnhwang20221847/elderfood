import { db, auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const KEY = "caq_total_v1";
const PKEY = "caq_profile_v1";

const state = {
  user: null, // 로그인된 유저 객체 저장 (null이면 비로그인 상태)
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

// 인증 화면 모드 제어 ("login" | "signup" | "forgot")
let authMode = "login"; 

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
  // 🔒 로그인 상태가 아니면 무조건 인증 화면 전용 렌더링 후 종료
  if (!state.user) {
    renderAuthScreen();
    return;
  }

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
  const p = state.profile || {};
  
  // 사용자 정보 표시 분기 처리
  const userGreeting = p.name 
    ? `<span style="font-size:14px; font-weight:600; color:var(--textS); background:#fff; padding:4px 10px; border-radius:20px; border:1px solid var(--line);">${p.name} 어르신 계정</span>`
    : `<span style="font-size:14px; font-weight:600; color:var(--textS);">반갑습니다!</span>`;

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
      <div>
        <h1 style="margin-bottom:2px; line-height:1.2;">고령자 식품\n안전</h1>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
        <button class="btn-ghost" style="color:var(--danger); font-size:14px; font-weight:800; padding:6px 12px; border:1px solid var(--danger); border-radius:8px; background:rgba(210,63,63,0.04); width:auto;" onclick="handleLogOut()">로그아웃</button>
        ${userGreeting}
      </div>
    </div>
    <p class="sub" style="margin-bottom:18px;">저작능력에 맞춰 안전하게 먹을 수 있는\n음식 크기·형태·조리법을 안내합니다.</p>
  `;

  if(s){ 
    html += stageCardHTML(STAGE_INFO[s]); 
  } else {
    html += `<div class="card">
      <strong style="color:var(--danger);font-size:18px">⚠ 저작능력 평가가 필요합니다</strong>
      <p class="sub" style="margin:10px 0">먼저 15문항 자가 평가를 완료하면\n나에게 맞는 손질 기준이 적용됩니다.</p>
      <button class="btn btn-primary" onclick="setTab('assess')">평가 시작하기</button>
    </div>`;
  }

  html += `
  <a href="/survey.html" style="text-decoration:none; display:block; margin-bottom:18px;">
    <div style="
      background: linear-gradient(135deg, #2E7D4F, #4CAF78);
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      box-shadow: 0 4px 12px rgba(46,125,79,0.25);
    ">
      <div>
        <div style="font-size:12px; opacity:0.85; margin-bottom:4px;">약 3분 · 익명 보장</div>
        <div style="font-size:15px; font-weight:700;">📋 서비스 이용 경험 알려주기</div>
      </div>
      <div style="font-size:22px; font-weight:700;">→</div>
    </div>
  </a>
`;
  
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

// ===== 🔒 Firebase Auth 전용 UI 인터페이스 렌더링 =====
function renderAuthScreen() {
  let html = `<div class="card" style="max-width: 400px; margin: 60px auto; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">`;
  
  if (authMode === "login") {
    html += `
      <h2 style="text-align:center; margin-bottom:10px;">로그인</h2>
      <p class="sub" style="text-align:center; margin-bottom:24px;">고령자 식품 안전 서비스 로그인이 필요합니다.</p>
      <div class="field" style="margin-bottom:15px;"><label>이메일 주소</label><input id="auth_email" type="email" placeholder="example@email.com" style="width:100%; padding:10px; box-sizing:border-box;"></div>
      <div class="field" style="margin-bottom:20px;"><label>비밀번호</label><input id="auth_pw" type="password" placeholder="비밀번호 입력" style="width:100%; padding:10px; box-sizing:border-box;"></div>
      <button class="btn btn-primary" style="width:100%; margin-bottom:15px;" onclick="handleLogin()">로그인</button>
      <div style="text-align:center; font-size:14px; color:var(--textS);">
        <span style="cursor:pointer; text-decoration:underline;" onclick="switchAuthMode('signup')">회원가입</span> | 
        <span style="cursor:pointer; text-decoration:underline;" onclick="switchAuthMode('forgot')">비밀번호 찾기</span>
      </div>`;
  } else if (authMode === "signup") {
    html += `
      <h2 style="text-align:center; margin-bottom:10px;">회원가입</h2>
      <p class="sub" style="text-align:center; margin-bottom:24px;">새로운 분석 계정을 생성합니다.</p>
      <div class="field" style="margin-bottom:15px;"><label>이메일 주소</label><input id="auth_email" type="email" placeholder="example@email.com" style="width:100%; padding:10px; box-sizing:border-box;"></div>
      <div class="field" style="margin-bottom:20px;"><label>비밀번호</label><input id="auth_pw" type="password" placeholder="6자리 이상 입력" style="width:100%; padding:10px; box-sizing:border-box;"></div>
      <button class="btn btn-teal" style="width:100%; margin-bottom:15px;" onclick="handleSignUp()">회원가입 (인증 메일 발송)</button>
      <div style="text-align:center; font-size:14px;">
        <span style="color:var(--textS); cursor:pointer; text-decoration:underline;" onclick="switchAuthMode('login')">이미 계정이 있으신가요? 로그인</span>
      </div>`;
  } else if (authMode === "forgot") {
    html += `
      <h2 style="text-align:center; margin-bottom:10px;">비밀번호 찾기</h2>
      <p class="sub" style="text-align:center; margin-bottom:24px;">가입하신 이메일로 초기화 링크를 전송합니다.</p>
      <div class="field" style="margin-bottom:20px;"><label>이메일 주소</label><input id="auth_email" type="email" placeholder="example@email.com" style="width:100%; padding:10px; box-sizing:border-box;"></div>
      <button class="btn btn-navy" style="width:100%; margin-bottom:15px;" onclick="handleForgotPassword()">비밀번호 재설정 메일 발송</button>
      <div style="text-align:center; font-size:14px;">
        <span style="color:var(--textS); cursor:pointer; text-decoration:underline;" onclick="switchAuthMode('login')">로그인 화면으로 돌아가기</span>
      </div>`;
  }
  
  html += `</div>`;
  app.innerHTML = html;
}

function switchAuthMode(mode) {
  authMode = mode;
  render();
}

// ===== 🔒 Firebase Auth 핵심 처리 로직 비동기 함수 =====
async function handleSignUp() {
  const email = document.getElementById("auth_email").value.trim();
  const password = document.getElementById("auth_pw").value;
  if(!email || !password) { alert("이메일과 비밀번호를 모두 입력해주세요."); return; }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    alert("인증 메일이 발송되었습니다! 가입하신 이메일함을 확인하여 인증 링크를 클릭한 후 로그인해 주세요.");
    await signOut(auth); 
    switchAuthMode("login");
  } catch (error) {
    alert("회원가입 실패: " + error.message);
  }
}

async function handleLogin() {
  const email = document.getElementById("auth_email").value.trim();
  const password = document.getElementById("auth_pw").value;
  if(!email || !password) { alert("아이디와 비밀번호를 입력해주세요."); return; }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 이메일 링크 인증 승인 여부 검사 파트
    if (!userCredential.user.emailVerified) {
      alert("이메일 인증이 완료되지 않았습니다. 전송된 메일의 인증 링크를 클릭해 주세요.");
      await signOut(auth);
      return;
    }
  } catch (error) {
    alert("로그인 실패: 이메일 주소 혹은 비밀번호를 다시 확인하세요.");
  }
}

async function handleForgotPassword() {
  const email = document.getElementById("auth_email").value.trim();
  if(!email) { alert("이메일 주소를 정확히 입력해주세요."); return; }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("비밀번호 재설정 이메일 가이드 링크가 성공적으로 발송되었습니다.");
    switchAuthMode("login");
  } catch (error) {
    alert("메일 발송 오류: " + error.message);
  }
}

async function handleLogOut() {
  if(confirm("로그아웃 하시겠습니까? 데이터 안전을 위해 세션이 비활성화됩니다.")) {
    try {
      await signOut(auth);
      state.user = null;
      render();
    } catch (error) {
      console.error("로그아웃 처리 중 예외 발생:", error);
    }
  }
}

// ===== 💾 유저별 독립 인스턴스 Firestore 동기화 저장 함수 =====
async function saveSurveyToFirebase(){
  try {
    if (!state.user) return; 
    
    const uid = state.user.uid; // 현재 로그인 세션을 획득한 고유 유저 ID(UID)
    const score = totalScore(state.answers);
    const p = state.profile || {};

    // ✅ 1) users 컬렉션 고유 도큐먼트 ID 명을 유저 고유 UID로 매핑 (문서 덮어쓰기/업데이트형 생성)
    await setDoc(doc(db, "users", uid), {
      name:          p.name   || "",
      evalDate:      p.date   || "",
      birthYear:     p.y      ? parseInt(p.y, 10)  : null,
      birthMonth:    p.m      ? parseInt(p.m, 10)  : null,
      birthDay:      p.d      ? parseInt(p.d, 10)  : null,
      evaluatorType: p.by     || "",
      createdAt:     serverTimestamp()
    });

    // ✅ 2) assessments 하위 서브컬렉션에 유저 격리 ID 필드를 명시하여 레코드 추가 기록 누적
    await addDoc(collection(db, "users", uid, "assessments"), {
      userId:       uid,  // BigQuery 테이블 조인(JOIN) 통합 분석용 Key값 매핑 추가
      q01: state.answers[1]  ?? null,
      q02: state.answers[2]  ?? null,
      q03: state.answers[3]  ?? null,
      q04: state.answers[4]  ?? null,
      q05: state.answers[5]  ?? null,
      q06: state.answers[6]  ?? null,
      q07: state.answers[7]  ?? null,
      q08: state.answers[8]  ?? null,
      q09: state.answers[9]  ?? null,
      q10: state.answers[10] ?? null,
      q11: state.answers[11] ?? null,
      q12: state.answers[12] ?? null,
      q13: state.answers[13] ?? null,
      q14: state.answers[14] ?? null,
      q15: state.answers[15] ?? null,
      totalScore:   score,
      chewingLevel: stageFor(score) + "단계",
      takenAt:      serverTimestamp()
    });

    console.log("Firebase 유저 세션별 데이터 독립 인스턴스 격리 저장 완료 — UID:", uid);

  } catch(error) {
    console.error("Firebase 트랜잭션 도중 오류 발생:", error);
  }
}

// 사용자의 로그인/로그아웃 상태 변화를 실시간 감지하여 상태 인터셉트 리스너 배치
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    state.user = user;
  } else {
    state.user = null;
  }
  render(); 
});

window.setTab = setTab;
window.startProfile = startProfile;
window.submitProfile = submitProfile;
window.prevQ = prevQ;
window.pick = pick;
window.openFood = openFood;
window.backToList = backToList;
window.setFoodStage = setFoodStage;
window.simulate = simulate;
window.state = state;
window.switchAuthMode = switchAuthMode;
window.handleSignUp = handleSignUp;
window.handleLogin = handleLogin;
window.handleForgotPassword = handleForgotPassword;
window.handleLogOut = handleLogOut;
