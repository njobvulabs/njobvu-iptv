import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';

interface ParentalPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetName?: string;
  correctPin: string;
}

export function ParentalPinModal({ isOpen, onClose, onSuccess, targetName, correctPin }: ParentalPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onSuccess();
          setPin('');
          onClose();
        } else {
          setError(true);
          setTimeout(() => setPin(''), 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-paper-dark border border-white/10 rounded-3xl p-6 w-full max-w-sm relative text-center shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-white/10"
        >
          <X size={20} />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary mx-auto flex items-center justify-center mb-4">
          <Lock size={32} />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">Parental Control Lock</h3>
        <p className="text-sm text-gray-400 mb-6">
          Enter 4-digit PIN to access {targetName ? `"${targetName}"` : 'restricted content'}
        </p>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(index => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                error
                  ? 'bg-red-500 animate-bounce'
                  : index < pin.length
                  ? 'bg-primary scale-110'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 flex items-center justify-center gap-1 font-medium">
            <AlertCircle size={16} /> Incorrect PIN. Try again.
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-primary/30 text-xl font-bold text-white transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xl font-bold text-white"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
