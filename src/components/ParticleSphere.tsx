import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Particle configuration
const PARTICLE_COUNT = 8000;
const SPHERE_RADIUS = 80;

interface ParticleSphereProps {
  theme: 'dark' | 'light' | 'gold';
}

export const ParticleSphere: React.FC<ParticleSphereProps> = ({ theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<THREE.Points | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      1,
      1000
    );
    camera.position.z = 400;

    // Particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = SPHERE_RADIUS * (1 + 0.1 * (Math.random() - 0.5));
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const sphere = new THREE.Points(geometry, material);
    sphereRef.current = sphere;
    scene.add(sphere);

    // Animation
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      sphere.rotation.x += 0.0007;
      sphere.rotation.y += 0.00175;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sphereRef.current || !sceneRef.current) return;
    
    // Update colors
    const colors = sphereRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
    let color1: THREE.Color, color2: THREE.Color;
    
    if (theme === 'light') {
        color1 = new THREE.Color(0x8B0015); // Rich blood crimson
        color2 = new THREE.Color(0xB5122B); // Crimson accents
        sceneRef.current.background = new THREE.Color(0xffffff); // White
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const col = Math.random() > 0.5 ? color1 : color2;
            colors.setXYZ(i, col.r, col.g, col.b);
        }
    } else if (theme === 'gold') {
        color1 = new THREE.Color(0xB9A06A); // Champagne gold
        color2 = new THREE.Color(0x5E4B43); // Antique bronze-brown
        const color3 = new THREE.Color(0xE5D0A0); // Pale champagne gold highlights
        sceneRef.current.background = new THREE.Color(0x1a1a1a); // Deep charcoal

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const rand = Math.random();
            const col = rand < 0.4 ? color1 : (rand < 0.8 ? color2 : color3);
            colors.setXYZ(i, col.r, col.g, col.b);
        }
    } else {
        color1 = new THREE.Color(0xE8E8E8); // Silver-white
        color2 = new THREE.Color(0xF5F5F2); // Near-white
        sceneRef.current.background = new THREE.Color(0x000000); // Black

        for (let i = 0; i < PARTICLE_COUNT; i++) {
           const col = Math.random() > 0.5 ? color1 : color2;
           colors.setXYZ(i, col.r, col.g, col.b);
        }
    }
    colors.needsUpdate = true;

    const material = sphereRef.current.material as THREE.PointsMaterial;
    if (theme === 'light') {
        material.blending = THREE.NormalBlending;
        material.opacity = 1.0;
    } else {
        material.blending = THREE.AdditiveBlending;
        material.opacity = 0.8;
    }
    material.needsUpdate = true;
  }, [theme]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
};
