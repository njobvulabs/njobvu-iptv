import { useState, useEffect, useCallback, useRef } from 'react';
import { Channel, SourceStatus } from '../types';
import { parseM3U } from '../lib/utils';

const SOURCE_CONFIG = [
  { url: 'https://www.apsattv.com/localnow.m3u', name: 'APSAT Local' },
  { url: 'https://www.apsattv.com/distro.m3u', name: 'APSAT Distro' },
  { url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/tubi_all.m3u', name: 'Tubi' },
  { url: 'https://iptv-org.github.io/iptv/categories/movies.m3u', name: 'IPTV Movies' },
  { url: 'https://iptv-org.github.io/iptv/categories/music.m3u', name: 'IPTV Music' }
];

const CACHE_KEY = 'njobvu_channels_cache';
const CACHE_TTL = 60 * 60 * 1000;
const APP_VERSION = '1.0.0';

interface CacheData {
  channels: Channel[];
  timestamp: number;
  version: string;
  sourceStatus: SourceStatus[];
}

interface UseM3UReturn {
  channels: Channel[];
  loading: boolean;
  error: string | null;
  sourceStatus: SourceStatus[];
  isFromCache: boolean;
  isRefreshing: boolean;
  refetch: () => void;
  retrySource: (url: string) => Promise<void>;
}

function getCache(): CacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CacheData = JSON.parse(cached);
    
    if (data.version !== APP_VERSION) return null;
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    
    return data;
  } catch {
    return null;
  }
}

function setCache(data: CacheData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache channels:', e);
  }
}

function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore
  }
}

export function useM3U(): UseM3UReturn {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus[]>([]);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchAllSources = useCallback(async (showLoader = true): Promise<void> => {
    if (showLoader) setLoading(true);
    setError(null);

    const statuses: SourceStatus[] = [];
    let totalChannels: Channel[] = [];

    const fetchPromises = SOURCE_CONFIG.map(async (source) => {
      try {
        const res = await fetch(source.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseM3U(text, source.url);
        
        return {
          source,
          parsed,
          success: true
        };
      } catch (err) {
        return {
          source,
          error: err instanceof Error ? err.message : 'Unknown error',
          success: false
        };
      }
    });

    const results = await Promise.all(fetchPromises);

    for (const result of results) {
      if (result.success && result.parsed) {
        statuses.push({
          url: result.source.url,
          name: result.source.name,
          success: true,
          channelCount: result.parsed.length
        });
        totalChannels = totalChannels.concat(result.parsed);
      } else {
        statuses.push({
          url: result.source.url,
          name: result.source.name,
          success: false,
          channelCount: 0,
          error: result.error
        });
      }
    }

    if (isMountedRef.current) {
      setSourceStatus([...statuses]);
      setChannels(prev => {
        const combined = [...prev, ...totalChannels];
        return Array.from(new Map(combined.map(c => [c.id, c])).values());
      });
    }

    if (!isMountedRef.current) return;

    const successCount = statuses.filter(s => s.success).length;
    const failCount = statuses.length - successCount;
    const finalChannels = Array.from(new Map(totalChannels.map(c => [c.id, c])).values());

    if (finalChannels.length === 0) {
      setError('Unable to load channels from any source.');
    } else {
      setError(null);
      setCache({
        channels: finalChannels,
        timestamp: Date.now(),
        version: APP_VERSION,
        sourceStatus: statuses
      });
    }

    if (showLoader) setLoading(false);
    setIsRefreshing(false);
  }, []);

  const fetchData = useCallback(async () => {
    const cached = getCache();
    
    if (cached && cached.channels.length > 0) {
      setChannels(cached.channels);
      setSourceStatus(cached.sourceStatus);
      setIsFromCache(true);
      setLoading(false);
      
      if (Date.now() - cached.timestamp > CACHE_TTL) {
        setIsRefreshing(true);
        fetchAllSources(false);
      }
    } else {
      await fetchAllSources(true);
    }
  }, [fetchAllSources]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setIsRefreshing(true);
        fetchAllSources(false);
      }
    }, CACHE_TTL);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchData, fetchAllSources]);

  const retrySource = useCallback(async (url: string) => {
    const source = SOURCE_CONFIG.find(s => s.url === url);
    if (!source) return;

    setSourceStatus(prev => prev.map(s => 
      s.url === url ? { ...s, success: false, error: 'Retrying...' } : s
    ));

    try {
      const res = await fetch(source.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseM3U(text, source.url);

      setSourceStatus(prev => prev.map(s => 
        s.url === url ? { ...s, success: true, channelCount: parsed.length, error: undefined } : s
      ));
      
      setChannels(prev => {
        const filtered = prev.filter(c => c.source !== url);
        const combined = [...filtered, ...parsed];
        const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());
        
        setCache({
          channels: unique,
          timestamp: Date.now(),
          version: APP_VERSION,
          sourceStatus
        });
        
        return unique;
      });
    } catch (err) {
      setSourceStatus(prev => prev.map(s => 
        s.url === url ? { ...s, success: false, error: err instanceof Error ? err.message : 'Failed' } : s
      ));
    }
  }, [sourceStatus]);

  const refetch = useCallback(() => {
    clearCache();
    setIsFromCache(false);
    fetchAllSources(true);
  }, [fetchAllSources]);

  return { 
    channels, 
    loading, 
    error, 
    sourceStatus, 
    isFromCache,
    isRefreshing,
    refetch, 
    retrySource 
  };
}