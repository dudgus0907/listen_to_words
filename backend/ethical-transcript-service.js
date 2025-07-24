const axios = require('axios');

/**
 * 건전한 유료 YouTube Transcript 서비스들
 * YouTube의 비즈니스 모델을 존중하는 정당한 API 서비스들
 */
class EthicalTranscriptService {
  constructor() {
    this.services = {
      // 1. youtube-transcript.io - 합법적인 유료 서비스
      transcriptIO: {
        name: 'YouTube-Transcript.io',
        baseURL: 'https://www.youtube-transcript.io/api',
        pricing: {
          starter: { price: '$9.99/month', requests: '1,000 requests' },
          pro: { price: '$29.99/month', requests: '5,000 requests' },
          business: { price: '$99.99/month', requests: '25,000 requests' }
        },
        rateLimit: '5 requests per 10 seconds',
        features: [
          '✅ 합법적인 transcript 접근',
          '✅ 50개 비디오 batch 처리',
          '✅ JSON 형태 응답',
          '✅ 안정적인 서비스'
        ]
      },
      
      // 2. AssemblyAI - AI 기반 transcript 서비스
      assemblyAI: {
        name: 'AssemblyAI',
        baseURL: 'https://api.assemblyai.com/v2',
        pricing: {
          payAsYouGo: { price: '$0.00037/second', note: '약 $1.33/hour' },
          monthly: { price: '$500/month', hours: '500 hours' }
        },
        features: [
          '✅ 고품질 AI transcription',
          '✅ 다국어 지원',
          '✅ 화자 인식 (Speaker diarization)',
          '✅ 감정 분석 추가 가능'
        ]
      }
    };
  }

  /**
   * YouTube-Transcript.io API 사용 예시
   */
  async useTranscriptIO(apiToken, videoIds) {
    try {
      const response = await axios.post(
        'https://www.youtube-transcript.io/api/transcripts',
        { ids: videoIds },
        {
          headers: {
            'Authorization': `Basic ${apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        service: 'transcript.io',
        cost: '유료 서비스 (정당한 비용 지불)',
        data: response.data,
        ethical: true
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        recommendation: 'API 토큰 확인 또는 계정 업그레이드 필요'
      };
    }
  }

  /**
   * 교육 기관을 위한 할인 혜택 안내
   */
  getEducationalDiscounts() {
    return {
      message: '교육 기관을 위한 특별 혜택',
      options: [
        {
          service: 'YouTube-Transcript.io',
          discount: '50% 교육 할인',
          requirement: '교육 기관 이메일 인증',
          contact: 'education@youtube-transcript.io'
        },
        {
          service: 'AssemblyAI',
          discount: '무료 크레딧 제공',
          requirement: '학술 연구 목적 증명',
          contact: 'academic@assemblyai.com'
        }
      ],
      benefits: [
        '🎓 교육 목적 할인',
        '📚 연구 프로젝트 지원',
        '👥 학생 프로젝트 무료 크레딧',
        '📖 오픈소스 프로젝트 후원'
      ]
    };
  }

  /**
   * 비용 대비 효과 분석
   */
  getCostAnalysis(monthlyVideoCount) {
    const analysis = {
      estimatedCosts: {},
      recommendations: []
    };

    // YouTube-Transcript.io 비용 계산
    if (monthlyVideoCount <= 1000) {
      analysis.estimatedCosts.transcriptIO = '$9.99/month (Starter)';
      analysis.recommendations.push('👍 소규모 프로젝트에 적합');
    } else if (monthlyVideoCount <= 5000) {
      analysis.estimatedCosts.transcriptIO = '$29.99/month (Pro)';
      analysis.recommendations.push('💼 중간 규모 비즈니스에 적합');
    } else {
      analysis.estimatedCosts.transcriptIO = '$99.99/month (Business)';
      analysis.recommendations.push('🏢 대규모 기업용');
    }

    // 무료 대안과 비교
    analysis.comparison = {
      free: {
        pros: ['💰 비용 없음'],
        cons: [
          '❌ IP 블록 위험',
          '❌ 불안정한 서비스',
          '❌ 법적 리스크',
          '❌ 지속가능하지 않음'
        ]
      },
      paid: {
        pros: [
          '✅ 안정적인 서비스',
          '✅ 법적 보호',
          '✅ 기술 지원',
          '✅ SLA 보장',
          '✅ 지속가능한 개발'
        ],
        cons: ['💳 월 사용료']
      }
    };

    return analysis;
  }

  /**
   * 합법적인 사용을 위한 가이드라인
   */
  getLegalGuidelines() {
    return {
      title: '건전하고 합법적인 transcript 사용 가이드',
      principles: [
        {
          principle: '🤝 상호 이익',
          description: 'YouTube와 크리에이터 모두에게 도움이 되는 방식으로 사용'
        },
        {
          principle: '💰 정당한 대가',
          description: '서비스 사용에 대한 적절한 비용 지불'
        },
        {
          principle: '📋 이용약관 준수',
          description: 'YouTube 및 서비스 제공업체의 약관 준수'
        },
        {
          principle: '🎯 교육적 목적',
          description: '언어 학습, 연구, 교육 등 건전한 목적으로 사용'
        }
      ],
      bestPractices: [
        '📖 교육 콘텐츠 제작 시 transcript 활용',
        '🔍 접근성 향상을 위한 자막 제공',
        '📊 언어학 연구를 위한 데이터 분석',
        '🎓 온라인 강의 자료 제작',
        '♿ 청각 장애인을 위한 접근성 개선'
      ]
    };
  }

  /**
   * 대안적인 해결책들
   */
  getAlternativeSolutions() {
    return {
      title: '창의적이고 건전한 대안 해결책들',
      solutions: [
        {
          solution: '🤝 크리에이터 협업',
          description: 'YouTube 크리에이터와 직접 협업하여 transcript 제공 받기',
          benefits: ['상호 이익', '고품질 데이터', '법적 안전성']
        },
        {
          solution: '🎓 대학 연구 프로그램',
          description: '대학의 연구 프로그램으로 YouTube와 공식 파트너십 구축',
          benefits: ['학술적 정당성', '높은 할당량', '연구 지원']
        },
        {
          solution: '📱 앱 스토어 출시',
          description: 'YouGlish Copycat을 앱으로 출시하여 YouTube와 수익 분배',
          benefits: ['정당한 비즈니스 모델', '지속가능성', '스케일링 가능']
        },
        {
          solution: '🤖 AI 음성 인식',
          description: '자체 AI 음성 인식 시스템 구축하여 비디오에서 직접 추출',
          benefits: ['기술적 독립성', '프라이버시 보호', '커스터마이징 가능']
        }
      ]
    };
  }
}

module.exports = { EthicalTranscriptService };

// 데모 실행
async function demonstrateEthicalApproach() {
  const service = new EthicalTranscriptService();
  
  console.log('🌟 건전한 YouTube Transcript 사용 방법\n');
  
  // 1. 서비스 정보
  console.log('💼 추천 유료 서비스:');
  console.log(service.services.transcriptIO);
  
  // 2. 교육 할인
  console.log('\n🎓 교육 기관 혜택:');
  console.log(service.getEducationalDiscounts());
  
  // 3. 비용 분석
  console.log('\n💰 비용 분석 (월 1000개 영상):');
  console.log(service.getCostAnalysis(1000));
  
  // 4. 법적 가이드라인
  console.log('\n⚖️ 법적 가이드라인:');
  console.log(service.getLegalGuidelines());
  
  // 5. 대안 해결책
  console.log('\n💡 창의적 대안책:');
  console.log(service.getAlternativeSolutions());
}

// 실행
if (require.main === module) {
  demonstrateEthicalApproach();
} 