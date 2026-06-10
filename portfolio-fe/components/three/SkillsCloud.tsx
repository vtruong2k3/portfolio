"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Billboard, Sphere } from "@react-three/drei";
import * as THREE from "three";

const SKILLS = [
  "React", "Next.js", "TypeScript", "NestJS", "PostgreSQL",
  "Prisma", "Docker", "AWS", "GraphQL", "Redis",
  "Three.js", "GSAP", "Tailwind", "Node.js", "Zod",
  "Git", "Figma", "Vite", "Vitest", "tRPC",
];

// Fibonacci sphere distribution — evenly spaces N points on sphere surface
function fibonacciSphere(n: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push(new THREE.Vector3(r * Math.cos(theta) * radius, y * radius, r * Math.sin(theta) * radius));
  }
  return points;
}

function SkillTag({
  label,
  position,
  color,
  hovered,
  onHover,
  onLeave,
}: {
  label: string;
  position: THREE.Vector3;
  color: string;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const textRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!textRef.current) return;
    const target = hovered ? 1.15 : 1;
    textRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
  });

  return (
    // Billboard keeps text always facing the camera
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <Text
        ref={textRef}
        fontSize={hovered ? 0.26 : 0.22}
        color={hovered ? "#ffffff" : color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={hovered ? 0.008 : 0}
        outlineColor="#22d3ee"
        onPointerOver={onHover}
        onPointerOut={onLeave}
        font="/fonts/Inter-SemiBold.woff"
      >
        {label}
      </Text>
    </Billboard>
  );
}

function Cloud({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const positions = useMemo(() => fibonacciSphere(SKILLS.length, 2.8), []);

  const colors = useMemo(() => {
    const cyan   = "#22d3ee";
    const violet = "#a855f7";
    const blue   = "#3b82f6";
    const palette = [cyan, violet, blue];
    return SKILLS.map((_, i) => palette[i % palette.length]);
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.12;
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.05) * 0.15;
  });

  return (
    <group ref={groupRef}>
      {/* Subtle wireframe sphere as guide */}
      <Sphere args={[2.8, 24, 24]}>
        <meshBasicMaterial
          color="#22d3ee"
          wireframe
          transparent
          opacity={0.04}
        />
      </Sphere>

      {SKILLS.map((skill, i) => (
        <SkillTag
          key={skill}
          label={skill}
          position={positions[i]}
          color={colors[i]}
          hovered={hoveredIdx === i}
          onHover={() => setHoveredIdx(i)}
          onLeave={() => setHoveredIdx(null)}
        />
      ))}
    </group>
  );
}

export function SkillsCloud() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  return (
    <div
      className="w-full h-[480px] cursor-pointer"
      aria-label="3D skills word cloud — hover to highlight a technology"
      role="img"
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]}  color="#22d3ee" intensity={2} />
        <pointLight position={[-5, -5, 5]} color="#a855f7" intensity={1.5} />
        <Cloud reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
