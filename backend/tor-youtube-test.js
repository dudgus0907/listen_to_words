const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

/**
 * Tor 프록시를 통한 YouTube 직접 접근 테스트
 */
async function testTorYouTubeAccess() {
  console.log('🌐 Testing YouTube access via Tor proxy...\n');
  
  // Tor Browser SOCKS5 프록시 설정
  const torProxy = 'socks5://127.0.0.1:9150';
  const agent = new SocksProxyAgent(torProxy);
  
  try {
    // 1. Tor 연결 테스트
    console.log('🔧 Step 1: Testing Tor connection...');
    const ipResponse = await axios.get('https://httpbin.org/ip', {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 10000
    });
    
    console.log(`✅ Tor proxy working! IP: ${ipResponse.data.origin}`);
    
    // 2. YouTube 메인 페이지 접근 테스트
    console.log('\n🔧 Step 2: Testing YouTube main page access...');
    const ytResponse = await axios.get('https://www.youtube.com/', {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (ytResponse.status === 200) {
      console.log(`✅ YouTube accessible! Status: ${ytResponse.status}`);
      console.log(`📊 Response size: ${Math.round(ytResponse.data.length / 1024)}KB`);
      
      // 3. 특정 비디오 페이지 접근 테스트
      const videoId = 'dQw4w9WgXcQ';
      console.log(`\n🔧 Step 3: Testing specific video page access (${videoId})...`);
      
      const videoResponse = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (videoResponse.status === 200) {
        console.log(`✅ Video page accessible! Status: ${videoResponse.status}`);
        
        // 페이지에서 transcript 관련 키워드 검색
        const pageContent = videoResponse.data;
        const hasTranscript = pageContent.includes('transcript') || 
                              pageContent.includes('captions') || 
                              pageContent.includes('"captions"');
        
        console.log(`📝 Transcript indicators found: ${hasTranscript ? '✅ Yes' : '❌ No'}`);
        
        // 4. 결론 및 권장사항
        console.log('\n🎯 Conclusion:');
        console.log('✅ Tor proxy is working perfectly!');
        console.log('✅ YouTube is accessible via Tor');
        console.log('✅ Specific video pages can be accessed');
        
        if (hasTranscript) {
          console.log('✅ Transcript functionality may be available');
        } else {
          console.log('⚠️ Transcript functionality might be limited');
        }
        
        console.log('\n💡 Next steps:');
        console.log('1. Configure browser to use SOCKS5 proxy: 127.0.0.1:9150');
        console.log('2. Visit YouTube manually to verify transcript access');
        console.log('3. Try different videos with known transcripts');
        console.log('4. Use browser extensions for transcript extraction');
        
        return {
          success: true,
          torWorking: true,
          youtubeAccessible: true,
          videoAccessible: true,
          transcriptPossible: hasTranscript,
          proxyConfig: {
            type: 'socks5',
            host: '127.0.0.1',
            port: 9150,
            ip: ipResponse.data.origin
          }
        };
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// 실행
testTorYouTubeAccess()
  .then(result => {
    console.log('\n📊 Final Result:');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
  }); 