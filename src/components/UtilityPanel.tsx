import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { NavPage } from './Sidebar';

interface UtilityPanelProps {
  page: NavPage | null;
  onClose: () => void;
  theme: 'dark' | 'light' | 'gold';
  setTheme: (theme: 'dark' | 'light' | 'gold') => void;
  sidebarTransparent: boolean;
  setSidebarTransparent: (transparent: boolean) => void;
}

export const UtilityPanel: React.FC<UtilityPanelProps> = ({ page, onClose, theme, setTheme, sidebarTransparent, setSidebarTransparent }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!page) return null;

  const getTitle = () => {
    switch (page) {
      case 'theme':
        return 'Appearance';
      case 'settings':
        return 'Settings';
      case 'history':
        return 'History';
      case 'account':
        return 'Account';
      default:
        return page.charAt(0).toUpperCase() + page.slice(1);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm bg-[#080808]/95 backdrop-blur-2xl border border-zinc-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col p-6 animate-in zoom-in-95 duration-300 pointer-events-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-white">{getTitle()}</h2>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>
          
          {page === 'history' ? (
            <div className="py-8 text-center text-zinc-400 text-sm">
              No previous conversation history.
            </div>
          ) : page === 'theme' ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark', label: 'Dark' },
                    { id: 'light', label: 'Light' },
                    { id: 'gold', label: 'Gold' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={`p-2 rounded-2xl border-2 transition-all ${theme === t.id ? 'border-[var(--app-accent)]' : 'border-zinc-800'}`}
                    >
                      <div className={`h-16 w-full rounded-lg mb-2 border border-zinc-700 ${t.id === 'dark' ? 'bg-black' : t.id === 'light' ? 'bg-white' : 'bg-amber-950'}`} />
                      <p className="text-xs text-center text-zinc-300">{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-400 text-sm">
              {getTitle()} panel is empty.
            </div>
          )}
        </div>
      </div>
    </>
  );
};
