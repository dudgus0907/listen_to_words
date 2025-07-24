const { LazyTranscriptSystem } = require('./lazy-transcript-system');
const { PythonYouTubeBridge } = require('./python-youtube-bridge');

class PreprocessedTranscriptSystem {
  constructor() {
    this.lazySystem = new LazyTranscriptSystem();
    this.pythonBridge = new PythonYouTubeBridge();
    this.processedVideos = new Map();
    this.isReady = false;
  }

  async initializeWithPreprocessing() {
    console.log('🚀 Starting FAST search system with preprocessing...\n');
    
    // Wait for lazy system to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stats = await this.lazySystem.getStats();
    console.log(`📊 Found ${stats.totalVideos} videos in database`);
    console.log(`📊 ${stats.processedVideos} already processed`);
    
    const unprocessedCount = stats.totalVideos - stats.processedVideos;
    
    if (unprocessedCount > 0) {
      console.log(`⚡ Pre-processing ${unprocessedCount} remaining videos for instant search...`);
      console.log('   This may take a few minutes, but searches will be lightning fast!\n');
      
      await this.preprocessAllVideos();
    }
    
    console.log('✅ System ready! All searches will now be instant.\n');
    this.isReady = true;
    
    return this.getProcessedVideoCount();
  }

  async preprocessAllVideos() {
    // Get all videos that need processing
    const unprocessedVideos = await this.lazySystem.db.all(`
      SELECT * FROM videos 
      WHERE transcript_processed = FALSE 
      AND processing_attempts < 3
      ORDER BY category, title
    `);

    console.log(`🎬 Processing ${unprocessedVideos.length} videos...`);
    
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < unprocessedVideos.length; i++) {
      const video = unprocessedVideos[i];
      const progress = `(${i + 1}/${unprocessedVideos.length})`;
      
      try {
        console.log(`${progress} 🎬 Processing: "${video.title}"`);
        
        const result = await this.pythonBridge.extractRealTranscript(video.id);
        
        if (result.success) {
          await this.lazySystem.saveTranscriptToDatabase(video.id, result.data);
          await this.lazySystem.updateVideoProcessingStatus(video.id, true);
          
          this.processedVideos.set(video.id, {
            title: video.title,
            segments: result.data.length
          });
          
          processed++;
          console.log(`✅ ${progress} SUCCESS: ${result.data.length} segments extracted`);
        } else {
          await this.lazySystem.updateVideoProcessingStatus(video.id, false);
          failed++;
          console.log(`❌ ${progress} FAILED: ${result.error}`);
        }
        
        // Rate limiting to be nice to YouTube
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        await this.lazySystem.updateVideoProcessingStatus(video.id, false);
        failed++;
        console.log(`❌ ${progress} ERROR: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Preprocessing complete:`);
    console.log(`   ✅ Successfully processed: ${processed} videos`);
    console.log(`   ❌ Failed: ${failed} videos`);
    console.log(`   🚀 Total ready for instant search: ${await this.getProcessedVideoCount()}`);
  }

  async getProcessedVideoCount() {
    const result = await this.lazySystem.db.get(`
      SELECT COUNT(*) as count FROM videos WHERE transcript_processed = TRUE
    `);
    return result.count;
  }

  async instantSearch(query, limit = 10) {
    if (!this.isReady) {
      throw new Error('System not ready! Please wait for preprocessing to complete.');
    }
    
    console.log(`⚡ INSTANT search for: "${query}"`);
    const startTime = Date.now();
    
    // This will be super fast since everything is pre-processed
    const results = await this.lazySystem.searchProcessedTranscripts(query, limit);
    
    const searchTime = Date.now() - startTime;
    console.log(`🚀 Search completed in ${searchTime}ms`);
    
    return {
      query,
      results,
      searchTime,
      totalResults: results.length,
      systemReady: this.isReady
    };
  }

  async getSystemStats() {
    const stats = await this.lazySystem.getStats();
    return {
      ...stats,
      isReady: this.isReady,
      instantSearchReady: this.isReady,
      avgSearchTime: this.isReady ? '<100ms' : 'Processing...'
    };
  }
}

// Quick demo function
async function demonstrateInstantSearch() {
  console.log('🎯 Demonstrating INSTANT search system\n');
  
  const system = new PreprocessedTranscriptSystem();
  
  console.log('Phase 1: Preprocessing all videos...');
  const processedCount = await system.initializeWithPreprocessing();
  
  console.log(`\nPhase 2: Testing instant searches with ${processedCount} processed videos...\n`);
  
  const testQueries = [
    'never gonna give you up',
    'interview',
    'office',
    'comedy',
    'education'
  ];
  
  for (const query of testQueries) {
    try {
      const result = await system.instantSearch(query, 5);
      console.log(`🔍 "${query}": ${result.results.length} results in ${result.searchTime}ms`);
      
      if (result.results.length > 0) {
        console.log(`   📝 Sample: "${result.results[0].title}" at ${result.results[0].startTime}s`);
        console.log(`   💬 Text: "${result.results[0].transcript}"`);
      }
      console.log('');
      
    } catch (error) {
      console.log(`❌ Search failed: ${error.message}`);
    }
  }
  
  const finalStats = await system.getSystemStats();
  console.log('📊 Final system stats:', finalStats);
  
  return system;
}

module.exports = { PreprocessedTranscriptSystem, demonstrateInstantSearch };

if (require.main === module) {
  demonstrateInstantSearch().catch(console.error);
} 