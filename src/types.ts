export type AnimationState = 'idle' | 'thinking' | 'answered';

export interface CompanionMessage {
  id: string;
  text: string;
  sender: 'user' | 'companion';
  timestamp: Date;
}
