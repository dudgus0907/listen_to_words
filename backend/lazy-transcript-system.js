const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const { PythonYouTubeBridge } = require('./python-youtube-bridge');
const { YouTubeAPICollector } = require('./youtube-api-collector');

class LazyTranscriptSystem {
  constructor() {
    this.dbPath = path.join(__dirname, 'transcripts.db');
    this.db = null;
    this.pythonBridge = new PythonYouTubeBridge();
    this.apiCollector = null; // Will be initialized if API key is available
    this.processingQueue = new Map(); // Prevent duplicate processing
    this.init();
  }

  async init() {
    try {
      // Initialize SQLite database
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Create tables
      await this.createTables();
      
      // Initialize API collector if YouTube API key is available
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
        this.apiCollector = new YouTubeAPICollector(apiKey);
        console.log('✅ YouTube API Collector initialized');
      } else {
        console.log('⚠️ YouTube API key not configured - using manual video list only');
      }

      console.log('🗄️ Lazy Transcript System initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Lazy Transcript System:', error);
    }
  }

  async createTables() {
    // Videos metadata table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        channel_title TEXT,
        published_at TEXT,
        category TEXT,
        duration INTEGER,
        has_transcript BOOLEAN DEFAULT FALSE,
        transcript_processed BOOLEAN DEFAULT FALSE,
        processing_attempts INTEGER DEFAULT 0,
        last_attempt_at TEXT,
        added_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transcripts table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        text TEXT NOT NULL,
        similarity_keywords TEXT, -- For faster searching
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos (id)
      )
    `);

    // Search cache table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS search_cache (
        query_hash TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        results TEXT NOT NULL, -- JSON string
        result_count INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT
      )
    `);

    // Create indexes for faster searching
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
      CREATE INDEX IF NOT EXISTS idx_transcripts_text ON transcripts(text);
      CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
      CREATE INDEX IF NOT EXISTS idx_videos_processed ON videos(transcript_processed);
    `);

    console.log('📊 Database tables created/verified');
  }

  async getVideoCount() {
    const result = await this.db.get('SELECT COUNT(*) as count FROM videos');
    return result.count;
  }

  async getProcessedVideoCount() {
    const result = await this.db.get('SELECT COUNT(*) as count FROM videos WHERE transcript_processed = TRUE');
    return result.count;
  }

  async addVideosToDatabase(videos) {
    console.log(`📥 Adding ${videos.length} videos to database...`);
    
    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO videos 
      (id, title, description, channel_title, published_at, category, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const video of videos) {
      await stmt.run(
        video.id,
        video.title,
        video.description || '',
        video.channelTitle || video.channel || '',
        video.publishedAt || video.published_at,
        video.category,
        video.duration || 0
      );
    }

    await stmt.finalize();
    console.log(`✅ Added ${videos.length} videos to database`);
  }

  async searchTranscripts(query, limit = 10) {
    console.log(`🔍 Searching for: "${query}"`);
    
    // Check cache first
    const cached = await this.getCachedSearch(query);
    if (cached) {
      console.log('📂 Using cached search results');
      return cached;
    }

    // Search in processed transcripts
    const processedResults = await this.searchProcessedTranscripts(query, limit);
    
    // If we have enough results, return them
    if (processedResults.length >= limit) {
      await this.cacheSearchResults(query, processedResults);
      return processedResults;
    }

    // Otherwise, find and process more videos that might contain this query
    const candidateVideos = await this.findCandidateVideos(query, limit * 2);
    const newlyProcessed = await this.processVideosInBackground(candidateVideos);
    
    // Search again with newly processed videos
    const allResults = await this.searchProcessedTranscripts(query, limit);
    
    await this.cacheSearchResults(query, allResults);
    return allResults;
  }

  async searchProcessedTranscripts(query, limit) {
    const sql = `
      SELECT 
        v.id as videoId,
        v.title,
        v.channel_title as channelTitle,
        v.category,
        t.start_time as startTime,
        t.text as transcript,
        1.0 as similarity
      FROM transcripts t
      JOIN videos v ON t.video_id = v.id
      WHERE t.text LIKE ? OR t.text LIKE ?
      ORDER BY 
        CASE 
          WHEN t.text LIKE ? THEN 1
          ELSE 2
        END,
        v.updated_at DESC
      LIMIT ?
    `;

    const searchPattern = `%${query}%`;
    const exactPattern = `%${query.toLowerCase()}%`;
    
    const results = await this.db.all(sql, [
      searchPattern,
      exactPattern,
      exactPattern,
      limit
    ]);

    return results.map(result => ({
      ...result,
      searchQuery: query,
      method: 'lazy-processed',
      isReal: true
    }));
  }

  async findCandidateVideos(query, limit) {
    // Find videos that haven't been processed yet but might contain the query
    const sql = `
      SELECT * FROM videos 
      WHERE transcript_processed = FALSE 
      AND processing_attempts < 3
      AND (
        title LIKE ? OR 
        description LIKE ? OR
        category IN (?, ?, ?, ?)
      )
      ORDER BY added_at DESC
      LIMIT ?
    `;

    const searchPattern = `%${query}%`;
    const candidates = await this.db.all(sql, [
      searchPattern,
      searchPattern,
      'interviews',
      'vlogs',
      'comedy',
      'education',
      limit
    ]);

    console.log(`🎯 Found ${candidates.length} candidate videos to process`);
    return candidates;
  }

  async processVideosInBackground(videos) {
    if (videos.length === 0) return [];

    console.log(`⚡ Processing ${videos.length} videos in background...`);
    const processed = [];

    for (const video of videos.slice(0, 5)) { // Limit to 5 at a time
      try {
        // Skip if already processing
        if (this.processingQueue.has(video.id)) {
          continue;
        }

        this.processingQueue.set(video.id, true);
        
        // Extract transcript
        const result = await this.pythonBridge.extractRealTranscript(video.id);
        
        if (result.success) {
          // Save transcript to database
          await this.saveTranscriptToDatabase(video.id, result.data);
          processed.push(video);
          console.log(`✅ Processed ${video.title}`);
        }

        // Update processing status
        await this.updateVideoProcessingStatus(video.id, result.success);
        
      } catch (error) {
        console.error(`❌ Failed to process ${video.id}:`, error.message);
        await this.updateVideoProcessingStatus(video.id, false);
      } finally {
        this.processingQueue.delete(video.id);
      }
    }

    console.log(`🎉 Background processing complete: ${processed.length} videos processed`);
    return processed;
  }

  async saveTranscriptToDatabase(videoId, transcriptData) {
    const stmt = await this.db.prepare(`
      INSERT INTO transcripts (video_id, start_time, text, similarity_keywords)
      VALUES (?, ?, ?, ?)
    `);

    for (const segment of transcriptData) {
      const keywords = this.extractKeywords(segment.text);
      await stmt.run(videoId, segment.start, segment.text, keywords.join(' '));
    }

    await stmt.finalize();
  }

  async updateVideoProcessingStatus(videoId, success) {
    await this.db.run(`
      UPDATE videos 
      SET 
        transcript_processed = ?,
        processing_attempts = processing_attempts + 1,
        last_attempt_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [success, videoId]);
  }

  extractKeywords(text) {
    // Simple keyword extraction
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
  }

  async getCachedSearch(query) {
    const hash = this.hashQuery(query);
    const cached = await this.db.get(`
      SELECT results FROM search_cache 
      WHERE query_hash = ? AND expires_at > CURRENT_TIMESTAMP
    `, [hash]);

    return cached ? JSON.parse(cached.results) : null;
  }

  async cacheSearchResults(query, results) {
    const hash = this.hashQuery(query);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

    await this.db.run(`
      INSERT OR REPLACE INTO search_cache 
      (query_hash, query, results, result_count, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      hash,
      query,
      JSON.stringify(results),
      results.length,
      expiresAt.toISOString()
    ]);
  }

  hashQuery(query) {
    return require('crypto').createHash('md5').update(query.toLowerCase()).digest('hex');
  }

  async getStats() {
    const totalVideos = await this.getVideoCount();
    const processedVideos = await this.getProcessedVideoCount();
    
    const categories = await this.db.all(`
      SELECT category, COUNT(*) as count 
      FROM videos 
      GROUP BY category
    `);

    const transcriptSegments = await this.db.get(`
      SELECT COUNT(*) as count FROM transcripts
    `);

    return {
      totalVideos,
      processedVideos,
      unprocessedVideos: totalVideos - processedVideos,
      transcriptSegments: transcriptSegments.count,
      categories: categories.reduce((acc, cat) => {
        acc[cat.category] = cat.count;
        return acc;
      }, {}),
      processingProgress: totalVideos > 0 ? (processedVideos / totalVideos * 100).toFixed(1) + '%' : '0%'
    };
  }

  async collectMoreVideos() {
    if (!this.apiCollector) {
      console.log('⚠️ YouTube API not configured - cannot collect more videos');
      return;
    }

    console.log('🚀 Collecting more videos from YouTube API...');
    const newVideos = await this.apiCollector.collectAllCategories();
    await this.addVideosToDatabase(newVideos);
    
    return newVideos.length;
  }
}

module.exports = { LazyTranscriptSystem };

// Test the system
async function testLazySystem() {
  console.log('🧪 Testing Lazy Transcript System\n');
  
  const lazySystem = new LazyTranscriptSystem();
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const stats = await lazySystem.getStats();
  console.log('📊 System stats:', stats);
  
  // Test search
  const results = await lazySystem.searchTranscripts('interview', 5);
  console.log(`\n🔍 Search results: ${results.length} found`);
  
  return lazySystem;
}

if (require.main === module) {
  testLazySystem().catch(console.error);
} 