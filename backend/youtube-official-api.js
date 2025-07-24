const axios = require('axios');

/**
 * YouTube Data API v3를 사용한 건전한 데이터 수집
 * 공식 API를 통해 YouTube의 비즈니스 모델을 존중하면서 데이터 수집
 */
class YouTubeOfficialAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    this.quotaUsed = 0; // 일일 할당량 추적
    this.dailyQuotaLimit = 10000; // 기본 무료 할당량
  }

  /**
   * 공식 API로 비디오 정보 가져오기
   * 비용: 1 quota unit per request
   */
  async getVideoInfo(videoId) {
    try {
      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          key: this.apiKey,
          part: 'snippet,contentDetails,statistics',
          id: videoId
        }
      });

      this.quotaUsed += 1; // 할당량 사용량 추적
      
      if (response.data.items.length === 0) {
        return { success: false, error: 'Video not found' };
      }

      const video = response.data.items[0];
      return {
        success: true,
        data: {
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          channelTitle: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt,
          duration: video.contentDetails.duration,
          viewCount: video.statistics.viewCount,
          likeCount: video.statistics.likeCount,
          // 공식 API는 transcript를 직접 제공하지 않음
          hasTranscript: video.contentDetails.caption === 'true'
        }
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        quotaUsed: this.quotaUsed 
      };
    }
  }

  /**
   * 채널의 비디오 목록 가져오기
   * 비용: 1 quota unit per request
   */
  async getChannelVideos(channelId, maxResults = 10) {
    try {
      // 1. 채널의 업로드 플레이리스트 ID 가져오기
      const channelResponse = await axios.get(`${this.baseURL}/channels`, {
        params: {
          key: this.apiKey,
          part: 'contentDetails',
          id: channelId
        }
      });

      if (channelResponse.data.items.length === 0) {
        return { success: false, error: 'Channel not found' };
      }

      const uploadsPlaylistId = channelResponse.data.items[0]
        .contentDetails.relatedPlaylists.uploads;

      // 2. 플레이리스트에서 비디오 목록 가져오기
      const playlistResponse = await axios.get(`${this.baseURL}/playlistItems`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: maxResults
        }
      });

      this.quotaUsed += 2; // 2번의 API 호출

      const videos = playlistResponse.data.items.map(item => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails
      }));

      return {
        success: true,
        data: videos,
        quotaUsed: this.quotaUsed
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        quotaUsed: this.quotaUsed 
      };
    }
  }

  /**
   * 검색 API 사용 (비용이 높음)
   * 비용: 100 quota units per request
   */
  async searchVideos(query, maxResults = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: maxResults,
          order: 'relevance'
        }
      });

      this.quotaUsed += 100; // 검색 API는 비용이 매우 높음

      const videos = response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails
      }));

      return {
        success: true,
        data: videos,
        quotaUsed: this.quotaUsed,
        warning: 'Search API uses 100 quota units per request'
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        quotaUsed: this.quotaUsed 
      };
    }
  }

  /**
   * 할당량 상태 확인
   */
  getQuotaStatus() {
    return {
      used: this.quotaUsed,
      remaining: this.dailyQuotaLimit - this.quotaUsed,
      percentage: (this.quotaUsed / this.dailyQuotaLimit * 100).toFixed(2)
    };
  }

  /**
   * 교육/연구 목적 신청 가이드
   */
  getEducationalUseGuidelines() {
    return {
      message: "교육/연구 목적으로 더 높은 할당량이 필요한 경우",
      steps: [
        "1. Google Cloud Console에서 프로젝트 생성",
        "2. YouTube Data API v3 활성화", 
        "3. 교육/연구 목적 할당량 증가 신청",
        "4. 사용 목적과 예상 사용량 명시",
        "5. 대학/연구기관 이메일로 신청"
      ],
      benefits: [
        "✅ 정당한 사용 방법",
        "✅ IP 블록 위험 없음", 
        "✅ 안정적인 서비스",
        "✅ YouTube의 정책 준수"
      ]
    };
  }
}

module.exports = { YouTubeOfficialAPI };

// 사용 예시
async function demonstrateOfficialAPI() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ YouTube API 키가 필요합니다.');
    console.log('🔗 https://console.cloud.google.com/apis/credentials 에서 생성하세요.');
    return;
  }

  const youtube = new YouTubeOfficialAPI(apiKey);
  
  console.log('🎯 건전한 YouTube 데이터 수집 시작...\n');
  
  // 1. 비디오 정보 가져오기 (낮은 비용)
  const videoInfo = await youtube.getVideoInfo('dQw4w9WgXcQ');
  console.log('📹 비디오 정보:', videoInfo);
  
  // 2. 할당량 상태 확인
  console.log('\n📊 할당량 상태:', youtube.getQuotaStatus());
  
  // 3. 교육 목적 가이드라인
  console.log('\n🎓 교육/연구 목적 가이드라인:');
  console.log(youtube.getEducationalUseGuidelines());
}

// 실행 (필요시)
if (require.main === module) {
  demonstrateOfficialAPI();
} 