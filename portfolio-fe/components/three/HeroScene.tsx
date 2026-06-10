"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sphere, Torus, TorusKnot, MeshDistortMaterial, Float, Stars } from "@react-three/drei";
import * as THREE from "three";

// ─── Floating Geometry ───────────────────────────────────────────────────────

function FloatingTorusKnot() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = clock.elapsedTime * 0.15;
    meshRef.current.rotation.y = clock.elapsedTime * 0.2;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.8}>
      <TorusKnot ref={meshRef} args={[1, 0.32, 128, 32]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color="#22d3ee"
          emissive="#0891b2"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.1}
          distort={0.25}
          speed={2}
          transparent
          opacity={0.9}
        />
      </TorusKnot>
    </Float>
  );
}

function FloatingOrb({ position, color, scale = 1 }: {
  position: [number, number, number];
  color: string;
  scale?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = position[1] + Math.sin(clock.elapsedTime + position[0]) * 0.3;
  });

  return (
    <Sphere ref={meshRef} args={[0.5 * scale, 32, 32]} position={position}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        metalness={0.6}
        roughness={0.2}
        transparent
        opacity={0.7}
      />
    </Sphere>
  );
}

function FloatingRing({ position, color }: {
  position: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = clock.elapsedTime * 0.3;
    meshRef.current.rotation.z = clock.elapsedTime * 0.15;
  });

  return (
    <Torus ref={meshRef} args={[0.7, 0.06, 16, 64]} position={position}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        metalness={0.9}
        roughness={0.05}
        transparent
        opacity={0.8}
      />
    </Torus>
  );
}

// ─── Particle Field ───────────────────────────────────────────────────────────

function ParticleField({ count = 400 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color("#22d3ee");
    const violet = new THREE.Color("#a855f7");

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const c = Math.random() > 0.5 ? cyan : violet;
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.03;
    pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.05) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Mouse-tracking camera rig ────────────────────────────────────────────────

function CameraRig() {
  const { camera, gl } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    gl.domElement.parentElement?.addEventListener("mousemove", onMove);
    return () => gl.domElement.parentElement?.removeEventListener("mousemove", onMove);
  }, [gl]);

  useFrame(() => {
    // Lerp toward mouse — smooth lag effect
    targetRef.current.x += (mouseRef.current.x * 0.6 - targetRef.current.x) * 0.05;
    targetRef.current.y += (mouseRef.current.y * 0.4 - targetRef.current.y) * 0.05;
    camera.position.x = targetRef.current.x;
    camera.position.y = targetRef.current.y;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <CameraRig />

      {/* Ambient + point lights for neon feel */}
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]}   color="#22d3ee" intensity={3} />
      <pointLight position={[-5, -3, -5]} color="#a855f7" intensity={2} />
      <pointLight position={[0, 8, 0]}   color="#3b82f6" intensity={1.5} />

      {/* Central TorusKnot */}
      <FloatingTorusKnot />

      {/* Orbiting orbs */}
      <FloatingOrb position={[-3.5, 1, -1]}  color="#22d3ee" scale={0.6} />
      <FloatingOrb position={[3.2, -1.5, -2]} color="#a855f7" scale={0.5} />
      <FloatingOrb position={[-2, -2.5, 0]}  color="#3b82f6" scale={0.4} />
      <FloatingOrb position={[4, 2.5, -3]}   color="#ec4899" scale={0.35} />

      {/* Floating rings */}
      <FloatingRing position={[-4, 0, -2]}  color="#22d3ee" />
      <FloatingRing position={[3.5, 2, -1]} color="#a855f7" />

      {/* Star field */}
      {!reducedMotion && (
        <Stars radius={30} depth={30} count={800} factor={2} fade speed={0.5} />
      )}

      {/* Custom particle cloud */}
      <ParticleField count={reducedMotion ? 100 : 500} />
    </>
  );
}

// ─── Exported component (no dynamic import needed — caller does that) ─────────

export function HeroScene() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <Scene reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
