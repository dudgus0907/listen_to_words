#!/usr/bin/env python3
"""
Simple YouTube Transcript API Test
"""

import json
import sys

def test_transcript_api():
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        print("✅ youtube-transcript-api imported successfully")
        
        # Test with Rick Astley video (known to have captions)
        video_id = 'dQw4w9WgXcQ'
        print(f"🔍 Testing with video: {video_id}")
        
        # Get transcript using new API
        try:
            # Try new API format first
            ytt_api = YouTubeTranscriptApi()
            fetched_transcript = ytt_api.fetch(video_id)
            transcript = [
                {
                    'start': snippet.start,
                    'duration': snippet.duration,
                    'text': snippet.text
                }
                for snippet in fetched_transcript
            ]
        except AttributeError:
            # Fallback to old API format
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
        print(f"✅ SUCCESS: Got {len(transcript)} transcript segments")
        
        # Show first 5 segments
        print("\n📝 First 5 segments:")
        for i, segment in enumerate(transcript[:5]):
            start_time = int(segment['start'])
            text = segment['text'].strip()
            print(f"  {start_time:3d}s: \"{text}\"")
        
        # Save to JSON for Node.js to use
        output = {
            'success': True,
            'video_id': video_id,
            'segments': len(transcript),
            'transcript': transcript[:20]  # First 20 segments
        }
        
        with open('transcript_output.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Saved transcript to: transcript_output.json")
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("📦 Install with: pip install youtube-transcript-api")
        return False
        
    except Exception as e:
        print(f"❌ API Error: {e}")
        print("🔍 This might be due to:")
        print("   • Video doesn't have captions")
        print("   • Regional restrictions")
        print("   • Temporary YouTube API changes")
        return False

if __name__ == "__main__":
    success = test_transcript_api()
    sys.exit(0 if success else 1) 