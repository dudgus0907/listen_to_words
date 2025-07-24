const fs = require('fs');

console.log('🔄 Batch Convert All SRT to JSON');

function extractVideoId(filename) {
  const match = filename.match(/\[([^\]]+)\]/);
  return match ? match[1] : null;
}

function extractVideoTitle(filename) {
  const match = filename.match(/^(.+?)\s*\[([^\]]+)\]/);
  if (match) {
    return match[1].trim();
  }
  return 'Unknown Video';
}

function parseSrt(srtContent) {
  const transcript = [];
  const blocks = srtContent.split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    
    if (lines.length >= 3) {
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatch) {
        const startHours = parseInt(timeMatch[1]);
        const startMinutes = parseInt(timeMatch[2]);
        const startSeconds = parseInt(timeMatch[3]);
        const start = startHours * 3600 + startMinutes * 60 + startSeconds;
        
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

async function convertAllSrtFiles() {
  console.log('🔍 Scanning for SRT files...\n');
  
  // 현재 디렉토리의 모든 SRT 파일 찾기
  const srtFiles = fs.readdirSync('.').filter(f => f.endsWith('.srt'));
  console.log(`📁 Found ${srtFiles.length} SRT files`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const srtFile of srtFiles) {
    try {
      const videoId = extractVideoId(srtFile);
      
      if (!videoId) {
        console.log(`⏩ Skipping ${srtFile} - no video ID found`);
        skipCount++;
        continue;
      }
      
      // 이미 JSON 파일이 있는지 확인
      const jsonFile = `transcript-cache/${videoId}_real.json`;
      if (fs.existsSync(jsonFile)) {
        console.log(`⏩ Skipping ${videoId} - JSON already exists`);
        skipCount++;
        continue;
      }
      
      console.log(`🔧 Converting ${videoId}...`);
      
      // SRT 파일 읽기
      const srtContent = fs.readFileSync(srtFile, 'utf8');
      const transcript = parseSrt(srtContent);
      const videoTitle = extractVideoTitle(srtFile);
      
      // JSON 결과 생성
      const result = {
        success: true,
        videoId: videoId,
        videoTitle: videoTitle,
        transcript: transcript,
        method: 'yt-dlp-batch-auto',
        segments: transcript.length,
        timestamp: new Date().toISOString()
      };
      
      // JSON 파일 저장
      fs.writeFileSync(jsonFile, JSON.stringify(result, null, 2));
      
      console.log(`✅ ${videoId}: ${transcript.length} segments (${videoTitle.substring(0, 50)}...)`);
      successCount++;
      
    } catch (error) {
      console.log(`❌ Error processing ${srtFile}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n📊 Batch Conversion Complete!');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⏩ Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${successCount + skipCount + errorCount}`);
  
  return { successCount, skipCount, errorCount };
}

// 실행
convertAllSrtFiles().catch(console.error); 