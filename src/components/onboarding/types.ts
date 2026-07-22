import type { FactKind } from '@/store';

/** Mutable control channel into the R3F Signal Field (read every frame, never via state). */
export interface SignalControl {
  /** 0..1 — field energy: charged-node fraction + connection opacity/density */
  energy: number;
  /** 0..1 — Model Reveal convergence toward entity clusters */
  converge: number;
  /** 0..1 — exit scatter (particles blown outward before route change) */
  scatter: number;
}

export interface IdentityState {
  name: string;
  ops: string[];
  countries: string[];
  fleet: string | null;
}

export interface ExtractedFact {
  id: string;
  file: string;
  label: string;
  confidence: number;
  kind: FactKind;
  factId?: string;
}

export interface DocFile {
  id: string;
  name: string;
  status: 'parsing' | 'streaming' | 'done';
  facts: ExtractedFact[];
}

export interface InterviewFact {
  id: string;
  qIndex: number;
  kind: FactKind;
  label: string;
  confidence: number;
  factId?: string;
}

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];
export const EASE_STANDARD = [0.22, 1, 0.36, 1] as [number, number, number, number];
export const SPRING_SNAPPY = { type: 'spring', stiffness: 380, damping: 30 } as const;
