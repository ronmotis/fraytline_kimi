import { useRef } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SignalControl } from './types';

/**
 * Signal Field particle constellation (design.md §7, §6.2.8):
 * ~220 warm-neutral points, ~30 teal/ember charged nodes (grows with energy),
 * line segments under a 90px distance threshold, cursor repulsion (120px),
 * idle drift (≤12px amplitude, 20s period). Energy/converge/scatter are driven
 * by the wizard through a mutable control object.
 */

const COUNT = 220;
const MAX_CHARGED_EXTRA = 20; // +30 charged at full energy (30 base)
const CAM_Z = 60;
const FOV = 50;

const AMBIENT = new THREE.Color('#8d8474');
const TEAL = new THREE.Color('#2FD3BE');
const EMBER = new THREE.Color('#E8912D');

// entity-cluster targets (loose ring, normalized) — Model Reveal convergence
const CLUSTERS: [number, number][] = [
  [-0.56, 0.6],
  [0.56, 0.64],
  [-0.76, -0.1],
  [0.76, -0.04],
  [-0.6, -0.68],
];

/** Field data is generated once at module load (stable particle layout, render-pure). */
function buildFieldData() {
  {
    const norm = new Float32Array(COUNT * 3); // normalized base positions [-1,1]
    const disp = new Float32Array(COUNT * 3); // cursor-repulsion displacement (decays)
    const phase = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    const charge = new Float32Array(COUNT); // random threshold — charged when < chargedFrac
    const ember = new Uint8Array(COUNT); // 1 → ember charged node, else teal
    const cluster = new Uint8Array(COUNT);
    const jitter = new Float32Array(COUNT * 2);
    const scatterMul = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      norm[i * 3] = Math.random() * 2 - 1;
      norm[i * 3 + 1] = Math.random() * 2 - 1;
      norm[i * 3 + 2] = (Math.random() * 2 - 1) * 0.4;
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.7 + Math.random() * 0.6; // around the 20s drift period
      charge[i] = Math.random();
      ember[i] = Math.random() < 0.25 ? 1 : 0;
      cluster[i] = i % CLUSTERS.length;
      jitter[i * 2] = (Math.random() * 2 - 1) * 2.4;
      jitter[i * 2 + 1] = (Math.random() * 2 - 1) * 1.8;
      scatterMul[i] = 1.5 + Math.random() * 2.5;
    }

    // precompute connection pairs at reference extents (world 100 x 56), sorted by distance
    const REF_W = 100;
    const REF_H = 56;
    const pairs: { a: number; b: number; d: number }[] = [];
    for (let a = 0; a < COUNT; a++) {
      for (let b = a + 1; b < COUNT; b++) {
        const dx = (norm[a * 3] - norm[b * 3]) * (REF_W / 2) * 0.92;
        const dy = (norm[a * 3 + 1] - norm[b * 3 + 1]) * (REF_H / 2) * 0.92;
        const d = Math.hypot(dx, dy);
        if (d < 8.2) pairs.push({ a, b, d });
      }
    }
    pairs.sort((p, q) => p.d - q.d);
    if (pairs.length > 1100) pairs.length = 1100;
    const pairDist = new Float32Array(pairs.map((p) => p.d));

    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const linePositions = new Float32Array(pairs.length * 6);

    const pointGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    pointGeo.setAttribute('position', posAttr);
    pointGeo.setAttribute('color', colAttr);

    const lineGeo = new THREE.BufferGeometry();
    const lineAttr = new THREE.BufferAttribute(linePositions, 3);
    lineAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute('position', lineAttr);

    return {
      norm, disp, phase, speed, charge, ember, cluster, jitter, scatterMul,
      pairs, pairDist, positions, colors, linePositions, pointGeo, lineGeo,
    };
  }
}

const FIELD_DATA = buildFieldData();

function Field({ control }: { control: RefObject<SignalControl> }) {
  const data = FIELD_DATA;

  const pointsMat = useRef<THREE.PointsMaterial>(null);
  const linesMat = useRef<THREE.LineBasicMaterial>(null);
  const lastFrac = useRef(-1);

  useFrame((state) => {
    const ctrl = control.current ?? { energy: 0, converge: 0, scatter: 0 };
    const { energy, scatter } = ctrl;
    const c = Math.min(1, Math.max(0, ctrl.converge));
    const converge = c * c * (3 - 2 * c); // smoothstep

    const cam = state.camera as THREE.PerspectiveCamera;
    const h = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(cam.fov ?? FOV) / 2);
    const w = h * (state.size.width / state.size.height);
    const pxToWorld = h / state.size.height;
    const driftAmp = 12 * pxToWorld; // ≤12px idle drift
    const repelR = 120 * pxToWorld; // 120px cursor repulsion radius
    const t = state.clock.elapsedTime;
    // 20s base period, field accelerates with energy
    const omega = ((Math.PI * 2) / 20) * (1 + energy * 0.5);
    const mx = state.pointer.x * (w / 2);
    const my = state.pointer.y * (h / 2);
    const halfW = (w / 2) * 0.92;
    const halfH = (h / 2) * 0.92;

    const {
      norm, disp, phase, speed, cluster, jitter, scatterMul,
      positions, pairs, linePositions, pointGeo, lineGeo,
    } = data;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      // base world position
      let x = norm[i3] * halfW;
      let y = norm[i3 + 1] * halfH;
      const z = norm[i3 + 2] * 4;

      // converge toward entity cluster (Model Reveal)
      if (converge > 0) {
        const [cx, cy] = CLUSTERS[cluster[i]];
        const tx = cx * halfW * 0.82 + jitter[i * 2];
        const ty = cy * halfH * 0.82 + jitter[i * 2 + 1];
        x += (tx - x) * converge;
        y += (ty - y) * converge;
      }

      // idle drift (sine, ≤12px)
      const ph = phase[i];
      const sp = speed[i];
      x += Math.sin(t * omega * sp + ph) * driftAmp;
      y += Math.cos(t * omega * sp * 0.8 + ph * 1.3) * driftAmp;

      // cursor repulsion — displacement + lerp decay (never touch base position)
      const dx = x - mx;
      const dy = y - my;
      const d = Math.hypot(dx, dy);
      if (d < repelR && d > 0.001) {
        const f = (1 - d / repelR) * 0.9 * pxToWorld * 22;
        disp[i3] += (dx / d) * f;
        disp[i3 + 1] += (dy / d) * f;
      }
      disp[i3] *= 0.95;
      disp[i3 + 1] *= 0.95;
      x += disp[i3];
      y += disp[i3 + 1];

      // exit scatter — blow outward from center
      if (scatter > 0) {
        const bx = norm[i3] * halfW;
        const by = norm[i3 + 1] * halfH;
        const bd = Math.hypot(bx, by) || 1;
        x += (bx / bd) * scatter * scatterMul[i] * 14;
        y += (by / bd) * scatter * scatterMul[i] * 14;
      }

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
    }
    (pointGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

    // charged-node coloring: 30 base → ~50 at full energy (+30% during extraction)
    const frac = (30 + MAX_CHARGED_EXTRA * energy) / COUNT;
    if (Math.abs(frac - lastFrac.current) > 0.005) {
      lastFrac.current = frac;
      for (let i = 0; i < COUNT; i++) {
        const col = data.charge[i] < frac ? (data.ember[i] ? EMBER : TEAL) : AMBIENT;
        data.colors[i * 3] = col.r;
        data.colors[i * 3 + 1] = col.g;
        data.colors[i * 3 + 2] = col.b;
      }
      (pointGeo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }

    // connections — threshold 90px, +20% reach with energy; drawn via drawRange on sorted pairs
    const thresh = 90 * pxToWorld * (1 + energy * 0.2);
    // map current world threshold back to reference extents (100 x 56) used for pair precompute
    const refScale = (w / 100 + h / 56) / 2;
    const threshRef = thresh / refScale;
    // binary search on sorted base distances
    let lo = 0;
    let hi = pairs.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (data.pairDist[mid] <= threshRef) lo = mid + 1;
      else hi = mid;
    }
    const cutoff = lo;
    for (let p = 0; p < cutoff; p++) {
      const { a, b } = pairs[p];
      linePositions[p * 6] = positions[a * 3];
      linePositions[p * 6 + 1] = positions[a * 3 + 1];
      linePositions[p * 6 + 2] = positions[a * 3 + 2];
      linePositions[p * 6 + 3] = positions[b * 3];
      linePositions[p * 6 + 4] = positions[b * 3 + 1];
      linePositions[p * 6 + 5] = positions[b * 3 + 2];
    }
    lineGeo.setDrawRange(0, cutoff * 2);
    (lineGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

    if (pointsMat.current) pointsMat.current.opacity = 0.85 * (1 - scatter * 0.9);
    if (linesMat.current)
      linesMat.current.opacity = (0.16 + 0.08 * energy) * (1 - converge * 0.7) * (1 - scatter);
  });

  return (
    <>
      <points geometry={data.pointGeo} frustumCulled={false}>
        <pointsMaterial
          ref={pointsMat}
          size={2.6}
          sizeAttenuation={false}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments geometry={data.lineGeo} frustumCulled={false}>
        <lineBasicMaterial
          ref={linesMat}
          color="#A89F8E"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}

export default function SignalFieldCanvas({ control }: { control: RefObject<SignalControl> }) {
  return (
    <Canvas
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      camera={{ position: [0, 0, CAM_Z], fov: FOV }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
    >
      <Field control={control} />
    </Canvas>
  );
}
