const { LazyTranscriptSystem } = require('./lazy-transcript-system');

class SafeTranscriptProcessor {
  constructor() {
    this.lazySystem = new LazyTranscriptSystem();
    this.dailyLimit = 50; // 하루 최대 50개 영상 처리
    this.requestDelay = 5000; // 5초 간격
    this.batchSize = 5; // 한 번에 5개씩
    this.processedToday = 0;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    console.log('🔄 Initializing system...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Ensure database is ready
    let retries = 0;
    while (!this.lazySystem.db && retries < 10) {
      console.log(`  ⏳ Waiting for database... (${retries + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    if (!this.lazySystem.db) {
      throw new Error('Failed to initialize database');
    }
    
    this.initialized = true;
    console.log('✅ System initialized successfully');
  }

  async processSafely(maxVideos = 20) {
    await this.init();
    console.log('🛡️ Starting SAFE transcript processing...');
    console.log(`   • Daily limit: ${this.dailyLimit} videos`);
    console.log(`   • Request delay: ${this.requestDelay/1000}s between requests`);
    console.log(`   • Batch size: ${this.batchSize} videos at a time`);
    console.log(`   • Max this session: ${maxVideos} videos\n`);

    // Check how many we can process today
    const remainingToday = this.dailyLimit - this.processedToday;
    const toProcess = Math.min(maxVideos, remainingToday);

    if (toProcess <= 0) {
      console.log('⚠️ Daily limit reached. Try again tomorrow!');
      return [];
    }

    console.log(`🎯 Processing ${toProcess} videos safely...\n`);

    // Get unprocessed videos
    const unprocessedVideos = await this.lazySystem.db.all(`
      SELECT * FROM videos 
      WHERE transcript_processed = FALSE 
      AND processing_attempts < 3
      ORDER BY added_at DESC
      LIMIT ?
    `, [toProcess]);

    console.log(`📋 Found ${unprocessedVideos.length} candidates for processing`);

    let successCount = 0;
    let failCount = 0;

    // Process in small batches with delays
    for (let i = 0; i < unprocessedVideos.length; i += this.batchSize) {
      const batch = unprocessedVideos.slice(i, i + this.batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(unprocessedVideos.length/this.batchSize)} (${batch.length} videos)`);

      for (let j = 0; j < batch.length; j++) {
        const video = batch[j];
        const videoNum = i + j + 1;
        
        try {
          console.log(`  (${videoNum}/${unprocessedVideos.length}) 🎬 "${video.title}"`);
          
          // Add random delay to appear more human-like
          const delay = this.requestDelay + Math.random() * 2000;
          console.log(`  ⏳ Waiting ${Math.round(delay/1000)}s to avoid detection...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          const result = await this.lazySystem.pythonBridge.extractRealTranscript(video.id);
          
          if (result.success) {
            await this.lazySystem.saveTranscriptToDatabase(video.id, result.data);
            await this.lazySystem.updateVideoProcessingStatus(video.id, true);
            successCount++;
            this.processedToday++;
            console.log(`  ✅ SUCCESS: ${result.data.length} segments extracted`);
          } else {
            await this.lazySystem.updateVideoProcessingStatus(video.id, false);
            failCount++;
            
            // Check if it's an IP block
            if (result.error && result.error.includes('blocking requests from your IP')) {
              console.log(`  ❌ IP BLOCKED: Stopping for safety`);
              break;
            } else {
              console.log(`  ❌ FAILED: ${result.error}`);
            }
          }

        } catch (error) {
          await this.lazySystem.updateVideoProcessingStatus(video.id, false);
          failCount++;
          console.log(`  ❌ ERROR: ${error.message}`);
          
          // Stop if we get too many errors
          if (failCount > 3) {
            console.log(`  ⚠️ Too many failures, stopping for safety`);
            break;
          }
        }
      }

      // Longer break between batches
      if (i + this.batchSize < unprocessedVideos.length) {
        console.log(`  🛌 Longer break between batches (10s)...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    const stats = await this.lazySystem.getStats();
    
    console.log(`\n📊 Safe processing complete:`);
    console.log(`   ✅ Successfully processed: ${successCount} videos`);
    console.log(`   ❌ Failed: ${failCount} videos`);
    console.log(`   📈 Total processed videos: ${stats.processedVideos}`);
    console.log(`   📊 Total transcript segments: ${stats.transcriptSegments}`);
    console.log(`   🚀 Processing progress: ${stats.processingProgress}`);
    console.log(`   📅 Processed today: ${this.processedToday}/${this.dailyLimit}`);

    return { successCount, failCount, stats };
  }

  async getProcessingRecommendation() {
    await this.init();
    const stats = await this.lazySystem.getStats();
    const unprocessed = stats.totalVideos - stats.processedVideos;
    
    console.log('\n💡 Processing Recommendation:');
    
    if (unprocessed === 0) {
      console.log('🎉 All videos are processed! You can search everything instantly.');
      return 'complete';
    }
    
    const daysNeeded = Math.ceil(unprocessed / this.dailyLimit);
    
    console.log(`📊 Current status:`);
    console.log(`   • Total videos: ${stats.totalVideos}`);
    console.log(`   • Processed: ${stats.processedVideos}`);
    console.log(`   • Remaining: ${unprocessed}`);
    console.log(`   • Estimated days to complete: ${daysNeeded} days`);
    console.log(`   • Daily safe limit: ${this.dailyLimit} videos`);
    
    if (unprocessed < 20) {
      console.log('\n🎯 Recommendation: Process remaining videos now (low risk)');
      return 'process_now';
    } else if (unprocessed < 100) {
      console.log('\n⚖️ Recommendation: Process 20-30 videos per day for best safety');
      return 'gradual';
    } else {
      console.log('\n🛡️ Recommendation: Process 50 videos per day maximum to avoid blocks');
      return 'very_gradual';
    }
  }

  async quickTest() {
    await this.init();
    console.log('🧪 Quick safety test with 3 videos...\n');
    return await this.processSafely(3);
  }
}

// Usage examples
async function runSafeProcessing() {
  const processor = new SafeTranscriptProcessor();
  
  console.log('🛡️ Safe YouTube Transcript Processor\n');
  
  // Get recommendation
  const recommendation = await processor.getProcessingRecommendation();
  
  if (recommendation === 'complete') {
    return;
  }
  
  // Process based on recommendation
  if (recommendation === 'process_now') {
    await processor.processSafely(50);
  } else {
    await processor.quickTest();
  }
}

async function testSafety() {
  const processor = new SafeTranscriptProcessor();
  await processor.quickTest();
}

module.exports = { SafeTranscriptProcessor, runSafeProcessing, testSafety };

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'test') {
    testSafety().catch(console.error);
  } else if (command === 'process') {
    runSafeProcessing().catch(console.error);
  } else {
    console.log('🛡️ Safe Transcript Processor');
    console.log('Commands:');
    console.log('  node safe-transcript-processor.js test     - Quick 3-video test');
    console.log('  node safe-transcript-processor.js process  - Full safe processing');
  }
} 