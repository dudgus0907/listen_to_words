const fs = require('fs');

console.log('🔄 Auto SRT to JSON Converter');

function findSrtFile(videoId) {
  // 현재 디렉토리의 모든 .srt 파일 찾기
  const files = fs.readdirSync('.').filter(f => 
    f.endsWith('.srt') && f.includes(videoId)
  );
  
  if (files.length === 0) {
    console.log(`❌ No SRT file found for video ID: ${videoId}`);
    return null;
  }
  
  // 가장 최근 파일 선택
  const file = files[0];
  console.log(`✅ Found SRT file: ${file}`);
  return file;
}

function parseSrt(srtContent) {
  const transcript = [];
  const blocks = srtContent.split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    
    if (lines.length >= 3) {
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      // 시간 파싱
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatch) {
        // 시작 시간 계산 (초)
        const startHours = parseInt(timeMatch[1]);
        const startMinutes = parseInt(timeMatch[2]);
        const startSeconds = parseInt(timeMatch[3]);
        const start = startHours * 3600 + startMinutes * 60 + startSeconds;
        
        // 텍스트 정리
        const text = textLines.join(' ').replace(/^-/, '').trim();
        
        if (text) {
          transcript.push({
            start: start,
            text: text
          });
        }
      }
    }
  }
  
  return transcript;
}

function extractVideoTitle(filename) {
  // 파일명에서 제목 추출 (videoId와 확장자 제거)
  const match = filename.match(/^(.+?)\s*\[([^\]]+)\]/);
  if (match) {
    return match[1].trim();
  }
  return 'Unknown Video';
}

async function convertSrtToJson(videoId) {
  try {
    // 1. SRT 파일 찾기
    const srtFile = findSrtFile(videoId);
    if (!srtFile) return { success: false, error: 'SRT file not found' };
    
    // 2. SRT 파일 읽기
    const srtContent = fs.readFileSync(srtFile, 'utf8');
    console.log(`📥 Loaded SRT file: ${srtContent.length} characters`);
    
    // 3. SRT 파싱
    const transcript = parseSrt(srtContent);
    console.log(`✅ Parsed ${transcript.length} segments`);
    
    // 4. 제목 추출
    const videoTitle = extractVideoTitle(srtFile);
    console.log(`🎬 Video title: ${videoTitle}`);
    
    // 5. JSON 결과 생성
    const result = {
      success: true,
      videoId: videoId,
      videoTitle: videoTitle,
      transcript: transcript,
      method: 'yt-dlp-auto',
      segments: transcript.length,
      timestamp: new Date().toISOString()
    };
    
    // 6. 캐시에 저장
    const cacheFile = `transcript-cache/${videoId}_real.json`;
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    console.log(`💾 Saved to cache: ${cacheFile}`);
    
    // 7. 미리보기
    console.log('\n📝 Transcript Preview:');
    transcript.slice(0, 5).forEach((seg, i) => {
      console.log(`   ${i+1}. [${seg.start}s] ${seg.text}`);
    });
    
    console.log(`\n🎉 SUCCESS! Converted ${transcript.length} segments`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 실행
async function main() {
  const videoId = process.argv[2];
  
  if (!videoId) {
    console.log(`
🔄 Auto SRT to JSON Converter

Usage:
  node auto-srt-convert.js <video_id>

Example:
  node auto-srt-convert.js rQ3luEIcKes

Available SRT files:
`);
    
    // 현재 디렉토리의 SRT 파일들 표시
    const srtFiles = fs.readdirSync('.').filter(f => f.endsWith('.srt'));
    srtFiles.forEach(file => {
      const match = file.match(/\[([^\]]+)\]/);
      const videoId = match ? match[1] : 'unknown';
      console.log(`  - ${videoId}: ${file.substring(0, 60)}...`);
    });
    
    return;
  }
  
  const result = await convertSrtToJson(videoId);
  
  if (result.success) {
    console.log(`\n✅ Conversion complete!`);
    console.log(`📁 Cache file: transcript-cache/${videoId}_real.json`);
    console.log(`📊 Segments: ${result.segments}`);
  } else {
    console.log(`\n❌ Conversion failed: ${result.error}`);
  }
}

main().catch(console.error); 