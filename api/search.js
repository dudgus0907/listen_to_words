const fs = require('fs');
const path = require('path');

// Load transcript cache data 
function loadTranscriptCache() {
  try {
    const cacheDir = path.join(process.cwd(), 'backend', 'transcript-cache');
    const cacheFiles = fs.readdirSync(cacheDir);
    const videos = [];
    
    for (const file of cacheFiles) {
      if (file.endsWith('_real.json')) {
        try {
          const videoId = file.replace('_real.json', '');
          const data = JSON.parse(fs.readFileSync(path.join(cacheDir, file), 'utf8'));
          
          if (data.transcript && data.transcript.length > 0) {
            videos.push({
              id: data.video_id || data.videoId || videoId,
              title: data.video_title || data.videoTitle || `Video ${videoId}`,
              duration: Math.max(...data.transcript.map(t => t.start)) + 30,
              transcript: data.transcript,
              method: 'cached-real'
            });
          }
        } catch (error) {
          // Skip invalid cache files
        }
      }
    }
    
    return videos;
  } catch (error) {
    console.log('Cache loading failed, using fallback');
    return [{
      id: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      duration: 212,
      transcript: [
        { start: 43, text: "Never gonna give you up" },
        { start: 45, text: "Never gonna let you down" },
        { start: 47, text: "Never gonna run around and desert you" }
      ],
      method: 'fallback'
    }];
  }
}

// Simple search function
function searchTranscripts(query, videos) {
  const results = [];
  const searchLower = query.toLowerCase();
  
  for (const video of videos) {
    for (const segment of video.transcript) {
      if (segment.text && segment.text.toLowerCase().includes(searchLower)) {
        results.push({
          videoId: video.id,
          title: video.title,
          startTime: Math.floor(segment.start),
          transcript: segment.text,
          similarity: 0.9,
          searchQuery: query,
          method: video.method
        });
      }
    }
  }
  
  return results.slice(0, 10); // Limit to 10 results
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log(`🔍 Searching for: "${query}"`);
    const startTime = Date.now();
    
    // Load videos and search
    const videos = loadTranscriptCache();
    const results = searchTranscripts(query, videos);
    
    const searchTime = Date.now() - startTime;
    console.log(`✅ Found ${results.length} results in ${searchTime}ms`);
    
    res.json({
      query: query,
      results: results,
      totalResults: results.length,
      searchTime: searchTime,
      systemInfo: {
        source: 'vercel-serverless',
        videosInDatabase: videos.length,
        method: 'cached-search'
      }
    });
    
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 