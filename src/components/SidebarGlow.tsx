import React from 'react';

interface SidebarGlowProps {
  theme: 'dark' | 'light' | 'gold';
  isExpanded: boolean;
}

export const SidebarGlow: React.FC<SidebarGlowProps> = ({ theme, isExpanded }) => {
  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          core: '#8B0000',
          highlight: '#B51226',
        };
      case 'gold':
        return {
          core: '#C9A15B',
          highlight: '#F0D99A',
        };
      case 'dark':
      default:
        return {
          core: '#DADDE2',
          highlight: '#FFFFFF',
        };
    }
  };

  const { core, highlight } = getThemeColors();

  return (
    <div
      className={`fixed inset-y-0 left-0 right-0 pointer-events-none z-35 overflow-hidden transition-opacity duration-700 ease-in-out ${
        isExpanded ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* 
        Contained, subtle ambient glow originating along the right edge of the left navigation sidebar
        and fading smoothly into the workspace without washing out the entire screen.
      */}
      <div
        className="absolute inset-y-0 left-[72px] md:left-[80px] w-[340px] md:w-[440px]"
        style={{
          background: `
            radial-gradient(ellipse 55% 65% at 0% 50%, ${highlight}2a 0%, ${core}18 35%, transparent 75%),
            linear-gradient(90deg, ${highlight}22 0%, ${core}14 20%, ${core}06 45%, transparent 75%),
            radial-gradient(ellipse 45% 85% at 0% 50%, ${core}14 0%, ${core}05 40%, transparent 80%)
          `,
          filter: 'blur(14px)',
        }}
      />
    </div>
  );
};
