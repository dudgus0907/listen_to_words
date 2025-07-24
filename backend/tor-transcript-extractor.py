#!/usr/bin/env python3
"""
Tor 프록시를 사용한 YouTube Transcript 추출기
IP 블록을 우회하여 안전하게 transcript 추출
"""

import sys
import json
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled, 
    NoTranscriptFound, 
    VideoUnavailable
)

class TorTranscriptExtractor:
    def __init__(self):
        # Tor Browser SOCKS5 프록시 설정
        self.proxies = {
            'http': 'socks5://127.0.0.1:9150',
            'https': 'socks5://127.0.0.1:9150'
        }
        
        # YouTube Transcript API에 프록시 적용을 위한 세션 설정
        self.session = requests.Session()
        self.session.proxies.update(self.proxies)
        
        print("🌐 Tor proxy configured: 127.0.0.1:9150")
        
    def test_tor_connection(self):
        """Tor 연결 테스트"""
        try:
            print("🔧 Testing Tor connection...")
            response = self.session.get('https://httpbin.org/ip', timeout=10)
            ip_data = response.json()
            print(f"✅ Tor working! Current IP: {ip_data['origin']}")
            return True
        except Exception as e:
            print(f"❌ Tor connection failed: {e}")
            return False
    
    def extract_transcript(self, video_id):
        """Tor 프록시를 통한 transcript 추출"""
        try:
            print(f"\n🎬 Extracting transcript for: {video_id}")
            print(f"🌐 Using Tor proxy: 127.0.0.1:9150")
            
            # 다양한 언어 옵션으로 시도
            language_options = ['en', 'en-US', 'en-GB', 'ko', 'auto']
            
            for lang in language_options:
                try:
                    print(f"🔍 Trying language: {lang}")
                    
                    if lang == 'auto':
                        # 자동 감지 (첫 번째 사용 가능한 언어)
                        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                        transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB', 'ko'])
                        result = transcript.fetch()
                    else:
                        result = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                    
                    if result:
                        formatted_result = []
                        for item in result:
                            formatted_result.append({
                                'start': int(item['start']),
                                'duration': int(item.get('duration', 0)),
                                'text': item['text'].replace('\n', ' ').strip()
                            })
                        
                        print(f"✅ SUCCESS with {lang}! Extracted {len(formatted_result)} segments")
                        
                        return {
                            'success': True,
                            'video_id': video_id,
                            'language': lang,
                            'segments': len(formatted_result),
                            'transcript': formatted_result,
                            'method': 'tor-proxy'
                        }
                        
                except Exception as lang_error:
                    print(f"⚠️ {lang} failed: {str(lang_error)[:50]}...")
                    continue
            
            return {
                'success': False,
                'video_id': video_id,
                'error': 'No supported language found',
                'method': 'tor-proxy'
            }
            
        except TranscriptsDisabled:
            return {
                'success': False,
                'video_id': video_id,
                'error': 'Transcripts disabled for this video',
                'method': 'tor-proxy'
            }
        except NoTranscriptFound:
            return {
                'success': False,
                'video_id': video_id,
                'error': 'No transcript found',
                'method': 'tor-proxy'
            }
        except VideoUnavailable:
            return {
                'success': False,
                'video_id': video_id,
                'error': 'Video unavailable',
                'method': 'tor-proxy'
            }
        except Exception as e:
            return {
                'success': False,
                'video_id': video_id,
                'error': f'Unexpected error: {str(e)}',
                'method': 'tor-proxy'
            }

def main():
    if len(sys.argv) != 2:
        print("""
🌐 Tor-Enhanced YouTube Transcript Extractor

Usage:
    python tor-transcript-extractor.py <video_id>

Examples:
    python tor-transcript-extractor.py dQw4w9WgXcQ
    python tor-transcript-extractor.py ocGJWc2F1Yk

Requirements:
    - Tor Browser running (provides SOCKS5 proxy on 127.0.0.1:9150)
    - pip install youtube-transcript-api requests[socks]
        """)
        sys.exit(1)
    
    video_id = sys.argv[1]
    
    extractor = TorTranscriptExtractor()
    
    # Tor 연결 테스트
    if not extractor.test_tor_connection():
        print("❌ Tor connection failed. Make sure Tor Browser is running!")
        sys.exit(1)
    
    # Transcript 추출
    result = extractor.extract_transcript(video_id)
    
    # 결과 출력
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main() 