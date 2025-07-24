const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class YouTubeAPICollector {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    this.dataDir = path.join(__dirname, 'video-metadata');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async searchVideosByCategory(category, maxResults = 50) {
    try {
      console.log(`🔍 Searching for ${category} videos...`);
      
      const searchQueries = this.getCategoryQueries(category);
      const allVideos = [];
      
      for (const query of searchQueries) {
        const response = await axios.get(`${this.baseURL}/search`, {
          params: {
            key: this.apiKey,
            q: query,
            part: 'snippet',
            type: 'video',
            maxResults: Math.min(maxResults, 10),
            order: 'relevance',
            videoDuration: 'medium', // 4-20 minutes
            videoDefinition: 'high',
            relevanceLanguage: 'en'
          }
        });

        const videos = response.data.items.map(item => ({
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnails: item.snippet.thumbnails,
          category: category,
          searchQuery: query,
          hasTranscript: null, // To be determined
          transcriptProcessed: false,
          addedAt: new Date().toISOString()
        }));

        allVideos.push(...videos);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Remove duplicates
      const uniqueVideos = this.removeDuplicates(allVideos);
      
      console.log(`✅ Found ${uniqueVideos.length} unique ${category} videos`);
      return uniqueVideos;

    } catch (error) {
      console.error(`❌ Error searching ${category} videos:`, error.message);
      return [];
    }
  }

  getCategoryQueries(category) {
    const queries = {
      'interviews': [
        'celebrity interview talk show',
        'CEO interview business',
        'actor interview behind scenes',
        'musician interview',
        'sports interview athlete',
        'author interview book',
        'director interview film'
      ],
      'vlogs': [
        'daily vlog lifestyle',
        'travel vlog adventure',
        'morning routine vlog',
        'student life vlog',
        'work day vlog',
        'family vlog',
        'food vlog cooking'
      ],
      'movies-tv': [
        'movie scene dialogue',
        'TV show best moments',
        'film analysis breakdown',
        'movie trailer reaction',
        'TV series recap',
        'movie behind scenes',
        'actor audition tape'
      ],
      'comedy': [
        'stand up comedy special',
        'comedy sketch funny',
        'late night comedy',
        'improv comedy',
        'comedy roast',
        'funny moments compilation',
        'comedy podcast clips'
      ],
      'education': [
        'TED talk education',
        'university lecture',
        'online course preview',
        'educational documentary',
        'science explanation',
        'history documentary',
        'language learning'
      ],
      'news': [
        'news interview',
        'breaking news analysis',
        'political interview',
        'news conference',
        'documentary investigation',
        'current events discussion',
        'press briefing'
      ]
    };
    
    return queries[category] || [category];
  }

  removeDuplicates(videos) {
    const seen = new Set();
    return videos.filter(video => {
      if (seen.has(video.id)) {
        return false;
      }
      seen.add(video.id);
      return true;
    });
  }

  async collectAllCategories() {
    console.log('🚀 Starting comprehensive video collection...\n');
    
    const categories = [
      'interviews',
      'vlogs', 
      'movies-tv',
      'comedy',
      'education',
      'news'
    ];

    const allVideos = [];
    
    for (const category of categories) {
      try {
        const videos = await this.searchVideosByCategory(category, 100);
        allVideos.push(...videos);
        
        // Save category data
        await this.saveCategoryData(category, videos);
        
        // Rate limiting between categories
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to collect ${category}:`, error.message);
      }
    }

    // Save master list
    await this.saveMasterList(allVideos);
    
    console.log(`\n🎉 Collection complete: ${allVideos.length} total videos`);
    return allVideos;
  }

  async saveCategoryData(category, videos) {
    const filename = path.join(this.dataDir, `${category}.json`);
    await fs.writeFile(filename, JSON.stringify(videos, null, 2));
    console.log(`💾 Saved ${videos.length} ${category} videos to ${filename}`);
  }

  async saveMasterList(allVideos) {
    const filename = path.join(this.dataDir, 'master-video-list.json');
    const data = {
      totalVideos: allVideos.length,
      lastUpdated: new Date().toISOString(),
      categories: this.getCategoryStats(allVideos),
      videos: allVideos
    };
    
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Saved master list with ${allVideos.length} videos`);
  }

  getCategoryStats(videos) {
    const stats = {};
    videos.forEach(video => {
      stats[video.category] = (stats[video.category] || 0) + 1;
    });
    return stats;
  }

  async loadMasterList() {
    try {
      const filename = path.join(this.dataDir, 'master-video-list.json');
      const data = await fs.readFile(filename, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log('📂 No existing master list found');
      return null;
    }
  }

  async getPopularChannels() {
    // Get popular channels for each category
    const channels = {
      interviews: [
        'UC8-Th83bH_thdKZDJCrn88g', // Jimmy Fallon
        'UCMtFAi84ehTSYSE9XoHefig', // The Late Show
        'UC8czUKSoIyHNaWRJnR8N_zQ', // Joe Rogan Experience
      ],
      vlogs: [
        'UC3tNpTOHsTnkmbwztCs30sA', // Emma Chamberlain
        'UCG8rbF3g2AMX70yOd8vqIZg', // David Dobrik
        'UCNIuvl7V8zACPpTmmNIqP2A', // Casey Neistat
      ],
      comedy: [
        'UCwWhs_6x42TyRM4Wstoq8HA', // Comedy Central
        'UCqFzWxSCi39LnW1JKFR3efg', // Saturday Night Live
        'UC-SJ6nODDmufqBzPBwCvYvQ', // Key & Peele
      ]
    };

    return channels;
  }
}

// Test function
async function testCollector() {
  console.log('🧪 Testing YouTube API Collector\n');
  
  // Note: You need a YouTube Data API key
  const apiKey = process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY_HERE';
  
  if (apiKey === 'YOUR_API_KEY_HERE') {
    console.log('⚠️ YouTube API key not configured');
    console.log('Set YOUTUBE_API_KEY environment variable');
    return;
  }
  
  const collector = new YouTubeAPICollector(apiKey);
  
  // Test with a small batch first
  const interviews = await collector.searchVideosByCategory('interviews', 10);
  console.log(`\n📊 Sample results: ${interviews.length} interviews found`);
  
  if (interviews.length > 0) {
    console.log('\n🎬 Sample video:');
    console.log(`   Title: ${interviews[0].title}`);
    console.log(`   Channel: ${interviews[0].channelTitle}`);
    console.log(`   ID: ${interviews[0].id}`);
  }
}

module.exports = { YouTubeAPICollector, testCollector };

if (require.main === module) {
  testCollector().catch(console.error);
} 