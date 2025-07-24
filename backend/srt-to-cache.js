const fs = require('fs');
const path = require('path');

/**
 * SRT 파일을 JSON 캐시로 변환
 */
function convertSrtToCache(srtFilePath, videoId) {
  console.log(`🔄 Converting SRT to cache: ${srtFilePath}\n`);
  
  try {
    // 1. SRT 파일 읽기
    const srtContent = fs.readFileSync(srtFilePath, 'utf8');
    console.log(`📥 Loaded SRT file (${srtContent.length} characters)`);
    
    // 2. SRT 파싱
    const transcript = parseSrt(srtContent);
    console.log(`✅ Parsed ${transcript.length} transcript segments`);
    
    // 3. 비디오 제목 추출 (파일명에서)
    const fileName = path.basename(srtFilePath, '.en-US.srt');
    const videoTitle = fileName.replace(/\s*\[.*?\]\s*$/, ''); // [videoId] 부분 제거
    
    // 4. JSON 결과 생성
    const result = {
      success: true,
      videoId: videoId,
      videoTitle: videoTitle,
      language: 'en-US',
      segments: transcript.length,
      transcript: transcript,
      method: 'yt-dlp-srt',
      timestamp: new Date().toISOString()
    };
    
    // 5. 캐시에 저장
    const cacheFile = path.join(__dirname, 'transcript-cache', `${videoId}_ytdlp.json`);
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    console.log(`💾 Saved to cache: ${videoId}_ytdlp.json`);
    
    // 6. 미리보기
    console.log('\n📝 Transcript Preview:');
    transcript.slice(0, 5).forEach((seg, i) => {
      console.log(`   ${i+1}. [${seg.start}s] ${seg.text}`);
    });
    
    console.log(`\n🎬 Video: ${videoTitle}`);
    console.log(`📊 Total segments: ${transcript.length}`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * SRT 내용을 파싱하여 transcript 배열로 변환
 */
function parseSrt(srtContent) {
  const transcript = [];
  
  // SRT를 블록별로 분리 (빈 줄로 구분)
  const blocks = srtContent.split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    
    if (lines.length >= 3) {
      // 첫 번째 줄: 번호 (무시)
      // 두 번째 줄: 시간
      // 세 번째 줄 이후: 텍스트
      
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      // 시간 파싱 (00:00:01,201 --> 00:00:02,336)
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatch) {
        const startHours = parseInt(timeMatch[1]);
        const startMinutes = parseInt(timeMatch[2]);
        const startSeconds = parseInt(timeMatch[3]);
        const startMs = parseInt(timeMatch[4]);
        
        const endHours = parseInt(timeMatch[5]);
        const endMinutes = parseInt(timeMatch[6]);
        const endSeconds = parseInt(timeMatch[7]);
        const endMs = parseInt(timeMatch[8]);
        
        // 초 단위로 변환
        const start = startHours * 3600 + startMinutes * 60 + startSeconds + startMs / 1000;
        const end = endHours * 3600 + endMinutes * 60 + endSeconds + endMs / 1000;
        const duration = end - start;
        
        // 텍스트 정리
        const text = textLines.join(' ')
          .replace(/^-/, '') // 첫 번째 대시 제거
          .trim();
        
        if (text) {
          transcript.push({
            start: Math.floor(start),
            duration: Math.floor(duration),
            text: text
          });
        }
      }
    }
  }
  
  return transcript;
}

// 실행
async function main() {
  const videoId = process.argv[2];
  const srtFile = process.argv[3];
  
  if (!videoId || !srtFile) {
    console.log(`
🔄 SRT to Cache Converter

Usage:
  node srt-to-cache.js <video_id> <srt_file_path>

Example:
  node srt-to-cache.js ocGJWc2F1Yk "Anne Hathaway*.srt"

Current directory files:
`);
    
    // 현재 디렉토리의 SRT 파일 찾기
    const files = fs.readdirSync('.').filter(f => f.endsWith('.srt'));
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    return;
  }
  
  // 와일드카드 지원
  let actualSrtFile = srtFile;
  if (srtFile.includes('*')) {
    const files = fs.readdirSync('.').filter(f => f.endsWith('.srt'));
    if (files.length > 0) {
      actualSrtFile = files[0];
      console.log(`🔍 Found SRT file: ${actualSrtFile}`);
    } else {
      console.log('❌ No SRT files found');
      return;
    }
  }
  
  const result = convertSrtToCache(actualSrtFile, videoId);
  
  console.log('\n📊 Final Result:');
  console.log(`Success: ${result.success}`);
  if (result.success) {
    console.log(`Cache file: ${videoId}_ytdlp.json`);
  }
}

main().catch(console.error); 