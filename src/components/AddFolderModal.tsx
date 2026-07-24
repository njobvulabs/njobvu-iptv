import React, { useState } from 'react';
import { FolderPlus, X, Search, Check, Trash2 } from 'lucide-react';
import { Channel, CustomFolder } from '../types';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  customFolders: CustomFolder[];
  setCustomFolders: React.Dispatch<React.SetStateAction<CustomFolder[]>>;
  initialChannelId?: string;
}

export function AddFolderModal({
  isOpen,
  onClose,
  channels,
  customFolders,
  setCustomFolders,
  initialChannelId
}: AddFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(
    initialChannelId ? [initialChannelId] : []
  );
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  if (!isOpen) return null;

  const handleToggleChannel = (id: string) => {
    setSelectedChannelIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    const newFolder: CustomFolder = {
      id: `folder_${Date.now()}`,
      name: folderName.trim(),
      channelIds: selectedChannelIds,
      createdAt: Date.now()
    };

    setCustomFolders(prev => [newFolder, ...prev]);
    setFolderName('');
    setSelectedChannelIds([]);
    onClose();
  };

  const handleDeleteFolder = (id: string) => {
    setCustomFolders(prev => prev.filter(f => f.id !== id));
  };

  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.group.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-paper-dark border border-white/10 rounded-3xl p-6 w-full max-w-lg relative max-h-[85vh] flex flex-col shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-white/10"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
            <FolderPlus size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Custom Playlists & Folders</h3>
            <p className="text-sm text-gray-400">Organize your channels into custom lists</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl mb-4">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'create' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Folder
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'manage' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Manage Folders ({customFolders.length})
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleCreateFolder} className="flex-1 flex flex-col min-h-0 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Folder Name
              </label>
              <input
                type="text"
                placeholder="e.g., Weekend Sports, Late Night Movies"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Select Channels ({selectedChannelIds.length} chosen)
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Filter channels..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-60 rounded-xl border border-white/5 p-2 bg-white/2">
              {filteredChannels.slice(0, 100).map(c => {
                const isSelected = selectedChannelIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleToggleChannel(c.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isSelected ? 'bg-primary/20 border border-primary/40' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                        {c.logo ? (
                          <img src={c.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                            {c.name.substring(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">{c.group}</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                      isSelected ? 'bg-primary border-primary text-white' : 'border-white/20'
                    }`}>
                      {isSelected && <Check size={14} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={!folderName.trim()}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors shadow-lg"
            >
              Save Custom Folder
            </button>
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {customFolders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No custom folders created yet.</p>
              </div>
            ) : (
              customFolders.map(folder => (
                <div
                  key={folder.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-white text-base">{folder.name}</h4>
                    <p className="text-xs text-gray-400">{folder.channelIds.length} channels</p>
                  </div>
                  <button
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Delete folder"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
