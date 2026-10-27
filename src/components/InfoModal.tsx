import React from 'react';
import { X, Sparkles, Layers, Activity } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-black/90 border border-white/15 rounded-3xl p-8 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          title="Close guide"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-medium tracking-tight">Living Particle Environment</h2>
            <p className="text-xs text-white/50 font-mono">Phase 01.01 — Architecture & Atmosphere</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-white/70 leading-relaxed font-sans mb-8">
          <p>
            Welcome to the foundational spatial graphics engine of your AI companion. This environment replicates a high-density, procedural 3D particle terrain inspired by deep celestial ocean topographies.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
              <div className="font-mono text-white text-[11px] font-semibold">IDLE</div>
              <p className="text-[11px] text-white/50">Gentle ambient wave rhythms and calm shimmer.</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
              <div className="font-mono text-amber-300 text-[11px] font-semibold">THINKING</div>
              <p className="text-[11px] text-white/50">Dynamic frequency acceleration and warm gold accents.</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
              <div className="font-mono text-blue-300 text-[11px] font-semibold">ANSWERED</div>
              <p className="text-[11px] text-white/50">Smooth settling motion returning to ambient flow.</p>
            </div>
          </div>
          <p className="text-[11px] text-white/40 italic">
            Tip: Use the 'Dev States' toggle in the bottom control bar to manually test transition states, or submit a prompt to trigger the demonstration lifecycle.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-white text-black font-medium text-xs rounded-xl hover:bg-white/90 transition-colors shadow-lg"
        >
          Explore Environment
        </button>
      </div>
    </div>
  );
};
