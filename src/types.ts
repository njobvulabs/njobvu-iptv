export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  source: string;
  categories: string[];
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
  'All',
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
  'Weather'
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
};