# 고령자 식품 안전 (웹)

저작능력 평가(CAQ-SE) → 단계 판정(KS H 4897 / UDF 구분 1~4) → 재료별 안전한
크기·형태·조리법 안내를 제공하는 **정적 웹앱**. 빌드 도구 없이 순수 HTML/CSS/JS로 동작.

## 파일 구성
- `index.html` — 앱 셸(상단바·탭바)
- `styles.css` — 스타일
- `data.js` — CAQ-SE 문항/채점, 단계 정보, 재료(감자·당근·계란·사과) 데이터
- `app.js` — 화면 렌더링·평가·손질 안내·재료 촬영 로직
- `netlify.toml` — Netlify 배포 설정

## GitHub + Netlify 배포 방법
### 1) GitHub에 올리기
```bash
git init
git add .
git commit -m "init: 고령자 식품 안전 웹앱"
git branch -M main
git remote add origin https://github.com/<사용자명>/elderfood-web.git
git push -u origin main
```

### 2) Netlify 연결
1. https://app.netlify.com 로그인 → **Add new site ▸ Import an existing project**
2. GitHub 선택 → 위 저장소 선택
3. Build settings: **Build command 비움**, **Publish directory = `.`** (netlify.toml에 이미 설정됨)
4. **Deploy** 클릭 → 발급된 `https://<사이트명>.netlify.app` 주소로 접속

> 빌드 과정이 없으므로 파일을 수정해 push 하면 Netlify가 자동 재배포합니다.
> 또는 폴더를 https://app.netlify.com/drop 에 끌어다 놓으면 즉시 배포됩니다.

## 데이터 출처
KS H 4897 고령친화식품 표준 · 일본 UDF 구분표(물성·크기 기준) · CAQ-SE v1.0
