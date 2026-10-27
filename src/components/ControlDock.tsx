import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Plus,
  AtSign,
  X,
  FileText,
} from 'lucide-react';
import { AnimationState } from '../types';

interface ControlDockProps {
  animationState: AnimationState;
  onStateChange: (state: AnimationState) => void;
  onSubmitMessage: (text: string) => void;
  isThinkingDemo: boolean;
  showDevControls: boolean;
}


export const ControlDock: React.FC<ControlDockProps> = ({
  animationState,
  onStateChange,
  onSubmitMessage,
  isThinkingDemo,
  showDevControls,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  // Close mention dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setIsMentionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputVal]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isThinkingDemo) return;

    let fullMessage = trimmed;
    if (attachments.length > 0) {
      const names = attachments.map((f) => f.name).join(', ');
      fullMessage = `[Attached: ${names}] ${trimmed}`;
    }

    onSubmitMessage(fullMessage);
    setInputVal('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };


  const hasContent = Boolean(inputVal.trim() || attachments.length > 0);

  return (
    <div className="fixed top-6 left-14 sm:left-20 md:left-24 right-4 sm:right-6 md:right-8 flex flex-col items-center z-30 pointer-events-none">
      {/* Hidden-by-default developer state switcher */}
      {showDevControls && (
        <div className="pointer-events-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-black/85 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/45 pr-1">
            State
          </span>
          {(['idle', 'thinking', 'answered'] as AnimationState[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onStateChange(st)}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                animationState === st
                  ? 'bg-white text-black font-medium'
                  : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box - Compact, refined dimensions */}
      <div className="pointer-events-auto relative w-full max-w-[560px] group">
        {/* Soft specular / concentrated white light reflection catch underneath the composer */}
        <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-28 sm:w-36 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent blur-[0.5px] pointer-events-none z-10" />
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-36 sm:w-44 h-2.5 bg-white/20 blur-md rounded-full pointer-events-none" />

        {/* Charcoal Glass Container */}
        <div className="relative w-full rounded-[18px] bg-gradient-to-b from-[#18191e]/95 via-[#131417]/92 to-[#0e0f12]/96 backdrop-blur-2xl border border-white/[0.08] border-l-white/[0.18] shadow-[0_16px_40px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.06)_inset] transition-all overflow-visible">
          {/* Internal soft warm ambient reflection across center-right */}
          <div className="absolute inset-0 rounded-[18px] pointer-events-none overflow-hidden">
            <div className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[220px] h-[55px] bg-gradient-to-r from-amber-500/[0.035] via-orange-300/[0.04] to-transparent blur-2xl" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col">
            {/* Attachment Chips (if any) */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3.5 pt-2.5">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 text-xs text-zinc-200"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="max-w-[130px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-zinc-400 hover:text-white ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* UPPER ROW: Input area */}
            <div className="w-full px-3.5 pt-2.5 pb-0.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                aria-label="Ask anything"
                className="w-full bg-transparent text-[14px] sm:text-[15px] text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none font-sans leading-snug selection:bg-white/20"
                style={{ minHeight: '30px' }}
              />
            </div>

            {/* LOWER ROW: Left controls and Send button */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5">
              {/* Left Controls: (+) Attachment and (@) Mention */}
              <div className="flex items-center gap-1">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* (+) Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Add attachment"
                  aria-label="Add attachment"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* (@) Mention Button with Downward Popover */}
                <div className="relative" ref={mentionRef}>
                  <button
                    type="button"
                    onClick={() => setIsMentionOpen(!isMentionOpen)}
                    title="Mention context"
                    aria-label="Mention context"
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isMentionOpen
                        ? 'text-white bg-white/15'
                        : 'text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95'
                    }`}
                  >
                    <AtSign className="w-3.5 h-3.5" />
                  </button>

                  {/* Mention Picker Popover - Single '+ Add features' option */}
                  {isMentionOpen && (
                    <div className="absolute top-full left-0 mt-2 w-44 rounded-xl bg-[#17181c] border border-white/10 shadow-2xl backdrop-blur-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => setIsMentionOpen(false)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-xs font-medium text-white transition-colors cursor-pointer group"
                      >
                        <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
                        <span>Add features</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Circular White Send Button */}
              <div className="flex items-center">
                <button
                  type="submit"
                  disabled={!hasContent || isThinkingDemo}
                  aria-label="Send message"
                  className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    hasContent && !isThinkingDemo
                      ? 'bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-[0_2px_10px_rgba(255,255,255,0.3)] cursor-pointer'
                      : isThinkingDemo
                      ? 'bg-white/40 text-black cursor-wait animate-pulse'
                      : 'bg-white/15 text-white/35 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
