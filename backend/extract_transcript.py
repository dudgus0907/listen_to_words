#!/usr/bin/env python3
"""
YouTube Transcript Extractor
Called by Node.js with video ID as argument
"""

import json
import sys
from youtube_transcript_api import YouTubeTranscriptApi

def extract_transcript(video_id):
    try:
        # Try new API format first
        try:
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
        
        # Convert to our format
        formatted_transcript = []
        for segment in transcript:
            formatted_transcript.append({
                'start': int(segment['start']),
                'text': segment['text'].replace('\n', ' ').strip()
            })
        
        result = {
            'success': True,
            'video_id': video_id,
            'segments': len(formatted_transcript),
            'transcript': formatted_transcript
        }
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'video_id': video_id,
            'error': str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python extract_transcript.py <video_id>'
        }))
        sys.exit(1)
    
    video_id = sys.argv[1]
    result = extract_transcript(video_id)
    print(json.dumps(result)) 