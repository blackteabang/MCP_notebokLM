# 🤖 Remann AI: Multi-Instance NotebookLM Proxy

본 프로젝트는 구글 NotebookLM을 기반으로 사내 지식 관리(ESG) 및 자원순환 안내(Replus)를 제공하는 웹 프록시 서비스입니다. 하나의 서버에서 여러 개의 독립적인 AI 인스턴스를 운영하며, 클라우드플레어 터널을 통해 안전하게 외부로 서비스합니다.

---

## 🛠️ 주요 기능

- **다중 인스턴스 운영:** 서로 다른 노트북 소스를 사용하는 독립적인 AI 서비스 동시 구동
- **닉네임 기반 입장:** 복잡한 가입 절차 없이 닉네임만 입력하고 즉시 AI 대화 시작 (간소화된 인증)
- **개인화 서비스:** 챗봇이 사용자의 닉네임을 기억하고 불러주는 맞춤형 대화 경험 제공
- **실시간 질문 내역:** 전용 페이지(`/history`)를 통한 사용자들의 질문 실시간 모니터링
- **자동화 관리:** PM2를 활용한 서비스 상시 가동 및 로그 관리
- **보안 터널:** Cloudflare Tunnel을 통한 포트 개방 없는 서브도메인 연결 (`refurbish.co.kr`)

---

## 🚀 서비스 주소

- **리맨 지식 정보 AI:** [https://note.refurbish.co.kr](https://note.refurbish.co.kr)
- **리플러스 자원순환 AI:** [https://replusqna.refurbish.co.kr](https://replusqna.refurbish.co.kr)
- **전체 질문 내역 확인:** [https://note.refurbish.co.kr/history](https://note.refurbish.co.kr/history)

---

## 🚀 시작하기

### 1. 사전 요구 사항
- **Node.js:** v16 이상
- **Python:** NotebookLM CLI(`nlm`) 구동용
- **cloudflared:** 터널 서비스를 위한 클라이언트

### 2. 설치
```bash
# 의존성 설치
npm install

# nlm CLI 설치 (Python 환경)
pip install notebooklm-mcp-cli
```

### 3. 설정 파일
- **`ecosystem.config.js`**: 각 서비스의 포트, 별칭, 서비스명, 인증 여부를 설정합니다.
- **`config.yml`**: 클라우드플레어 터널의 도메인 라우팅 규칙을 정의합니다.

### 4. 실행 및 관리 (PM2)
```bash
# 전체 서비스 실행 (ESG, Replus, Tunnel 모두 포함)
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 로그 확인 (실시간)
pm2 logs

# 서비스 중지 및 삭제
pm2 delete all
```

---

## 📊 모니터링 및 기록 (`/history`)

- **질문 내역:** 사용자들이 AI에게 던진 질문과 서비스 종류를 실시간으로 확인 및 분석할 수 있습니다.
- **자동 갱신:** 30초마다 자동으로 새로운 내역을 불러오며, '새로고침' 버튼으로 즉시 확인이 가능합니다.
- **접근 방법:** `https://note.refurbish.co.kr/history` (별도 로그인 없이 접근 가능)

---

## 📂 프로젝트 구조

- `server.js`: 핵심 Node.js 백엔드 (Express) / 세션 및 닉네임 처리
- `public/`: 프론트엔드 HTML/JS/CSS 소스
- `public/history.html`: 질문 내역 조회 페이지
- `queries.json`: 사용자 질문 로그 데이터베이스
- `ecosystem.config.js`: PM2 다중 인스턴스 설정 파일

---

## 📝 기술 지원
- **관리자:** Remann Admin
- **개발 지원:** Antigravity AI (Pair Programming)
