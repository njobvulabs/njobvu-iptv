import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CATEGORY_KEYWORDS, MAIN_CATEGORIES } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCategoriesFromGroup(group: string): string[] {
  if (!group) return [];
  
  const categories: string[] = [];
  const normalizedGroup = group.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedGroup.includes(keyword.toLowerCase())) {
        if (!categories.includes(category)) {
          categories.push(category);
        }
        break;
      }
    }
  }
  
  return categories;
}

export function parseM3U(content: string, sourceUrl: string): any[] {
  const lines = content.split('\n');
  const channels: any[] = [];
  let currentChannel: any = null;

  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const info = line.split(',');
      const name = info[info.length - 1]?.trim();
      
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      
      const rawGroup = groupTitleMatch ? groupTitleMatch[1] : '';

      currentChannel = {
        name: name || 'Unknown Channel',
        logo: tvgLogoMatch ? tvgLogoMatch[1] : '',
        group: rawGroup || 'General',
        categories: getCategoriesFromGroup(rawGroup),
        tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
        source: sourceUrl
      };
    } else if (line.startsWith('http') && currentChannel) {
      currentChannel.url = line;
      
      const urlHash = getHash(currentChannel.url);
      const sourceHash = getHash(sourceUrl).substr(0, 4);
      
      currentChannel.id = `${sourceHash}_${urlHash}`;
      
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  return channels;
}

export function filterChannelsByCategory(channels: any[], category: string): any[] {
  if (category === 'All') return channels;
  return channels.filter(c => c.categories.includes(category));
}