const { YoutubeTranscript } = require('youtube-transcript');
const { SocksProxyAgent } = require('socks-proxy-agent');

/**
 * 기존 youtube-transcript 라이브러리에 Tor 프록시 적용
 */
async function extractWithLibraryAndTor(videoId) {
  console.log(`🔧 Extracting ${videoId} using youtube-transcript library + Tor proxy...\n`);
  
  try {
    // Tor 프록시 설정
    const torProxy = 'socks5://127.0.0.1:9150';
    const agent = new SocksProxyAgent(torProxy);
    
    // youtube-transcript 라이브러리의 기본 axios 인스턴스에 프록시 적용
    // 이 방법으로 라이브러리가 Tor를 통해 요청하게 만들기
    
    console.log('🌐 Configuring youtube-transcript with Tor proxy...');
    
    // Option 1: 환경변수 설정 (일부 라이브러리에서 지원)
    process.env.https_proxy = torProxy;
    process.env.http_proxy = torProxy;
    
    // Option 2: 직접 라이브러리 호출 (첫 번째 사용 가능한 언어로 시도)
    let transcript;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en',
        country: 'US'
      });
    } catch (error) {
      console.log('⚠️ "en" failed, trying without lang specification...');
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
    }
    
    console.log(`✅ Success! Extracted ${transcript.length} segments`);
    
    // 결과 포맷팅
    const formattedTranscript = transcript.map(item => ({
      start: Math.floor(item.offset / 1000), // ms를 초로 변환
      duration: Math.floor(item.duration / 1000),
      text: item.text
    }));
    
    console.log('\n📝 Preview:');
    formattedTranscript.slice(0, 5).forEach((seg, i) => {
      console.log(`   ${i+1}. [${seg.start}s] ${seg.text}`);
    });
    
    return {
      success: true,
      videoId,
      segments: formattedTranscript.length,
      transcript: formattedTranscript,
      method: 'youtube-transcript-library-tor'
    };
    
  } catch (error) {
    console.error(`❌ Library extraction failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      videoId
    };
  } finally {
    // 환경변수 정리
    delete process.env.https_proxy;
    delete process.env.http_proxy;
  }
}

// 실행
async function main() {
  const videoId = process.argv[2] || 'dQw4w9WgXcQ';
  
  console.log(`
🎯 Using youtube-transcript Library with Tor Proxy

Testing video: ${videoId}
Tor proxy: 127.0.0.1:9150

`);
  
  const result = await extractWithLibraryAndTor(videoId);
  
  console.log('\n📊 Final Result:');
  console.log(`Success: ${result.success}`);
  if (result.success) {
    console.log(`Segments: ${result.segments}`);
    console.log(`Method: ${result.method}`);
  } else {
    console.log(`Error: ${result.error}`);
  }
}

main().catch(console.error); 