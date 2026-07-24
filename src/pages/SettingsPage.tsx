import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  Info, 
  ExternalLink, 
  Github, 
  Plus, 
  Upload, 
  Lock, 
  Globe, 
  Shield, 
  Radio, 
  Check, 
  FileText, 
  Key, 
  Server
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { CustomPlaylist, ParentalConfig, MAIN_CATEGORIES } from '../types';

export default function SettingsPage() {
  const navigate = useNavigate();

  // Custom Playlists State
  const [playlists, setPlaylists] = useLocalStorage<CustomPlaylist[]>('njobvu_custom_playlists', []);
  const [playlistTab, setPlaylistTab] = useState<'url' | 'file' | 'xtream'>('url');
  
  // URL Form
  const [m3uName, setM3uName] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');

  // Xtream Form
  const [xtreamName, setXtreamName] = useState('');
  const [xtreamServer, setXtreamServer] = useState('');
  const [xtreamUser, setXtreamUser] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');

  // File Upload
  const [uploadName, setUploadName] = useState('');
  const [uploadContent, setUploadContent] = useState('');

  // CORS Proxy Settings
  const [useCorsProxy, setUseCorsProxy] = useLocalStorage<boolean>('njobvu_use_cors_proxy', false);
  const [corsProxyUrl, setCorsProxyUrl] = useLocalStorage<string>('njobvu_cors_proxy_url', 'https://corsproxy.io/?');

  // Parental Control State
  const [parentalConfig, setParentalConfig] = useLocalStorage<ParentalConfig>('njobvu_parental_config', {
    enabled: false,
    pin: '0000',
    lockedCategories: [],
    lockedChannelIds: []
  });
  const [pinInput, setPinInput] = useState(parentalConfig.pin);

  const handleAddM3uUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!m3uName.trim() || !m3uUrl.trim()) return;

    const newP: CustomPlaylist = {
      id: `m3u_${Date.now()}`,
      name: m3uName.trim(),
      type: 'm3u_url',
      url: m3uUrl.trim(),
      enabled: true,
      createdAt: Date.now()
    };

    setPlaylists(prev => [newP, ...prev]);
    setM3uName('');
    setM3uUrl('');
    localStorage.removeItem('njobvu_channels_cache');
    alert('Playlist added successfully! Channels cache cleared.');
  };

  const handleAddXtream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!xtreamName.trim() || !xtreamServer.trim() || !xtreamUser.trim() || !xtreamPass.trim()) return;

    const newP: CustomPlaylist = {
      id: `xtream_${Date.now()}`,
      name: xtreamName.trim(),
      type: 'xtream',
      serverUrl: xtreamServer.trim(),
      username: xtreamUser.trim(),
      password: xtreamPass.trim(),
      enabled: true,
      createdAt: Date.now()
    };

    setPlaylists(prev => [newP, ...prev]);
    setXtreamName('');
    setXtreamServer('');
    setXtreamUser('');
    setXtreamPass('');
    localStorage.removeItem('njobvu_channels_cache');
    alert('Xtream Codes playlist added successfully!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadName(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setUploadContent(text);
    };
    reader.readAsText(file);
  };

  const handleSaveFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim() || !uploadContent) return;

    const newP: CustomPlaylist = {
      id: `file_${Date.now()}`,
      name: uploadName.trim(),
      type: 'm3u_file',
      content: uploadContent,
      enabled: true,
      createdAt: Date.now()
    };

    setPlaylists(prev => [newP, ...prev]);
    setUploadName('');
    setUploadContent('');
    localStorage.removeItem('njobvu_channels_cache');
    alert('Local M3U file saved successfully!');
  };

  const togglePlaylist = (id: string) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    localStorage.removeItem('njobvu_channels_cache');
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    localStorage.removeItem('njobvu_channels_cache');
  };

  const toggleLockedCategory = (cat: string) => {
    setParentalConfig(prev => {
      const locked = prev.lockedCategories.includes(cat)
        ? prev.lockedCategories.filter(c => c !== cat)
        : [...prev.lockedCategories, cat];
      return { ...prev, lockedCategories: locked };
    });
  };

  const handleSavePin = () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      alert('PIN must be exactly 4 numeric digits!');
      return;
    }
    setParentalConfig(prev => ({ ...prev, pin: pinInput }));
    alert('Parental Lock PIN updated successfully!');
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear your watch history?')) {
      localStorage.removeItem('history');
      window.location.reload();
    }
  };

  const clearFavorites = () => {
    if (confirm('Are you sure you want to clear all favorites?')) {
      localStorage.removeItem('favorites');
      window.location.reload();
    }
  };

  const clearCustomPlaylists = () => {
    if (confirm('Are you sure you want to remove all custom playlists?')) {
      localStorage.removeItem('njobvu_custom_playlists');
      localStorage.removeItem('njobvu_channels_cache');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 rounded-full bg-paper-dark hover:bg-white/5 transition-colors text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white">Settings</h1>
            <p className="text-sm text-gray-400">Manage playlists, proxies, parental locks, and preferences</p>
          </div>
        </header>

        <div className="space-y-6">

          {/* Custom Playlists & M3U Management */}
          <section className="bg-paper-dark rounded-3xl p-6 border border-white/5 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <Radio size={22} className="text-primary" />
              Custom Playlist & M3U Management
            </h2>

            {/* Sub-tabs for Add method */}
            <div className="flex bg-white/5 p-1 rounded-2xl mb-6">
              <button
                onClick={() => setPlaylistTab('url')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  playlistTab === 'url' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                M3U URL
              </button>
              <button
                onClick={() => setPlaylistTab('file')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  playlistTab === 'file' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Upload .M3U File
              </button>
              <button
                onClick={() => setPlaylistTab('xtream')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  playlistTab === 'xtream' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Xtream Codes
              </button>
            </div>

            {playlistTab === 'url' && (
              <form onSubmit={handleAddM3uUrl} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Playlist Name</label>
                  <input
                    type="text"
                    placeholder="e.g. My Premium IPTV"
                    value={m3uName}
                    onChange={e => setM3uName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">M3U / M3U8 Playlist URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/playlist.m3u"
                    value={m3uUrl}
                    onChange={e => setM3uUrl(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add M3U Playlist
                </button>
              </form>
            )}

            {playlistTab === 'file' && (
              <form onSubmit={handleSaveFileUpload} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Select .M3U File</label>
                  <input
                    type="file"
                    accept=".m3u,.m3u8,.txt"
                    onChange={handleFileUpload}
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>
                {uploadContent && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Playlist Name</label>
                    <input
                      type="text"
                      placeholder="My Local Playlist"
                      value={uploadName}
                      onChange={e => setUploadName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!uploadContent || !uploadName.trim()}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={18} /> Save Uploaded Playlist
                </button>
              </form>
            )}

            {playlistTab === 'xtream' && (
              <form onSubmit={handleAddXtream} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Account Label</label>
                  <input
                    type="text"
                    placeholder="Xtream Service"
                    value={xtreamName}
                    onChange={e => setXtreamName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Server Host / URL</label>
                    <input
                      type="text"
                      placeholder="http://domain.com:8080"
                      value={xtreamServer}
                      onChange={e => setXtreamServer(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="Username"
                      value={xtreamUser}
                      onChange={e => setXtreamUser(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Password"
                      value={xtreamPass}
                      onChange={e => setXtreamPass(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Server size={18} /> Add Xtream Account
                </button>
              </form>
            )}

            {/* Added Playlists List */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Custom Playlists ({playlists.length})</h3>
              {playlists.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No custom playlists added yet. Use the form above to add your M3U or Xtream sources.</p>
              ) : (
                <div className="space-y-2">
                  {playlists.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${p.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <h4 className="font-bold text-white text-sm truncate">{p.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-gray-300 font-mono uppercase">{p.type}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{p.url || p.serverUrl || 'Local .m3u File'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePlaylist(p.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            p.enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {p.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                        <button
                          onClick={() => deletePlaylist(p.id)}
                          className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* CORS Proxy Settings */}
          <section className="bg-paper-dark rounded-3xl p-6 border border-white/5 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <Globe size={22} className="text-primary" />
              CORS Proxy Fallback
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">Enable CORS Proxy Fallback</p>
                  <p className="text-xs text-gray-400">Routes blocked stream URLs through a proxy server to fix CORS playback errors</p>
                </div>
                <button
                  onClick={() => setUseCorsProxy(!useCorsProxy)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    useCorsProxy ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      useCorsProxy ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {useCorsProxy && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">CORS Proxy Service URL</label>
                  <input
                    type="url"
                    value={corsProxyUrl}
                    onChange={e => setCorsProxyUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Default: https://corsproxy.io/? or https://api.allorigins.win/raw?url=</p>
                </div>
              )}
            </div>
          </section>

          {/* Parental Controls */}
          <section className="bg-paper-dark rounded-3xl p-6 border border-white/5 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <Shield size={22} className="text-primary" />
              Parental Controls & Category Lock
            </h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">Enable Parental Control PIN Lock</p>
                  <p className="text-xs text-gray-400">Restrict selected categories behind a 4-digit PIN code</p>
                </div>
                <button
                  onClick={() => setParentalConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    parentalConfig.enabled ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      parentalConfig.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {parentalConfig.enabled && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Change 4-Digit PIN Code</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        maxLength={4}
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                        className="w-36 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-lg font-bold tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={handleSavePin}
                        className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors"
                      >
                        Save PIN
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Locked Categories 🔒</label>
                    <div className="flex flex-wrap gap-2">
                      {MAIN_CATEGORIES.map(cat => {
                        const isLocked = parentalConfig.lockedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleLockedCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                              isLocked
                                ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            <Lock size={12} /> {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Data Management */}
          <section className="bg-paper-dark rounded-3xl p-6 border border-white/5 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <Trash2 size={20} className="text-primary" />
              Data & Storage Management
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">Clear Watch History</p>
                  <p className="text-xs text-gray-400">Remove all recently watched channels</p>
                </div>
                <button 
                  onClick={clearHistory}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-bold"
                >
                  Clear History
                </button>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">Clear Favorites</p>
                  <p className="text-xs text-gray-400">Remove all channels from your saved favorites</p>
                </div>
                <button 
                  onClick={clearFavorites}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-bold"
                >
                  Clear Favorites
                </button>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">Clear Custom Playlists</p>
                  <p className="text-xs text-gray-400">Reset custom sources and reload default channels</p>
                </div>
                <button 
                  onClick={clearCustomPlaylists}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-bold"
                >
                  Clear Playlists
                </button>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="bg-paper-dark rounded-3xl p-6 border border-white/5 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <Info size={20} className="text-primary" />
              About Njobvu IPTV
            </h2>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm leading-relaxed">
                Njobvu IPTV is a modern, high-performance streaming client built with Material Design 3 and React. 
                Enjoy live TV channels, custom M3U/Xtream playlists, real-time EPG guides, and customizable player controls.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition-colors">
                  <Github size={16} /> GitHub
                </a>
                <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition-colors">
                  <ExternalLink size={16} /> Website
                </a>
              </div>
            </div>
          </section>

          <p className="text-center text-gray-500 text-xs py-4">
            Version 1.2.0 • Crafted with ❤️ by Njobvu Labs
          </p>
        </div>
      </div>
    </div>
  );
}
