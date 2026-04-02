# 🤖 Remann AI: Multi-Instance NotebookLM Proxy

본 프로젝트는 구글 NotebookLM을 기반으로 사내 지식 관리(ESG) 및 자외선 순환 안내(Replus)를 제공하는 웹 프록시 서비스입니다. 하나의 서버에서 여러 개의 독립적인 AI 인스턴스를 운영하며, 클라우드플레어 터널을 통해 안전하게 외부로 서비스합니다.

---

## 🛠️ 주요 기능

- **다중 인스턴스 운영:** 서로 다른 노트북 소스를 사용하는 독립적인 AI 서비스 동시 구동
- **인증 시스템:** 
    - **리맨 지식 정보 AI:** 승인 기반 회원제 운영 (보안 강화)
    - **리플러스 자원순환 AI:** 로그인 없는 공개 모드 (접근성 강화)
- **통계 및 모니터링:** 관리자용 대시보드(`/admin`)를 통한 실시간 질문 로그 및 통계 확인
- **자동화 관리:** PM2를 활용한 서비스 상시 가동 및 로그 관리
- **보안 터널:** Cloudflare Tunnel을 통한 포트 개방 없는 서브도메인 연결

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

### 4. 실행 및 중지
PM2를 사용하여 모든 서비스를 한 번에 관리합니다.
```bash
# 전체 서비스 실행 (ESG, Replus, Tunnel)
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 서비스 중지
pm2 delete all

# 설정 저장 (부팅 시 자동 시작용)
pm2 save
```

---

## 📊 관리자 기능 (`/admin`)

- **사용자 관리:** 신규 가입자의 '승인' 또는 '거절' 처리
- **활동 통계:** 사용자들이 AI에게 던진 질문 내역(`queries.json`)을 실시간으로 확인 및 분석
- **접근 방법:** `https://note.jashin.org/admin` (관리자 계정 로그인 필수)

---

## 📂 프로젝트 구조

- `server.js`: 핵심 Node.js 백엔드 (Express)
- `public/`: 프론트엔드 HTML/JS/CSS 소스
- `docs/`: 도움말 및 매뉴얼 파일 저장소
- `queries.json`: 사용자 질문 로그 데이터베이스
- `users_*.json`: 서비스별 사용자 정보 데이터베이스

---

## 📝 관리 문의
- **관리자:** 관리자 전용 계정 사용
- **기술 지원:** Antigravity AI
