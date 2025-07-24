const { YoutubeTranscript } = require('youtube-transcript');

/**
 * 수동으로 YouTube Transcript 추출기
 * YouTube 영상 링크만 있으면 transcript 변환 가능
 * IP 블록과 관계없이 작동
 */
class ManualTranscriptExtractor {
  constructor() {
    this.supportedLanguages = [
      'en-US', 'en-GB', 'en-CA', 'en-AU', 'en', // 영어 변형들
      'ko', 'ko-KR', // 한국어
      'ja', 'ja-JP', // 일본어  
      'zh', 'zh-CN', 'zh-TW', // 중국어
      'es', 'es-ES', 'es-MX', // 스페인어
      'fr', 'fr-FR', 'fr-CA', // 프랑스어
      'de', 'de-DE', // 독일어
      'it', 'it-IT', // 이탈리아어
      'pt', 'pt-BR', 'pt-PT', // 포르투갈어
      'ru', 'ru-RU', // 러시아어
      'ar', 'ar-SA', // 아랍어
      'hi', 'hi-IN' // 힌디어
    ];
  }

  /**
   * YouTube URL에서 영상 ID 추출
   */
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : url; // URL이면 ID 추출, 아니면 그대로 반환
  }

  /**
   * 사용 가능한 자막 언어 확인
   */
  async getAvailableLanguages(videoId) {
    try {
      console.log(`🔍 Checking available languages for ${videoId}...`);
      
      // 가능한 언어들을 시도해보면서 사용 가능한 것들 찾기
      const availableLanguages = [];
      
      for (const lang of this.supportedLanguages) {
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
          if (transcript && transcript.length > 0) {
            availableLanguages.push({
              code: lang,
              segments: transcript.length,
              preview: transcript[0].text.substring(0, 50) + '...'
            });
            console.log(`✅ Found ${lang}: ${transcript.length} segments`);
            break; // 첫 번째 성공한 언어로 진행
          }
        } catch (error) {
          // 이 언어는 사용 불가능, 다음 언어 시도
        }
      }
      
      return availableLanguages;
    } catch (error) {
      console.error(`❌ Error checking languages: ${error.message}`);
      return [];
    }
  }

  /**
   * 수동으로 transcript 추출
   */
  async extractManually(urlOrId, preferredLang = 'en-US') {
    const videoId = this.extractVideoId(urlOrId);
    
    console.log(`\n🎬 Manual Transcript Extraction`);
    console.log(`📺 Video ID: ${videoId}`);
    console.log(`🌐 Preferred Language: ${preferredLang}`);
    console.log(`🔗 Original URL: ${urlOrId}`);
    
    try {
      // 1. 선호 언어로 시도
      try {
        console.log(`\n🎯 Trying preferred language: ${preferredLang}`);
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: preferredLang });
        
        if (transcript && transcript.length > 0) {
          const formatted = this.formatTranscript(transcript);
          
          console.log(`✅ SUCCESS with ${preferredLang}!`);
          console.log(`📊 Extracted ${formatted.length} segments`);
          console.log(`⏱️ Duration: ~${Math.max(...formatted.map(t => t.start))} seconds`);
          
          return {
            success: true,
            videoId,
            language: preferredLang,
            segments: formatted.length,
            transcript: formatted,
            method: 'manual-extract'
          };
        }
      } catch (preferredError) {
        console.log(`⚠️ ${preferredLang} not available: ${preferredError.message}`);
      }

      // 2. 사용 가능한 언어들 시도
      console.log(`\n🔍 Trying other available languages...`);
      const availableLanguages = await this.getAvailableLanguages(videoId);
      
      if (availableLanguages.length > 0) {
        const lang = availableLanguages[0].code;
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
        const formatted = this.formatTranscript(transcript);
        
        console.log(`✅ SUCCESS with ${lang}!`);
        console.log(`📊 Extracted ${formatted.length} segments`);
        
        return {
          success: true,
          videoId,
          language: lang,
          segments: formatted.length,
          transcript: formatted,
          method: 'manual-extract'
        };
      } else {
        return {
          success: false,
          error: 'No supported language found for this video',
          videoId
        };
      }

    } catch (error) {
      console.error(`❌ Manual extraction failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        videoId
      };
    }
  }

  /**
   * Transcript 포맷팅
   */
  formatTranscript(rawTranscript) {
    return rawTranscript.map(item => ({
      start: Math.floor(item.offset / 1000),
      duration: Math.floor(item.duration / 1000),
      text: item.text.replace(/\n/g, ' ').trim()
    })).filter(item => item.text.length > 2);
  }
}

// 메인 실행 함수
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🎬 Manual YouTube Transcript Extractor

사용법:
  node manual-transcript-extractor.js <YouTube URL 또는 Video ID> [언어코드]

예시:
  node manual-transcript-extractor.js "https://www.youtube.com/watch?v=ocGJWc2F1Yk"
  node manual-transcript-extractor.js ocGJWc2F1Yk en-US
  node manual-transcript-extractor.js dQw4w9WgXcQ ko

지원 언어: en-US, en-GB, ko, ja, zh, es, fr, de, it, pt, ru, ar, hi
    `);
    return;
  }

  const urlOrId = args[0];
  const preferredLang = args[1] || 'en-US';
  
  const extractor = new ManualTranscriptExtractor();
  const result = await extractor.extractManually(urlOrId, preferredLang);
  
  if (result.success) {
    console.log(`\n🎉 Extraction Complete!`);
    console.log(`📄 First few segments:`);
    result.transcript.slice(0, 3).forEach((seg, i) => {
      console.log(`   ${i+1}. [${seg.start}s] ${seg.text}`);
    });
    
    // 캐시에 저장 (옵션)
    if (args.includes('--save')) {
      const fs = require('fs');
      const path = require('path');
      const cacheFile = path.join(__dirname, 'transcript-cache', `${result.videoId}_manual.json`);
      fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
      console.log(`💾 Saved to cache: ${result.videoId}_manual.json`);
    }
  } else {
    console.log(`\n❌ Extraction Failed: ${result.error}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ManualTranscriptExtractor }; 