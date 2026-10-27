import React, { useEffect, useRef, useState } from 'react';
import { Sliders } from 'lucide-react';
import { ParticleSphere } from './components/ParticleSphere';
import { ControlDock } from './components/ControlDock';
import { Sidebar, NavPage, NavAction } from './components/Sidebar';
import { SidebarGlow } from './components/SidebarGlow';
import { UtilityPanel } from './components/UtilityPanel';
import { AnimationState } from './types';

export default function App() {
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [isThinkingDemo, setIsThinkingDemo] = useState(false);
  const [showDevControls, setShowDevControls] = useState(false);
  const [activePage, setActivePage] = useState<NavPage>('home');
  const [utilityPage, setUtilityPage] = useState<NavPage | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light' | 'gold'>(() => (localStorage.getItem('theme') as 'dark' | 'light' | 'gold') || 'dark');
  const [sidebarTransparent, setSidebarTransparent] = useState<boolean>(() => localStorage.getItem('sidebarTransparent') === 'true');
  const [sessionKey, setSessionKey] = useState(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('sidebarTransparent', sidebarTransparent.toString());
  }, [theme, sidebarTransparent]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handleManualStateChange = (newState: AnimationState) => {
    clearTimers();
    setIsThinkingDemo(false);
    setAnimationState(newState);
  };

  const handleSubmitMessage = (_text: string) => {
    if (isThinkingDemo) return;
    clearTimers();

    setIsThinkingDemo(true);
    setAnimationState('thinking');

    const t1 = window.setTimeout(() => {
      setAnimationState('answered');
      const t2 = window.setTimeout(() => {
        setAnimationState('idle');
        setIsThinkingDemo(false);
      }, 2400);
      timersRef.current.push(t2);
    }, 3000);

    timersRef.current.push(t1);
  };

  const handlePageChange = (page: NavPage) => {
    if (page !== 'home' && page !== 'voice') {
      setUtilityPage(utilityPage === page ? null : page);
    } else {
      setActivePage(page);
      setUtilityPage(null);
    }
  };

  const handleAction = (action: NavAction) => {
    if (action === 'new-chat') {
      clearTimers();
      setIsThinkingDemo(false);
      setAnimationState('idle');
      setActivePage('home');
      setUtilityPage(null);
      setSessionKey((prev) => prev + 1);
    }
  };

  const isPanelOpen = (utilityPage !== null && utilityPage !== 'home' && utilityPage !== 'voice') || (activePage !== 'home' && activePage !== 'voice');

  return (
    <div className={`w-full h-full ${theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'gold'}`}>
      <main className="relative w-screen h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)] font-sans selection:bg-[var(--app-accent)]/20 selection:text-[var(--app-text)]">
      {/* Sidebar Ambient Glow (Panel-open state) */}
      <SidebarGlow theme={theme} isExpanded={isPanelOpen} />

      {/* Sidebar Navigation */}
      <Sidebar 
        activePage={utilityPage || activePage} 
        theme={theme}
        onPageChange={handlePageChange} 
        onAction={handleAction}
      />

      {/* Utility Overlays */}
      <UtilityPanel 
        page={utilityPage} 
        onClose={() => setUtilityPage(null)} 
        theme={theme} 
        setTheme={setTheme} 
        sidebarTransparent={sidebarTransparent}
        setSidebarTransparent={setSidebarTransparent}
      />

      {/* Primary Screens */}
      <div className="absolute inset-0 z-0">
        {activePage === 'home' && <ParticleSphere theme={theme} />}
        {activePage === 'voice' && (
          <div className="flex items-center justify-center w-full h-full text-white/10 font-mono text-sm tracking-widest uppercase">
            Voice Mode
          </div>
        )}
      </div>

      {/* Control Dock & Bottom Input (Only on Home) */}
      {activePage === 'home' && (
        <ControlDock
          key={sessionKey}
          animationState={animationState}
          onStateChange={handleManualStateChange}
          onSubmitMessage={handleSubmitMessage}
          isThinkingDemo={isThinkingDemo}
          showDevControls={showDevControls}
        />
      )}
      </main>
    </div>
  );
}
