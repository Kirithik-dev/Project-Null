import React from 'react';
import { Plus, Home, Mic, Layout, Bot, MessageSquare, Settings, User, Palette, Bookmark, Clock } from 'lucide-react';

export type NavPage = 'home' | 'voice' | 'projects' | 'agents' | 'history' | 'settings' | 'account' | 'theme' | 'saved' | 'recent';
export type NavAction = 'new-chat';

export const Sidebar = ({ activePage, theme, onPageChange, onAction }: {
  activePage: NavPage;
  theme: 'dark' | 'light' | 'gold';
  onPageChange: (page: NavPage) => void;
  onAction?: (action: NavAction) => void;
}) => {
  const renderItem = (item: { id: NavPage; icon: React.ElementType; label: string }) => (
    <button
      key={item.id}
      onClick={() => onPageChange(item.id)}
      className={`p-2.5 rounded-xl transition-all duration-300 ${activePage === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
      title={item.label}
      aria-label={item.label}
    >
      <item.icon size={20} strokeWidth={2} />
    </button>
  );

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'voice', icon: Mic, label: 'Voice' },
    { id: 'projects', icon: Layout, label: 'Projects' },
    { id: 'agents', icon: Bot, label: 'Agents' },
    { id: 'history', icon: MessageSquare, label: 'History' },
    { id: 'saved', icon: Bookmark, label: 'Saved' },
    { id: 'recent', icon: Clock, label: 'Recent' },
  ] as const;

  const settingsItems = [
    { id: 'theme', icon: Palette, label: 'Theme' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'account', icon: User, label: 'Account' },
  ] as const;

  const getThemeHighlight = () => {
    switch (theme) {
      case 'light':
        return '#8B0000';
      case 'gold':
        return '#C9A15B';
      case 'dark':
      default:
        return '#DADDE2';
    }
  };

  const highlightColor = getThemeHighlight();

  return (
    <div className="fixed left-4 md:left-6 top-1/2 -translate-y-1/2 z-50 w-fit pointer-events-auto select-none">
      <nav
        className="w-fit p-2 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col gap-2 transition-shadow duration-500"
        style={{
          boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.5), 1.5px 0 3px 0 ${highlightColor}88, 3px 0 10px -1px ${highlightColor}44`,
        }}
      >
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onAction?.('new-chat')}
            className="p-2.5 rounded-xl transition-all duration-300 text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            title="New Chat"
            aria-label="New Chat"
          >
            <Plus size={20} strokeWidth={2} />
          </button>
          {navItems.map(renderItem)}
        </div>
        <div className="h-px bg-zinc-800 w-full" />
        <div className="flex flex-col gap-1">
          {settingsItems.map(renderItem)}
        </div>
      </nav>
    </div>
  );
};
