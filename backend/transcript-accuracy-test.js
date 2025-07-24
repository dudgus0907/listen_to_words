const { YoutubeTranscript } = require('youtube-transcript');
const ytdl = require('ytdl-core');
const { getSubtitles } = require('youtube-captions-scraper');

class TranscriptAccuracyTester {
  constructor() {
    this.testResults = {};
  }

  async testMethod1_YoutubeTranscript(videoId) {
    console.log('\n🔍 Method 1: youtube-transcript');
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcript && transcript.length > 0) {
        const formatted = transcript.slice(0, 10).map(item => ({
          start: Math.floor(item.offset / 1000),
          duration: Math.floor((item.duration || 0) / 1000),
          text: item.text.replace(/\n/g, ' ').trim()
        }));
        
        console.log(`✅ Success: ${transcript.length} segments found`);
        console.log('Sample segments:');
        formatted.forEach((seg, i) => {
          console.log(`  ${seg.start}s: "${seg.text}"`);
        });
        
        return { success: true, segments: transcript.length, sample: formatted };
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testMethod2_YtdlCore(videoId) {
    console.log('\n🔍 Method 2: ytdl-core');
    try {
      const info = await ytdl.getInfo(videoId);
      
      // 자막 트랙 찾기
      const tracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (tracks && tracks.length > 0) {
        console.log(`✅ Found ${tracks.length} caption tracks`);
        
        // 영어 자막 찾기
        const englishTrack = tracks.find(track => 
          track.languageCode === 'en' || 
          track.languageCode === 'en-US' ||
          track.name?.simpleText?.includes('English')
        );
        
        if (englishTrack) {
          console.log(`📝 English track found: ${englishTrack.name?.simpleText}`);
          console.log(`📋 Auto-generated: ${englishTrack.kind || 'unknown'}`);
          return { 
            success: true, 
            tracks: tracks.length, 
            hasEnglish: true,
            trackInfo: {
              name: englishTrack.name?.simpleText,
              kind: englishTrack.kind,
              url: englishTrack.baseUrl?.substring(0, 100) + '...'
            }
          };
        } else {
          console.log('❌ No English track found');
          console.log('Available tracks:', tracks.map(t => t.languageCode));
          return { success: true, tracks: tracks.length, hasEnglish: false };
        }
      } else {
        console.log('❌ No caption tracks found');
        return { success: false, error: 'No captions available' };
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testMethod3_CaptionsScraper(videoId) {
    console.log('\n🔍 Method 3: youtube-captions-scraper');
    try {
      const captions = await getSubtitles({
        videoID: videoId,
        lang: 'en'
      });
      
      if (captions && captions.length > 0) {
        const formatted = captions.slice(0, 10).map(item => ({
          start: Math.floor(item.start),
          duration: Math.floor(item.dur || 0),
          text: item.text.replace(/\n/g, ' ').trim()
        }));
        
        console.log(`✅ Success: ${captions.length} segments found`);
        console.log('Sample segments:');
        formatted.forEach((seg, i) => {
          console.log(`  ${seg.start}s: "${seg.text}"`);
        });
        
        return { success: true, segments: captions.length, sample: formatted };
      } else {
        console.log('❌ No captions found');
        return { success: false, error: 'No captions available' };
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testVideoAccuracy(videoId, expectedQuote, expectedTime) {
    console.log(`\n🎯 Testing accuracy for video: ${videoId}`);
    console.log(`Expected: "${expectedQuote}" at ~${expectedTime}s`);
    console.log('='.repeat(60));
    
    const results = {
      videoId,
      expectedQuote,
      expectedTime,
      methods: {}
    };

    // Method 1 테스트
    results.methods.youtubeTranscript = await this.testMethod1_YoutubeTranscript(videoId);
    
    // Method 2 테스트
    results.methods.ytdlCore = await this.testMethod2_YtdlCore(videoId);
    
    // Method 3 테스트
    results.methods.captionsScraper = await this.testMethod3_CaptionsScraper(videoId);

    return results;
  }

  async runFullTest() {
    console.log('🚀 Starting Comprehensive Transcript Accuracy Test\n');
    
    // 잘 알려진 영상들과 정확한 명대사/시간
    const testCases = [
      {
        id: 'UF8uR6Z6KLc',
        title: 'Steve Jobs Stanford Speech',
        expectedQuote: 'Stay hungry. Stay foolish.',
        expectedTime: 840 // 대략 14분 경
      },
      {
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        expectedQuote: 'Never gonna give you up',
        expectedTime: 43
      },
      {
        id: 'iCvmsMzlF7o',
        title: 'Julian Treasure - How to speak',
        expectedQuote: 'How to speak so that people want to listen',
        expectedTime: 20
      }
    ];

    const allResults = [];

    for (const testCase of testCases) {
      const result = await this.testVideoAccuracy(
        testCase.id,
        testCase.expectedQuote,
        testCase.expectedTime
      );
      result.title = testCase.title;
      allResults.push(result);
      
      // 다음 테스트 전 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 결과 분석
    this.analyzeResults(allResults);
    return allResults;
  }

  analyzeResults(results) {
    console.log('\n📊 COMPREHENSIVE ANALYSIS');
    console.log('='.repeat(60));
    
    const methodStats = {
      youtubeTranscript: { success: 0, total: 0 },
      ytdlCore: { success: 0, total: 0 },
      captionsScraper: { success: 0, total: 0 }
    };

    results.forEach(result => {
      Object.keys(methodStats).forEach(method => {
        methodStats[method].total++;
        if (result.methods[method]?.success) {
          methodStats[method].success++;
        }
      });
    });

    console.log('\n🎯 Success Rates:');
    Object.entries(methodStats).forEach(([method, stats]) => {
      const rate = Math.round((stats.success / stats.total) * 100);
      console.log(`  ${method}: ${stats.success}/${stats.total} (${rate}%)`);
    });

    // 추천 방법
    const bestMethod = Object.entries(methodStats)
      .sort((a, b) => b[1].success - a[1].success)[0];
    
    console.log(`\n🏆 Best performing method: ${bestMethod[0]}`);
    
    console.log('\n💡 Recommendations:');
    if (methodStats.youtubeTranscript.success > 0) {
      console.log('   ✅ youtube-transcript works - use as primary');
    }
    if (methodStats.ytdlCore.success > 0) {
      console.log('   ✅ ytdl-core works - use as secondary');
    }
    if (methodStats.captionsScraper.success > 0) {
      console.log('   ✅ captions-scraper works - use as fallback');
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Use successful methods in production');
    console.log('   2. Implement fallback chain');
    console.log('   3. Verify timestamp accuracy manually');
    console.log('   4. Cache successful extractions');
  }
}

// 실행
async function runTest() {
  const tester = new TranscriptAccuracyTester();
  try {
    await tester.runFullTest();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

if (require.main === module) {
  runTest();
}

module.exports = { TranscriptAccuracyTester }; 