# Tier-Drop (나만의 티어표)

> **Drag, Paste, and Drop!**  
> 유저 친화형 티어표입니다.

---

## 🌟 Key Features (핵심 기능)

- **이미지 복붙 (Ctrl + V)**: 주소창을 복사할 필요 없이, 웹서핑 중 마우스 우클릭 '이미지 복사' 후 화면 어디서나 붙여넣으면 보관함에 카드가 즉시 생성됩니다.
- **이미지 파일 드래그 앤 드롭 (Drag & Drop)**: 컴퓨터 파일 탐색기나 바탕화면의 이미지 파일을 웹 브라우저 위로 쓱 던져서 카드를 추가할 수 있습니다.
- **PNG 이미지 저장**: 완성된 티어표를 사용자가 상단에 입력한 제목 기반의 동적 파일명(`[제목]-[시간].png`)으로 다운로드할 수 있습니다.

---

## 🧠 AI Configuration

- **VS code Extension**: Kilo code
- **Local AI Engine**: LM Studio
- **Model**: Qwen3.8 27B 

---

## 🛠️ Tech Stack

- **Framework**: React (TypeScript)
- **Build Tool**: Vite
- **Package Manager**: pnpm (Strictly Enforced)
- **Drag & Drop Engine**: `@dnd-kit/sortable` & `@dnd-kit/core`
- **UI Components & Style**: Tailwind CSS v4 & Lucide React Icon
- **Canvas Export Engine**: `html2canvas-pro`

---

## 🏗️ Architecture Design (안전한 저작권 & 비용 제로 설계)

본 프로젝트는 데이터베이스(DB)나 이미지 업로드 서버를 쓰지 않는 **100% 프론트엔드 단독 아키텍처**로 설계되었습니다.

**저작권 리스크 0%**: 사용자가 추가한 이미지 데이터는 외부 서버에 수집되거나 무단 복제되지 않고, 오직 유저 브라우저의 임시 메모리 내부에서만 안전하게 머물다 소멸합니다.


---

## ⚙️ Installation & Deployment (설치 및 배포 방법)

### 1. 로컬 환경 실행
의존성 충돌 방지를 위해 반드시 `pnpm`을 사용하여 패키지를 설치하고 실행합니다.
```bash
# 의존성 패키지 설치
pnpm install

# 로컬 개발 서버 구동
pnpm dev
```

### 2. GitHub Pages 정석 배포
`vite.config.ts`의 `base` 경로가 레포지토리 이름인 `'/tier-drop/'`으로 올바르게 세팅되어 있는지 확인한 후 아래 스크립트를 터미널에 입력합니다.
```bash
# 빌드 및 gh-pages 브랜치 자동 배포 프로세스 가동
pnpm run deploy
```

---

## 📝 Disclaimer (면책 조항)
본 서비스는 유저의 어떠한 이미지 데이터도 서버에 수집하거나 보관하지 않는 순수 프론트엔드 도구입니다. 모든 이미지의 저작권은 원저작권자에게 있으며, 사용자가 자발적으로 추가·유포한 이미지 데이터로 인해 발생하는 저작권 관련 분쟁의 책임은 사용자 본인에게 있습니다.
