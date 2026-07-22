import { Component, Suspense, lazy, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { SignalControl } from './types';

const SignalFieldCanvas = lazy(() => import('./SignalFieldCanvas'));

function canUseWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Static fallback per design.md §7: signal-field-fallback.png + radial gradient. */
function Fallback() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/signal-field-fallback.png')" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(47,211,190,0.05), transparent 70%)',
        }}
      />
    </div>
  );
}

class FieldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

/**
 * The Signal Field — memory made visible (design.md §2, §7).
 * Full-viewport R3F constellation at 15% opacity behind the Genesis wizard.
 * `control` is a mutable channel: { energy, converge, scatter } read every frame.
 */
export default function SignalField({ control }: { control: RefObject<SignalControl> }) {
  const [enabled] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches && canUseWebGL(),
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.15]" aria-hidden>
      {enabled ? (
        <FieldBoundary>
          <Suspense fallback={<Fallback />}>
            <SignalFieldCanvas control={control} />
          </Suspense>
        </FieldBoundary>
      ) : (
        <Fallback />
      )}
    </div>
  );
}
