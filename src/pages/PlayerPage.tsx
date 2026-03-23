import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize,
  Minimize,
  Heart,
  List,
  SkipBack,
  SkipForward,
  WifiOff,
  Share2,
  X,
  Eye,
  Gauge,
  ChevronDown
} from 'lucide-react';
import { Channel } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { cn } from '../lib/utils';

interface PlayerPageProps {
  channels: Channel[];
}

const QUALITY_OPTIONS = [144, 240, 360, 480, 720, 1080, 1440, 2160];

export default function PlayerPage({ channels }: PlayerPageProps) {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', []);
  const [history, setHistory] = useLocalStorage<{id: string, time: number}[]>('history', []);
  const [savedVolume, setSavedVolume] = useLocalStorage<number>('playerVolume', 1);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigatingRef = useRef(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(savedVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showChannelList, setShowChannelList] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewChannel, setPreviewChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<number[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [currentResolution, setCurrentResolution] = useState<string>('');
  const [isAutoQuality, setIsAutoQuality] = useState(true);

  const channel = channels.find(c => c.id === channelId);
  const isFavorite = channel ? favorites.includes(channel.id) : false;

  useEffect(() => {
    if (volume !== savedVolume) {
      setSavedVolume(volume);
    }
  }, [volume, savedVolume, setSavedVolume]);

  const fastCleanup = useCallback(() => {
    isNavigatingRef.current = true;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  }, []);

  useEffect(() => {
    if (!channel) return;

    fastCleanup();
    isNavigatingRef.current = false;

    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== channel.id);
      return [{ id: channel.id, time: Date.now() }, ...filtered].slice(0, 20);
    });

    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);
    setIsMetadataLoaded(false);
    setAvailableQualities([]);
    setCurrentQuality(-1);
    setIsAutoQuality(true);

    video.volume = volume;

    let hls: Hls | null = null;

    const handlePlay = async () => {
      if (!video || isNavigatingRef.current) return;
      try {
        await video.play();
        if (!isNavigatingRef.current) setIsPlaying(true);
      } catch (err) {
        if (!isNavigatingRef.current) setIsPlaying(false);
      }
    };

    if (channel.url.includes('.m3u8') || channel.url.includes('m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });
        hlsRef.current = hls;

        hls.loadSource(channel.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (isNavigatingRef.current) return;
          
          const qualities = data.levels.map(level => level.height).filter(Boolean) as number[];
          setAvailableQualities(qualities.sort((a, b) => a - b));
          
          if (qualities.length > 0) {
            setCurrentResolution(`${qualities[0]}p`);
          }
          
          handlePlay();
          setIsLoading(false);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          if (isNavigatingRef.current) return;
          const level = hls?.levels[data.level];
          if (level && level.height) {
            setCurrentResolution(`${level.height}p`);
          }
          setCurrentQuality(data.level);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (isNavigatingRef.current) return;
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Network error. Please check your connection.');
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                setError('Failed to load stream.');
                break;
            }
            setIsLoading(false);
          }
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (!isNavigatingRef.current) setIsBuffering(false);
        });

        hls.on(Hls.Events.FRAG_LOADING, () => {
          if (!isNavigatingRef.current) setIsBuffering(true);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = channel.url;
        video.addEventListener('loadedmetadata', () => {
          if (!isNavigatingRef.current) {
            setIsMetadataLoaded(true);
            handlePlay();
            setIsLoading(false);
          }
        }, { once: true });
      }
    } else {
      video.src = channel.url;
      video.addEventListener('loadedmetadata', () => {
        if (!isNavigatingRef.current) {
          setIsMetadataLoaded(true);
          handlePlay();
          setIsLoading(false);
        }
      }, { once: true });
      video.addEventListener('error', () => {
        if (!isNavigatingRef.current) {
          setError('Format not supported or stream offline.');
          setIsLoading(false);
        }
      }, { once: true });
    }

    video.addEventListener('waiting', () => {
      if (!isNavigatingRef.current) setIsBuffering(true);
    });
    video.addEventListener('playing', () => {
      if (!isNavigatingRef.current) setIsBuffering(false);
    });

    return () => {
      isNavigatingRef.current = true;
      if (hls) hls.destroy();
      video.pause();
      video.src = '';
    };
  }, [channelId, channel, fastCleanup, setHistory, volume]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'escape':
          if (showQualityMenu) setShowQualityMenu(false);
          else if (showChannelList) setShowChannelList(false);
          else if (showChannelInfo) setShowChannelInfo(false);
          else handleGoBack();
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, showQualityMenu, showChannelList, showChannelInfo]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((value: number) => {
    const val = Math.max(0, Math.min(1, value));
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current || !isMetadataLoaded) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP failed', error);
    }
  }, [isMetadataLoaded]);

  const setQuality = useCallback((targetQuality: number) => {
    if (hlsRef.current) {
      if (targetQuality === -1) {
        hlsRef.current.currentLevel = -1;
        setIsAutoQuality(true);
      } else {
        const levels = hlsRef.current.levels;
        const levelIndex = levels.findIndex(l => l.height === targetQuality);
        if (levelIndex !== -1) {
          hlsRef.current.currentLevel = levelIndex;
          setIsAutoQuality(false);
        }
      }
      setShowQualityMenu(false);
    }
  }, []);

  const handleGoBack = useCallback(() => {
    fastCleanup();
    navigate(-1);
  }, [fastCleanup, navigate]);

  const nextChannel = useCallback(() => {
    const idx = channels.findIndex(c => c.id === channelId);
    const nextIdx = (idx + 1) % channels.length;
    navigate(`/player/${channels[nextIdx].id}`);
  }, [channels, channelId, navigate]);

  const prevChannel = useCallback(() => {
    const idx = channels.findIndex(c => c.id === channelId);
    const prevIdx = (idx - 1 + channels.length) % channels.length;
    navigate(`/player/${channels[prevIdx].id}`);
  }, [channels, channelId, navigate]);

  const toggleFavorite = useCallback(() => {
    if (!channel) return;
    setFavorites(prev => 
      prev.includes(channel.id) 
        ? prev.filter(id => id !== channel.id) 
        : [...prev, channel.id]
    );
  }, [channel, setFavorites]);

  const shareChannel = useCallback(() => {
    if (channel && navigator.share) {
      navigator.share({
        title: channel.name,
        text: `Watch ${channel.name} on Njobvu IPTV`,
        url: window.location.href,
      });
    } else if (channel) {
      navigator.clipboard.writeText(window.location.href);
    }
  }, [channel]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isPlaying) {
      timeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  const handlePreview = useCallback((c: Channel) => {
    setPreviewChannel(c);
    setShowPreview(true);
    setTimeout(() => setShowPreview(false), 2000);
  }, []);

  const getCurrentQualityLabel = () => {
    if (isAutoQuality) return 'Auto';
    const level = hlsRef.current?.levels[currentQuality];
    return level?.height ? `${level.height}p` : currentResolution;
  };

  if (!channel) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-black">
        <h2 className="text-2xl font-bold text-white mb-4">Channel Not Found</h2>
        <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl bg-primary text-white font-medium">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen bg-black relative overflow-hidden group"
      onMouseMove={handleMouseMove}
    >
      <video 
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
      />

      {/* Buffering Indicator */}
      {isBuffering && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium">Loading Stream...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="max-w-md p-8 bg-white/10 backdrop-blur-md rounded-2xl text-center border border-white/20">
            <div className="text-red-400 mb-4 flex justify-center">
              <WifiOff size={48} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Playback Error</h3>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90"
              >
                Retry
              </button>
              <button 
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Preview Toast */}
      {showPreview && previewChannel && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden">
                {previewChannel.logo ? (
                  <img src={previewChannel.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-primary/40 flex items-center justify-center text-white font-bold">
                    {previewChannel.name.substring(0, 2)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-bold">{previewChannel.name}</p>
                <p className="text-white/60 text-sm">{previewChannel.group}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-8 bg-gradient-to-t from-black/90 via-black/40 to-black/60 z-40 pointer-events-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={handleGoBack}
                aria-label="Go back"
                className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              <div>
                <h1 className="text-white font-bold text-lg md:text-xl flex items-center gap-2">
                  {channel.name}
                  <span className="px-2 py-0.5 bg-red-600 text-[10px] uppercase tracking-wider rounded font-black">Live</span>
                </h1>
                <p className="text-white/60 text-sm hidden md:block">{channel.group}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2">
              {currentResolution && (
                <span className="px-2 py-1 rounded bg-white/10 text-white/80 text-xs font-mono hidden md:block">
                  {getCurrentQualityLabel()}
                </span>
              )}
              <button 
                onClick={shareChannel}
                aria-label="Share channel"
                className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
              >
                <Share2 size={18} className="text-white" />
              </button>
              <button 
                onClick={toggleFavorite}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                className={cn(
                  "p-2 md:p-3 rounded-full backdrop-blur-sm transition-colors",
                  isFavorite ? "text-red-500 bg-red-500/20" : "text-white bg-white/10 hover:bg-white/20"
                )}
              >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={() => setShowChannelInfo(!showChannelInfo)}
                className={cn(
                  "p-2 md:p-3 rounded-full backdrop-blur-sm transition-colors",
                  showChannelInfo ? "text-primary bg-white/20" : "text-white bg-white/10 hover:bg-white/20"
                )}
              >
                <Eye size={18} className="text-white" />
              </button>
              <button 
                onClick={() => setShowChannelList(!showChannelList)}
                className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
              >
                <List size={18} className="text-white" />
              </button>
            </div>
          </div>

          {/* Spacer to push bottom bar down */}
          <div />

          {/* Bottom Bar */}
          <div className="flex flex-col gap-3 pointer-events-auto">
            {/* Progress Bar (Simulated for Live) */}
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-full animate-pulse opacity-70" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                <button onClick={prevChannel} aria-label="Previous channel" className="p-1.5 md:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <SkipBack size={18} className="text-white" />
                </button>
                <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className="p-1.5 md:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  {isPlaying ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white" />}
                </button>
                <button onClick={nextChannel} aria-label="Next channel" className="p-1.5 md:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <SkipForward size={18} className="text-white" />
                </button>
                
                <div className="flex items-center gap-1 md:gap-2 group/volume">
                  <button onClick={toggleMute} className="p-1.5 md:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    {isMuted || volume === 0 ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 md:w-24 h-1 accent-primary bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>

                <span className="text-white/80 text-xs md:text-sm font-mono hidden md:block" aria-live="polite">LIVE</span>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <button 
                  onClick={togglePiP}
                  disabled={!isMetadataLoaded}
                  className={cn(
                    "p-1.5 md:p-2 rounded-lg transition-colors",
                    !isMetadataLoaded ? "opacity-30 cursor-not-allowed bg-white/10" : "bg-white/10 hover:bg-white/20"
                  )}
                >
                  <Maximize size={16} className="text-white" />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="p-1.5 md:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1"
                  >
                    <Gauge size={16} className="text-white" />
                    <ChevronDown size={12} className="text-white" />
                  </button>
                  
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden min-w-[120px] z-50">
                      <button
                        onClick={() => setQuality(-1)}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center justify-between",
                          isAutoQuality ? "text-primary" : "text-white"
                        )}
                      >
                        <span>Auto</span>
                        {isAutoQuality && <span className="text-xs">●</span>}
                      </button>
                      {QUALITY_OPTIONS.map(quality => {
                        const isAvailable = availableQualities.includes(quality);
                        const isSelected = !isAutoQuality && currentResolution === `${quality}p`;
                        return (
                          <button
                            key={quality}
                            onClick={() => isAvailable && setQuality(quality)}
                            disabled={!isAvailable}
                            className={cn(
                              "w-full px-4 py-2 text-left text-sm flex items-center justify-between",
                              isAvailable ? "hover:bg-white/10 cursor-pointer" : "opacity-40 cursor-not-allowed",
                              isSelected ? "text-primary" : "text-white"
                            )}
                          >
                            <span>{quality}p</span>
                            {isSelected && <span className="text-xs">●</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={toggleFullscreen}
                  className="p-1.5 md:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {isFullscreen ? <Minimize size={16} className="text-white" /> : <Maximize size={16} className="text-white" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel Info Panel */}
      {showChannelInfo && (
        <div className="absolute top-20 left-4 md:left-8 right-4 md:right-auto md:w-80 z-50">
          <div className="bg-black/90 backdrop-blur-md rounded-2xl border border-white/20 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Channel Info</h3>
              <button onClick={() => setShowChannelInfo(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10">
                {channel.logo ? (
                  <img src={channel.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                    {channel.name.substring(0, 2)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-white font-bold text-lg">{channel.name}</h4>
                <p className="text-white/60 text-sm">{channel.group}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/60">
                <span>Quality</span>
                <span className="text-white">{getCurrentQualityLabel()}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Available</span>
                <span className="text-white">{availableQualities.length > 0 ? availableQualities.map(q => `${q}p`).join(', ') : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side Channel List */}
      {showChannelList && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-black/95 backdrop-blur-md z-50 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">Channels</h3>
            <button 
              onClick={() => setShowChannelList(false)}
              className="text-white/60 hover:text-white p-1"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {channels.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  navigate(`/player/${c.id}`);
                  setShowChannelList(false);
                }}
                onMouseEnter={() => handlePreview(c)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                  c.id === channelId ? "bg-primary text-white" : "hover:bg-white/10 text-white/80"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                  {c.logo ? (
                    <img src={c.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                      {c.name.substring(0, 2)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs opacity-60 truncate">{c.group}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}