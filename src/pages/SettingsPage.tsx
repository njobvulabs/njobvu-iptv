import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Info, ExternalLink, Github } from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-bg-dark p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 rounded-full bg-paper-dark hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-black">Settings</h1>
        </header>

        <div className="space-y-6">
          {/* Data Management */}
          <section className="bg-paper-dark rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trash2 size={20} className="text-primary" />
              Data Management
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Clear History</p>
                  <p className="text-sm text-gray-400">Remove all recently watched channels</p>
                </div>
                <button 
                  onClick={clearHistory}
                  className="px-4 py-2 rounded-xl bg-error-dark/10 text-error-dark hover:bg-error-dark/20 transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Clear Favorites</p>
                  <p className="text-sm text-gray-400">Remove all channels from your favorites</p>
                </div>
                <button 
                  onClick={clearFavorites}
                  className="px-4 py-2 rounded-xl bg-error-dark/10 text-error-dark hover:bg-error-dark/20 transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="bg-paper-dark rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Info size={20} className="text-primary" />
              About Njobvu IPTV
            </h2>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm leading-relaxed">
                Njobvu IPTV is a modern, high-performance streaming client designed for the best viewing experience. 
                We aggregate publicly available M3U playlists to provide a seamless interface for your favorite content.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">
                  <Github size={16} /> GitHub
                </a>
                <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">
                  <ExternalLink size={16} /> Website
                </a>
              </div>
            </div>
          </section>

          <p className="text-center text-gray-500 text-xs py-4">
            Version 1.0.0 • Made with ❤️ by Njobvu Labs
          </p>
        </div>
      </div>
    </div>
  );
}