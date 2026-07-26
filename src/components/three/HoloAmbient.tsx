import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Ambient, non-interactive 3D scene used ONLY on the Login screen and other
 * pre-auth/idle surfaces — never behind operational data (see DESIGN_SYSTEM §1).
 * Renders a slowly rotating lattice sphere (an abstracted "intelligence globe")
 * with drifting particle nodes and connecting arcs, in the primary/accent palette.
 */

function Lattice() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = 900;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const r = 2.6;
      arr[i * 3] = r * Math.cos(theta) * Math.sin(phi);
      arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} color="#2563EB" transparent opacity={0.55} />
    </points>
  );
}

function Arcs() {
  const group = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 14; i++) {
      const start = randomOnSphere(2.6);
      const end = randomOnSphere(2.6);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(3.3);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const pts = curve.getPoints(32);
      out.push(new THREE.BufferGeometry().setFromPoints(pts));
    }
    return out;
  }, []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={group}>
      {lines.map((geo, i) => (
        <line key={i}>
          <primitive object={geo} attach="geometry" />
          <lineBasicMaterial color="#06B6D4" transparent opacity={0.35} />
        </line>
      ))}
    </group>
  );
}

function randomOnSphere(r: number) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

export function HoloAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.6} />
        <Lattice />
        <Arcs />
      </Canvas>
    </div>
  );
}
