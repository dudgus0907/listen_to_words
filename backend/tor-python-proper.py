#!/usr/bin/env python3
import sys
import json
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import socks
import socket
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled, 
    NoTranscriptFound, 
    VideoUnavailable
)

def setup_tor_proxy():
    """Tor SOCKS5 프록시 설정"""
    print("🌐 Setting up Tor SOCKS5 proxy...")
    
    # SOCKS5 프록시 설정
    socks.set_default_proxy(socks.SOCKS5, "127.0.0.1", 9150)
    socket.socket = socks.socksocket
    
    print("✅ Tor proxy configured successfully")

def test_tor_connection():
    """Tor 연결 테스트"""
    try:
        print("🔧 Testing Tor connection...")
        response = requests.get('https://httpbin.org/ip', timeout=10)
        ip_info = response.json()
        print(f"✅ Tor working! Current IP: {ip_info['origin']}")
        return True
    except Exception as e:
        print(f"❌ Tor connection failed: {e}")
        return False

def extract_transcript_with_tor(video_id):
    """Tor 프록시를 통한 transcript 추출"""
    print(f"\n🎯 Extracting transcript for {video_id} via Tor...\n")
    
    try:
        # 1. Tor 프록시 설정
        setup_tor_proxy()
        
        # 2. Tor 연결 테스트
        if not test_tor_connection():
            return {"success": False, "error": "Tor connection failed"}
        
        # 3. Transcript 추출 시도
        print("🔧 Attempting transcript extraction...")
        
        # 먼저 사용 가능한 언어 확인
        try:
            available_transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
            print(f"📋 Available transcripts found for {video_id}")
            
            # 영어 transcript 찾기
            transcript = None
            for t in available_transcripts:
                print(f"   - {t.language} ({t.language_code})")
                if t.language_code in ['en', 'en-US', 'en-GB']:
                    transcript = t.fetch()
                    print(f"✅ Using {t.language} transcript")
                    break
            
            # 영어가 없으면 첫 번째 transcript 사용
            if not transcript:
                first_transcript = next(iter(available_transcripts))
                transcript = first_transcript.fetch()
                print(f"⚠️ Using {first_transcript.language} transcript (fallback)")
            
            # 4. 결과 포맷팅
            formatted_transcript = []
            for item in transcript:
                formatted_transcript.append({
                    "start": int(float(item['start'])),
                    "duration": int(float(item.get('duration', 0))),
                    "text": item['text'].strip()
                })
            
            print(f"✅ Successfully extracted {len(formatted_transcript)} segments")
            
            # 5. 미리보기
            print("\n📝 Transcript Preview:")
            for i, seg in enumerate(formatted_transcript[:5]):
                print(f"   {i+1}. [{seg['start']}s] {seg['text']}")
            
            # 6. 결과 반환
            result = {
                "success": True,
                "videoId": video_id,
                "segments": len(formatted_transcript),
                "transcript": formatted_transcript,
                "method": "python-tor-proxy"
            }
            
            # 7. 캐시에 저장
            try:
                cache_file = f"transcript-cache/{video_id}_python_tor.json"
                with open(cache_file, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                print(f"\n💾 Saved to cache: {cache_file}")
            except Exception as save_error:
                print(f"⚠️ Could not save to cache: {save_error}")
            
            return result
            
        except NoTranscriptFound:
            return {"success": False, "error": "No transcripts available for this video"}
        except TranscriptsDisabled:
            return {"success": False, "error": "Transcripts are disabled for this video"}
        except VideoUnavailable:
            return {"success": False, "error": "Video is unavailable"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print("""
🐍 Python YouTube Transcript Extractor with Tor

Usage:
  python tor-python-proper.py <video_id>

Example:
  python tor-python-proper.py dQw4w9WgXcQ
  python tor-python-proper.py ocGJWc2F1Yk

Requirements:
  - Tor Browser running on 127.0.0.1:9150
  - pip install requests PySocks youtube-transcript-api
        """)
        return
    
    video_id = sys.argv[1]
    
    print("🐍 Python YouTube Transcript Extractor with Tor")
    print(f"📹 Video ID: {video_id}")
    print("🌐 Tor Proxy: 127.0.0.1:9150\n")
    
    result = extract_transcript_with_tor(video_id)
    
    print("\n📊 Final Result:")
    if result["success"]:
        print(f"✅ Success!")
        print(f"📝 Segments: {result['segments']}")
        print(f"🔧 Method: {result['method']}")
    else:
        print(f"❌ Failed: {result['error']}")
    
    # JSON 출력 (프로그래밍적 사용을 위해)
    print(f"\n🔧 JSON Result:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main() 