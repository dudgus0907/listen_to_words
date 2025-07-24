# 🚀 YouGlish Copycat 무료 배포 가이드

이 가이드는 YouGlish Copycat 서비스를 **무료로 빠르게** 배포하는 방법을 설명합니다.

## 🎯 추천 배포 방법: Vercel (무료)

Vercel은 React 앱과 서버리스 함수를 모두 지원하며, GitHub과 연동하여 자동 배포가 가능합니다.

### 1단계: GitHub에 코드 업로드

```bash
# 현재 프로젝트를 GitHub에 업로드
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2단계: Vercel 계정 생성 및 연동

1. [Vercel.com](https://vercel.com)에서 GitHub 계정으로 가입
2. "New Project" 클릭
3. GitHub 리포지토리 선택
4. 프로젝트 설정:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `youglish-copycat`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 3단계: 환경변수 설정 (선택사항)

Vercel 대시보드에서:
- Settings > Environment Variables
- 로컬 개발시에만 필요: `REACT_APP_API_URL=http://localhost:5000/api`
- 프로덕션에서는 설정하지 않음 (자동으로 `/api` 사용)

### 4단계: 배포!

"Deploy" 버튼 클릭 → 약 2-3분 후 배포 완료!

## 🌐 다른 무료 배포 옵션들

### Option 2: Netlify
1. [Netlify.com](https://netlify.com)에서 GitHub 연동
2. Build settings:
   - Build command: `cd youglish-copycat && npm run build`
   - Publish directory: `youglish-copycat/build`
3. Functions을 위해 Netlify Functions 사용 가능

### Option 3: GitHub Pages (프론트엔드만)
```bash
npm install --save-dev gh-pages

# package.json에 추가:
"homepage": "https://your-username.github.io/your-repo-name",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}

npm run deploy
```

### Option 4: Railway (풀스택)
1. [Railway.app](https://railway.app) 가입
2. GitHub 리포지토리 연결
3. 자동으로 감지하여 배포

## 🔧 로컬 개발 환경 설정

```bash
# 프론트엔드 실행
cd youglish-copycat
npm install
npm start

# 백엔드 실행 (별도 터미널)
cd youglish-copycat/backend
npm install
npm start
```

환경변수 설정:
```bash
# youglish-copycat/.env.local 파일 생성
REACT_APP_API_URL=http://localhost:5000/api
```

## 📁 프로젝트 구조

```
youglish-copycat/
├── api/                 # Vercel 서버리스 함수
│   ├── search.js       # 검색 API
│   └── health.js       # 상태 체크 API
├── backend/            # 원본 백엔드 (로컬 개발용)
├── src/                # React 앱
├── public/             # 정적 파일
├── vercel.json         # Vercel 설정
└── package.json        # 의존성
```

## 🚨 주의사항

1. **무료 제한**: Vercel 무료 플랜은 월 100GB 대역폭, 1000개 서버리스 함수 실행
2. **Cold Start**: 서버리스 함수는 첫 요청시 약간의 지연 발생 가능
3. **데이터**: 현재는 캐시된 transcript 데이터만 사용 (실시간 YouTube API 호출 없음)

## 🎉 배포 완료 후 확인

배포된 URL에서:
- ✅ 메인 페이지 로딩 확인
- ✅ 검색 기능 테스트 ("never gonna give you up" 등)
- ✅ YouTube 플레이어 동작 확인

## 💡 문제 해결

**API 오류가 발생하면:**
1. Vercel Functions 탭에서 로그 확인
2. `/api/health` 엔드포인트 테스트
3. CORS 설정 확인

**빌드 오류가 발생하면:**
1. `youglish-copycat` 폴더가 루트 디렉토리인지 확인
2. `package.json`의 모든 의존성 설치 확인
3. TypeScript 오류 해결

## 🎯 배포 성공 예시

배포 완료 후 이런 URL을 받게 됩니다:
- **Vercel**: `https://your-project-name.vercel.app`
- **Netlify**: `https://your-project-name.netlify.app`

## 📞 도움이 필요하면

- Vercel 문서: https://vercel.com/docs
- React 배포 가이드: https://create-react-app.dev/docs/deployment/
- GitHub Pages 가이드: https://docs.github.com/en/pages 