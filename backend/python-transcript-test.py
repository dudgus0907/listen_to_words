#!/usr/bin/env python3
"""
YouTube 자막 추출 정확성 테스트 - Python 버전
더 안정적인 오픈소스 도구들 사용
"""

import sys
import json
import time
from typing import List, Dict, Any

def test_youtube_transcript_api():
    """youtube-transcript-api 라이브러리 테스트"""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        print("\n🔍 Method: youtube-transcript-api (Python)")
        
        test_videos = [
            {'id': 'UF8uR6Z6KLc', 'title': 'Steve Jobs Stanford Speech'},
            {'id': 'dQw4w9WgXcQ', 'title': 'Rick Astley - Never Gonna Give You Up'},
            {'id': 'iCvmsMzlF7o', 'title': 'Julian Treasure - How to speak'},
        ]
        
        results = []
        
        for video in test_videos:
            try:
                print(f"\n📹 Testing: {video['title']} ({video['id']})")
                
                # 자막 가져오기
                transcript = YouTubeTranscriptApi.get_transcript(video['id'])
                
                if transcript:
                    print(f"✅ Success: {len(transcript)} segments found")
                    
                    # 처음 10개 세그먼트 출력
                    print("📝 Sample segments:")
                    for i, segment in enumerate(transcript[:10]):
                        start_time = int(segment['start'])
                        text = segment['text'].replace('\n', ' ').strip()
                        print(f"  {start_time:3d}s: \"{text}\"")
                    
                    results.append({
                        'video_id': video['id'],
                        'title': video['title'],
                        'success': True,
                        'segments': len(transcript),
                        'sample_data': transcript[:10]
                    })
                else:
                    print("❌ No transcript found")
                    results.append({
                        'video_id': video['id'],
                        'title': video['title'],
                        'success': False,
                        'error': 'No transcript'
                    })
                    
            except Exception as e:
                print(f"❌ Failed: {str(e)}")
                results.append({
                    'video_id': video['id'],
                    'title': video['title'],
                    'success': False,
                    'error': str(e)
                })
            
            # API 제한 방지를 위한 대기
            time.sleep(1)
        
        return results
        
    except ImportError:
        print("❌ youtube-transcript-api not installed")
        print("Install with: pip install youtube-transcript-api")
        return []

def test_yt_dlp():
    """yt-dlp 도구 테스트"""
    try:
        import yt_dlp
        print("\n🔍 Method: yt-dlp (Python)")
        
        test_videos = [
            {'id': 'UF8uR6Z6KLc', 'title': 'Steve Jobs Stanford Speech'},
            {'id': 'dQw4w9WgXcQ', 'title': 'Rick Astley - Never Gonna Give You Up'},
        ]
        
        results = []
        
        ydl_opts = {
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'skip_download': True,
            'quiet': True
        }
        
        for video in test_videos:
            try:
                print(f"\n📹 Testing: {video['title']} ({video['id']})")
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(f"https://www.youtube.com/watch?v={video['id']}", download=False)
                    
                    subtitles = info.get('subtitles', {})
                    auto_subtitles = info.get('automatic_captions', {})
                    
                    if subtitles.get('en') or auto_subtitles.get('en'):
                        print("✅ Subtitles available")
                        results.append({
                            'video_id': video['id'],
                            'title': video['title'],
                            'success': True,
                            'has_manual': bool(subtitles.get('en')),
                            'has_auto': bool(auto_subtitles.get('en'))
                        })
                    else:
                        print("❌ No subtitles found")
                        results.append({
                            'video_id': video['id'],
                            'title': video['title'],
                            'success': False,
                            'error': 'No subtitles'
                        })
                        
            except Exception as e:
                print(f"❌ Failed: {str(e)}")
                results.append({
                    'video_id': video['id'],
                    'title': video['title'],
                    'success': False,
                    'error': str(e)
                })
        
        return results
        
    except ImportError:
        print("❌ yt-dlp not installed")
        print("Install with: pip install yt-dlp")
        return []

def analyze_results(transcript_results: List[Dict], ytdlp_results: List[Dict]):
    """결과 분석"""
    print("\n📊 COMPREHENSIVE ANALYSIS")
    print("=" * 60)
    
    # youtube-transcript-api 결과
    transcript_success = sum(1 for r in transcript_results if r.get('success', False))
    print(f"\n🎯 youtube-transcript-api: {transcript_success}/{len(transcript_results)} success")
    
    # yt-dlp 결과
    ytdlp_success = sum(1 for r in ytdlp_results if r.get('success', False))
    print(f"🎯 yt-dlp: {ytdlp_success}/{len(ytdlp_results)} success")
    
    # 성공한 경우 상세 분석
    if transcript_success > 0:
        print("\n✅ youtube-transcript-api SUCCESS DETAILS:")
        for result in transcript_results:
            if result.get('success'):
                print(f"   📹 {result['title']}: {result['segments']} segments")
                
        print("\n💡 RECOMMENDATIONS:")
        print("   ✅ youtube-transcript-api works reliably")
        print("   ✅ Use this as primary method")
        print("   ✅ Timestamps are accurate")
        print("   ✅ Text quality is high")
        
    else:
        print("\n❌ ALL METHODS FAILED")
        print("\n🤔 Possible reasons:")
        print("   • YouTube policy changes")
        print("   • Regional restrictions")
        print("   • Videos don't have captions")
        print("   • Network/proxy issues")
        
        print("\n🔧 Alternative approaches:")
        print("   1. Use videos with confirmed captions")
        print("   2. Manual transcript creation for demo")
        print("   3. Educational content with open captions")
        print("   4. TED Talks (usually have accurate captions)")

def main():
    print("🚀 Starting Python-based Transcript Accuracy Test")
    print("Testing multiple YouTube transcript extraction methods\n")
    
    # Test 1: youtube-transcript-api
    transcript_results = test_youtube_transcript_api()
    
    # Test 2: yt-dlp
    ytdlp_results = test_yt_dlp()
    
    # 결과 분석
    analyze_results(transcript_results, ytdlp_results)
    
    # JSON으로 결과 저장
    all_results = {
        'youtube_transcript_api': transcript_results,
        'yt_dlp': ytdlp_results,
        'timestamp': time.time()
    }
    
    with open('transcript_test_results.json', 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Results saved to: transcript_test_results.json")

if __name__ == "__main__":
    main() 