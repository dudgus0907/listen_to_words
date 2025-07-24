const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * 고속 검색 시스템 (SQLite FTS 기반)
 */
class FastSearchSystem {
  constructor() {
    this.db = null;
    this.searchCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5분 캐시
  }

  /**
   * 데이터베이스 초기화 및 FTS 테이블 생성
   */
  async initialize() {
    console.log('🚀 Fast Search System 초기화 중...');
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database('fast_search.db', (err) => {
        if (err) {
          reject(err);
          return;
        }

        // FTS5 가상 테이블 생성
        this.db.run(`
          CREATE VIRTUAL TABLE IF NOT EXISTS transcript_search USING fts5(
            video_id,
            video_title, 
            text,
            start_time,
            method,
            tokenize = 'porter ascii'
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('✅ FTS 테이블 생성 완료');
          resolve();
        });
      });
    });
  }

  /**
   * 인덱스가 필요한지 확인 (실제로 인덱스되지 않은 영상이 있는지 체크)
   */
  async needsIndexing() {
    try {
      // 인덱스되지 않은 영상들 찾기
      const unindexedFiles = await this.findUnindexedVideos();
      
      // 현재 인덱스된 영상 수 확인
      const result = await this.runQuery('SELECT COUNT(DISTINCT video_id) as count FROM transcript_search');
      const indexedVideos = result[0]?.count || 0;
      
      // 캐시 파일 수 확인
      const cacheDir = path.join(__dirname, 'transcript-cache');
      const totalFiles = fs.existsSync(cacheDir) ? 
        fs.readdirSync(cacheDir).filter(f => f.endsWith('_real.json')).length : 0;
      
      console.log(`📊 인덱스 상태 확인: ${indexedVideos}개 인덱싱됨 / ${totalFiles}개 캐시 파일 (${unindexedFiles.length}개 미인덱싱)`);
      
      // 인덱스되지 않은 파일이 있으면 인덱싱 필요
      return unindexedFiles.length > 0;
      
    } catch (error) {
      console.log('⚠️ 인덱스 상태 확인 실패, 재인덱싱 필요:', error.message);
      return true;
    }
  }

  /**
   * 인덱스되지 않은 영상들만 찾기
   */
  async findUnindexedVideos() {
    try {
      const cacheDir = path.join(__dirname, 'transcript-cache');
      if (!fs.existsSync(cacheDir)) return [];
      
      const cacheFiles = fs.readdirSync(cacheDir).filter(f => f.endsWith('_real.json'));
      const allVideoIds = cacheFiles.map(f => f.replace('_real.json', ''));
      
      if (allVideoIds.length === 0) return [];
      
      // 현재 인덱스된 영상 ID들 조회
      const indexedResult = await this.runQuery('SELECT DISTINCT video_id FROM transcript_search');
      const indexedVideoIds = new Set(indexedResult.map(row => row.video_id));
      
      // 인덱스되지 않은 영상들만 필터링
      const unindexedFiles = cacheFiles.filter(file => {
        const videoId = file.replace('_real.json', '');
        return !indexedVideoIds.has(videoId);
      });
      
      return unindexedFiles;
    } catch (error) {
      console.log('⚠️ 인덱스되지 않은 영상 찾기 실패:', error.message);
      return [];
    }
  }

  /**
   * 모든 transcript 데이터를 FTS 테이블에 인덱싱 (증분 인덱싱 지원)
   */
  async buildIndex(force = false) {
    // 강제 재인덱싱이 아니라면 필요성 확인
    if (!force) {
      const needsIndex = await this.needsIndexing();
      if (!needsIndex) {
        console.log('✅ 인덱스가 이미 최신 상태입니다. 재구축을 건너뜁니다.');
        const stats = await this.getStats();
        console.log(`📊 기존 인덱스: ${stats.totalVideos}개 영상, ${stats.totalSegments}개 세그먼트`);
        return { videos: stats.totalVideos, segments: stats.totalSegments, timeMs: 0, skipped: true };
      }
    }
    
    console.log('🔧 인덱스 구축 시작...');
    
    const cacheDir = path.join(__dirname, 'transcript-cache');
    let filesToProcess = [];
    
    if (force) {
      // 강제 재인덱싱: 모든 파일 처리
      console.log('🗑️ 강제 재인덱싱 - 기존 인덱스 삭제 중...');
      await this.runQuery('DELETE FROM transcript_search');
      console.log('✅ 기존 인덱스 삭제 완료\n');
      
      filesToProcess = fs.readdirSync(cacheDir).filter(f => f.endsWith('_real.json'));
      console.log(`📁 전체 ${filesToProcess.length}개 파일 재인덱싱 예정\n`);
    } else {
      // 증분 인덱싱: 인덱스되지 않은 파일만 처리
      filesToProcess = await this.findUnindexedVideos();
      if (filesToProcess.length === 0) {
        console.log('✅ 모든 영상이 이미 인덱싱되어 있습니다.');
        const stats = await this.getStats();
        return { videos: stats.totalVideos, segments: stats.totalSegments, timeMs: 0, skipped: true };
      }
      console.log(`📁 새로운 ${filesToProcess.length}개 파일만 인덱싱 예정\n`);
    }
    
    let indexedCount = 0;
    let segmentCount = 0;
    const totalFiles = filesToProcess.length;
    const startTime = Date.now();
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const progress = Math.round(((i + 1) / totalFiles) * 100);
      const elapsedTime = Date.now() - startTime;
      const estimatedTotal = totalFiles > 0 ? (elapsedTime / (i + 1)) * totalFiles : 0;
      const remainingTime = estimatedTotal - elapsedTime;
      
      try {
        const filePath = path.join(cacheDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`📝 [${i + 1}/${totalFiles}] ${progress}% - ${file.replace('_real.json', '')} 처리 중...`);
        
        if (data.transcript && data.transcript.length > 0) {
          let fileSegments = 0;
          
          // 각 transcript 세그먼트를 개별적으로 인덱싱
          for (const segment of data.transcript) {
            await this.runQuery(`
              INSERT INTO transcript_search 
              (video_id, video_title, text, start_time, method)
              VALUES (?, ?, ?, ?, ?)
            `, [
              data.video_id || data.videoId,
              data.video_title || data.videoTitle || 'Unknown Video',
              segment.text,
              segment.start,
              data.method || 'unknown'
            ]);
            segmentCount++;
            fileSegments++;
          }
          
          console.log(`   ✅ ${fileSegments}개 세그먼트 인덱싱 완료`);
          indexedCount++;
        } else {
          console.log(`   ⚠️ 빈 transcript`);
        }
        
        // 진행률 정보 표시
        if (i < totalFiles - 1) {
          const remainingMinutes = Math.round(remainingTime / 60000);
          const remainingSeconds = Math.round((remainingTime % 60000) / 1000);
          console.log(`   📊 진행률: ${progress}% | 남은 시간: ${remainingMinutes}분 ${remainingSeconds}초\n`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${file} 인덱싱 실패: ${error.message}\n`);
      }
    }

    const totalTime = Date.now() - startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.round((totalTime % 60000) / 1000);

    console.log(`\n🎉 인덱스 구축 완료!`);
    console.log(`   📊 결과: ${indexedCount}개 영상, ${segmentCount}개 세그먼트`);
    console.log(`   ⏱️ 소요 시간: ${minutes}분 ${seconds}초`);
    console.log(`   🚀 평균 속도: ${Math.round(segmentCount / (totalTime / 1000))}개 세그먼트/초\n`);
    
    return { videos: indexedCount, segments: segmentCount, timeMs: totalTime };
  }

  /**
   * 고속 검색 실행
   */
  async search(query, limit = 50) {
    // 캐시 확인
    const cacheKey = `${query}_${limit}`;
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`⚡ 캐시에서 반환: "${query}"`);
        return cached.results;
      }
    }

    const startTime = Date.now();
    
    // 검색어를 개별 단어로 분리
    const searchWords = query.split(' ')
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 0);
    
    if (searchWords.length === 0) {
      return [];
    }

    try {
      let allResults = [];
      
      // 1단계: 모든 단어가 포함된 결과 검색 (AND 검색)
      if (searchWords.length > 1) {
        const andQuery = searchWords.join(' AND ');
        
        const exactResults = await this.runQuery(`
          SELECT 
            video_id,
            video_title,
            text,
            start_time,
            method,
            highlight(transcript_search, 2, '<mark>', '</mark>') as highlighted_text,
            bm25(transcript_search) as relevance_score
          FROM transcript_search 
          WHERE transcript_search MATCH ?
          ORDER BY relevance_score ASC
          LIMIT ?
        `, [andQuery, limit]);

        // 완전 매치 결과에 우선순위 부여
        exactResults.forEach(row => {
          allResults.push({
            videoId: row.video_id,
            videoTitle: row.video_title,
            text: row.text,
            highlightedText: row.highlighted_text,
            start: row.start_time,
            method: row.method,
            relevanceScore: row.relevance_score,
            matchType: 'exact', // 완전 매치 표시
            priority: 1 // 최고 우선순위
          });
        });
      }
      
      // 2단계: 개별 단어 검색 (OR 검색) - 완전 매치가 부족한 경우만
      if (allResults.length < limit) {
        const orQuery = searchWords.join(' OR ');
        const remainingLimit = limit - allResults.length;
        
        const partialResults = await this.runQuery(`
          SELECT 
            video_id,
            video_title,
            text,
            start_time,
            method,
            highlight(transcript_search, 2, '<mark>', '</mark>') as highlighted_text,
            bm25(transcript_search) as relevance_score
          FROM transcript_search 
          WHERE transcript_search MATCH ?
          ORDER BY relevance_score ASC
          LIMIT ?
        `, [orQuery, limit * 2]); // 더 많이 가져와서 필터링
        
        // 이미 포함된 결과 제외하고 부분 매치 추가
        const existingIds = new Set(allResults.map(r => `${r.videoId}_${r.start}`));
        
        partialResults.forEach(row => {
          const id = `${row.video_id}_${row.start_time}`;
          if (!existingIds.has(id) && allResults.length < limit) {
            // 실제로 몇 개의 검색어가 포함되었는지 계산
            const textLower = row.text.toLowerCase();
            const matchedWords = searchWords.filter(word => 
              textLower.includes(word.toLowerCase())
            );
            
            allResults.push({
              videoId: row.video_id,
              videoTitle: row.video_title,
              text: row.text,
              highlightedText: row.highlighted_text,
              start: row.start_time,
              method: row.method,
              relevanceScore: row.relevance_score,
              matchType: 'partial',
              matchedWordsCount: matchedWords.length,
              totalWordsCount: searchWords.length,
              priority: 2 + (searchWords.length - matchedWords.length) // 매치된 단어가 많을수록 높은 우선순위
            });
          }
        });
      }

      // 3단계: 결과 정렬 - 완전 매치 우선, 그 다음 부분 매치
      allResults.sort((a, b) => {
        // 우선순위가 낮을수록 (완전 매치일수록) 상위
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        
        // 같은 우선순위 내에서는 매치된 단어 수가 많을수록 상위
        if (a.matchedWordsCount && b.matchedWordsCount) {
          if (a.matchedWordsCount !== b.matchedWordsCount) {
            return b.matchedWordsCount - a.matchedWordsCount;
          }
        }
        
        // 마지막으로 relevance score로 정렬
        return a.relevanceScore - b.relevanceScore;
      });

      // 최종 limit 적용
      const finalResults = allResults.slice(0, limit);

      const searchTime = Date.now() - startTime;
      const exactCount = finalResults.filter(r => r.matchType === 'exact').length;
      const partialCount = finalResults.filter(r => r.matchType === 'partial').length;
      
      console.log(`🔍 검색 완료: "${query}" - ${finalResults.length}개 결과 (완전매치: ${exactCount}, 부분매치: ${partialCount}) (${searchTime}ms)`);

      // 맥락 포함하여 결과 포맷팅
      const formattedResults = await Promise.all(finalResults.map(async result => {
        // 앞뒤 문장을 포함한 확장된 맥락 가져오기
        const contextualText = await this.getContextualText(
          result.videoId, 
          result.start, 
          result.text, 
          result.highlightedText
        );
        
        return {
          videoId: result.videoId,
          videoTitle: result.videoTitle,
          text: result.text,
          highlightedText: result.highlightedText,
          contextualText: contextualText, // 앞뒤 문장 포함된 텍스트
          start: result.start,
          method: result.method,
          relevanceScore: result.relevanceScore,
          matchType: result.matchType, // 매치 타입 정보 추가
          matchInfo: result.matchedWordsCount ? 
            `${result.matchedWordsCount}/${result.totalWordsCount} words matched` : 
            'exact match'
        };
      }));

      // 캐시 저장
      this.searchCache.set(cacheKey, {
        results: formattedResults,
        timestamp: Date.now()
      });

      return formattedResults;
    } catch (error) {
      console.error(`❌ 검색 오류: ${error.message}`);
      return [];
    }
  }

  /**
   * 검색 통계 조회
   */
  async getStats() {
    try {
      const videoCount = await this.runQuery(`
        SELECT COUNT(DISTINCT video_id) as count 
        FROM transcript_search
      `);
      
      const segmentCount = await this.runQuery(`
        SELECT COUNT(*) as count 
        FROM transcript_search
      `);
      
      return {
        totalVideos: videoCount[0]?.count || 0,
        totalSegments: segmentCount[0]?.count || 0,
        cacheSize: this.searchCache.size
      };
    } catch (error) {
      console.error(`❌ 통계 조회 오류: ${error.message}`);
      return { totalVideos: 0, totalSegments: 0, cacheSize: 0 };
    }
  }

  /**
   * 캐시 정리
   */
  clearCache() {
    this.searchCache.clear();
    console.log('🧹 검색 캐시 정리 완료');
  }

  /**
   * 검색 결과에 앞뒤 문장을 포함한 맥락 제공
   */
  async getContextualText(videoId, startTime, originalText, highlightedText, contextSentences = 2) {
    try {
      // 현재 문장의 앞뒤 문장들을 가져오기
      const contextQuery = `
        SELECT text, start_time
        FROM transcript_search 
        WHERE video_id = ? 
        AND start_time BETWEEN ? AND ?
        ORDER BY start_time ASC
      `;
      
      // 앞뒤 20초 범위에서 문장들 가져오기 (보통 2-3개 문장)
      const timeWindow = 20; 
      const contextResults = await this.runQuery(contextQuery, [
        videoId,
        Math.max(0, startTime - timeWindow),
        startTime + timeWindow
      ]);
      
      if (contextResults.length <= 1) {
        // 맥락이 없으면 하이라이트된 원본 텍스트 반환
        return highlightedText;
      }
      
      // 현재 문장의 인덱스 찾기
      const currentIndex = contextResults.findIndex(result => 
        result.start_time === startTime && result.text === originalText
      );
      
      if (currentIndex === -1) {
        // 현재 문장을 찾을 수 없으면 하이라이트된 원본 텍스트 반환
        return highlightedText;
      }
      
      // 앞뒤 문장 선택
      const startIndex = Math.max(0, currentIndex - contextSentences);
      const endIndex = Math.min(contextResults.length - 1, currentIndex + contextSentences);
      
      // 선택된 문장들을 배열로 가져오기
      const contextualSentences = contextResults.slice(startIndex, endIndex + 1);
      
      // highlightedText에서 하이라이트된 단어들 추출
      const markRegex = /<mark>(.*?)<\/mark>/g;
      const highlightedWords = [];
      let match;
      
      while ((match = markRegex.exec(highlightedText)) !== null) {
        highlightedWords.push(match[1].toLowerCase());
      }
      
      // 맥락 문장들을 조합하면서 하이라이팅 적용
      const contextualText = contextualSentences.map((sentence, index) => {
        let text = sentence.text;
        
        // 각 하이라이트된 단어에 대해 처리
        highlightedWords.forEach(word => {
          // 대소문자 구분 없이 단어 경계에서 매치
          const wordRegex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
          text = text.replace(wordRegex, '<mark>$1</mark>');
        });
        
        // 현재 문장인 경우 강조 표시 (선택사항)
        if (index === currentIndex - startIndex) {
          return text; // 검색된 문장
        }
        
        return text;
      }).join(' ');
      
      return contextualText;
      
    } catch (error) {
      console.error('맥락 텍스트 가져오기 오류:', error);
      return highlightedText; // 오류 시 하이라이트된 원본 텍스트 반환
    }
  }

  /**
   * SQL 쿼리 실행 헬퍼
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (sql.trim().toLowerCase().startsWith('select')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    });
  }

  /**
   * 시스템 종료
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('🔒 Fast Search System 종료');
    }
  }
}

module.exports = FastSearchSystem; 