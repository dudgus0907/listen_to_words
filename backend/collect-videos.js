const { LazyTranscriptSystem } = require('./lazy-transcript-system');
const { YouTubeAPICollector } = require('./youtube-api-collector');

async function collectAndStoreVideos() {
  console.log('🚀 Starting automated video collection...\n');
  
  // Check if API key is configured
  const apiKey = process.env.YOUTUBE_API_KEY || 'AIzaSyDwsNGGLjgncR5dtB_wgQWtZPA3BWtebjI';
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || apiKey === 'your_actual_api_key_here') {
    console.log('⚠️ YouTube API key not configured!');
    console.log('\n📝 To enable automated video collection:');
    console.log('1. Get API key from: https://developers.google.com/youtube/v3/getting-started');
    console.log('2. Set environment variable: $env:YOUTUBE_API_KEY = "your_key"');
    console.log('3. Run this script again\n');
    console.log('💡 Current system works with manually added videos.');
    console.log('   You can still search and use the lazy transcript system!');
    return;
  }

  const lazySystem = new LazyTranscriptSystem();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for init
  
  const collector = new YouTubeAPICollector(apiKey);
  
  console.log('🔍 Collecting fresh videos from YouTube...');
  
  // Collect videos by category with high quality filters
  const categories = [
    { name: 'interviews', queries: 50 },
    { name: 'vlogs', queries: 30 },
    { name: 'movies-tv', queries: 40 },
    { name: 'comedy', queries: 30 },
    { name: 'education', queries: 20 },
    { name: 'news', queries: 20 }
  ];
  
  let totalCollected = 0;
  
  for (const category of categories) {
    try {
      console.log(`\n📺 Collecting ${category.name} videos...`);
      const videos = await collector.searchVideosByCategory(category.name, category.queries);
      
      if (videos.length > 0) {
        await lazySystem.addVideosToDatabase(videos);
        totalCollected += videos.length;
        console.log(`✅ Added ${videos.length} ${category.name} videos`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to collect ${category.name}:`, error.message);
    }
  }
  
  const stats = await lazySystem.getStats();
  
  console.log('\n🎉 Collection complete!');
  console.log(`📊 Total videos in database: ${stats.totalVideos}`);
  console.log(`📈 Added this session: ${totalCollected}`);
  console.log(`📋 Categories: ${JSON.stringify(stats.categories, null, 2)}`);
  console.log(`⚡ Processing progress: ${stats.processingProgress}`);
  
  // Test search with newly collected videos
  console.log('\n🧪 Testing search with fresh content...');
  const testQueries = ['interview', 'vlog', 'funny', 'education', 'news'];
  
  for (const query of testQueries) {
    const results = await lazySystem.searchTranscripts(query, 3);
    console.log(`🔍 "${query}": ${results.length} results`);
    if (results.length > 0) {
      console.log(`   Sample: "${results[0].title}"`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n💡 System ready! Users can now search across thousands of real videos.');
  console.log('🚀 Transcripts will be processed on-demand for lightning-fast searches.');
  
  return lazySystem;
}

// Additional utility functions
async function getSystemStatus() {
  const lazySystem = new LazyTranscriptSystem();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const stats = await lazySystem.getStats();
  
  console.log('📊 System Status:');
  console.log(`   Videos in database: ${stats.totalVideos}`);
  console.log(`   Processed videos: ${stats.processedVideos}`);
  console.log(`   Transcript segments: ${stats.transcriptSegments}`);
  console.log(`   Processing progress: ${stats.processingProgress}`);
  console.log(`   Categories: ${Object.keys(stats.categories).length}`);
  
  return stats;
}

async function searchWithStats(query, limit = 10) {
  const lazySystem = new LazyTranscriptSystem();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const startTime = Date.now();
  const results = await lazySystem.searchTranscripts(query, limit);
  const searchTime = Date.now() - startTime;
  
  console.log(`\n🔍 Search: "${query}"`);
  console.log(`⚡ Time: ${searchTime}ms`);
  console.log(`📋 Results: ${results.length}`);
  
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. "${result.title}" at ${result.startTime}s`);
    console.log(`      "${result.transcript}"`);
  });
  
  return results;
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'collect':
      collectAndStoreVideos().catch(console.error);
      break;
    case 'status':
      getSystemStatus().catch(console.error);
      break;
    case 'search':
      const query = process.argv[3];
      if (!query) {
        console.log('Usage: node collect-videos.js search "your query"');
        process.exit(1);
      }
      searchWithStats(query).catch(console.error);
      break;
    default:
      console.log('🎬 YouTube Video Collection System\n');
      console.log('Commands:');
      console.log('  node collect-videos.js collect   - Collect fresh videos from YouTube');
      console.log('  node collect-videos.js status    - Show system status');
      console.log('  node collect-videos.js search "query" - Search videos');
      console.log('\nExample:');
      console.log('  node collect-videos.js search "never gonna give you up"');
  }
}

module.exports = { collectAndStoreVideos, getSystemStatus, searchWithStats }; 