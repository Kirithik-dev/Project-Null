import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimationState } from '../types';
import { generateParticleField } from '../utils/particleFieldGenerator';

interface ParticleEnvironmentProps {
  animationState: AnimationState;
}

export const ParticleEnvironment: React.FC<ParticleEnvironmentProps> = ({
  animationState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AnimationState>(animationState);
  stateRef.current = animationState;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;

    // Detect software WebGL
    const probeCanvas = document.createElement('canvas');
    const glProbe =
      probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    let isSoftwareGl = true;
    if (glProbe) {
      const ext = glProbe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : glProbe.RENDERER;
      const gpu = String(glProbe.getParameter(param));
      glProbe.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
        gpu
      );
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera framed to preserve upper black negative space and sweeping lower particle basin
    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      250
    );
    camera.position.set(0.0, 17.5, 41.0);
    camera.lookAt(-0.8, -3.2, 0.5);

    // Generate deterministic 3-layer organic particle field
    const field = generateParticleField();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(field.positions, 3)
    );
    geometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(field.colors, 3)
    );
    geometry.setAttribute('aSize', new THREE.BufferAttribute(field.sizes, 1));
    geometry.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(field.alphas, 1)
    );
    geometry.setAttribute(
      'aLayer',
      new THREE.BufferAttribute(field.layerIds, 1)
    );
    geometry.setAttribute(
      'aFlow',
      new THREE.BufferAttribute(field.flowParams, 4)
    );

    const vertexShader = `
      uniform float uTime;
      uniform float uInwardPhase;
      uniform float uWaveAmp;
      uniform float uConvergence;
      uniform float uHighlightBoost;
      uniform float uPixelRatio;

      attribute vec3 aColor;
      attribute float aSize;
      attribute float aAlpha;
      attribute float aLayer;
      attribute vec4 aFlow; // x: theta, y: radius, z: phase, w: waveWeight

      varying vec3 vColor;
      varying float vAlpha;
      varying float vLayer;

      void main() {
        vec3 pos = position;
        float theta = aFlow.x;
        float radius = aFlow.y;
        float phase = aFlow.z;
        float waveWeight = aFlow.w;

        float alphaMod = 1.0;
        float sizeMod = 1.0;

        if (aLayer < 0.5) {
          // LAYER 1: Distant stars — slow parallax drift and gentle shimmer
          pos.x += sin(uTime * 0.12 + phase) * 0.35;
          pos.y += cos(uTime * 0.10 + phase * 1.3) * 0.20;
          float twinkle = 0.78 + 0.22 * sin(uTime * 1.4 + phase * 5.0);
          alphaMod = twinkle;
        } else {
          // LAYERS 2, 3, 4: Sweeping landscape, wave highlights, and atmospheric wave mist
          // Continuous spiral/curved traveling wave along the terrain streamlines
          float spiralCoord = theta * 3.0 + radius * 0.38;
          float wavePrimary = sin(spiralCoord - uTime * 1.15 + phase * 0.25) * 0.68;
          float waveSecondary = cos(theta * 5.0 - radius * 0.55 + uTime * 0.85) * 0.36;
          float waveSlowBreathing = sin(radius * 0.18 - uTime * 0.55) * 0.48;

          float verticalDisp = (wavePrimary + waveSecondary + waveSlowBreathing) * uWaveAmp;

          // Subtle lateral orbital drift along the curved wave contour
          float tangentDrift = (0.35 + 0.65 * uConvergence) * sin(uTime * 0.7 + phase);
          vec2 basinCenter = vec2(-1.8, 1.5);
          vec2 toParticle = pos.xz - basinCenter;
          float dist = max(0.5, length(toParticle));
          vec2 radialDir = toParticle / dist;
          vec2 tangentDir = vec2(-radialDir.y, radialDir.x);

          // Continuous cyclical inward convergence toward the luminous central region
          float cycle = fract(phase / 6.2831853 + uInwardPhase * (0.18 + 0.22 * waveWeight));
          float inwardEnvelope = sin(cycle * 3.14159265);
          float inwardShift = cycle * (1.2 + 3.4 * uConvergence) * smoothstep(2.5, 22.0, dist);

          pos.xz -= radialDir * inwardShift * uConvergence;
          pos.xz += tangentDir * tangentDrift * 0.45;
          pos.y += verticalDisp * (0.65 + 0.35 * smoothstep(1.5, 14.0, dist));

          // Gentle shimmer and thinking-state highlight intensification
          float shimmer = 0.86 + 0.14 * sin(uTime * 2.1 + phase * 3.7);
          alphaMod = shimmer * mix(1.0, 0.75 + 0.45 * inwardEnvelope, uConvergence * 0.5);

          if (aLayer > 1.5 && aLayer < 2.5) {
            // Highlight & amber particles intensify smoothly during thinking
            float boost = 1.0 + uHighlightBoost * (0.38 + 0.25 * waveWeight);
            alphaMod *= boost;
            sizeMod = 1.0 + uHighlightBoost * 0.22 * (0.5 + 0.5 * sin(uTime * 3.0 + phase));
          } else if (aLayer > 2.5) {
            // Soft volumetric mist subtly brightens during thinking
            alphaMod *= (1.0 + uHighlightBoost * 0.32);
          }
        }

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float perspectiveSize = aSize * sizeMod * (185.0 / max(1.0, -mvPosition.z)) * uPixelRatio;
        if (aLayer > 2.5) {
          gl_PointSize = clamp(perspectiveSize, 8.0, 95.0);
        } else {
          gl_PointSize = clamp(perspectiveSize, 0.4, 6.0);
        }

        vColor = aColor * (1.0 + uHighlightBoost * 0.15 * waveWeight);
        vAlpha = clamp(aAlpha * alphaMod, 0.0, 1.0);
        vLayer = aLayer;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vLayer;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        // Sharpened falloff: steeper curve makes points look crisper
        float t = 1.0 - (dist * 2.0); 

        float falloff;
        if (vLayer > 2.5) {
          falloff = pow(t, 2.2);
        } else {
          // Sharper core, reduced halo for crisp individual points
          falloff = pow(t, 1.5) * 0.9;
        }

        gl_FragColor = vec4(vColor, vAlpha * falloff);
      }
    `;

    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uInwardPhase: { value: 0 },
        uWaveAmp: { value: 1.0 },
        uConvergence: { value: 0.14 },
        uHighlightBoost: { value: 0.0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pointsMesh = new THREE.Points(geometry, shaderMaterial);
    pointsMesh.frustumCulled = false;
    scene.add(pointsMesh);

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let frameId = 0;
    const clock = new THREE.Clock();

    let waveTimeAccum = 0;
    let inwardPhaseAccum = 0;
    let currentSpeed = 0.55;
    let currentInwardSpeed = 0.08;
    let currentWaveAmp = 0.95;
    let currentConvergence = 0.14;
    let currentHighlightBoost = 0.0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const tick = () => {
      if (isDisposed) return;

      if (!document.hidden) {
        const delta = Math.min(clock.getDelta(), 0.1);
        const state = stateRef.current;

        let targetSpeed = 0.55;
        let targetInwardSpeed = 0.08;
        let targetWaveAmp = 0.95;
        let targetConvergence = 0.14;
        let targetHighlightBoost = 0.0;

        if (state === 'thinking') {
          // THINKING: Faster waves, inward convergence toward central basin, heightened highlights & amber accents
          targetSpeed = 1.65;
          targetInwardSpeed = 0.42;
          targetWaveAmp = 1.72;
          targetConvergence = 0.92;
          targetHighlightBoost = 1.0;
        } else if (state === 'answered') {
          // ANSWERED: Smoothly settles back toward slow ambient motion
          targetSpeed = 0.72;
          targetInwardSpeed = 0.12;
          targetWaveAmp = 1.08;
          targetConvergence = 0.24;
          targetHighlightBoost = 0.18;
        }

        if (prefersReducedMotion) {
          targetSpeed = 0.08;
          targetInwardSpeed = 0.02;
          targetWaveAmp = 0.25;
          targetConvergence = 0.05;
          targetHighlightBoost = 0.0;
        }

        const dampLambda = 2.8;
        currentSpeed = THREE.MathUtils.damp(
          currentSpeed,
          targetSpeed,
          dampLambda,
          delta
        );
        currentInwardSpeed = THREE.MathUtils.damp(
          currentInwardSpeed,
          targetInwardSpeed,
          dampLambda,
          delta
        );
        currentWaveAmp = THREE.MathUtils.damp(
          currentWaveAmp,
          targetWaveAmp,
          dampLambda,
          delta
        );
        currentConvergence = THREE.MathUtils.damp(
          currentConvergence,
          targetConvergence,
          dampLambda,
          delta
        );
        currentHighlightBoost = THREE.MathUtils.damp(
          currentHighlightBoost,
          targetHighlightBoost,
          dampLambda,
          delta
        );

        waveTimeAccum += delta * currentSpeed;
        inwardPhaseAccum += delta * currentInwardSpeed;

        shaderMaterial.uniforms.uTime.value = waveTimeAccum;
        shaderMaterial.uniforms.uInwardPhase.value = inwardPhaseAccum;
        shaderMaterial.uniforms.uWaveAmp.value = currentWaveAmp;
        shaderMaterial.uniforms.uConvergence.value = currentConvergence;
        shaderMaterial.uniforms.uHighlightBoost.value = currentHighlightBoost;

        // Subtle, slow camera breathing for atmospheric depth
        camera.position.x = Math.sin(waveTimeAccum * 0.22) * 0.55;
        camera.position.y = 17.5 + Math.cos(waveTimeAccum * 0.18) * 0.35;
        camera.lookAt(-0.8, -3.2, 0.5);

        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container || isDisposed) return;
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      shaderMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      geometry.dispose();
      shaderMaterial.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-black select-none pointer-events-auto"
    />
  );
};
