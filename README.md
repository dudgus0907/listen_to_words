# YouGlish Copycat

영어 표현을 실제 YouTube 영상에서 찾아서 듣고 배울 수 있는 웹 애플리케이션입니다.

## 🚀 배포 가이드

### 백엔드 배포 (Railway - 무료)

1. [Railway.app](https://railway.app)에 가입하고 GitHub 연결
2. "Deploy from GitHub repo" 선택
3. 이 repository 선택
4. Root Directory를 `youglish-copycat/backend`로 설정
5. 배포 완료 후 나오는 URL을 복사 (예: `https://your-app.railway.app`)

### 프론트엔드 환경 변수 설정

Vercel 대시보드에서:
1. Settings → Environment Variables로 이동
2. 다음 환경 변수 추가:
   ```
   REACT_APP_API_URL = https://your-backend-url.railway.app/api
   ```
3. Redeploy 실행

### 로컬 개발 환경

```bash
# 백엔드 실행
cd youglish-copycat/backend
npm install
npm start

# 프론트엔드 실행 (새 터미널)
cd youglish-copycat
npm install
npm start
```

## ✨ 주요 기능

- 🔍 **고속 검색**: SQLite FTS를 사용한 실시간 검색
- 🎯 **정확한 타임스탬프**: 정확한 시작 시점으로 이동
- 💡 **하이라이트**: 검색어가 노란색으로 강조 표시
- 📱 **반응형 디자인**: 모바일/데스크톱 지원
- 💾 **클립 저장**: 마음에 드는 표현 저장 기능

## 🛠 기술 스택

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, SQLite FTS5
- **Deployment**: Vercel (Frontend) + Railway (Backend)
