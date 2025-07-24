# YouGlish Copycat

YouGlish와 같은 영어 학습 서비스를 구현한 프로젝트입니다. YouTube 영상에서 특정 영어 표현이 나오는 부분을 찾아서 학습할 수 있습니다.

## ✨ 주요 기능

### 🔍 검색 기능
- 영어 표현을 입력하면 해당 표현이 포함된 YouTube 영상 클립을 찾아줍니다
- **100% 정확 매칭**을 먼저 시도하고, 없으면 **80% 유사도**로 검색합니다
- 유사도 퍼센티지를 표시하여 검색 결과의 정확도를 확인할 수 있습니다

### 🎬 비디오 플레이어
- 실제 YouTube 영상을 재생할 수 있습니다
- 검색어가 나오는 시점부터 자동 재생됩니다
- 완전한 플레이어 컨트롤 제공

### 🎮 영상 컨트롤
- **⏪ 5초 뒤로**: 현재 재생 위치에서 5초 뒤로 이동
- **▶️/⏸️ 재생/정지**: 영상 재생 상태 제어
- **⏩ 5초 앞으로**: 현재 재생 위치에서 5초 앞으로 이동
- **🎯 검색어 위치로**: 검색어가 나오는 정확한 시점으로 이동
- **⏭️ 다음 영상**: 같은 검색어의 다음 검색 결과로 이동

### 💾 저장 및 복습 기능
- 마음에 드는 클립을 저장할 수 있습니다
- 저장된 클립들을 리스트로 확인할 수 있습니다
- 각 저장 항목에는 **검색어**, **스크립트**, **다시보기 버튼**이 포함됩니다
- 언제든지 저장된 클립으로 돌아가서 복습할 수 있습니다

## 🚀 시작하기

### 필요 조건
- Node.js (v14 이상)
- npm 또는 yarn

### 설치 및 실행

1. **백엔드 서버 시작**
   ```bash
   cd youglish-copycat/backend
   npm install
   npm start
   ```

2. **프론트엔드 시작** (새 터미널에서)
   ```bash
   cd youglish-copycat
   npm install
   npm start
   ```

3. 브라우저에서 `http://localhost:3000` 접속

## 🎯 사용법

1. **검색하기**
   - 메인 페이지의 검색창에 영어 표현을 입력합니다
   - 예시: `"give you up"`, `"never gonna"`, `"strangers to love"`
   - Enter 키를 누르거나 검색 버튼을 클릭합니다

2. **영상 시청하기**
   - 검색 결과로 나온 YouTube 영상이 해당 표현이 나오는 시점부터 재생됩니다
   - 각종 컨트롤 버튼을 사용해서 영상을 조작할 수 있습니다
   - 다음 영상 버튼으로 같은 검색어의 다른 결과들을 확인할 수 있습니다

3. **클립 저장하기**
   - 마음에 드는 클립이 있으면 "💾 저장하기" 버튼을 클릭합니다
   - 상단의 "저장된 클립 보기" 버튼으로 저장한 클립들을 확인할 수 있습니다

4. **복습하기**
   - 저장된 클립 페이지에서 각 클립의 "다시 보기" 버튼을 클릭합니다
   - 저장했던 바로 그 시점부터 영상이 재생됩니다

## 🛠️ 기술 스택

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **React Player** for YouTube video playback
- **Axios** for API calls

### Backend
- **Express.js** for API server
- **Node.js** runtime
- **CORS** for cross-origin requests
- **Fuzzy matching** for text similarity

## 📝 API 엔드포인트

- `GET /api/search?query={검색어}` - 영상 검색
- `GET /api/video/{videoId}` - 특정 영상 정보
- `GET /api/health` - 서버 상태 확인

## 🎮 테스트해볼 수 있는 검색어

현재 Mock 데이터로 테스트할 수 있는 검색어들:
- `"give you up"` - Rick Astley의 "Never Gonna Give You Up"
- `"never gonna"` - 같은 곡의 다른 부분
- `"strangers to love"` - 같은 곡의 시작 부분
- `"direction"` - Luis Fonsi의 "Despacito" 관련

## 🔮 향후 개발 계획

- [ ] 실제 YouTube Data API 연동
- [ ] 자동 자막(transcript) 추출 기능
- [ ] 더 정교한 텍스트 유사도 알고리즘
- [ ] 사용자 계정 시스템
- [ ] 데이터베이스 연동 (현재는 메모리 저장)
- [ ] 더 많은 언어 지원

## 📄 라이선스

MIT License

## 🤝 기여하기

이 프로젝트에 기여하고 싶으시다면 Pull Request를 보내주세요!

---

**YouGlish Copycat** - 영어 학습을 위한 YouTube 클립 검색 서비스 💪🎓
