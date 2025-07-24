const { YoutubeTranscript } = require('youtube-transcript');

// 실제 자막이 있는 유명한 영상들의 ID
const videoIds = [
  'UF8uR6Z6KLc', // Steve Jobs Stanford Speech
  'ZXsQAXx_ao0', // Simon Sinek TED Talk
  'f84n5oFoZBc', // Brené Brown TED Talk
  '5tSTk1083VY', // David Goggins (if available)
  'iCvmsMzlF7o'  // Julian Treasure TED Talk
];

async function fetchTranscripts() {
  const processedVideos = [];
  
  for (const videoId of videoIds) {
    try {
      console.log(`Fetching transcript for video: ${videoId}`);
      
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcript && transcript.length > 0) {
        // YouTube에서 가져온 transcript를 우리 형식으로 변환
        const formattedTranscript = transcript.map(item => ({
          start: Math.floor(item.offset / 1000), // milliseconds to seconds
          text: item.text.replace(/\n/g, ' ').trim()
        })).filter(item => item.text.length > 10); // 너무 짧은 텍스트 제외
        
        processedVideos.push({
          id: videoId,
          title: `Real Transcript Video ${videoId}`,
          duration: Math.max(...formattedTranscript.map(t => t.start)) + 30,
          transcript: formattedTranscript.slice(0, 20) // 첫 20개 세그먼트만
        });
        
        console.log(`✅ Successfully processed ${videoId}: ${formattedTranscript.length} segments`);
      }
    } catch (error) {
      console.log(`❌ Failed to fetch transcript for ${videoId}: ${error.message}`);
    }
  }
  
  console.log('\n=== PROCESSED VIDEOS DATA ===');
  console.log(JSON.stringify(processedVideos, null, 2));
  
  return processedVideos;
}

// 실행
fetchTranscripts().then(() => {
  console.log('\n✅ Transcript fetching completed!');
}).catch(error => {
  console.error('❌ Error:', error);
}); 