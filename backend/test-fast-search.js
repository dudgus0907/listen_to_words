const FastSearchSystem = require('./fast-search-system');

async function testFastSearch() {
  console.log('🧪 FastSearchSystem 테스트 시작\n');
  
  const searchSystem = new FastSearchSystem();
  
  try {
    // 1. 시스템 초기화
    await searchSystem.initialize();
    console.log('✅ 시스템 초기화 완료\n');
    
    // 2. 인덱스 구축
    console.log('🔧 인덱스 구축 중...');
    const indexStats = await searchSystem.buildIndex();
    console.log(`📊 인덱스 구축 결과:`);
    console.log(`   - 영상: ${indexStats.videos}개`);
    console.log(`   - 세그먼트: ${indexStats.segments}개\n`);
    
    // 3. 검색 테스트
    const testQueries = [
      'startup',
      'AI',
      'shark tank', 
      'million dollar',
      'entrepreneur',
      'investment'
    ];
    
    console.log('🔍 검색 성능 테스트:\n');
    
    for (const query of testQueries) {
      const startTime = Date.now();
      const results = await searchSystem.search(query, 10);
      const searchTime = Date.now() - startTime;
      
      console.log(`"${query}": ${results.length}개 결과 (${searchTime}ms)`);
      
      // 상위 3개 결과 미리보기
      if (results.length > 0) {
        console.log('   상위 결과:');
        results.slice(0, 3).forEach((result, index) => {
          console.log(`   ${index + 1}. [${result.videoId}] ${result.text.substring(0, 60)}...`);
        });
      }
      console.log('');
    }
    
    // 4. 캐시 테스트
    console.log('⚡ 캐시 성능 테스트:');
    const cacheTestQuery = 'startup';
    
    const firstSearch = Date.now();
    await searchSystem.search(cacheTestQuery, 10);
    const firstTime = Date.now() - firstSearch;
    
    const secondSearch = Date.now();
    await searchSystem.search(cacheTestQuery, 10);
    const secondTime = Date.now() - secondSearch;
    
    console.log(`   첫 번째 검색: ${firstTime}ms`);
    console.log(`   캐시된 검색: ${secondTime}ms`);
    console.log(`   속도 향상: ${Math.round((firstTime / secondTime) * 100) / 100}x\n`);
    
    // 5. 통계 조회
    const stats = await searchSystem.getStats();
    console.log('📊 시스템 통계:');
    console.log(`   - 총 영상: ${stats.totalVideos}개`);
    console.log(`   - 총 세그먼트: ${stats.totalSegments}개`);
    console.log(`   - 캐시 크기: ${stats.cacheSize}개\n`);
    
    console.log('🎉 모든 테스트 완료! 시스템이 정상 작동합니다.');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  } finally {
    searchSystem.close();
  }
}

// 실행
testFastSearch().catch(console.error); 