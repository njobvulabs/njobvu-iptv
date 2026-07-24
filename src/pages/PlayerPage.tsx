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
  ChevronDown,
  Moon,
  AudioLines,
  Subtitles,
  RectangleHorizontal as AspectIcon,
  Activity,
  Globe,
  Radio,
  Clock,
  Tv
} from 'lucide-react';
import { Channel, AspectRatioMode, StreamMetrics } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getCurrentAndNextEPG, formatEPGTime } from '../lib/epg';
import { cn } from '../lib/utils';

interface PlayerPageProps {
  channels: Channel[];
}

const QUALITY_OPTIONS = [144, 240, 360, 480, 720, 1080, 1440, 2160];
const SLEEP_TIMER_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1 Hour', minutes: 60 },
  { label: '2 Hours', minutes: 120 },
];

export default function PlayerPage({ channels }: PlayerPageProps) {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', []);
  const [history, setHistory] = useLocalStorage<{id: string, time: number}[]>('history', []);
  const [savedVolume, setSavedVolume] = useLocalStorage<number>('playerVolume', 1);
  const [useCorsProxy] = useLocalStorage<boolean>('njobvu_use_cors_proxy', false);
  const [corsProxyUrl] = useLocalStorage<string>('njobvu_cors_proxy_url', 'https://corsproxy.io/?');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const numberPadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showAspectMenu, setShowAspectMenu] = useState(false);

  const [previewChannel, setPreviewChannel] = useState<Channel | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<number[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [currentResolution, setCurrentResolution] = useState<string>('');
  const [isAutoQuality, setIsAutoQuality] = useState(true);

  // New Features States
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('contain');
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string; lang: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string; lang: string }[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);

  // Sleep Timer
  const [sleepMinutes, setSleepMinutes] = useState<number>(0);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);
  const [isSleepExpired, setIsSleepExpired] = useState(false);

  // Stream Metrics
  const [streamMetrics, setStreamMetrics] = useState<StreamMetrics>({
    bitrateKbps: 0,
    bandwidthMbps: 0,
    droppedFrames: 0,
    totalFrames: 0,
    bufferSeconds: 0,
    latencySeconds: 0
  });

  // Direct Number Keypad Channel Switching
  const [channelDigits, setChannelDigits] = useState<string>('');

  const channel = channels.find(c => c.id === channelId);
  const isFavorite = channel ? favorites.includes(channel.id) : false;

  useEffect(() => {
    if (volume !== savedVolume) {
      setSavedVolume(volume);
    }
  }, [volume, savedVolume, setSavedVolume]);

  // Sleep Timer Countdown
  useEffect(() => {
    if (sleepMinutes <= 0) {
      setSleepTimeRemaining(null);
      return;
    }

    setSleepTimeRemaining(sleepMinutes * 60);
    const interval = setInterval(() => {
      setSleepTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
          setIsSleepExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepMinutes]);

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

  const loadStreamUrl = useCallback((streamUrl: string, forceProxy: boolean = false) => {
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

    let finalUrl = streamUrl;
    if ((useCorsProxy || forceProxy) && corsProxyUrl) {
      finalUrl = `${corsProxyUrl}${encodeURIComponent(streamUrl)}`;
    }

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

    if (finalUrl.includes('.m3u8') || finalUrl.includes('m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          capLevelToPlayerSize: true,
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          startLevel: 0,
          fragLoadingMaxRetry: 3,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
          autoStartLoad: true,
          startFragPrefetch: true,
        });
        hlsRef.current = hls;

        hls.loadSource(finalUrl);
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

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
          if (isNavigatingRef.current) return;
          const tracks = data.audioTracks.map((t, idx) => ({
            id: idx,
            name: t.name || `Track ${idx + 1}`,
            lang: t.lang || 'Unknown'
          }));
          setAudioTracks(tracks);
          setCurrentAudioTrack(hls?.audioTrack ?? -1);
        });

        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
          if (isNavigatingRef.current) return;
          const tracks = data.subtitleTracks.map((t, idx) => ({
            id: idx,
            name: t.name || `Subtitle ${idx + 1}`,
            lang: t.lang || 'Unknown'
          }));
          setSubtitleTracks(tracks);
          setCurrentSubtitleTrack(hls?.subtitleTrack ?? -1);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          if (isNavigatingRef.current) return;
          const level = hls?.levels[data.level];
          if (level && level.height) {
            setCurrentResolution(`${level.height}p`);
          }
          setCurrentQuality(data.level);
        });

        hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
          if (isNavigatingRef.current) return;
          if (data.frag) {
            const stats = data.frag.stats;
            const duration = stats.loaded ? (stats.loaded / stats.total) : 1;
            const bitrate = Math.round((stats.total * 8) / (duration || 1) / 1000);
            const bandwidth = (hls?.bandwidthEstimate || 0) / (1024 * 1024);
            const bufferLen = video.buffered.length > 0 ? (video.buffered.end(0) - video.currentTime) : 0;
            
            setStreamMetrics(prev => ({
              ...prev,
              bitrateKbps: bitrate || 1500,
              bandwidthMbps: parseFloat(bandwidth.toFixed(2)) || 12.5,
              bufferSeconds: parseFloat(bufferLen.toFixed(1)),
              latencySeconds: parseFloat((hls?.latency || 0).toFixed(1))
            }));
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (isNavigatingRef.current) return;
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Network / CORS error. Try enabling CORS Proxy in Settings or retry below.');
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
        video.src = finalUrl;
        video.addEventListener('loadedmetadata', () => {
          if (!isNavigatingRef.current) {
            setIsMetadataLoaded(true);
            handlePlay();
            setIsLoading(false);
          }
        }, { once: true });
      }
    } else {
      video.src = finalUrl;
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
  }, [channel, fastCleanup, setHistory, volume, useCorsProxy, corsProxyUrl]);

  useEffect(() => {
    if (channel) {
      loadStreamUrl(channel.url);
    }
  }, [channelId, channel, loadStreamUrl]);

  // Handle direct numeric keypad channel jumps
  const handleDigitInput = useCallback((digit: string) => {
    setChannelDigits(prev => {
      const nextDigits = (prev + digit).slice(0, 4);
      if (numberPadTimeoutRef.current) clearTimeout(numberPadTimeoutRef.current);
      
      numberPadTimeoutRef.current = setTimeout(() => {
        const targetNum = parseInt(nextDigits, 10);
        setChannelDigits('');
        if (!isNaN(targetNum) && channels.length > 0) {
          // Find channel by channelNumber or index (1-based)
          let targetChannel = channels.find(c => c.channelNumber === targetNum);
          if (!targetChannel) {
            const targetIdx = (targetNum - 1) % channels.length;
            targetChannel = channels[Math.max(0, targetIdx)];
          }
          if (targetChannel) {
            navigate(`/player/${targetChannel.id}`);
          }
        }
      }, 1200);

      return nextDigits;
    });
  }, [channels, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleDigitInput(e.key);
        return;
      }
      
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
        case 'a':
          e.preventDefault();
          cycleAspectRatio();
          break;
        case 's':
          e.preventDefault();
          setShowSleepMenu(prev => !prev);
          break;
        case 'c':
        case 'l':
          e.preventDefault();
          setShowChannelList(prev => !prev);
          break;
        case 'i':
          e.preventDefault();
          setShowChannelInfo(prev => !prev);
          break;
        case 'escape':
          if (showQualityMenu) setShowQualityMenu(false);
          else if (showChannelList) setShowChannelList(false);
          else if (showChannelInfo) setShowChannelInfo(false);
          else if (showAudioMenu) setShowAudioMenu(false);
          else if (showSubtitleMenu) setShowSubtitleMenu(false);
          else if (showSleepMenu) setShowSleepMenu(false);
          else if (showAspectMenu) setShowAspectMenu(false);
          else handleGoBack();
          break;
        case 'arrowup':
          e.preventDefault();
          prevChannel();
          break;
        case 'arrowdown':
          e.preventDefault();
          nextChannel();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'arrowright':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, showQualityMenu, showChannelList, showChannelInfo, showAudioMenu, showSubtitleMenu, showSleepMenu, showAspectMenu, handleDigitInput]);

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

  const cycleAspectRatio = useCallback(() => {
    const modes: AspectRatioMode[] = ['contain', 'cover', '16:9', '4:3', 'fill'];
    setAspectRatio(prev => modes[(modes.indexOf(prev) + 1) % modes.length]);
  }, []);

  const selectAudioTrack = useCallback((trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
      setCurrentAudioTrack(trackId);
      setShowAudioMenu(false);
    }
  }, []);

  const selectSubtitleTrack = useCallback((trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = trackId;
      setCurrentSubtitleTrack(trackId);
      setShowSubtitleMenu(false);
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
      }, 3500);
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

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'cover': return 'object-cover w-full h-full';
      case '16:9': return 'aspect-[16/9] object-fill w-full h-full';
      case '4:3': return 'aspect-[4/3] object-fill w-full h-full';
      case 'fill': return 'object-fill w-full h-full';
      case 'contain':
      default: return 'object-contain w-full h-full';
    }
  };

  const formatSleepTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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

  const epgInfo = getCurrentAndNextEPG(channel);

  return (
    <div 
      ref={containerRef}
      className="h-screen bg-black relative overflow-hidden group select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Video Element with Dynamic Aspect Ratio */}
      <video 
        ref={videoRef}
        className={cn("transition-all duration-300", getAspectClass())}
        playsInline
      />

      {/* Numeric Keypad Overlay Badge */}
      {channelDigits && (
        <div className="absolute top-6 right-6 z-50 bg-primary/90 text-white border-2 border-white/40 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-pulse flex items-center gap-2">
          <Tv size={20} />
          <span className="text-2xl font-black tracking-widest font-mono">CH {channelDigits}</span>
        </div>
      )}

      {/* Sleep Timer Countdown Badge */}
      {sleepTimeRemaining !== null && sleepTimeRemaining > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
          <Moon size={16} className="text-primary animate-pulse" />
          <span className="text-xs font-bold font-mono">Sleep in {formatSleepTime(sleepTimeRemaining)}</span>
        </div>
      )}

      {/* Sleep Expired Modal */}
      {isSleepExpired && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 z-50">
          <div className="bg-paper-dark border border-white/10 rounded-3xl p-8 max-w-sm text-center shadow-2xl">
            <Moon size={48} className="text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Sleep Timer Ended</h3>
            <p className="text-sm text-gray-400 mb-6">Playback stopped to save battery and bandwidth.</p>
            <button
              onClick={() => {
                setIsSleepExpired(false);
                setSleepMinutes(0);
                if (videoRef.current) {
                  videoRef.current.play();
                  setIsPlaying(true);
                }
              }}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg"
            >
              Resume Playback
            </button>
          </div>
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium">Connecting to Live Stream...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-30 p-4">
          <div className="max-w-md p-8 bg-paper-dark/90 backdrop-blur-md rounded-3xl text-center border border-white/10 shadow-2xl">
            <div className="text-red-400 mb-4 flex justify-center">
              <WifiOff size={48} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Playback Error</h3>
            <p className="text-gray-300 text-sm mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => loadStreamUrl(channel.url, true)}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
              >
                <Globe size={16} /> Retry with Proxy
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors"
              >
                Reload
              </button>
              <button 
                onClick={() => navigate('/')}
                className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors"
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
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
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
                <p className="text-white/60 text-xs">{previewChannel.group}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-8 bg-gradient-to-t from-black/95 via-black/30 to-black/70 z-40 pointer-events-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={handleGoBack}
                aria-label="Go back"
                className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-white font-bold text-lg md:text-xl flex items-center gap-2">
                  {channel.name}
                  <span className="px-2 py-0.5 bg-red-600 text-[10px] uppercase tracking-wider rounded font-black">Live</span>
                </h1>
                <p className="text-white/60 text-xs hidden md:block">
                  On Now: <span className="text-white font-bold">{epgInfo.current.title}</span> ({epgInfo.minutesRemaining}m left)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2">
              <button 
                onClick={() => setShowSleepMenu(!showSleepMenu)}
                aria-label="Sleep timer"
                className={`p-2 md:p-3 rounded-full backdrop-blur-sm transition-colors ${
                  sleepMinutes > 0 ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="Sleep Timer"
              >
                <Moon size={18} />
              </button>

              <button 
                onClick={shareChannel}
                aria-label="Share channel"
                className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors text-white"
              >
                <Share2 size={18} />
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
                  showChannelInfo ? "text-primary bg-white/30" : "text-white bg-white/10 hover:bg-white/20"
                )}
                title="Stream Info & Health"
              >
                <Activity size={18} />
              </button>

              <button 
                onClick={() => setShowChannelList(!showChannelList)}
                className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors text-white"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* Spacer */}
          <div />

          {/* Bottom Bar */}
          <div className="flex flex-col gap-3 pointer-events-auto">
            {/* Live Progress Bar with EPG Title */}
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[11px] text-gray-300 font-mono px-1">
                <span className="truncate">{epgInfo.current.title}</span>
                <span>{Math.round(epgInfo.progressPercent)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${epgInfo.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <button onClick={prevChannel} aria-label="Previous channel" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
                  <SkipBack size={18} />
                </button>
                <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button onClick={nextChannel} aria-label="Next channel" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
                  <SkipForward size={18} />
                </button>
                
                <div className="flex items-center gap-1.5 group/volume">
                  <button onClick={toggleMute} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
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
              </div>

              {/* Right Side Options Controls */}
              <div className="flex items-center gap-1 md:gap-2">

                {/* Aspect Ratio Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAspectMenu(!showAspectMenu)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white flex items-center gap-1 text-xs font-bold"
                    title="Aspect Ratio"
                  >
                    <AspectIcon size={16} />
                    <span className="uppercase text-[10px] hidden md:inline">{aspectRatio}</span>
                  </button>
                  {showAspectMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden min-w-[130px] z-50">
                      {(['contain', 'cover', '16:9', '4:3', 'fill'] as AspectRatioMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => {
                            setAspectRatio(mode);
                            setShowAspectMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-xs font-bold capitalize hover:bg-white/10 flex items-center justify-between ${
                            aspectRatio === mode ? 'text-primary' : 'text-white'
                          }`}
                        >
                          <span>{mode}</span>
                          {aspectRatio === mode && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multi-Audio Tracks */}
                {audioTracks.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowAudioMenu(!showAudioMenu)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white flex items-center gap-1 text-xs font-bold"
                      title="Audio Track"
                    >
                      <AudioLines size={16} />
                    </button>
                    {showAudioMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden min-w-[150px] z-50">
                        {audioTracks.map(track => (
                          <button
                            key={track.id}
                            onClick={() => selectAudioTrack(track.id)}
                            className={`w-full px-4 py-2 text-left text-xs hover:bg-white/10 flex items-center justify-between ${
                              currentAudioTrack === track.id ? 'text-primary font-bold' : 'text-white'
                            }`}
                          >
                            <span>{track.name}</span>
                            {currentAudioTrack === track.id && <span>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Subtitles Track */}
                {subtitleTracks.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white flex items-center gap-1 text-xs font-bold"
                      title="Subtitles"
                    >
                      <Subtitles size={16} />
                    </button>
                    {showSubtitleMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden min-w-[150px] z-50">
                        <button
                          onClick={() => selectSubtitleTrack(-1)}
                          className={`w-full px-4 py-2 text-left text-xs hover:bg-white/10 ${
                            currentSubtitleTrack === -1 ? 'text-primary font-bold' : 'text-white'
                          }`}
                        >
                          Off
                        </button>
                        {subtitleTracks.map(track => (
                          <button
                            key={track.id}
                            onClick={() => selectSubtitleTrack(track.id)}
                            className={`w-full px-4 py-2 text-left text-xs hover:bg-white/10 flex items-center justify-between ${
                              currentSubtitleTrack === track.id ? 'text-primary font-bold' : 'text-white'
                            }`}
                          >
                            <span>{track.name}</span>
                            {currentSubtitleTrack === track.id && <span>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quality Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white flex items-center gap-1"
                  >
                    <Gauge size={16} />
                    <ChevronDown size={12} />
                  </button>
                  
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden min-w-[120px] z-50">
                      <button
                        onClick={() => setQuality(-1)}
                        className={cn(
                          "w-full px-4 py-2 text-left text-xs font-bold hover:bg-white/10 flex items-center justify-between",
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
                              "w-full px-4 py-2 text-left text-xs flex items-center justify-between",
                              isAvailable ? "hover:bg-white/10 cursor-pointer" : "opacity-40 cursor-not-allowed",
                              isSelected ? "text-primary font-bold" : "text-white"
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
                  onClick={togglePiP}
                  disabled={!isMetadataLoaded}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white disabled:opacity-30"
                >
                  <Maximize size={16} />
                </button>

                <button 
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sleep Timer Menu Modal Overlay */}
      {showSleepMenu && (
        <div className="absolute top-20 right-4 md:right-8 z-50 bg-paper-dark border border-white/10 rounded-3xl p-5 shadow-2xl w-64 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Moon size={18} className="text-primary" /> Sleep Timer
            </h4>
            <button onClick={() => setShowSleepMenu(false)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-1.5">
            {SLEEP_TIMER_OPTIONS.map(opt => (
              <button
                key={opt.minutes}
                onClick={() => {
                  setSleepMinutes(opt.minutes);
                  setIsSleepExpired(false);
                  setShowSleepMenu(false);
                }}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors flex items-center justify-between ${
                  sleepMinutes === opt.minutes ? 'bg-primary text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span>{opt.label}</span>
                {sleepMinutes === opt.minutes && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Channel Info & Stream Health Panel */}
      {showChannelInfo && (
        <div className="absolute top-20 left-4 md:left-8 right-4 md:right-auto md:w-88 z-50">
          <div className="bg-paper-dark/95 backdrop-blur-md rounded-3xl border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Stream Health & EPG Guide
              </h3>
              <button onClick={() => setShowChannelInfo(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 flex-shrink-0">
                {channel.logo ? (
                  <img src={channel.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                    {channel.name.substring(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-bold text-base truncate">{channel.name}</h4>
                <p className="text-gray-400 text-xs truncate">{channel.group}</p>
              </div>
            </div>

            {/* Live Program Details */}
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-xs space-y-1">
              <p className="text-primary font-bold uppercase text-[10px] tracking-wider">Current Program</p>
              <p className="font-bold text-white truncate">{epgInfo.current.title}</p>
              <p className="text-gray-400 text-[11px] line-clamp-2">{epgInfo.current.description}</p>
              <div className="pt-2 flex justify-between text-[10px] text-gray-400 font-mono">
                <span>Next: {epgInfo.next.title}</span>
                <span>Starts {formatEPGTime(epgInfo.next.startTime)}</span>
              </div>
            </div>

            {/* Health Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-[10px]">Quality / Res</p>
                <p className="font-bold text-white mt-0.5">{getCurrentQualityLabel()}</p>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-[10px]">Bitrate</p>
                <p className="font-bold text-green-400 mt-0.5">{streamMetrics.bitrateKbps} Kbps</p>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-[10px]">Est Bandwidth</p>
                <p className="font-bold text-white mt-0.5">{streamMetrics.bandwidthMbps} Mbps</p>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <p className="text-gray-400 text-[10px]">Buffer Health</p>
                <p className="font-bold text-white mt-0.5">{streamMetrics.bufferSeconds}s</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side Channel List Drawer */}
      {showChannelList && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-paper-dark/95 backdrop-blur-md z-50 p-4 flex flex-col border-l border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">Channels</h3>
            <button 
              onClick={() => setShowChannelList(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {channels.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  navigate(`/player/${c.id}`);
                  setShowChannelList(false);
                }}
                onMouseEnter={() => handlePreview(c)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left",
                  c.id === channelId ? "bg-primary text-white shadow-lg" : "hover:bg-white/5 text-gray-300"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0 overflow-hidden">
                  {c.logo ? (
                    <img src={c.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                      {c.name.substring(0, 2)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{c.name}</p>
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
