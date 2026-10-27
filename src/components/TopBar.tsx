import React from 'react';
import { Sliders, HelpCircle } from 'lucide-react';

interface TopBarProps {
  onOpenInfo: () => void;
  onToggleDevControls: () => void;
  showDevControls: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenInfo, onToggleDevControls, showDevControls }) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-8 px-8 py-5 pointer-events-auto bg-gradient-to-b from-black/80 via-black/30 to-transparent">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
        <span className="text-xs font-medium tracking-[0.25em] text-white/80 uppercase">
          Aether
        </span>
      </div>

      {/* Zone 2: Empty center for clean viewport */}
      <div className="hidden md:flex items-center" />

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDevControls}
          className={`p-2 rounded-full transition-colors border ${
            showDevControls
              ? 'bg-white/20 text-white border-white/30'
              : 'bg-white/5 text-white/60 hover:text-white border-white/10'
          }`}
          title="Developer State Controls"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onOpenInfo}
          className="p-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
          title="Guide"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
