const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs');

/**
 * XML 디버깅을 위한 스크립트
 */
async function debugCaptionXML(videoId) {
  console.log(`🔍 Debugging caption XML for ${videoId}...\n`);
  
  const torProxy = 'socks5://127.0.0.1:9150';
  const agent = new SocksProxyAgent(torProxy);
  
  try {
    // 1. YouTube 페이지 접근
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await axios.get(videoUrl, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ Page loaded');
    
    // 2. Caption URL 찾기
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
    
    const track = captions.captionTracks[0];
    const captionUrl = track.baseUrl;
    
    console.log(`🔗 Caption URL: ${captionUrl.substring(0, 80)}...`);
    
    // 3. XML 다운로드
    const captionResponse = await axios.get(captionUrl, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const xmlData = captionResponse.data;
    console.log(`\n📥 Downloaded XML (${xmlData.length} bytes)`);
    
    // 4. XML 내용 분석
    console.log('\n🔍 XML Content Analysis:');
    console.log(`First 500 characters:`);
    console.log(xmlData.substring(0, 500));
    console.log('\n...');
    
    // 5. XML 구조 분석
    const xmlLines = xmlData.split('\n').slice(0, 20);
    console.log('\n📋 First 20 lines:');
    xmlLines.forEach((line, i) => {
      console.log(`${(i+1).toString().padStart(2, '0')}: ${line}`);
    });
    
    // 6. 다양한 패턴 테스트
    console.log('\n🧪 Pattern Testing:');
    
    const patterns = [
      { name: 'Basic text tags', regex: /<text[^>]*>.*?<\/text>/g },
      { name: 'Self-closing text', regex: /<text[^>]*\/>/g },
      { name: 'Any text content', regex: /<text[^>]*>([^<]*)/g },
      { name: 'Start attribute', regex: /start="([^"]*)"/g },
      { name: 'Dur attribute', regex: /dur="([^"]*)"/g }
    ];
    
    patterns.forEach(pattern => {
      const matches = xmlData.match(pattern.regex);
      console.log(`   ${pattern.name}: ${matches ? matches.length : 0} matches`);
      if (matches && matches.length > 0) {
        console.log(`      Example: ${matches[0].substring(0, 80)}...`);
      }
    });
    
    // 7. XML 파일로 저장
    const xmlFile = `debug_${videoId}_captions.xml`;
    fs.writeFileSync(xmlFile, xmlData);
    console.log(`\n💾 XML saved to: ${xmlFile}`);
    
    return {
      success: true,
      xmlLength: xmlData.length,
      captionUrl: captionUrl,
      xmlPreview: xmlData.substring(0, 500)
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 실행
debugCaptionXML('ocGJWc2F1Yk').catch(console.error); 