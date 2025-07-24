const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class PythonYouTubeBridge {
  constructor() {
    this.cacheDir = path.join(__dirname, 'transcript-cache');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async extractRealTranscript(videoId) {
    console.log(`🐍 Extracting real transcript for ${videoId} using Python API`);
    
    try {
      // Check cache first
      const cacheFile = path.join(this.cacheDir, `${videoId}_real.json`);
      try {
        const cached = await fs.readFile(cacheFile, 'utf8');
        const data = JSON.parse(cached);
        console.log(`📂 Using cached transcript for ${videoId}`);
        return { success: true, data: data.transcript, method: 'cached-real' };
      } catch (cacheError) {
        // No cache, proceed with API call
      }

      // Execute Python script file
      const { stdout, stderr } = await execAsync(`py extract_transcript.py ${videoId}`, {
        timeout: 30000 // 30 second timeout
      });

      if (stderr) {
        console.log(`⚠️ Python stderr: ${stderr}`);
      }

      // Parse result
      const result = JSON.parse(stdout.trim());
      
      if (result.success) {
        console.log(`✅ Successfully extracted ${result.segments} segments`);
        
        // Cache the result
        await fs.writeFile(cacheFile, JSON.stringify(result, null, 2));
        
        return { 
          success: true, 
          data: result.transcript,
          method: 'python-real',
          segments: result.segments
        };
      } else {
        console.log(`❌ Python API failed: ${result.error}`);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.log(`❌ Bridge error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async processVideo(videoId, title) {
    console.log(`\n🎬 Processing ${videoId} - ${title}`);
    
    // Try Python API first
    const pythonResult = await this.extractRealTranscript(videoId);
    
    if (pythonResult.success) {
      return {
        id: videoId,
        title: title,
        duration: Math.max(...pythonResult.data.map(t => t.start)) + 30,
        transcript: pythonResult.data,
        method: pythonResult.method,
        segments: pythonResult.segments
      };
    } else {
      console.log(`⚠️ Falling back to manual data for ${videoId}`);
      return null;
    }
  }

  async processBatch(videos) {
    const results = [];
    
    for (const video of videos) {
      try {
        const result = await this.processVideo(video.id, video.title);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error processing ${video.id}:`, error);
      }
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  searchTranscripts(query, videos) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    for (const video of videos) {
      for (const segment of video.transcript) {
        if (segment.text.toLowerCase().includes(searchTerm)) {
          const similarity = this.calculateSimilarity(searchTerm, segment.text.toLowerCase());
          results.push({
            videoId: video.id,
            title: video.title,
            startTime: segment.start,
            transcript: segment.text,
            similarity: similarity,
            searchQuery: query,
            method: video.method,
            isReal: video.method?.includes('real') || video.method?.includes('python')
          });
        }
      }
    }
    
    // Sort by similarity and prioritize real transcripts
    return results.sort((a, b) => {
      if (a.isReal && !b.isReal) return -1;
      if (!a.isReal && b.isReal) return 1;
      return b.similarity - a.similarity;
    });
  }

  calculateSimilarity(search, text) {
    if (text.includes(search)) {
      return 1.0;
    }
    const words = search.split(' ');
    let matches = 0;
    for (const word of words) {
      if (text.includes(word)) matches++;
    }
    return matches / words.length;
  }
}

// Test the bridge
async function testBridge() {
  console.log('🚀 Testing Python-YouTube Bridge\n');
  
  const bridge = new PythonYouTubeBridge();
  
  const testVideos = [
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up' },
    { id: 'UF8uR6Z6KLc', title: 'Steve Jobs Stanford Speech' }
  ];
  
  const results = await bridge.processBatch(testVideos);
  
  console.log(`\n📊 Results: ${results.length} videos processed`);
  
  // Test search
  if (results.length > 0) {
    const searchResults = bridge.searchTranscripts('never gonna', results);
    console.log(`\n🔍 Search test: ${searchResults.length} results for "never gonna"`);
    if (searchResults.length > 0) {
      console.log(`   Best match: "${searchResults[0].transcript}" at ${searchResults[0].startTime}s`);
    }
  }
  
  return results;
}

module.exports = { PythonYouTubeBridge, testBridge };

if (require.main === module) {
  testBridge().catch(console.error);
} 