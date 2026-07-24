import React, { useState } from 'react';
import { Radio, X, Search, Play, Clock } from 'lucide-react';
import { Channel } from '../types';
import { getCurrentAndNextEPG, formatEPGTime } from '../lib/epg';
import { useNavigate } from 'react-router-dom';

interface EPGGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
}

export function EPGGuideModal({ isOpen, onClose, channels }: EPGGuideModalProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'News', 'Sports', 'Movies', 'TV Shows', 'Music', 'Kids'];

  const filteredChannels = channels.filter(c => {
    const matchesCat = selectedCat === 'All' || c.categories.includes(selectedCat);
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.group.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-paper-dark border border-white/10 rounded-3xl p-6 w-full max-w-4xl relative max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
              <Radio size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Electronic Program Guide (EPG)</h3>
              <p className="text-xs text-gray-400">Live & upcoming TV schedules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full text-gray-400 hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search channels or programs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCat === cat ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Guide Table */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredChannels.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No matching channels found.</p>
            </div>
          ) : (
            filteredChannels.slice(0, 50).map(c => {
              const { current, next, progressPercent, minutesRemaining } = getCurrentAndNextEPG(c);
              return (
                <div
                  key={c.id}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Channel info */}
                    <div className="flex items-center gap-3 w-56 flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
                        {c.logo ? (
                          <img src={c.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                            {c.name.substring(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white truncate">{c.name}</h4>
                        <p className="text-xs text-gray-400 truncate">{c.group}</p>
                      </div>
                    </div>

                    {/* Program Schedule Details */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Current Show */}
                      <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> ON NOW
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {formatEPGTime(current.startTime)} - {formatEPGTime(current.endTime)}
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-white truncate">{current.title}</h5>
                        <p className="text-xs text-gray-400 line-clamp-1 mb-2">{current.description}</p>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 text-right">{minutesRemaining}m remaining</p>
                      </div>

                      {/* Next Show */}
                      <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock size={10} /> UP NEXT
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {formatEPGTime(next.startTime)}
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-gray-200 truncate">{next.title}</h5>
                        <p className="text-xs text-gray-400 line-clamp-1">{next.description}</p>
                      </div>
                    </div>

                    {/* Play Button */}
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/player/${c.id}`);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors flex-shrink-0"
                    >
                      <Play size={14} fill="currentColor" /> Watch
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
