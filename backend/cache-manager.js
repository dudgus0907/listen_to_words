const fs = require('fs');
const path = require('path');

/**
 * YouGlish Copycat 캐시 관리 유틸리티
 * 로컬에 저장된 캐시 데이터를 관리하는 도구
 */
class CacheManager {
  constructor() {
    this.cacheDir = path.join(__dirname, 'transcript-cache');
    this.dbPath = path.join(__dirname, 'transcripts.db');
  }

  /**
   * 캐시 현황 분석
   */
  async analyzeCacheStatus() {
    const analysis = {
      location: {
        cacheFolder: this.cacheDir,
        database: this.dbPath,
        isLocal: true,
        computerPath: 'C:\\Users\\nick0\\youglish_copycat\\youglish-copycat\\backend\\'
      },
      storage: {},
      files: {
        json: [],
        database: null
      }
    };

    try {
      // JSON 캐시 파일들 분석
      const cacheFiles = fs.readdirSync(this.cacheDir);
      let totalSize = 0;
      
      const filesByType = {
        real: [],
        synthetic: [],
        known: []
      };

      for (const file of cacheFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        const fileInfo = {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          videoId: file.split('_')[0]
        };

        totalSize += stats.size;

        if (file.includes('_real.json')) {
          filesByType.real.push(fileInfo);
        } else if (file.includes('_synthetic.json')) {
          filesByType.synthetic.push(fileInfo);
        } else if (file.includes('_known.json')) {
          filesByType.known.push(fileInfo);
        }

        analysis.files.json.push(fileInfo);
      }

      analysis.storage.jsonCache = {
        fileCount: cacheFiles.length,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        byType: filesByType
      };

      // SQLite 데이터베이스 분석
      if (fs.existsSync(this.dbPath)) {
        const dbStats = fs.statSync(this.dbPath);
        analysis.files.database = {
          size: dbStats.size,
          sizeMB: (dbStats.size / 1024 / 1024).toFixed(2),
          modified: dbStats.mtime
        };
      }

      analysis.storage.totalSizeMB = (
        (analysis.storage.jsonCache.totalSizeBytes + (analysis.files.database?.size || 0)) 
        / 1024 / 1024
      ).toFixed(2);

      return analysis;

    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 캐시 정리 옵션들
   */
  getCleanupOptions() {
    return {
      options: [
        {
          type: 'selective',
          name: '선택적 정리',
          description: '특정 비디오나 오래된 파일만 삭제',
          risk: 'low',
          command: 'node cache-manager.js clean --selective'
        },
        {
          type: 'old-files',
          name: '오래된 파일 정리',
          description: '30일 이상 된 캐시 파일 삭제',
          risk: 'low',
          command: 'node cache-manager.js clean --old'
        },
        {
          type: 'json-only',
          name: 'JSON 캐시만 정리',
          description: 'JSON 파일만 삭제, 데이터베이스는 유지',
          risk: 'medium',
          command: 'node cache-manager.js clean --json-only'
        },
        {
          type: 'full-reset',
          name: '전체 초기화',
          description: '모든 캐시 데이터 삭제 (주의!)',
          risk: 'high',
          command: 'node cache-manager.js clean --full'
        }
      ],
      warnings: [
        '⚠️ 캐시를 삭제하면 다시 YouTube에서 transcript를 가져와야 합니다',
        '⚠️ IP 블록 상황에서는 캐시 삭제를 권장하지 않습니다',
        '💡 캐시는 검색 속도를 향상시키므로 필요시에만 정리하세요'
      ]
    };
  }

  /**
   * 캐시 백업 생성
   */
  async createBackup() {
    const backupDir = path.join(__dirname, `cache-backup-${Date.now()}`);
    
    try {
      fs.mkdirSync(backupDir, { recursive: true });
      
      // JSON 파일들 백업
      const cacheFiles = fs.readdirSync(this.cacheDir);
      for (const file of cacheFiles) {
        fs.copyFileSync(
          path.join(this.cacheDir, file),
          path.join(backupDir, file)
        );
      }

      // 데이터베이스 백업
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(
          this.dbPath,
          path.join(backupDir, 'transcripts.db')
        );
      }

      return {
        success: true,
        backupLocation: backupDir,
        message: `백업이 생성되었습니다: ${backupDir}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 스토리지 위치 안내
   */
  getStorageInfo() {
    return {
      title: '📍 YouGlish Copycat 데이터 저장 위치',
      localComputer: true,
      privacy: {
        local: '✅ 모든 데이터가 당신의 컴퓨터에만 저장됨',
        noCloud: '✅ 클라우드나 외부 서버에 업로드되지 않음',
        privacy: '✅ 완전한 프라이버시 보장'
      },
      locations: [
        {
          type: 'JSON 캐시',
          path: 'C:\\Users\\nick0\\youglish_copycat\\youglish-copycat\\backend\\transcript-cache\\',
          purpose: 'YouTube transcript 원본 데이터',
          format: 'JSON 파일들'
        },
        {
          type: 'SQLite 데이터베이스',
          path: 'C:\\Users\\nick0\\youglish_copycat\\youglish-copycat\\backend\\transcripts.db',
          purpose: '검색 최적화된 데이터',
          format: 'SQLite 데이터베이스'
        }
      ],
      benefits: [
        '🔒 완전한 오프라인 작동',
        '⚡ 빠른 검색 속도',
        '💾 중복 다운로드 방지',
        '🌐 인터넷 없이도 검색 가능'
      ]
    };
  }
}

module.exports = { CacheManager };

// CLI 실행 부분
if (require.main === module) {
  const manager = new CacheManager();
  
  (async () => {
    console.log('🗄️ YouGlish Copycat 캐시 관리자\n');
    
    // 캐시 현황 분석
    const analysis = await manager.analyzeCacheStatus();
    console.log('📊 캐시 현황 분석:');
    console.log(JSON.stringify(analysis, null, 2));
    
    // 저장 위치 정보
    console.log('\n📍 저장 위치 정보:');
    console.log(JSON.stringify(manager.getStorageInfo(), null, 2));
    
    // 정리 옵션
    console.log('\n🧹 정리 옵션:');
    console.log(JSON.stringify(manager.getCleanupOptions(), null, 2));
  })();
} 