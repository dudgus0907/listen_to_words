const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

/**
 * 고속 검색 시스템 (SQLite FTS 기반 - better-sqlite3)
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
  initialize() {
    console.log('🚀 Fast Search System 초기화 중...');
    
    try {
      this.db = new Database('fast_search.db');

      // FTS5 가상 테이블 생성
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS transcript_search USING fts5(
          video_id,
          video_title, 
          text,
          start_time,
          method,
          tokenize = 'porter ascii'
        )
      `);
      
      console.log('✅ FTS 테이블 생성 완료');
    } catch (err) {
      console.error('❌ DB 초기화 오류:', err);
      throw err;
    }
  }

  /**
   * 인덱스 통계 조회
   */
  async getStats() {
    try {
      const result = this.runQuery('SELECT COUNT(DISTINCT video_id) as count FROM transcript_search');
      return {
        indexedVideos: result[0]?.count || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 통계 조회 오류:', error);
      return {
        indexedVideos: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 빌드 인덱스
   */
  async buildIndex() {
    const startTime = Date.now();
    console.log('🔨 인덱스 빌드 시작...');
    
    try {
      // SRT 파일들 찾기
      const files = fs.readdirSync('./').filter(file => file.endsWith('.srt'));
      console.log(`📁 발견된 SRT 파일: ${files.length}개`);
      
      if (files.length === 0) {
        console.log('⚠️ SRT 파일이 없습니다.');
        return;
      }

      // 기존 데이터 삭제
      const indexedResult = this.runQuery('SELECT DISTINCT video_id FROM transcript_search');
      if (indexedResult.length > 0) {
        console.log(`🗑️ 기존 ${indexedResult.length}개 비디오 인덱스 삭제 중...`);
        this.runQuery('DELETE FROM transcript_search');
      }

      // 각 파일 처리
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📝 처리 중 (${i + 1}/${files.length}): ${file}`);
        
        try {
          await this.processSRTFile(file);
        } catch (error) {
          console.error(`❌ 파일 처리 오류 ${file}:`, error);
        }
      }

      const buildTime = Date.now() - startTime;
      console.log(`✅ 인덱스 빌드 완료 (${buildTime}ms)`);
    } catch (error) {
      console.error('❌ 인덱스 빌드 오류:', error);
      throw error;
    }
  }

  /**
   * SRT 파일 처리
   */
  async processSRTFile(filename) {
    try {
      const content = fs.readFileSync(filename, 'utf-8');
      const videoId = this.extractVideoId(filename);
      const title = this.extractTitle(filename);

      const segments = this.parseSRT(content);
      console.log(`  📊 ${segments.length}개 세그먼트 발견`);

      // 데이터베이스에 삽입
      const stmt = this.db.prepare(`
        INSERT INTO transcript_search (video_id, video_title, text, start_time, method)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const segment of segments) {
        stmt.run(videoId, title, segment.text, segment.startTime, 'srt');
      }

      console.log(`  ✅ ${filename} 처리 완료`);
    } catch (error) {
      console.error(`❌ SRT 파일 처리 오류 ${filename}:`, error);
      throw error;
    }
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
        
        const exactResults = this.runQuery(`
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
            matchType: 'exact',
            priority: 1
          });
        });
      }
      
      // 2단계: 개별 단어 검색 (OR 검색)
      if (allResults.length < limit) {
        const orQuery = searchWords.join(' OR ');
        const remainingLimit = limit - allResults.length;
        
        const partialResults = this.runQuery(`
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
        `, [orQuery, limit * 2]);
        
        // 이미 포함된 결과 제외
        const existingIds = new Set(allResults.map(r => `${r.videoId}_${r.start}`));
        
        partialResults.forEach(row => {
          const id = `${row.video_id}_${row.start_time}`;
          if (!existingIds.has(id) && allResults.length < limit) {
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
              priority: 2 + (searchWords.length - matchedWords.length)
            });
          }
        });
      }

      // 결과 정렬
      allResults.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        if (a.matchedWordsCount && b.matchedWordsCount) {
          if (a.matchedWordsCount !== b.matchedWordsCount) {
            return b.matchedWordsCount - a.matchedWordsCount;
          }
        }
        return a.relevanceScore - b.relevanceScore;
      });

      const finalResults = allResults.slice(0, limit);
      const searchTime = Date.now() - startTime;
      
      console.log(`🔍 검색 완료: "${query}" - ${finalResults.length}개 결과 (${searchTime}ms)`);

      // 결과 포맷팅
      const formattedResults = finalResults.map(result => ({
        videoId: result.videoId,
        videoTitle: result.videoTitle,
        text: result.text,
        highlightedText: result.highlightedText,
        start: result.start,
        method: result.method,
        relevanceScore: result.relevanceScore,
        matchType: result.matchType,
        matchInfo: result.matchedWordsCount ? 
          `${result.matchedWordsCount}/${result.totalWordsCount} words matched` : 
          'exact match'
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
   * SQL 쿼리 실행 헬퍼
   */
  runQuery(sql, params = []) {
    try {
      if (sql.trim().toLowerCase().startsWith('select')) {
        const stmt = this.db.prepare(sql);
        return stmt.all(params);
      } else {
        const stmt = this.db.prepare(sql);
        return stmt.run(params);
      }
    } catch (err) {
      console.error('❌ Query error:', err);
      throw err;
    }
  }

  /**
   * 유틸리티 메서드들
   */
  extractVideoId(filename) {
    const match = filename.match(/\[([a-zA-Z0-9_-]+)\]/);
    return match ? match[1] : filename.replace('.srt', '');
  }

  extractTitle(filename) {
    return filename.replace(/\[([a-zA-Z0-9_-]+)\]\.en.*\.srt$/, '').trim();
  }

  parseSRT(content) {
    const segments = [];
    const blocks = content.trim().split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const textLines = lines.slice(2);
        
        const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timeMatch) {
          const [, hours, minutes, seconds, milliseconds] = timeMatch;
          const startTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
          const text = textLines.join(' ').replace(/<[^>]*>/g, '').trim();
          
          if (text.length > 0) {
            segments.push({ startTime, text });
          }
        }
      }
    }

    return segments;
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