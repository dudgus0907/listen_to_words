const { LazyTranscriptSystem } = require('./lazy-transcript-system');

// 기존 서버의 영상 목록
const existingVideos = [
  // 🎯 Original Core Videos
  { id: 'UF8uR6Z6KLc', title: 'Steve Jobs Stanford Commencement Speech 2005', category: 'education' },
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', category: 'music' },
  { id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', category: 'music' },
  
  // 🎤 Celebrity Interviews & Talk Shows
  { id: 'TvnYmWpD_T8', title: 'Will Smith on The Tonight Show Starring Jimmy Fallon', category: 'interviews' },
  { id: 'BQ4yd2W50No', title: 'Oprah Winfrey interviews Michael Jackson', category: 'interviews' },
  { id: 'djV11Xbc914', title: 'David Letterman Final Show - Thank You and Goodnight', category: 'interviews' },
  { id: 'q-hBLnmjgWQ', title: 'Ellen DeGeneres Coming Out on Oprah 1997', category: 'interviews' },
  { id: 'Tuw8hxrFBH8', title: 'Barack Obama on Between Two Ferns with Zach Galifianakis', category: 'interviews' },
  { id: '6P1vf_7DoLA', title: 'Jennifer Lawrence on Conan - Hunger Games Stories', category: 'interviews' },
  { id: 'lWA2pjMjpBs', title: 'Gordon Ramsay Heated Moments', category: 'interviews' },
  { id: 'PrT1wMANGFg', title: 'Bill Gates interview on 60 Minutes', category: 'interviews' },
  
  // 🎭 Movie & TV Show Clips
  { id: 'vWizDna1XO4', title: 'Good Will Hunting - Park Bench Scene', category: 'movies-tv' },
  { id: 'Ug88HO2mg44', title: 'The Office - Jim and Dwight Best Pranks', category: 'movies-tv' },
  { id: 'qvOgAPa_mkE', title: 'Friends - Ross and Rachel First Kiss', category: 'movies-tv' },
  { id: '5PdXIHGvMpk', title: 'The Dark Knight - Why So Serious Scene', category: 'movies-tv' },
  { id: 'C_rttgHqmzM', title: 'Breaking Bad - I Am The One Who Knocks', category: 'movies-tv' },
  { id: 'GlKL_EpnSp8', title: 'Game of Thrones - Best Tyrion Lannister Quotes', category: 'movies-tv' },
  { id: 'QeAKX_0wZWY', title: 'Stranger Things - Eleven Goodbye Scene', category: 'movies-tv' },
  { id: 'tHhL1SMgQIY', title: 'The Shawshank Redemption - Hope Speech', category: 'movies-tv' },
  
  // 📱 Popular Vlogs & YouTubers
  { id: 'FlsCjmMhFmw', title: 'David Dobrik - SURPRISING MY FRIENDS!!', category: 'vlogs' },
  { id: 'M8FerFHbPWY', title: 'Emma Chamberlain - day in my life living alone', category: 'vlogs' },
  { id: 'FRjOSmc01-M', title: 'Casey Neistat - NYC to London in 18 HOURS', category: 'vlogs' },
  { id: '8mkofgRW1II', title: 'MrBeast - I Gave $1,000,000 To Random People', category: 'vlogs' },
  { id: 'hFZFjoX2cGg', title: 'Yes Theory - Asking Strangers To Travel The World', category: 'vlogs' },
  { id: 'jdH2Sy-BlNE', title: 'Dude Perfect - Airplane Trick Shots', category: 'vlogs' },
  { id: 'KYEyIGLRqW0', title: 'Liza Koshy - REACTING TO MY OLD VIDEOS', category: 'vlogs' },
  
  // 🎪 Comedy Sketches & Stand-up
  { id: 'VlrUKF4095Q', title: 'Key & Peele - Substitute Teacher', category: 'comedy' },
  { id: 'hFQOLz_LJKM', title: 'SNL - More Cowbell with Christopher Walken', category: 'comedy' },
  { id: 'M5FR1LGsT7E', title: 'Dave Chappelle - Killing Them Softly', category: 'comedy' },
  { id: 'QO2QL_x1SZo', title: 'Comedy Central Roast - Best Burns', category: 'comedy' },
  { id: 'n450GmN2Yfk', title: 'The Eric Andre Show - Hannibal Buress Pranks', category: 'comedy' },
  { id: '5Krz-dyD-UQ', title: 'Conan O Brien - Best Remote Segments', category: 'comedy' },
  
  // 📚 Educational & Inspirational Content
  { id: 'ZXsQAXx_ao0', title: 'Simon Sinek: How great leaders inspire action', category: 'education' },
  { id: 'iCvmsMzlF7o', title: 'Julian Treasure: How to speak so that people want to listen', category: 'education' },
  { id: 'f84n5oFoZBc', title: 'Brené Brown: The power of vulnerability', category: 'education' },
  { id: '8KkKuTCFvzI', title: 'Inside the mind of a master procrastinator | Tim Urban', category: 'education' },
  { id: 'rBpaUICxEhk', title: 'Amy Cuddy: Your body language may shape who you are', category: 'education' },
  { id: 'ROO4Z9tOyqQ', title: 'Neil deGrasse Tyson - Death by Black Hole', category: 'education' },
  { id: 'bHIhgxav9LY', title: 'Jordan Peterson - 12 Rules for Life', category: 'education' },
  
  // 🌟 Viral Moments & Memes
  { id: 'BROWqjuTM0g', title: 'Double Rainbow Bear - "Oh my god!"', category: 'viral' },
  { id: 'JcmylxQ0ma4', title: 'Hide the Pain Harold Interview', category: 'viral' },
  { id: 'wROM58ZbdR0', title: 'Chewbacca Mom - Full Facebook Live Video', category: 'viral' },
  { id: 'ZZ5LpwO-An4', title: 'HEYYEYAAEYAAAEYAEYAA', category: 'viral' },
  { id: 'kJQP7kiw5Fk', title: 'Deez Nuts - Original Video', category: 'viral' },
  
  // 🎮 Gaming Content
  { id: 'k0VjBOL5w-A', title: 'PewDiePie - Minecraft Epic Moments', category: 'gaming' },
  { id: '0m9QUoW5KnY', title: 'Markiplier - Five Nights at Freddys Reaction', category: 'gaming' },
  { id: 'Pim6LgNGb4s', title: 'Ninja - Fortnite Best Plays', category: 'gaming' },
  
  // 🍳 Lifestyle & How-To
  { id: 'aDL0HJNvKXY', title: 'Gordon Ramsay - Perfect Scrambled Eggs', category: 'lifestyle' },
  { id: 'knAqM2Gsfi4', title: 'Jamie Oliver - 5 Minute Meals', category: 'lifestyle' },
  { id: 'KNHgeykDXFw', title: 'Michelle Obama - Healthy Eating Tips', category: 'lifestyle' },
  
  // 🎬 Behind the Scenes & Bloopers
  { id: 'WK4HHaNhcgU', title: 'Marvel Avengers Endgame Bloopers', category: 'movies-tv' },
  { id: 'IE44gWAjuDQ', title: 'The Office Bloopers Season 1-9', category: 'movies-tv' },
  { id: 'zLTZPK8HhFI', title: 'Star Wars Behind the Scenes Funny Moments', category: 'movies-tv' }
];

async function migrateToLazySystem() {
  console.log('🚀 Migrating existing videos to Lazy Transcript System\n');
  
  const lazySystem = new LazyTranscriptSystem();
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`📥 Adding ${existingVideos.length} videos to database...`);
  
  // Add all videos to database
  await lazySystem.addVideosToDatabase(existingVideos);
  
  const stats = await lazySystem.getStats();
  console.log('\n📊 Migration complete! System stats:');
  console.log(`   Total videos: ${stats.totalVideos}`);
  console.log(`   Categories: ${JSON.stringify(stats.categories, null, 2)}`);
  console.log(`   Processing progress: ${stats.processingProgress}`);
  
  // Test search functionality
  console.log('\n🧪 Testing search functionality...');
  
  const testQueries = ['never gonna', 'interview', 'comedy', 'office', 'steve jobs'];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Testing search: "${query}"`);
    const results = await lazySystem.searchTranscripts(query, 3);
    console.log(`   Results: ${results.length} found`);
    
    if (results.length > 0) {
      console.log(`   Sample: "${results[0].title}"`);
    }
    
    // Wait between searches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎉 Migration and testing complete!');
  console.log('\n💡 The system will now process transcripts on-demand as users search.');
  console.log('   First searches may be slower as transcripts are extracted.');
  console.log('   Subsequent searches will be very fast using cached data.');
  
  return lazySystem;
}

if (require.main === module) {
  migrateToLazySystem().catch(console.error);
}

module.exports = { migrateToLazySystem, existingVideos }; 