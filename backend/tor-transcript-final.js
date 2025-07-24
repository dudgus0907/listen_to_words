const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

/**
 * Tor 프록시를 통한 완전한 YouTube transcript 추출
 */
async function extractFullTranscript(videoId) {
  console.log(`🌐 Full transcript extraction for ${videoId} via Tor...\n`);
  
  const torProxy = 'socks5://127.0.0.1:9150';
  const agent = new SocksProxyAgent(torProxy);
  
  try {
    // 1. YouTube 페이지 접근
    console.log('🔧 Step 1: Loading YouTube page...');
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await axios.get(videoUrl, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    console.log(`✅ Page loaded! (${Math.round(response.data.length / 1024)}KB)`);
    
    // 2. ytInitialPlayerResponse에서 captions 정보 추출
    console.log('🔧 Step 2: Extracting caption URLs...');
    const pageContent = response.data;
    
    const playerResponseMatch = pageContent.match(/ytInitialPlayerResponse["\s]*=["\s]*({.*?});/);
    
    if (!playerResponseMatch) {
      throw new Error('Could not find ytInitialPlayerResponse');
    }
    
    const playerResponse = JSON.parse(playerResponseMatch[1]);
    const captions = playerResponse.captions?.playerCaptionsTracklistRenderer;
    
    if (!captions || !captions.captionTracks) {
      throw new Error('No caption tracks found');
    }
    
    console.log(`✅ Found ${captions.captionTracks.length} caption track(s)`);
    
    // 3. 영어 caption track 찾기
    let englishTrack = null;
    for (const track of captions.captionTracks) {
      console.log(`   - ${track.name?.simpleText || 'Unknown'} (${track.languageCode})`);
      if (track.languageCode === 'en' || track.languageCode === 'en-US') {
        englishTrack = track;
        break;
      }
    }
    
    // 영어가 없으면 첫 번째 track 사용
    if (!englishTrack && captions.captionTracks.length > 0) {
      englishTrack = captions.captionTracks[0];
      console.log(`⚠️ Using first available track: ${englishTrack.languageCode}`);
    }
    
    if (!englishTrack) {
      throw new Error('No suitable caption track found');
    }
    
    // 4. Caption XML 다운로드
    console.log(`\n🔧 Step 3: Downloading caption XML...`);
    const captionUrl = englishTrack.baseUrl;
    console.log(`📥 Caption URL: ${captionUrl.substring(0, 100)}...`);
    
    const captionResponse = await axios.get(captionUrl, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`✅ Caption XML downloaded! (${captionResponse.data.length} bytes)`);
    
    // 5. XML 파싱
    console.log('🔧 Step 4: Parsing XML transcript...');
    const xmlData = captionResponse.data;
    
    // 간단한 XML 파싱 (text 태그 추출)
    const textMatches = xmlData.match(/<text[^>]*>([^<]*)<\/text>/g);
    const transcript = [];
    
    if (textMatches) {
      textMatches.forEach((match, index) => {
        const timeMatch = match.match(/start="([^"]*)".*?dur="([^"]*)"/);
        const textMatch = match.match(/>([^<]*)</);
        
        if (timeMatch && textMatch) {
          const start = Math.floor(parseFloat(timeMatch[1]));
          const duration = Math.floor(parseFloat(timeMatch[2] || '0'));
          const text = textMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
          
          if (text) {
            transcript.push({
              start,
              duration,
              text
            });
          }
        }
      });
    }
    
    console.log(`✅ Parsed ${transcript.length} transcript segments`);
    
    // 6. 결과 정리
    const result = {
      success: true,
      videoId,
      videoTitle: pageContent.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(' - YouTube', '') || 'Unknown',
      language: englishTrack.languageCode,
      segments: transcript.length,
      transcript: transcript,
      method: 'tor-caption-xml',
      torIP: (await axios.get('https://httpbin.org/ip', { httpAgent: agent, httpsAgent: agent })).data.origin
    };
    
    // 7. 미리보기 출력
    console.log('\n🎬 Transcript Preview:');
    transcript.slice(0, 5).forEach((seg, i) => {
      console.log(`   ${i+1}. [${seg.start}s] ${seg.text}`);
    });
    
    // 8. 캐시에 저장
    const fs = require('fs');
    const path = require('path');
    
    try {
      const cacheFile = path.join(__dirname, 'transcript-cache', `${videoId}_tor.json`);
      fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
      console.log(`\n💾 Saved to cache: ${videoId}_tor.json`);
    } catch (saveError) {
      console.log(`⚠️ Could not save to cache: ${saveError.message}`);
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
🌐 Tor Complete YouTube Transcript Extractor

Usage:
  node tor-transcript-final.js <video_id>

Example:
  node tor-transcript-final.js ocGJWc2F1Yk

Note: 
  Requires Tor Browser running on 127.0.0.1:9150
    `);
    return;
  }
  
  const result = await extractFullTranscript(videoId);
  
  console.log('\n📊 Final Result:');
  console.log(`Success: ${result.success}`);
  if (result.success) {
    console.log(`Video: ${result.videoTitle}`);
    console.log(`Language: ${result.language}`);
    console.log(`Segments: ${result.segments}`);
    console.log(`Method: ${result.method}`);
  } else {
    console.log(`Error: ${result.error}`);
  }
}

main().catch(console.error); 