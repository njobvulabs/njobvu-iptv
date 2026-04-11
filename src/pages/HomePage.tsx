import React, { useState, useMemo, useCallback, memo, useTransition, useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Tv, 
  Heart, 
  History, 
  LayoutGrid, 
  List as ListIcon, 
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  Play,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { Channel, SourceStatus, MAIN_CATEGORIES } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ChannelIcon, FeaturedIcon, GridIcon } from '../components/ChannelIcon';
import { cn } from '../lib/utils';

interface HomePageProps {
  channels: Channel[];
  loading: boolean;
  error: string | null;
  sourceStatus: SourceStatus[];
  retrySource?: (url: string) => Promise<void>;
  isFromCache?: boolean;
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
  asLink?: boolean;
  to?: string;
  className?: string;
}

const NavButton = memo(function NavButton({ icon, label, active, collapsed, onClick, asLink, to, className }: NavButtonProps) {
  const baseClass = cn(
    "flex items-center gap-3 p-3 rounded-xl transition-all duration-150",
    active ? "bg-primary/10 text-primary" : "text-gray-400 hover:bg-white/5",
    collapsed ? "justify-center w-12 h-12" : "w-full",
    className
  );

  if (asLink && to) {
    return (
      <Link to={to} className={baseClass}>
        {icon}
        {!collapsed && <span className="font-medium">{label}</span>}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={baseClass}>
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );
});

interface ChannelCardProps {
  channel: Channel;
  viewMode: 'grid' | 'list';
}

const ChannelCard = memo(function ChannelCard({ channel, viewMode }: ChannelCardProps) {
  return (
    <Link 
      to={`/player/${channel.id}`}
      aria-label={`${channel.name} - ${channel.group}`}
      className={cn(
        "m3-card bg-paper-dark hover:shadow-xl group block",
        viewMode === 'grid' ? "p-4" : "p-3 flex items-center gap-4"
      )}
    >
      <div className={cn(
        "rounded-2xl overflow-hidden flex-shrink-0 relative",
        viewMode === 'grid' ? "aspect-square mb-4" : "w-16 h-16"
      )}>
        <GridIcon 
          src={channel.logo} 
          name={channel.name}
          className={viewMode === 'grid' ? "w-full h-full" : ""}
        />
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
          <Play size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold truncate group-hover:text-primary transition-colors">{channel.name}</h3>
        <p className="text-sm text-gray-400 truncate">{channel.group}</p>
      </div>
    </Link>
  );
});

interface FeaturedCardProps {
  channel: Channel;
}

const FeaturedCard = memo(function FeaturedCard({ channel }: FeaturedCardProps) {
  return (
    <Link 
      to={`/player/${channel.id}`}
      className="flex-shrink-0 w-72 md:w-80 h-44 rounded-3xl relative overflow-hidden group snap-start shadow-lg"
      aria-label={`Watch ${channel.name} - ${channel.group}`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
      <FeaturedIcon 
        src={channel.logo} 
        name={channel.name}
        className="absolute inset-0 w-full h-full"
      />
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <p className="text-white font-bold text-lg truncate">{channel.name}</p>
        <p className="text-white/60 text-sm">{channel.group}</p>
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-xl">
          <Play fill="currentColor" size={24} className="ml-1" />
        </div>
      </div>
    </Link>
  );
});

interface CategoryButtonProps {
  category: string;
  active: boolean;
  onClick: () => void;
}

const CategoryButton = memo(function CategoryButton({ category, active, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all flex-shrink-0",
        active 
          ? "bg-primary text-white shadow-md shadow-primary/20" 
          : "bg-paper-dark text-gray-400 hover:bg-white/5"
      )}
    >
      {category}
    </button>
  );
});

const ALL_CATEGORIES = [...MAIN_CATEGORIES];

export default function HomePage({ channels, loading, error, sourceStatus, retrySource, isFromCache }: HomePageProps) {
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState('');
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>('searchHistory', []);
  const [selectedCategory, setSelectedCategory] = useLocalStorage<string>('selectedCategory', 'News');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites] = useLocalStorage<string[]>('favorites', []);
  const [history] = useLocalStorage<{id: string, time: number}[]>('history', []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const deferredSearch = useDeferredValue(searchInput);

  const handleCategoryClick = useCallback((category: string) => {
    startTransition(() => {
      setSelectedCategory(category);
    });
  }, []);

  const filteredChannels = useMemo(() => {
    let result = channels;

    // If searching, search across all channels (Global Search)
    if (deferredSearch) {
      const query = deferredSearch.toLowerCase();
      return channels.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.categories.some(cat => cat.toLowerCase().includes(query)) ||
        c.group.toLowerCase().includes(query)
      );
    }

    if (selectedCategory === 'Favorites') {
      return favorites
        .map(id => channels.find(c => c.id === id))
        .filter((c): c is Channel => c !== undefined);
    }

    if (selectedCategory === 'History') {
      const historyMap = new Map<string, number>(history.map(h => [h.id, h.time]));
      const historyChannels = channels.filter(c => historyMap.has(c.id));
      return historyChannels.sort((a, b) => {
        const timeA = historyMap.get(a.id) ?? 0;
        const timeB = historyMap.get(b.id) ?? 0;
        return timeB - timeA;
      });
    }

    return result.filter(c => c.categories.includes(selectedCategory));
  }, [channels, selectedCategory, deferredSearch, favorites, history]);

  const featuredChannels = useMemo(() => {
    const historyChannelIds = new Set(history.map(h => h.id));
    const favoriteChannels = channels.filter(c => favorites.includes(c.id));
    const historyChannels = channels.filter(c => historyChannelIds.has(c.id));
    
    const watchedFavoriteIds = new Set(
      historyChannels.filter(c => favorites.includes(c.id)).map(c => c.id)
    );
    
    const unwatchedFavorites = favoriteChannels.filter(c => !watchedFavoriteIds.has(c.id));
    const recentlyWatched = historyChannels.slice(0, 10);
    
    const combined = [...unwatchedFavorites, ...recentlyWatched];
    const seen = new Set<string>();
    const unique = combined.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    
    return unique.slice(0, 5);
  }, [channels, favorites, history]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      setSearchHistory(prev => [searchInput.trim(), ...prev.filter(s => s !== searchInput.trim())].slice(0, 5));
    }
  }, [searchInput, setSearchHistory]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg-dark">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold animate-pulse">Loading...</h2>
        {sourceStatus.length > 0 && (
          <div className="mt-6 space-y-2 w-full max-w-xs">
            {sourceStatus.map((source, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-4 py-2 bg-white/5 rounded-lg">
                <span className="truncate mr-2">{source.name}</span>
                {source.success ? (
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                ) : (
                  <RefreshCw size={16} className="text-gray-400 flex-shrink-0 animate-spin" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-bg-dark">
        <div className="text-error-dark mb-4">
          <Tv size={64} />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Channels Available</h2>
        <p className="text-gray-400 mb-6 max-w-md">{error || 'Unable to load channels.'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-primary text-white font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen pb-14 md:pb-0", sidebarCollapsed ? "md:pl-20" : "md:pl-56")}>
      {/* Sidebar (Desktop) */}
      <nav className={cn(
        "hidden md:flex fixed top-0 bottom-0 left-0 flex-col bg-paper-dark border-r border-white/10 z-50 transition-all duration-150",
        sidebarCollapsed ? "w-20 items-center" : "w-56 items-stretch"
      )}>
        <div className={cn("flex items-center h-20 border-b border-white/5", sidebarCollapsed ? "justify-center" : "px-6 gap-3")}>
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0">
            <Tv size={22} />
          </div>
          {!sidebarCollapsed && (
            <span className="font-black text-lg text-primary">Njobvu</span>
          )}
        </div>
        
        <div className="flex-1 flex flex-col py-6 px-3 gap-2">
          <NavButton 
            icon={<Heart size={22} />} 
            label="Favorites" 
            active={selectedCategory === 'Favorites'} 
            collapsed={sidebarCollapsed}
            onClick={() => handleCategoryClick('Favorites')}
          />
          <NavButton 
            icon={<History size={22} />} 
            label="History" 
            active={selectedCategory === 'History'} 
            collapsed={sidebarCollapsed}
            onClick={() => handleCategoryClick('History')}
          />
        </div>

        <div className="p-3 border-t border-white/5">
          <NavButton 
            icon={<SettingsIcon size={22} />} 
            label="Settings" 
            collapsed={sidebarCollapsed}
            asLink
            to="/settings"
          />
        </div>

        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-paper-dark border border-white/10 rounded-r-xl flex items-center justify-center text-gray-400 hover:text-primary transition-colors",
            sidebarCollapsed ? "-right-3" : "-right-6"
          )}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-paper-dark border-t border-white/10 flex items-center justify-around z-50 px-2">
        <NavButton icon={<Heart size={20} />} label="" active={selectedCategory === 'Favorites'} collapsed={true} onClick={() => handleCategoryClick('Favorites')} className="!p-2" />
        <NavButton icon={<History size={20} />} label="" active={selectedCategory === 'History'} collapsed={true} onClick={() => handleCategoryClick('History')} className="!p-2" />
        <NavButton icon={<Tv size={20} />} label="" collapsed={true} asLink to="/" className="!p-2" />
        <NavButton icon={<SettingsIcon size={20} />} label="" collapsed={true} asLink to="/settings" className="!p-2" />
      </nav>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-primary flex items-center gap-3">
              <Tv className="md:hidden" />
              Njobvu IPTV
              {isFromCache && <span className="text-xs font-normal text-gray-500">cached</span>}
            </h1>
            <p className="text-gray-500">{channels.length} channels</p>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Search channels..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-paper-dark border-none shadow-sm focus:ring-2 focus:ring-primary"
            />
            {searchHistory.length > 0 && !searchInput && searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-paper-dark rounded-2xl shadow-xl border border-white/5 z-40">
                <p className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Recent</p>
                {searchHistory.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setSearchInput(s);
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Featured Section */}
        {!searchInput && featuredChannels.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">For You</h2>
              <button onClick={() => handleCategoryClick('Favorites')} className="text-primary font-medium flex items-center gap-1 hover:underline">
                View All <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
              {featuredChannels.map((c) => (
                <FeaturedCard key={c.id} channel={c} />
              ))}
            </div>
          </section>
        )}

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
          {ALL_CATEGORIES.map(cat => (
            <CategoryButton
              key={cat}
              category={cat}
              active={selectedCategory === cat}
              onClick={() => handleCategoryClick(cat)}
            />
          ))}
        </div>

        {/* View Controls */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn("text-xl font-bold", isPending && "opacity-50")}>
            {selectedCategory} <span className="text-gray-500 font-normal text-sm ml-2">({filteredChannels.length})</span>
          </h2>
          <div className="flex items-center gap-1 p-1 bg-paper-dark rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-primary text-white" : "text-gray-500")}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-primary text-white" : "text-gray-500")}
            >
              <ListIcon size={18} />
            </button>
          </div>
        </div>

        {/* Channels Grid/List */}
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1"
        )}>
          {filteredChannels.map((c) => (
            <ChannelCard key={c.id} channel={c} viewMode={viewMode} />
          ))}
        </div>

        {filteredChannels.length === 0 && (
          <div className="py-20 text-center">
            <Search size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No channels found</h3>
            <p className="text-gray-400">Try a different search or category</p>
          </div>
        )}
      </main>
    </div>
  );
}