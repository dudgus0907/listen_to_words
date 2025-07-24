const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

/**
 * Tor 프록시를 통한 직접 YouTube transcript 추출
 */
async function extractTranscriptViaTor(videoId) {
  console.log(`🌐 Extracting transcript for ${videoId} via Tor proxy...\n`);
  
  // Tor 프록시 설정
  const torProxy = 'socks5://127.0.0.1:9150';
  const agent = new SocksProxyAgent(torProxy);
  
  try {
    // 1. Tor 연결 확인
    console.log('🔧 Step 1: Verifying Tor connection...');
    const ipCheck = await axios.get('https://httpbin.org/ip', {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 5000
    });
    console.log(`✅ Tor working! IP: ${ipCheck.data.origin}\n`);
    
    // 2. YouTube 비디오 페이지 접근
    console.log(`🔧 Step 2: Accessing YouTube video page...`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await axios.get(videoUrl, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });
    
    console.log(`✅ Page loaded! Status: ${response.status}`);
    console.log(`📊 Content size: ${Math.round(response.data.length / 1024)}KB\n`);
    
    // 3. 페이지에서 transcript 관련 정보 찾기
    console.log('🔧 Step 3: Searching for transcript data...');
    const pageContent = response.data;
    
    // 다양한 transcript 관련 패턴 검색
    const patterns = [
      /"captions":\s*{[^}]*"playerCaptionsTracklistRenderer"/,
      /"transcriptRenderer":\s*{/,
      /"captionTracks":\s*\[/,
      /"automaticCaptions":\s*{/,
      /ytInitialPlayerResponse["\s]*=["\s]*{.*?"captions"/,
      /"timedtext"/
    ];
    
    let foundPatterns = [];
    patterns.forEach((pattern, index) => {
      if (pattern.test(pageContent)) {
        foundPatterns.push(`Pattern ${index + 1}`);
      }
    });
    
    console.log(`📝 Transcript patterns found: ${foundPatterns.length > 0 ? foundPatterns.join(', ') : 'None'}`);
    
    // 4. 비디오 제목 추출
    const titleMatch = pageContent.match(/<title>([^<]+)<\/title>/);
    const videoTitle = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'Unknown';
    console.log(`🎬 Video title: ${videoTitle}`);
    
    // 5. ytInitialPlayerResponse에서 captions 정보 찾기
    const playerResponseMatch = pageContent.match(/ytInitialPlayerResponse["\s]*=["\s]*({.*?});/);
    let captionsInfo = null;
    
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        if (playerResponse.captions) {
          captionsInfo = playerResponse.captions;
          console.log('✅ Found captions configuration in player response');
        }
      } catch (e) {
        console.log('⚠️ Could not parse player response');
      }
    }
    
    // 6. 결과 정리
    const result = {
      success: foundPatterns.length > 0,
      videoId,
      videoTitle,
      torIP: ipCheck.data.origin,
      foundPatterns: foundPatterns.length,
      hasCaptionsConfig: !!captionsInfo,
      pageSize: response.data.length,
      method: 'tor-direct-page-scraping'
    };
    
    if (captionsInfo) {
      result.captionsDetails = {
        hasPlayerCaptionsTracklistRenderer: !!captionsInfo.playerCaptionsTracklistRenderer,
        hasAudioTracks: !!captionsInfo.playerCaptionsTracklistRenderer?.audioTracks,
        hasCaptionTracks: !!captionsInfo.playerCaptionsTracklistRenderer?.captionTracks
      };
    }
    
    console.log('\n🎯 Results:');
    if (result.success) {
      console.log('✅ Transcript indicators found!');
      console.log('💡 Next steps:');
      console.log('   1. Configure browser proxy: SOCKS5 127.0.0.1:9150');
      console.log('   2. Visit YouTube manually and check transcript button');
      console.log('   3. Use browser extension for transcript extraction');
      console.log('   4. Try YouTube API with different approach');
    } else {
      console.log('❌ No transcript indicators found');
      console.log('💡 This video might not have transcripts available');
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      videoId
    };
  }
}

// 실행
async function main() {
  const videoId = process.argv[2];
  
  if (!videoId) {
    console.log(`
🌐 Tor Direct YouTube Transcript Extractor

Usage:
  node tor-direct-extract.js <video_id>

Example:
  node tor-direct-extract.js ocGJWc2F1Yk
  node tor-direct-extract.js dQw4w9WgXcQ

Note: 
  Requires Tor Browser running on 127.0.0.1:9150
    `);
    return;
  }
  
  const result = await extractTranscriptViaTor(videoId);
  
  console.log('\n📊 Final Result:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error); 