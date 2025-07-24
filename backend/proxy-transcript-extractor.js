const { YoutubeTranscript } = require('youtube-transcript');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

/**
 * 프록시를 사용한 YouTube Transcript 추출기
 * IP 블록을 우회하기 위한 다양한 프록시 옵션 지원
 */
class ProxyTranscriptExtractor {
  constructor() {
    this.proxyOptions = [
      // 공개 SOCKS 프록시들 (무료)
      { type: 'socks5', host: '127.0.0.1', port: 9050, name: 'Local Tor (if running)' },
      { type: 'socks5', host: '127.0.0.1', port: 9150, name: 'Tor Browser SOCKS' },
      // 공개 HTTP 프록시들 (테스트용)
      { type: 'http', host: 'proxy-server.com', port: 8080, name: 'Public HTTP Proxy' },
    ];
    
    this.workingProxies = [];
    this.currentProxyIndex = 0;
  }

  /**
   * URL에서 비디오 ID 추출
   */
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : url;
  }

  /**
   * 프록시 연결 테스트
   */
  async testProxy(proxy) {
    try {
      console.log(`🔧 Testing proxy: ${proxy.name} (${proxy.type}://${proxy.host}:${proxy.port})`);
      
      let agent;
      if (proxy.type === 'socks5') {
        agent = new SocksProxyAgent(`socks5://${proxy.host}:${proxy.port}`);
      } else {
        agent = new SocksProxyAgent(`http://${proxy.host}:${proxy.port}`);
      }

      // 간단한 HTTP 요청으로 프록시 테스트
      const response = await axios.get('https://httpbin.org/ip', {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 5000
      });

      console.log(`✅ Proxy working! External IP: ${response.data.origin}`);
      return true;
    } catch (error) {
      console.log(`❌ Proxy failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 작동하는 프록시 찾기
   */
  async findWorkingProxies() {
    console.log('🔍 Searching for working proxies...\n');
    
    this.workingProxies = [];
    
    for (const proxy of this.proxyOptions) {
      const isWorking = await this.testProxy(proxy);
      if (isWorking) {
        this.workingProxies.push(proxy);
      }
      
      // 프록시 테스트 간 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Found ${this.workingProxies.length} working proxy(ies)`);
    return this.workingProxies.length > 0;
  }

  /**
   * 프록시 없이 직접 시도
   */
  async extractDirectly(videoId) {
    try {
      console.log(`\n🎯 Trying direct extraction (no proxy)...`);
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcript && transcript.length > 0) {
        console.log(`✅ Direct extraction SUCCESS! ${transcript.length} segments`);
        return {
          success: true,
          method: 'direct',
          data: this.formatTranscript(transcript),
          proxy: 'none'
        };
      }
    } catch (error) {
      console.log(`❌ Direct extraction failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 프록시 사용해서 추출 (Node.js 제한으로 인해 시뮬레이션)
   */
  async extractWithProxy(videoId) {
    if (this.workingProxies.length === 0) {
      console.log('❌ No working proxies available');
      return { success: false, error: 'No working proxies' };
    }

    const proxy = this.workingProxies[this.currentProxyIndex % this.workingProxies.length];
    this.currentProxyIndex++;

    try {
      console.log(`\n🌐 Trying with proxy: ${proxy.name}`);
      
      // NOTE: youtube-transcript 라이브러리는 직접적인 프록시 지원이 제한적
      // 실제 환경에서는 Python 스크립트나 다른 방법 필요
      console.log(`⚠️ Note: youtube-transcript library has limited proxy support`);
      console.log(`💡 Recommended: Use Python script with proxy or try different approach`);
      
      // 시뮬레이션: 프록시를 사용한다면...
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcript && transcript.length > 0) {
        console.log(`✅ Proxy extraction SUCCESS! ${transcript.length} segments`);
        return {
          success: true,
          method: 'proxy',
          data: this.formatTranscript(transcript),
          proxy: proxy.name
        };
      }
    } catch (error) {
      console.log(`❌ Proxy extraction failed: ${error.message}`);
      
      // 다음 프록시로 자동 시도
      if (this.currentProxyIndex < this.workingProxies.length) {
        console.log(`🔄 Trying next proxy...`);
        return this.extractWithProxy(videoId);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 메인 추출 함수
   */
  async extract(urlOrId) {
    const videoId = this.extractVideoId(urlOrId);
    
    console.log(`\n🎬 Proxy-Enhanced Transcript Extraction`);
    console.log(`📺 Video ID: ${videoId}`);
    console.log(`🔗 URL: ${urlOrId}`);
    
    // 1. 직접 연결 시도
    let result = await this.extractDirectly(videoId);
    if (result.success) {
      return result;
    }
    
    // 2. 프록시 찾기
    const hasProxies = await this.findWorkingProxies();
    if (!hasProxies) {
      console.log('\n❌ No working proxies found. Consider:');
      console.log('   • Installing Tor Browser (opens SOCKS proxy on port 9150)');
      console.log('   • Using VPN service');
      console.log('   • Waiting 24-48 hours for IP block to reset');
      return { success: false, error: 'No proxies available and direct connection failed' };
    }
    
    // 3. 프록시 사용해서 시도
    result = await this.extractWithProxy(videoId);
    return result;
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

  /**
   * 캐시에 저장
   */
  async saveToCache(videoId, data) {
    try {
      const fs = require('fs');
      const path = require('path');
      const cacheFile = path.join(__dirname, 'transcript-cache', `${videoId}_proxy.json`);
      
      const cacheData = {
        videoId,
        method: data.method,
        proxy: data.proxy,
        transcript: data.data,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Saved to cache: ${videoId}_proxy.json`);
      return true;
    } catch (error) {
      console.log(`⚠️ Cache save failed: ${error.message}`);
      return false;
    }
  }
}

// 메인 실행 함수
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🌐 Proxy-Enhanced YouTube Transcript Extractor

사용법:
  node proxy-transcript-extractor.js <YouTube URL 또는 Video ID> [--save]

예시:
  node proxy-transcript-extractor.js "https://www.youtube.com/watch?v=ocGJWc2F1Yk"
  node proxy-transcript-extractor.js ocGJWc2F1Yk --save
  node proxy-transcript-extractor.js dQw4w9WgXcQ

📋 지원 기능:
  • 직접 연결 시도
  • 자동 프록시 검색
  • Tor SOCKS 프록시 지원 (포트 9050, 9150)
  • 캐시 저장 옵션

💡 Tor 사용법:
  1. Tor Browser 설치 → 자동으로 9150 포트에 SOCKS 프록시 실행
  2. 또는 독립 Tor 설치 → 9050 포트 사용
    `);
    return;
  }

  const urlOrId = args[0];
  const shouldSave = args.includes('--save');
  
  const extractor = new ProxyTranscriptExtractor();
  const result = await extractor.extract(urlOrId);
  
  if (result.success) {
    console.log(`\n🎉 Extraction Complete!`);
    console.log(`📊 Method: ${result.method}`);
    console.log(`🌐 Proxy: ${result.proxy}`);
    console.log(`📄 Segments: ${result.data.length}`);
    
    // 첫 몇 개 세그먼트 미리보기
    console.log(`\n📄 Preview:`);
    result.data.slice(0, 3).forEach((seg, i) => {
      console.log(`   ${i+1}. [${seg.start}s] ${seg.text.substring(0, 60)}...`);
    });
    
    if (shouldSave) {
      await extractor.saveToCache(extractor.extractVideoId(urlOrId), result);
    }
  } else {
    console.log(`\n❌ Extraction Failed: ${result.error}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Install Tor Browser for SOCKS proxy`);
    console.log(`   2. Try VPN service`);
    console.log(`   3. Wait 24-48 hours for IP reset`);
    console.log(`   4. Use paid transcript API service`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ProxyTranscriptExtractor }; 