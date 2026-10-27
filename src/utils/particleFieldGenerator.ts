export interface GeneratedParticleField {
  count: number;
  positions: Float32Array;      // Base (x, y, z)
  colors: Float32Array;         // RGB (r, g, b)
  sizes: Float32Array;          // Base point size
  alphas: Float32Array;         // Base opacity
  layerIds: Float32Array;       // 0 = distant stars, 1 = main terrain, 2 = wave highlights & amber, 3 = soft volumetric mist
  flowParams: Float32Array;     // (angle, radius, phase, highlightWeight) for continuous wave & inward convergence
}

// Deterministic pseudo-random generator (Mulberry32)
function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 2D value noise for organic terrain undulations
function hash2(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);

  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm2D(x: number, y: number): number {
  let value = 0.0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 4; i++) {
    value += amp * (noise2D(x * freq, y * freq) * 2.0 - 1.0);
    freq *= 2.05;
    amp *= 0.5;
  }
  return value;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Evaluates the sweeping 3D curved landscape height and luminous wave weight at world (x, z).
 * - Strong sweeping wave enters from the left (x < 0) and curves around the central depression.
 * - Asymmetrical central basin centered near (-2.0, 1.5).
 * - Multi-layered diagonal ridges in the lower foreground.
 */
function evaluateLandscape(x: number, z: number) {
  // Center of the asymmetrical basin
  const bx = -1.8;
  const bz = 1.5;
  const dx = x - bx;
  const dz = z - bz;

  // Elliptical skewed coordinates for sweeping flow
  const rx = dx * 0.82 + dz * 0.28;
  const rz = -dx * 0.22 + dz * 1.12;
  const r = Math.sqrt(rx * rx + rz * rz);
  const theta = Math.atan2(rz, rx); // [-PI, PI], where PI / -PI is Left, -PI/2 is Back, +PI/2 is Front

  // Spiral-sweep coordinate: waves enter from the left/upper-left and curve counter-clockwise into the center
  const spiralPhase = theta + r * 0.14;

  // Primary sweeping wave entering from the left side (x < 0) curving into the lower-center rim
  // Left-to-center angular envelope: strongest around theta in [1.4, 4.4] (left through front-bottom to center-right)
  const normAngle = Math.atan2(Math.sin(theta - 2.65), Math.cos(theta - 2.65));
  const leftSweepArc = Math.exp(-(normAngle * normAngle) / 1.45);

  // Radial profile of the luminous wave crest: peaks around r = 6..18 on the left sweep
  const waveRadiusCenter = 7.5 + leftSweepArc * 5.5;
  const distFromWaveCrest = (r - waveRadiusCenter) / (4.5 + leftSweepArc * 4.0);
  const luminousWaveWeight =
    Math.exp(-(distFromWaveCrest * distFromWaveCrest) * 1.35) * (0.35 + 0.65 * leftSweepArc);

  // Deep central funnel/basin depression
  const centralHole = -11.5 * Math.exp(-(r * r) / 28.0);

  // Sweeping left wall elevation (rises gracefully on the left and curves down toward the center)
  const leftWallRise =
    leftSweepArc * smoothstep(3.0, 22.0, r) * smoothstep(38.0, 12.0, r) * 7.8;

  // Right/foreground sweeping slope
  const rightSlope =
    (1.0 - leftSweepArc * 0.6) * smoothstep(4.0, 26.0, r) * 3.2 -
    smoothstep(2.0, 28.0, z) * 4.8;

  // Organic multi-scale ridges following the curved streamlines
  const streamWave1 = Math.sin(spiralPhase * 5.0 - r * 0.45) * 0.85;
  const streamWave2 = Math.cos(spiralPhase * 9.0 + r * 0.75) * 0.42;
  const noiseUndulation = fbm2D(x * 0.09 + 3.1, z * 0.09 - 1.7) * 2.1;
  const fineDetail = fbm2D(x * 0.26 - 5.4, z * 0.26 + 2.3) * 0.65;

  const y =
    -3.2 +
    centralHole +
    leftWallRise +
    rightSlope +
    streamWave1 +
    streamWave2 +
    noiseUndulation +
    fineDetail;

  // Ridge crest factor (higher on wave crests, lower in troughs to create dark valleys between particle streams)
  const crestFactor = smoothstep(-0.85, 0.9, Math.sin(spiralPhase * 6.0 - r * 0.52 + noiseUndulation));

  return {
    y,
    r,
    theta,
    spiralPhase,
    luminousWaveWeight,
    leftSweepArc,
    crestFactor,
  };
}

export function generateParticleField(): GeneratedParticleField {
  const rng = createRng(133742);

  // Reduced, curated particle counts across 3 visual layers + subtle volumetric wave mist
  const starCount = 950;          // Layer 1: Distant stars in dark upper negative space
  const terrainCount = 13200;     // Layer 2: Main sweeping silver-white particle terrain
  const highlightCount = 3400;    // Layer 3: Luminous wave highlights & sparse amber-orange accents
  const mistCount = 260;          // Subtle volumetric glow sprites along the luminous wave

  const totalCount = starCount + terrainCount + highlightCount + mistCount;

  const positions = new Float32Array(totalCount * 3);
  const colors = new Float32Array(totalCount * 3);
  const sizes = new Float32Array(totalCount);
  const alphas = new Float32Array(totalCount);
  const layerIds = new Float32Array(totalCount);
  const flowParams = new Float32Array(totalCount * 4);

  let idx = 0;

  // =========================================================================
  // LAYER 1: DISTANT STARS (Sparse, tiny, faint points in upper dark region)
  // =========================================================================
  for (let i = 0; i < starCount; i++) {
    // Spread across wide sky & background, biased toward the upper dark negative space
    const u = rng();
    const v = rng();
    const x = (u - 0.5) * 95.0;
    const z = -12.0 - rng() * 42.0;
    // Mostly in upper region y in [-4, 28]
    const y = -4.0 + Math.pow(v, 0.85) * 32.0;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Mostly cool silver-white stars, with very rare subtle warm tint
    const isWarmStar = rng() < 0.08;
    if (isWarmStar) {
      colors[idx * 3] = 0.95;
      colors[idx * 3 + 1] = 0.78;
      colors[idx * 3 + 2] = 0.58;
    } else {
      const tint = rng() * 0.15;
      colors[idx * 3] = 0.72 + tint;
      colors[idx * 3 + 1] = 0.78 + tint;
      colors[idx * 3 + 2] = 0.92;
    }

    sizes[idx] = 0.65 + Math.pow(rng(), 2.2) * 1.15;
    alphas[idx] = 0.08 + Math.pow(rng(), 1.8) * 0.34;
    layerIds[idx] = 0;

    flowParams[idx * 4] = rng() * Math.PI * 2;
    flowParams[idx * 4 + 1] = 20.0 + rng() * 30.0;
    flowParams[idx * 4 + 2] = rng() * Math.PI * 2;
    flowParams[idx * 4 + 3] = 0.0;

    idx++;
  }

  // =========================================================================
  // LAYER 2: MAIN LANDSCAPE (Refined silver-white particles along curved streams)
  // =========================================================================
  let generatedTerrain = 0;
  while (generatedTerrain < terrainCount) {
    // Sample in polar/streamline space around the basin so particles naturally follow the curved flow
    // Mix of broad terrain coverage and denser streamline bands
    const bandChoice = rng();
    let r: number;
    let theta: number;

    if (bandChoice < 0.55) {
      // Sweeping left-to-center & foreground stream bands
      // Bias theta toward the left-entry and foreground sweep
      const rawAngle = (rng() - 0.5) * Math.PI * 2.0;
      theta = 2.55 + rawAngle * 0.88;
      // Bias radius toward the active wave and mid-terrain (r from 2.2 to 32)
      r = 2.1 + Math.pow(rng(), 1.15) * 30.0;
    } else {
      // Full 360-degree undulating basin & outer terrain
      theta = (rng() - 0.5) * Math.PI * 2.0;
      r = 2.0 + Math.pow(rng(), 0.95) * 34.0;
    }

    // Add organic streamline curl warp so particles align with flowing filaments
    const streamRibbon = Math.floor(rng() * 28);
    const ribbonOffset = Math.sin(streamRibbon * 1.7 + r * 0.32) * 0.35;
    const warpedTheta = theta + ribbonOffset * 0.18 - r * 0.06;

    // Convert elliptical basin coordinates back to world (x, z)
    const bx = -1.8;
    const bz = 1.5;
    const ex = Math.cos(warpedTheta) * r * 1.18;
    const ez = Math.sin(warpedTheta) * r * 0.88;
    const x = bx + ex * 0.92 - ez * 0.24 + (rng() - 0.5) * 0.8;
    const z = bz + ex * 0.22 + ez * 0.96 + (rng() - 0.5) * 0.8;

    const info = evaluateLandscape(x, z);

    // Reject particles in the upper-back zone so the upper half remains clean black negative space
    if (z < -11.0 && x > -8.0 && rng() < 0.78) {
      continue;
    }

    // Preferentially keep particles on wave crests & filaments (creates dark valleys between ridges)
    const keepProbability = 0.22 + 0.78 * Math.pow(info.crestFactor, 1.35) + info.luminousWaveWeight * 0.4;
    if (rng() > keepProbability) {
      continue;
    }

    // Multi-layer vertical depth stratification (3 organic depth sub-layers)
    const depthLayer = rng();
    let verticalSpread = (rng() - 0.5) * 0.65;
    if (depthLayer < 0.25) {
      // Deep under-layer
      verticalSpread -= 0.7 + rng() * 0.8;
    } else if (depthLayer > 0.82) {
      // Fine surface spray along the wave
      verticalSpread += (0.35 + rng() * 0.9) * (0.3 + info.luminousWaveWeight);
    }

    const y = info.y + verticalSpread;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Outer edge distance fade
    const edgeFade =
      smoothstep(36.0, 12.0, info.r) *
      smoothstep(-16.0, -3.0, z) *
      smoothstep(28.0, 10.0, z);

    const waveBright = info.luminousWaveWeight;
    const crestBright = info.crestFactor;

    // Refined silver-white palette with subtle cool depth in shadows
    const brightness = Math.min(1.0, 0.28 + crestBright * 0.42 + waveBright * 0.48);
    colors[idx * 3] = 0.68 + brightness * 0.30;
    colors[idx * 3 + 1] = 0.74 + brightness * 0.24;
    colors[idx * 3 + 2] = 0.84 + brightness * 0.16;

    sizes[idx] = (0.85 + Math.pow(rng(), 2.0) * 1.25) * (0.85 + waveBright * 0.35);
    alphas[idx] = Math.max(
      0.04,
      (0.14 + crestBright * 0.36 + waveBright * 0.38) * Math.max(0.12, edgeFade)
    );
    layerIds[idx] = 1;

    flowParams[idx * 4] = info.theta;
    flowParams[idx * 4 + 1] = info.r;
    flowParams[idx * 4 + 2] = rng() * Math.PI * 2;
    flowParams[idx * 4 + 3] = waveBright;

    idx++;
    generatedTerrain++;
  }

  // =========================================================================
  // LAYER 3: HIGHLIGHT & AMBER ACCENT PARTICLES (Sweeping left wave & central core)
  // =========================================================================
  let generatedHighlights = 0;
  while (generatedHighlights < highlightCount) {
    // Concentrate highlights along the sweeping left-to-center wave and central basin rim
    const isAmber = rng() < 0.24; // ~24% sparse amber-orange accents, ~76% luminous silver-white wave highlights

    // Sample angle focused along the left-entering sweeping wave [1.1 .. 4.7] radians
    const angleSpread = isAmber ? 2.6 : 2.1;
    const centerAngle = isAmber ? 2.75 : 2.6;
    const theta = centerAngle + (rng() + rng() - 1.0) * angleSpread;

    // Radius concentrated along the inner rim and sweeping left wave wall
    const baseRadius = 3.2 + Math.pow(rng(), 1.3) * 18.5;
    const r = baseRadius + Math.sin(theta * 3.0) * 1.4;

    const bx = -1.8;
    const bz = 1.5;
    const ex = Math.cos(theta) * r * 1.15;
    const ez = Math.sin(theta) * r * 0.86;
    const x = bx + ex * 0.92 - ez * 0.24 + (rng() - 0.5) * 1.1;
    const z = bz + ex * 0.22 + ez * 0.96 + (rng() - 0.5) * 1.1;

    const info = evaluateLandscape(x, z);

    // Elevate slightly along the wave crest and inner vortex plume
    const loft =
      (Math.pow(rng(), 1.4) * 2.2 - 0.3) * (0.4 + info.luminousWaveWeight * 0.9);
    const y = info.y + loft;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    const edgeFade = smoothstep(28.0, 8.0, info.r);

    if (isAmber) {
      // Sparse champagne-amber and warm orange accents
      const warmTone = rng();
      colors[idx * 3] = 1.0;
      colors[idx * 3 + 1] = 0.62 + warmTone * 0.24; // 0.62 (amber-orange) to 0.86 (champagne gold)
      colors[idx * 3 + 2] = 0.28 + warmTone * 0.26;

      sizes[idx] = 1.25 + Math.pow(rng(), 1.8) * 1.75;
      alphas[idx] = (0.38 + info.luminousWaveWeight * 0.52) * Math.max(0.2, edgeFade);
    } else {
      // Radiant silver-white wave highlights
      colors[idx * 3] = 0.94 + rng() * 0.06;
      colors[idx * 3 + 1] = 0.96 + rng() * 0.04;
      colors[idx * 3 + 2] = 1.0;

      sizes[idx] = 1.35 + Math.pow(rng(), 1.9) * 1.95;
      alphas[idx] = (0.35 + info.luminousWaveWeight * 0.58) * Math.max(0.2, edgeFade);
    }

    layerIds[idx] = 2;

    flowParams[idx * 4] = info.theta;
    flowParams[idx * 4 + 1] = info.r;
    flowParams[idx * 4 + 2] = rng() * Math.PI * 2;
    flowParams[idx * 4 + 3] = isAmber ? 1.0 : 0.75;

    idx++;
    generatedHighlights++;
  }

  // =========================================================================
  // LAYER 4: RESTRAINED ATMOSPHERIC WAVE BLOOM (Soft low-alpha glow along wave)
  // =========================================================================
  for (let i = 0; i < mistCount; i++) {
    const t = i / mistCount;
    const theta = 1.35 + t * 3.1 + (rng() - 0.5) * 0.4;
    const r = 3.5 + Math.pow(rng(), 1.1) * 14.5;

    const bx = -1.8;
    const bz = 1.5;
    const ex = Math.cos(theta) * r * 1.15;
    const ez = Math.sin(theta) * r * 0.86;
    const x = bx + ex * 0.92 - ez * 0.24;
    const z = bz + ex * 0.22 + ez * 0.96;

    const info = evaluateLandscape(x, z);
    const y = info.y + (rng() - 0.4) * 1.2;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Delicate silver-blue-white with slight warm core tint
    const isWarmMist = rng() < 0.18;
    colors[idx * 3] = isWarmMist ? 0.95 : 0.82;
    colors[idx * 3 + 1] = isWarmMist ? 0.82 : 0.88;
    colors[idx * 3 + 2] = isWarmMist ? 0.68 : 0.98;

    sizes[idx] = 18.0 + rng() * 16.0;
    alphas[idx] = 0.014 + info.luminousWaveWeight * 0.022;
    layerIds[idx] = 3;

    flowParams[idx * 4] = info.theta;
    flowParams[idx * 4 + 1] = info.r;
    flowParams[idx * 4 + 2] = rng() * Math.PI * 2;
    flowParams[idx * 4 + 3] = info.luminousWaveWeight;

    idx++;
  }

  return {
    count: totalCount,
    positions,
    colors,
    sizes,
    alphas,
    layerIds,
    flowParams,
  };
}
