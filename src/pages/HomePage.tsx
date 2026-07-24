import React, { useState, useMemo, useCallback, memo, useTransition, useDeferredValue, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  CheckCircle,
  Radio,
  FolderPlus,
  ArrowUpDown,
  Lock,
  Download,
  Folder,
  Home as HomeIcon
} from 'lucide-react';
import { Channel, SourceStatus, MAIN_CATEGORIES, CustomFolder, SortOption, ParentalConfig } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { GridIcon, FeaturedIcon } from '../components/ChannelIcon';
import { ParentalPinModal } from '../components/ParentalPinModal';
import { AddFolderModal } from '../components/AddFolderModal';
import { EPGGuideModal } from '../components/EPGGuideModal';
import { InstallPwaModal } from '../components/InstallPwaModal';
import { getCurrentAndNextEPG } from '../lib/epg';
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
    active ? "bg-primary/10 text-primary font-bold" : "text-gray-400 hover:bg-white/5",
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
  isLocked: boolean;
  onSelect: (channel: Channel) => void;
}

const ChannelCard = memo(function ChannelCard({ channel, viewMode, isLocked, onSelect }: ChannelCardProps) {
  const epgInfo = getCurrentAndNextEPG(channel);

  return (
    <div
      onClick={() => onSelect(channel)}
      className={cn(
        "m3-card bg-paper-dark hover:shadow-2xl group block cursor-pointer relative overflow-hidden transition-all duration-200 border border-white/5",
        viewMode === 'grid' ? "p-4" : "p-3 flex items-center gap-4"
      )}
    >
      <div className={cn(
        "rounded-2xl overflow-hidden flex-shrink-0 relative bg-white/5",
        viewMode === 'grid' ? "aspect-square mb-3" : "w-16 h-16"
      )}>
        <GridIcon 
          src={channel.logo} 
          name={channel.name}
          className={viewMode === 'grid' ? "w-full h-full" : ""}
        />
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
          {isLocked ? (
            <div className="w-10 h-10 rounded-full bg-red-500/80 text-white flex items-center justify-center shadow-lg">
              <Lock size={20} />
            </div>
          ) : (
            <Play size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
          )}
        </div>

        {isLocked && (
          <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-lg shadow">
            <Lock size={12} />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h3 className="font-bold text-white text-sm truncate group-hover:text-primary transition-colors">{channel.name}</h3>
        </div>
        <p className="text-xs text-gray-400 truncate mb-1">{channel.group}</p>
        
        {/* Live EPG Badge */}
        <p className="text-[11px] text-primary/90 font-medium truncate flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          {epgInfo.current.title}
        </p>
      </div>
    </div>
  );
});

interface FeaturedCardProps {
  channel: Channel;
  isLocked: boolean;
  onSelect: (channel: Channel) => void;
}

const FeaturedCard = memo(function FeaturedCard({ channel, isLocked, onSelect }: FeaturedCardProps) {
  const epgInfo = getCurrentAndNextEPG(channel);

  return (
    <div 
      onClick={() => onSelect(channel)}
      className="flex-shrink-0 w-72 md:w-80 h-44 rounded-3xl relative overflow-hidden group snap-start shadow-xl cursor-pointer border border-white/5"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
      <FeaturedIcon 
        src={channel.logo} 
        name={channel.name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <p className="text-white font-bold text-base truncate">{channel.name}</p>
        <p className="text-primary text-xs font-medium truncate mt-0.5">{epgInfo.current.title}</p>
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl">
          {isLocked ? <Lock size={22} /> : <Play fill="currentColor" size={22} className="ml-1" />}
        </div>
      </div>
    </div>
  );
});

const ALL_CATEGORIES = ['All', ...MAIN_CATEGORIES];

export default function HomePage({ channels, loading, error, sourceStatus, retrySource, isFromCache }: HomePageProps) {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState('');
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>('searchHistory', []);
  const [selectedCategory, setSelectedCategory] = useLocalStorage<string>('selectedCategory', 'All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('default');

  const [favorites] = useLocalStorage<string[]>('favorites', []);
  const [history] = useLocalStorage<{id: string, time: number, count?: number}[]>('history', []);
  const [customFolders, setCustomFolders] = useLocalStorage<CustomFolder[]>('njobvu_custom_folders', []);
  const [parentalConfig] = useLocalStorage<ParentalConfig>('njobvu_parental_config', {
    enabled: false,
    pin: '0000',
    lockedCategories: [],
    lockedChannelIds: []
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Modals
  const [showEPG, setShowEPG] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingLockedChannel, setPendingLockedChannel] = useState<Channel | null>(null);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = () => {
    setShowInstallModal(true);
  };

  const deferredSearch = useDeferredValue(searchInput);

  const handleCategoryClick = useCallback((category: string) => {
    startTransition(() => {
      setSelectedCategory(category);
    });
  }, []);

  const isChannelLocked = useCallback((c: Channel) => {
    if (!parentalConfig.enabled) return false;
    if (parentalConfig.lockedChannelIds.includes(c.id)) return true;
    return c.categories.some(cat => parentalConfig.lockedCategories.includes(cat));
  }, [parentalConfig]);

  const handleSelectChannel = useCallback((c: Channel) => {
    if (isChannelLocked(c)) {
      setPendingLockedChannel(c);
      setShowPinModal(true);
    } else {
      navigate(`/player/${c.id}`);
    }
  }, [isChannelLocked, navigate]);

  const filteredChannels = useMemo(() => {
    let result = channels;

    // Search query
    if (deferredSearch) {
      const query = deferredSearch.toLowerCase();
      result = channels.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.categories.some(cat => cat.toLowerCase().includes(query)) ||
        c.group.toLowerCase().includes(query)
      );
    } else if (selectedCategory === 'All' || selectedCategory === 'Home') {
      result = channels;
    } else if (selectedCategory === 'Favorites') {
      result = favorites
        .map(id => channels.find(c => c.id === id))
        .filter((c): c is Channel => c !== undefined);
    } else if (selectedCategory === 'History') {
      const historyMap = new Map<string, number>(history.map(h => [h.id, h.time]));
      const historyChannels = channels.filter(c => historyMap.has(c.id));
      result = historyChannels.sort((a, b) => {
        const timeA = historyMap.get(a.id) ?? 0;
        const timeB = historyMap.get(b.id) ?? 0;
        return timeB - timeA;
      });
    } else if (selectedCategory.startsWith('folder_')) {
      const folderId = selectedCategory.replace('folder_', '');
      const folder = customFolders.find(f => f.id === folderId);
      if (folder) {
        result = folder.channelIds
          .map(id => channels.find(c => c.id === id))
          .filter((c): c is Channel => c !== undefined);
      }
    } else {
      result = channels.filter(c => c.categories.includes(selectedCategory));
    }

    // Apply Sorting
    const sorted = [...result];
    if (sortOption === 'name-asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'name-desc') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === 'most-watched') {
      const historyCounts = new Map<string, number>(history.map(h => [h.id, h.count || 1]));
      sorted.sort((a, b) => (historyCounts.get(b.id) || 0) - (historyCounts.get(a.id) || 0));
    } else if (sortOption === 'category') {
      sorted.sort((a, b) => a.group.localeCompare(b.group));
    }

    return sorted;
  }, [channels, selectedCategory, deferredSearch, favorites, history, customFolders, sortOption]);

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
        <h2 className="text-xl font-bold animate-pulse text-white">Loading IPTV Channels...</h2>
        {sourceStatus.length > 0 && (
          <div className="mt-6 space-y-2 w-full max-w-xs">
            {sourceStatus.map((source, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <span className="truncate mr-2 text-gray-300">{source.name}</span>
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
        <h2 className="text-2xl font-bold mb-2 text-white">No Channels Available</h2>
        <p className="text-gray-400 mb-6 max-w-md">{error || 'Unable to load channels. Please add an M3U playlist in Settings.'}</p>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-primary text-white font-medium shadow-lg"
          >
            Retry
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20"
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen pb-14 md:pb-0 bg-bg-dark text-white", sidebarCollapsed ? "md:pl-20" : "md:pl-56")}>
      {/* Sidebar (Desktop) */}
      <nav className={cn(
        "hidden md:flex fixed top-0 bottom-0 left-0 flex-col bg-paper-dark border-r border-white/10 z-50 transition-all duration-150",
        sidebarCollapsed ? "w-20 items-center" : "w-56 items-stretch"
      )}>
        <div className={cn("flex items-center h-20 border-b border-white/5", sidebarCollapsed ? "justify-center" : "px-6 gap-3")}>
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-lg">
            <Tv size={22} />
          </div>
          {!sidebarCollapsed && (
            <span className="font-black text-xl text-primary tracking-tight">Njobvu</span>
          )}
        </div>
        
        <div className="flex-1 flex flex-col py-6 px-3 gap-2 overflow-y-auto">
          <NavButton 
            icon={<HomeIcon size={20} />} 
            label="Home" 
            active={selectedCategory === 'All' || selectedCategory === 'Home'} 
            collapsed={sidebarCollapsed}
            onClick={() => handleCategoryClick('All')}
          />
          <NavButton 
            icon={<Heart size={20} />} 
            label="Favorites" 
            active={selectedCategory === 'Favorites'} 
            collapsed={sidebarCollapsed}
            onClick={() => handleCategoryClick('Favorites')}
          />
          <NavButton 
            icon={<History size={20} />} 
            label="History" 
            active={selectedCategory === 'History'} 
            collapsed={sidebarCollapsed}
            onClick={() => handleCategoryClick('History')}
          />
          <NavButton 
            icon={<Radio size={20} />} 
            label="TV Guide (EPG)" 
            collapsed={sidebarCollapsed}
            onClick={() => setShowEPG(true)}
          />
          <NavButton 
            icon={<FolderPlus size={20} />} 
            label="Custom Folders" 
            collapsed={sidebarCollapsed}
            onClick={() => setShowFolderModal(true)}
          />

          <button
            onClick={handleInstallPWA}
            className={cn(
              "mt-4 p-3 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center gap-3 font-bold text-xs hover:bg-primary/30 transition-all",
              sidebarCollapsed ? "justify-center w-12 h-12" : "w-full"
            )}
            title="Install Njobvu IPTV App"
          >
            <Download size={18} />
            {!sidebarCollapsed && <span>Install App</span>}
          </button>
        </div>

        <div className="p-3 border-t border-white/5">
          <NavButton 
            icon={<SettingsIcon size={20} />} 
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
        <NavButton icon={<HomeIcon size={20} />} label="" active={selectedCategory === 'All' || selectedCategory === 'Home'} collapsed={true} onClick={() => handleCategoryClick('All')} className="!p-2" />
        <NavButton icon={<Heart size={20} />} label="" active={selectedCategory === 'Favorites'} collapsed={true} onClick={() => handleCategoryClick('Favorites')} className="!p-2" />
        <NavButton icon={<History size={20} />} label="" active={selectedCategory === 'History'} collapsed={true} onClick={() => handleCategoryClick('History')} className="!p-2" />
        <NavButton icon={<Radio size={20} />} label="" collapsed={true} onClick={() => setShowEPG(true)} className="!p-2" />
        <NavButton icon={<SettingsIcon size={20} />} label="" collapsed={true} asLink to="/settings" className="!p-2" />
      </nav>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-primary flex items-center gap-3">
                <Tv className="md:hidden" />
                Njobvu IPTV
              </h1>
              <button
                onClick={handleInstallPWA}
                className="md:hidden px-3 py-1 rounded-full bg-primary text-white text-xs font-bold flex items-center gap-1 shadow"
              >
                <Download size={12} /> Install
              </button>
            </div>
            <p className="text-gray-400 text-sm">{channels.length} channels loaded</p>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search channels, groups, or shows..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-paper-dark border border-white/5 text-sm text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchHistory.length > 0 && !searchInput && searchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-paper-dark rounded-2xl shadow-2xl border border-white/10 z-40">
                  <p className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Recent Searches</p>
                  {searchHistory.map((s, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setSearchInput(s);
                        setSearchFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-gray-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowEPG(true)}
              className="px-4 py-3 rounded-2xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 font-bold text-xs flex items-center gap-2 whitespace-nowrap shadow-sm"
            >
              <Radio size={16} /> TV Guide
            </button>
          </div>
        </header>

        {/* Featured Section */}
        {!searchInput && featuredChannels.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Recommended For You</h2>
              <button onClick={() => handleCategoryClick('Favorites')} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                View All <ChevronRight size={14} />
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
              {featuredChannels.map((c) => (
                <FeaturedCard
                  key={c.id}
                  channel={c}
                  isLocked={isChannelLocked(c)}
                  onSelect={handleSelectChannel}
                />
              ))}
            </div>
          </section>
        )}

        {/* Categories & Custom Folders Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={cn(
                "px-4 py-2 rounded-full whitespace-nowrap font-bold text-xs transition-all flex-shrink-0",
                selectedCategory === cat 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "bg-paper-dark text-gray-400 hover:bg-white/5 border border-white/5"
              )}
            >
              {cat === 'All' ? 'All Channels' : cat}
            </button>
          ))}

          {/* Custom User Folders */}
          {customFolders.map(folder => (
            <button
              key={folder.id}
              onClick={() => handleCategoryClick(`folder_${folder.id}`)}
              className={cn(
                "px-4 py-2 rounded-full whitespace-nowrap font-bold text-xs transition-all flex-shrink-0 flex items-center gap-1.5",
                selectedCategory === `folder_${folder.id}` 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "bg-paper-dark text-gray-300 hover:bg-white/5 border border-white/5"
              )}
            >
              <Folder size={14} /> {folder.name}
            </button>
          ))}

          <button
            onClick={() => setShowFolderModal(true)}
            className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 text-primary border border-primary/30 text-xs font-bold flex items-center gap-1 flex-shrink-0"
          >
            <FolderPlus size={14} /> Custom List
          </button>
        </div>

        {/* Sorting & View Controls */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn("text-lg font-bold text-white", isPending && "opacity-50")}>
            {selectedCategory === 'All' || selectedCategory === 'Home'
              ? 'All Channels'
              : selectedCategory.startsWith('folder_')
              ? customFolders.find(f => f.id === selectedCategory.replace('folder_', ''))?.name
              : selectedCategory} 
            <span className="text-gray-500 font-normal text-xs ml-2">({filteredChannels.length} channels)</span>
          </h2>

          <div className="flex items-center gap-3">
            {/* Sorting Dropdown */}
            <div className="relative flex items-center gap-1 bg-paper-dark p-1 rounded-xl border border-white/5">
              <ArrowUpDown size={14} className="text-gray-400 ml-2" />
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-xs font-bold text-gray-300 pr-3 py-1 focus:outline-none cursor-pointer"
              >
                <option value="default" className="bg-paper-dark text-white">Default</option>
                <option value="name-asc" className="bg-paper-dark text-white">Name (A-Z)</option>
                <option value="name-desc" className="bg-paper-dark text-white">Name (Z-A)</option>
                <option value="most-watched" className="bg-paper-dark text-white">Most Watched</option>
                <option value="category" className="bg-paper-dark text-white">Group</option>
              </select>
            </div>

            {/* View Mode Grid/List */}
            <div className="flex items-center gap-1 p-1 bg-paper-dark rounded-xl border border-white/5">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-primary text-white" : "text-gray-500")}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-primary text-white" : "text-gray-500")}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Channels Grid/List */}
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1"
        )}>
          {filteredChannels.map((c) => (
            <ChannelCard
              key={c.id}
              channel={c}
              viewMode={viewMode}
              isLocked={isChannelLocked(c)}
              onSelect={handleSelectChannel}
            />
          ))}
        </div>

        {filteredChannels.length === 0 && (
          <div className="py-20 text-center">
            <Search size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">No channels found</h3>
            <p className="text-gray-400 text-sm">Try a different search, category, or add a custom M3U playlist</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <EPGGuideModal
        isOpen={showEPG}
        onClose={() => setShowEPG(false)}
        channels={channels}
      />

      <AddFolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        channels={channels}
        customFolders={customFolders}
        setCustomFolders={setCustomFolders}
      />

      {showPinModal && (
        <ParentalPinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            setPendingLockedChannel(null);
          }}
          onSuccess={() => {
            if (pendingLockedChannel) {
              navigate(`/player/${pendingLockedChannel.id}`);
            }
          }}
          targetName={pendingLockedChannel?.name}
          correctPin={parentalConfig.pin}
        />
      )}

      <InstallPwaModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => setCanInstall(false)}
      />
    </div>
  );
}
