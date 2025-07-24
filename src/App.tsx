import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
// Remove index.css import and only use App.css
import './App.css';

// Types
interface VideoClip {
  id?: string;
  videoId: string;
  title: string;
  startTime: number;
  searchQuery: string;
  transcript: string;
  contextualText?: string; // 앞뒤 문장 포함된 텍스트
  similarity?: number;
}

interface SearchResult {
  videoId: string;
  title: string;
  startTime: number;
  transcript: string;
  contextualText?: string; // 앞뒤 문장 포함된 텍스트
  similarity: number;
  searchQuery: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Helper function to safely render highlighted text
const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <span 
      dangerouslySetInnerHTML={{ 
        __html: text.replace(/<mark>/g, '<mark style="background-color: #ffeb3b; padding: 2px 4px; border-radius: 2px;">').replace(/<\/mark>/g, '</mark>')
      }} 
    />
  );
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentClip, setCurrentClip] = useState<VideoClip | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [savedClips, setSavedClips] = useState<VideoClip[]>([]);
  const [showSavedClips, setShowSavedClips] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [showContext, setShowContext] = useState(true); // 맥락 표시 여부
  const playerRef = useRef<HTMLDivElement>(null);

  // YouTube iframe API 로드
  useEffect(() => {
    // 이미 API가 로드되어 있으면 스킵
    if ((window as any).YT) {
      return;
    }

    // YouTube iframe API 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);

    // YouTube API 준비 완료 시 호출되는 전역 함수
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('YouTube iframe API ready');
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // 플레이어 생성
  useEffect(() => {
    if (currentClip && (window as any).YT && playerRef.current) {
      // 기존 플레이어 정리
      if (player) {
        player.destroy();
      }
      setIsPlayerReady(false);

      const newPlayer = new (window as any).YT.Player(playerRef.current, {
        videoId: currentClip.videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          start: currentClip.startTime,
          autoplay: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            setPlayer(event.target);
            console.log('Player ready');
          },
          onError: (event: any) => {
            console.error('Player error:', event.data);
          }
        }
      });
    }

    // 컴포넌트 언마운트 시 플레이어 정리
    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, [currentClip?.videoId, currentClip?.startTime]); // player를 의존성에서 제거

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      console.log('Searching for:', searchQuery);
      const response = await axios.get(`${API_BASE_URL}/search`, {
        params: { query: searchQuery }
      });
      
      const results = response.data.results;
      setSearchResults(results);
      
      if (results.length > 0) {
        const firstResult = results[0];
        const clip: VideoClip = {
          id: `${firstResult.videoId}-${firstResult.startTime}`,
          videoId: firstResult.videoId,
          title: firstResult.title,
          startTime: firstResult.startTime,
          searchQuery: searchQuery,
          transcript: firstResult.transcript,
          contextualText: firstResult.contextualText,
          similarity: firstResult.similarity
        };
        setCurrentClip(clip);
        setCurrentResultIndex(0);
      } else {
        alert('검색 결과가 없습니다. 다른 검색어를 시도해보세요.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('검색 중 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClip = () => {
    if (currentClip && !savedClips.find(clip => clip.id === currentClip.id)) {
      setSavedClips([...savedClips, currentClip]);
      alert('클립이 저장되었습니다!');
    }
  };

  const handlePreviousVideo = () => {
    if (searchResults.length > 0 && currentResultIndex > 0) {
      const prevIndex = currentResultIndex - 1;
      const prevResult = searchResults[prevIndex];
      
      const clip: VideoClip = {
        id: `${prevResult.videoId}-${prevResult.startTime}`,
        videoId: prevResult.videoId,
        title: prevResult.title,
        startTime: prevResult.startTime,
        searchQuery: searchQuery,
        transcript: prevResult.transcript,
        contextualText: prevResult.contextualText,
        similarity: prevResult.similarity
      };
      
      setCurrentClip(clip);
      setCurrentResultIndex(prevIndex);
    } else {
      alert('이전 결과가 없습니다.');
    }
  };

  const handleNextVideo = () => {
    if (searchResults.length > 0 && currentResultIndex < searchResults.length - 1) {
      const nextIndex = currentResultIndex + 1;
      const nextResult = searchResults[nextIndex];
      
      const clip: VideoClip = {
        id: `${nextResult.videoId}-${nextResult.startTime}`,
        videoId: nextResult.videoId,
        title: nextResult.title,
        startTime: nextResult.startTime,
        searchQuery: searchQuery,
        transcript: nextResult.transcript,
        contextualText: nextResult.contextualText,
        similarity: nextResult.similarity
      };
      
      setCurrentClip(clip);
      setCurrentResultIndex(nextIndex);
    } else {
      alert('더 이상 결과가 없습니다.');
    }
  };

  const handleSeekBackward = () => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      const newTime = Math.max(0, currentTime - 5);
      player.seekTo(newTime, true);
    }
  };

  const handleSeekForward = () => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      const newTime = currentTime + 5;
      player.seekTo(newTime, true);
    }
  };

  const handleGoToSearchTime = () => {
    if (player && isPlayerReady && currentClip) {
      player.seekTo(currentClip.startTime, true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="title">YouGlish Copycat</h1>
          <button
            onClick={() => setShowSavedClips(!showSavedClips)}
            className="button"
          >
            {showSavedClips ? '검색으로 돌아가기' : '저장된 클립 보기'}
          </button>
        </div>
      </header>

      <main className="container">
        {!showSavedClips ? (
          <div>
            {/* Search Section */}
            <div className="card">
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>영어 표현 검색</h2>
              <div className="search-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSearch()}
                  placeholder="예: 'give you up', 'never gonna', 'strangers to love'"
                  className="search-input"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="button"
                >
                  {isLoading ? '검색 중...' : '검색'}
                </button>
              </div>
              
              {/* Search Results Info */}
              {searchResults.length > 0 && (
                <div className="info-text">
                  총 {searchResults.length}개 결과 중 {currentResultIndex + 1}번째 ({currentClip?.similarity && Math.round(currentClip.similarity * 100)}% 유사도)
                </div>
              )}
            </div>

            {/* Video Player Section */}
            {currentClip && (
              <div className="card">
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>{currentClip.title}</h3>
                
                {/* Video Player */}
                <div className="video-container">
                  <div ref={playerRef} style={{ width: '100%', height: '100%' }}></div>
                </div>

                {/* Video Controls */}
                <div className="controls">
                  <button 
                    className="control-btn btn-gray" 
                    onClick={handlePreviousVideo} 
                    disabled={currentResultIndex <= 0}
                  >
                    ⏮️ 이전 영상
                  </button>
                  <button 
                    className="control-btn btn-blue" 
                    onClick={handleSeekBackward}
                    disabled={!isPlayerReady}
                  >
                    ⏪ 5초 전
                  </button>
                  <button 
                    className="control-btn btn-green" 
                    onClick={handleGoToSearchTime}
                    disabled={!isPlayerReady}
                  >
                    🎯 검색 시점
                  </button>
                  <button 
                    className="control-btn btn-blue" 
                    onClick={handleSeekForward}
                    disabled={!isPlayerReady}
                  >
                    ⏩ 5초 후
                  </button>
                  <button 
                    className="control-btn btn-purple" 
                    onClick={handleNextVideo} 
                    disabled={currentResultIndex >= searchResults.length - 1}
                  >
                    ⏭️ 다음 영상
                  </button>
                  <button className="control-btn btn-yellow" onClick={handleSaveClip}>
                    💾 저장하기
                  </button>
                </div>

                {/* Transcript */}
                <div className="transcript">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ fontWeight: '500', margin: 0 }}>스크립트:</h4>
                    {currentClip.contextualText && (
                      <button
                        onClick={() => setShowContext(!showContext)}
                        className="control-btn btn-gray"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        {showContext ? '원문만 보기' : '맥락 포함'}
                      </button>
                    )}
                  </div>
                  <p style={{ color: '#495057', lineHeight: '1.6' }}>
                    <HighlightedText 
                      text={showContext && currentClip.contextualText 
                        ? currentClip.contextualText 
                        : currentClip.transcript
                      } 
                    />
                  </p>
                  <p className="info-text">
                    검색어: "{currentClip.searchQuery}" | 시작 시간: {currentClip.startTime}초
                    {currentClip.similarity && ` | 유사도: ${Math.round(currentClip.similarity * 100)}%`}
                    {showContext && currentClip.contextualText && <span> | 맥락 포함</span>}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Saved Clips Section */
          <div className="card">
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '30px' }}>저장된 클립들</h2>
            {savedClips.length === 0 ? (
              <p style={{ color: '#6c757d', textAlign: 'center', padding: '40px 0' }}>저장된 클립이 없습니다.</p>
            ) : (
              <div>
                {savedClips.map((clip) => (
                  <div key={clip.id} className="saved-clip">
                    <div className="saved-clip-header">
                      <h3 className="saved-clip-title">{clip.title}</h3>
                      <button
                        onClick={() => {
                          setCurrentClip(clip);
                          setShowSavedClips(false);
                        }}
                        className="button small-button"
                      >
                        다시 보기
                      </button>
                    </div>
                    <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '10px' }}>
                      검색어: <strong>"{clip.searchQuery}"</strong>
                      {clip.similarity && ` | 유사도: ${Math.round(clip.similarity * 100)}%`}
                    </p>
                    <p style={{ color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
                      <HighlightedText 
                        text={showContext && clip.contextualText 
                          ? clip.contextualText 
                          : clip.transcript
                        } 
                      />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
