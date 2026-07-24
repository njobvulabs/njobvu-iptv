export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  source: string;
  categories: string[];
  tvgId?: string;
  channelNumber?: number;
}

export interface CustomPlaylist {
  id: string;
  name: string;
  type: 'm3u_url' | 'm3u_file' | 'xtream';
  url?: string;
  content?: string;
  username?: string;
  password?: string;
  serverUrl?: string;
  enabled: boolean;
  createdAt: number;
}

export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description: string;
  category: string;
  startTime: number; // Unix timestamp ms
  endTime: number;   // Unix timestamp ms
  rating?: string;
}

export interface CustomFolder {
  id: string;
  name: string;
  channelIds: string[];
  createdAt: number;
}

export interface ParentalConfig {
  enabled: boolean;
  pin: string;
  lockedCategories: string[];
  lockedChannelIds: string[];
}

export type SortOption = 'default' | 'name-asc' | 'name-desc' | 'most-watched' | 'category';

export type AspectRatioMode = 'contain' | 'cover' | '16:9' | '4:3' | 'fill';

export interface StreamMetrics {
  bitrateKbps: number;
  bandwidthMbps: number;
  droppedFrames: number;
  totalFrames: number;
  bufferSeconds: number;
  latencySeconds: number;
}

export interface SearchHistory {
  query: string;
  timestamp: number;
}

export interface WatchHistory {
  channelId: string;
  timestamp: number;
  progress?: number;
}

export interface HistoryEntry {
  id: string;
  time: number;
  count?: number;
}

export interface SourceStatus {
  url: string;
  name: string;
  success: boolean;
  channelCount: number;
  error?: string;
}

export type Theme = 'light' | 'dark';

export const MAIN_CATEGORIES = [
  'News',
  'Sports',
  'Movies',
  'TV Shows',
  'Comedy',
  'Kids',
  'Music',
  'Documentaries',
  'Entertainment',
  'Horror',
  'Español',
  'Weather',
  'General'
] as const;

export type MainCategory = typeof MAIN_CATEGORIES[number];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'News': ['news', 'global', 'local', 'business', 'national'],
  'Sports': ['sports', 'competition', 'games'],
  'Movies': ['movies', 'cinema', 'movie'],
  'TV Shows': ['series', 'dramas', 'drama', 'reality', 'classic tv', 'sitcom'],
  'Comedy': ['comedy'],
  'Kids': ['kids', 'family', 'animation', 'children', 'animated'],
  'Music': ['music', 'musical'],
  'Documentaries': ['documentary', 'science', 'nature', 'docu'],
  'Entertainment': ['entertainment', 'pop culture', 'lifestyle', 'reality'],
  'Horror': ['horror', 'supernatural', 'sci-fi', 'mystery', 'thriller'],
  'Español': ['español', 'spanish', 'latino'],
  'Weather': ['weather'],
  'General': ['general', 'other', 'misc'],
};