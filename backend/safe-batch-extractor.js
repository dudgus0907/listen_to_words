const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * 안전한 배치 자막 추출기 (IP 차단 방지)
 */
class SafeBatchExtractor {
  constructor() {
    this.successCount = 0;
    this.failCount = 0;
    this.skippedCount = 0;
    this.processedUrls = [];
    this.delayBetweenRequests = 3000; // 3초 대기
    this.batchSize = 5; // 한번에 5개씩
    this.maxRetries = 2;
  }

  /**
   * URL에서 Video ID 추출
   */
  extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  /**
   * 단일 영상의 자막 추출
   */
  async extractSingleVideo(url, retryCount = 0) {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      console.log(`❌ Invalid URL: ${url}`);
      return { success: false, error: 'Invalid URL' };
    }

    // 이미 처리된 영상인지 확인
    const existingFiles = [
      `transcript-cache/${videoId}_real.json`,
      `transcript-cache/${videoId}_ytdlp.json`,
      `${videoId}.en-US.srt`
    ];

    for (const file of existingFiles) {
      if (fs.existsSync(file)) {
        console.log(`⏩ Skipping ${videoId} - already exists`);
        this.skippedCount++;
        return { success: true, skipped: true };
      }
    }

    console.log(`🔧 Processing ${videoId}...`);

          return new Promise((resolve) => {
        // 언어 지정 없이 사용 가능한 첫 번째 자동 생성 자막 가져오기
        const args = [
          '--skip-download',
          '--write-auto-subs',  // 자동 생성 자막 사용
          '--sub-format', 'srt',
          url
        ];

        const ytdlp = spawn('yt-dlp', args);
      let output = '';
      let errorOutput = '';

      ytdlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytdlp.on('close', async (code) => {
        if (code === 0) {
          // SRT 파일이 생성되었는지 확인
          const srtFiles = fs.readdirSync('.').filter(f => 
            f.includes(videoId) && f.endsWith('.srt')
          );

          if (srtFiles.length > 0) {
            try {
              // SRT를 JSON으로 변환
              const result = await this.convertSrtToJson(srtFiles[0], videoId);
              if (result.success) {
                console.log(`✅ Success: ${videoId} (${result.segments} segments)`);
                this.successCount++;
                resolve({ success: true, segments: result.segments });
              } else {
                console.log(`⚠️ Conversion failed: ${videoId}`);
                this.failCount++;
                resolve({ success: false, error: 'Conversion failed' });
              }
            } catch (error) {
              console.log(`❌ Error processing ${videoId}: ${error.message}`);
              this.failCount++;
              resolve({ success: false, error: error.message });
            }
          } else {
            console.log(`⚠️ No subtitles available: ${videoId}`);
            this.failCount++;
            resolve({ success: false, error: 'No subtitles' });
          }
        } else {
          console.log(`❌ yt-dlp failed for ${videoId}: ${errorOutput}`);
          
          // 재시도 로직
          if (retryCount < this.maxRetries) {
            console.log(`🔄 Retrying ${videoId} (${retryCount + 1}/${this.maxRetries})...`);
            await this.sleep(5000); // 5초 대기 후 재시도
            const retryResult = await this.extractSingleVideo(url, retryCount + 1);
            resolve(retryResult);
          } else {
            this.failCount++;
            resolve({ success: false, error: errorOutput });
          }
        }
      });
    });
  }

  /**
   * SRT를 JSON으로 변환
   */
  async convertSrtToJson(srtFile, videoId) {
    try {
      const srtContent = fs.readFileSync(srtFile, 'utf8');
      const transcript = this.parseSrt(srtContent);
      
      const result = {
        videoId: videoId,
        videoTitle: `EO Global Video ${videoId}`,
        transcript: transcript,
        method: 'yt-dlp-batch',
        timestamp: new Date().toISOString()
      };

      const cacheFile = `transcript-cache/${videoId}_real.json`;
      fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
      
      // SRT 파일 정리
      fs.unlinkSync(srtFile);
      
      return { success: true, segments: transcript.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * SRT 파싱 (기존 함수 재사용)
   */
  parseSrt(srtContent) {
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

  /**
   * 지연 함수
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 배치 처리 실행
   */
  async processBatch(urls, startIndex = 0, count = 5) {
    console.log(`\n🚀 Processing batch: ${startIndex + 1}-${Math.min(startIndex + count, urls.length)} of ${urls.length}\n`);
    
    const batch = urls.slice(startIndex, startIndex + count);
    
    for (let i = 0; i < batch.length; i++) {
      const url = batch[i];
      const globalIndex = startIndex + i + 1;
      
      console.log(`\n📹 [${globalIndex}/${urls.length}] Processing: ${url}`);
      
      await this.extractSingleVideo(url);
      
      // 마지막 요청이 아니면 대기
      if (i < batch.length - 1) {
        console.log(`⏱️ Waiting ${this.delayBetweenRequests/1000}s before next request...`);
        await this.sleep(this.delayBetweenRequests);
      }
    }

    this.printStats();
  }

  /**
   * 통계 출력
   */
  printStats() {
    console.log(`\n📊 Current Stats:`);
    console.log(`   ✅ Success: ${this.successCount}`);
    console.log(`   ❌ Failed: ${this.failCount}`);
    console.log(`   ⏩ Skipped: ${this.skippedCount}`);
    console.log(`   📝 Total processed: ${this.successCount + this.failCount + this.skippedCount}`);
  }
}

// 실행
async function main() {
  const batchSize = parseInt(process.argv[2]) || 5;
  const startIndex = parseInt(process.argv[3]) || 0;
  
  console.log(`
🛡️ Safe Batch Subtitle Extractor

Configuration:
  📦 Batch size: ${batchSize}
  ⏱️ Delay between requests: 3 seconds
  🔄 Max retries: 2
  📍 Starting from index: ${startIndex}
  
`);

  try {
    // URL 파일 읽기
    const urls = fs.readFileSync('eoglobal_urls.txt', 'utf8')
      .split('\n')
      .filter(url => url.trim().length > 0);

    console.log(`📋 Loaded ${urls.length} URLs from eoglobal_urls.txt`);

    const extractor = new SafeBatchExtractor();
    await extractor.processBatch(urls, startIndex, batchSize);

    console.log(`\n🎉 Batch processing complete!`);
    extractor.printStats();

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 