import React from 'react';
import { Download, X, Share, PlusSquare, Tv, CheckCircle2, Smartphone, Monitor } from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export function InstallPwaModal({ isOpen, onClose, deferredPrompt, onInstallSuccess }: InstallPwaModalProps) {
  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstallSuccess();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-paper-dark border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
            <Tv size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Install Njobvu IPTV</h3>
            <p className="text-xs text-gray-400">Stream live TV directly from your home screen</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center text-green-400 font-medium text-sm flex items-center justify-center gap-2">
            <CheckCircle2 size={20} /> App is already installed and running in standalone mode!
          </div>
        ) : deferredPrompt ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Enjoy fullscreen streaming, faster channel loading, and home screen quick launch.
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              <Download size={18} /> Install App Now
            </button>
          </div>
        ) : isIOS ? (
          <div className="space-y-4 text-sm text-gray-300">
            <p className="font-bold text-white flex items-center gap-2">
              <Smartphone size={18} className="text-primary" /> Install on iPhone or iPad:
            </p>
            <ol className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">1</span>
                <span>Tap the <Share size={14} className="inline text-primary mx-1" /> <strong>Share</strong> button in Safari's toolbar.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">2</span>
                <span>Scroll down and select <PlusSquare size={14} className="inline text-primary mx-1" /> <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">3</span>
                <span>Tap <strong>Add</strong> in the top right corner.</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-gray-300">
            <p className="font-bold text-white flex items-center gap-2">
              <Monitor size={18} className="text-primary" /> Install on Browser / Android / PC:
            </p>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-xs space-y-2">
              <p>Look for the <strong>Install</strong> icon (<Download size={14} className="inline text-primary mx-1" />) in your browser address bar or menu.</p>
              <p className="text-gray-400">If using Chrome or Edge, click the 3-dots menu <strong className="text-white">⋮</strong> and select <strong>Install Njobvu IPTV</strong>.</p>
            </div>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="w-full py-3 rounded-2xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              Open App in New Window / Tab
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
