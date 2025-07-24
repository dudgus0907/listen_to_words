const fs = require('fs');

console.log('🚀 Simple SRT Converter starting...');

try {
  // 1. SRT 파일 읽기
  const srtContent = fs.readFileSync('anne_hathaway.srt', 'utf8');
  console.log(`📥 SRT file loaded: ${srtContent.length} characters`);
  
  // 2. 첫 몇 줄 확인
  const firstLines = srtContent.split('\n').slice(0, 10);
  console.log('📋 First 10 lines:');
  firstLines.forEach((line, i) => {
    console.log(`  ${i+1}: ${line}`);
  });
  
  // 3. 간단한 SRT 파싱
  const transcript = [];
  const blocks = srtContent.split(/\n\s*\n/);
  
  console.log(`🔧 Found ${blocks.length} subtitle blocks`);
  
  let validBlocks = 0;
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    
    if (lines.length >= 3) {
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      // 시간 파싱
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatch) {
        validBlocks++;
        
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
  
  console.log(`✅ Parsed ${validBlocks} valid blocks, ${transcript.length} segments`);
  
  // 4. 미리보기
  console.log('\n📝 Transcript Preview:');
  transcript.slice(0, 3).forEach((seg, i) => {
    console.log(`  ${i+1}. [${seg.start}s] ${seg.text}`);
  });
  
  // 5. JSON 저장
  const result = {
    videoId: 'ocGJWc2F1Yk',
    videoTitle: 'Anne Hathaway Interview',
    transcript: transcript,
    method: 'yt-dlp-simple'
  };
  
  fs.writeFileSync('ocGJWc2F1Yk_ytdlp.json', JSON.stringify(result, null, 2));
  console.log('\n💾 Saved to: ocGJWc2F1Yk_ytdlp.json');
  
  console.log(`\n🎉 SUCCESS! Converted ${transcript.length} segments`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
} 