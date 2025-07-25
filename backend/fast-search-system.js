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
   * 빌드 인덱스
   */
  async buildIndex(force = false) {
    const startTime = Date.now();
    console.log('🔨 인덱스 빌드 시작...');
    
    try {
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

      const cacheDir = path.join(__dirname, 'transcript-cache');
      if (!fs.existsSync(cacheDir)) {
        console.log('⚠️ transcript-cache 디렉터리가 없습니다.');
        return { videos: 0, segments: 0, timeMs: 0, skipped: false };
      }

      // JSON 캐시 파일들 찾기
      const files = fs.readdirSync(cacheDir).filter(file => file.endsWith('_real.json'));
      console.log(`📁 발견된 JSON 캐시 파일: ${files.length}개`);
      
      if (files.length === 0) {
        console.log('⚠️ JSON 캐시 파일이 없습니다.');
        return { videos: 0, segments: 0, timeMs: 0, skipped: false };
      }

      if (force) {
        // 강제 재인덱싱: 기존 데이터 삭제
        console.log('🗑️ 강제 재인덱싱 - 기존 인덱스 삭제 중...');
        this.runQuery('DELETE FROM transcript_search');
        console.log('✅ 기존 인덱스 삭제 완료\n');
      } else {
        // 증분 인덱싱: 이미 인덱싱된 비디오 제외
        const indexedVideos = this.runQuery('SELECT DISTINCT video_id FROM transcript_search');
        const indexedIds = new Set(indexedVideos.map(row => row.video_id));
        const unindexedFiles = files.filter(file => {
          const videoId = file.replace('_real.json', '');
          return !indexedIds.has(videoId);
        });
        
        if (unindexedFiles.length === 0) {
          console.log('✅ 모든 영상이 이미 인덱싱되어 있습니다.');
          const stats = await this.getStats();
          return { videos: stats.totalVideos, segments: stats.totalSegments, timeMs: 0, skipped: true };
        }
        
        console.log(`📁 새로운 ${unindexedFiles.length}개 파일만 인덱싱 예정\n`);
        files.splice(0, files.length, ...unindexedFiles);
      }

      let indexedVideos = 0;
      let totalSegments = 0;

      // 각 파일 처리
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = Math.round(((i + 1) / files.length) * 100);
        console.log(`📝 처리 중 (${i + 1}/${files.length}) ${progress}%: ${file}`);
        
        try {
          const segmentCount = await this.processJSONFile(file, cacheDir);
          totalSegments += segmentCount;
          indexedVideos++;
        } catch (error) {
          console.error(`❌ 파일 처리 오류 ${file}:`, error);
        }
      }

      const buildTime = Date.now() - startTime;
      console.log(`✅ 인덱스 빌드 완료 (${buildTime}ms)`);
      console.log(`📊 처리된 영상: ${indexedVideos}개, 세그먼트: ${totalSegments}개`);
      
      return { videos: indexedVideos, segments: totalSegments, timeMs: buildTime, skipped: false };
    } catch (error) {
      console.error('❌ 인덱스 빌드 오류:', error);
      throw error;
    }
  }

  /**
   * JSON 캐시 파일 처리
   */
  async processJSONFile(filename, cacheDir) {
    try {
      const filePath = path.join(cacheDir, filename);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const videoId = data.video_id || data.videoId || filename.replace('_real.json', '');
      const title = data.video_title || data.videoTitle || 'Unknown Video';

      if (!data.transcript || data.transcript.length === 0) {
        console.log(`  ⚠️ 빈 transcript: ${filename}`);
        return 0;
      }

      let segmentCount = 0;
      
      // 데이터베이스에 삽입
      const stmt = this.db.prepare(`
        INSERT INTO transcript_search (video_id, video_title, text, start_time, method)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const segment of data.transcript) {
        stmt.run(videoId, title, segment.text, segment.start, data.method || 'json');
        segmentCount++;
      }

      console.log(`  ✅ ${segmentCount}개 세그먼트 인덱싱 완료`);
      return segmentCount;
    } catch (error) {
      console.error(`❌ JSON 파일 처리 오류 ${filename}:`, error);
      return 0;
    }
  }

  /**
   * 인덱싱이 필요한지 확인
   */
  async needsIndexing() {
    try {
      const cacheDir = path.join(__dirname, 'transcript-cache');
      if (!fs.existsSync(cacheDir)) return false;
      
      const cacheFiles = fs.readdirSync(cacheDir).filter(f => f.endsWith('_real.json'));
      const indexedVideos = this.runQuery('SELECT DISTINCT video_id FROM transcript_search');
      
      return cacheFiles.length > indexedVideos.length;
    } catch (error) {
      console.error('인덱싱 필요성 확인 오류:', error);
      return true;
    }
  }

  /**
   * 인덱스 통계 가져오기
   */
  async getStats() {
    try {
      const videosResult = this.runQuery('SELECT COUNT(DISTINCT video_id) as count FROM transcript_search');
      const segmentsResult = this.runQuery('SELECT COUNT(*) as count FROM transcript_search');
      
      return {
        totalVideos: videosResult[0]?.count || 0,
        totalSegments: segmentsResult[0]?.count || 0
      };
    } catch (error) {
      console.error('통계 가져오기 오류:', error);
      return { totalVideos: 0, totalSegments: 0 };
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