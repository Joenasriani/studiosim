'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, Text } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { LessonControlId, LessonSchema } from '@/types/database';
import type { LearnerAttempt } from '@/lib/lesson-evaluator';

type SceneProps = LearnerAttempt & {
  schema: LessonSchema;
  score: number;
  passed: boolean;
  onNudge: (id: LessonControlId, delta: number | LearnerAttempt['ease']) => void;
  onVrStatus?: (status: WebXRStatus) => void;
};

type WebXRStatus = {
  supported: boolean;
  active: boolean;
  message: string;
};

type MotionSample = { x: number; y: number; t: number };

const xrStore = createXRStore();
const EASE_SEQUENCE: LearnerAttempt['ease'][] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'overshoot'];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeValue(t: number, ease: LearnerAttempt['ease'], overshoot: number) {
  if (ease === 'easeIn') return t * t;
  if (ease === 'easeOut') return 1 - Math.pow(1 - t, 2);
  if (ease === 'easeInOut') return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  if (ease === 'overshoot') {
    const c1 = 1.70158 + overshoot * 2;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  return t;
}

function getMotionSample(rawLoop: number, attempt: LearnerAttempt): MotionSample {
  const prepWindow = Math.min(0.24, attempt.anticipation * 0.18 + 0.04);
  const settleWindow = Math.min(0.24, attempt.settleHold * 0.18 + 0.04);
  const activeStart = prepWindow;
  const activeEnd = Math.max(activeStart + 0.2, 1 - settleWindow);

  if (rawLoop < activeStart) {
    const prepT = rawLoop / activeStart;
    const anticipationPull = -0.22 * attempt.anticipation * Math.sin(prepT * Math.PI);
    return { x: -2.4 + anticipationPull, y: 0.72, t: 0 };
  }

  if (rawLoop > activeEnd) {
    const settleT = (rawLoop - activeEnd) / Math.max(0.001, 1 - activeEnd);
    const settleBounce = Math.sin(settleT * Math.PI) * 0.06 * attempt.overshoot;
    return { x: 2.4, y: 0.72 + settleBounce, t: 1 };
  }

  const t = clamp01((rawLoop - activeStart) / (activeEnd - activeStart));
  const value = easeValue(t, attempt.ease, attempt.overshoot);
  return { x: THREE.MathUtils.lerp(-2.4, 2.4, value), y: 0.72, t };
}

function AnimatedPlate({ duration, ease, overshoot, anticipation, settleHold }: LearnerAttempt) {
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const loop = (clock.elapsedTime % duration) / duration;
    const sample = getMotionSample(loop, { duration, ease, overshoot, anticipation, settleHold });
    if (mesh.current) {
      mesh.current.position.x = sample.x;
      mesh.current.position.y = sample.y;
      mesh.current.rotation.z = Math.sin(sample.t * Math.PI) * 0.08 * overshoot;
    }
    if (glow.current) {
      glow.current.position.x = sample.x;
      glow.current.position.y = 0.08;
      glow.current.scale.setScalar(1 + Math.sin(sample.t * Math.PI) * 0.2);
    }
  });

  return (
    <group>
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[-2.4, 0.08, 0]}>
        <circleGeometry args={[0.62, 48]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.18} />
      </mesh>
      <mesh ref={mesh} position={[-2.4, 0.72, 0]} castShadow>
        <boxGeometry args={[0.92, 0.56, 0.92]} />
        <meshStandardMaterial color="#2dd4bf" emissive="#063f3b" metalness={0.45} roughness={0.22} />
      </mesh>
    </group>
  );
}

function CurveRibbon({ ease, overshoot }: { ease: LearnerAttempt['ease']; overshoot: number }) {
  const points = useMemo(() => {
    return Array.from({ length: 30 }, (_, index) => {
      const t = index / 29;
      const x = THREE.MathUtils.lerp(-2.4, 2.4, t);
      const y = 1.28 + easeValue(t, ease, overshoot) * 0.8;
      return new THREE.Vector3(x, y, -1.35);
    });
  }, [ease, overshoot]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 64, 0.018, 8, false]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {points.filter((_, index) => index % 7 === 0).map((point, index) => (
        <mesh key={`${point.x}-${index}`} position={point}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color="#facc15" emissive="#3b2500" />
        </mesh>
      ))}
    </group>
  );
}

function StudioWorkbench({ schema }: { schema: LessonSchema }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9.6, 5.6]} />
        <meshStandardMaterial color="#09111f" roughness={0.72} metalness={0.08} />
      </mesh>

      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[5.9, 0.18, 1.14]} />
        <meshStandardMaterial color="#132238" roughness={0.55} metalness={0.18} />
      </mesh>

      {[-2.4, -1.2, 0, 1.2, 2.4].map((x, index) => (
        <group key={x} position={[x, 0.24, 0]}>
          <mesh>
            <boxGeometry args={[0.035, 0.18, 1.22]} />
            <meshStandardMaterial color={index === 0 || index === 4 ? '#f59e0b' : '#334155'} emissive={index === 0 || index === 4 ? '#3b2500' : '#000000'} />
          </mesh>
          <Text position={[0, 0.18, 0.76]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.08} color="#cbd5e1" anchorX="center">
            {index === 0 ? 'START' : index === 4 ? 'SETTLE' : `${index}`}
          </Text>
        </group>
      ))}

      <mesh position={[-2.4, 0.18, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.12, 32]} />
        <meshStandardMaterial color="#14b8a6" emissive="#063f3b" />
      </mesh>
      <mesh position={[2.4, 0.18, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 32]} />
        <meshStandardMaterial color="#f59e0b" emissive="#3b2500" />
      </mesh>

      <Text position={[0, 2.34, -1.48]} fontSize={0.18} color="#dbeafe" anchorX="center">
        {schema.scene.studioName}
      </Text>
      <Text position={[0, 2.02, -1.48]} fontSize={0.095} color="#93c5fd" anchorX="center">
        {schema.scene.environmentMood}
      </Text>
    </group>
  );
}

function XRButton({ position, label, value, onSelect }: { position: [number, number, number]; label: string; value: string; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position}>
      <mesh
        onClick={(event) => { event.stopPropagation(); onSelect(); }}
        onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.86, 0.3, 0.08]} />
        <meshStandardMaterial color={hovered ? '#2dd4bf' : '#14243a'} emissive={hovered ? '#0f4f49' : '#06101c'} roughness={0.34} metalness={0.22} />
      </mesh>
      <Text position={[0, 0.045, 0.07]} fontSize={0.055} color="#e0f2fe" anchorX="center" anchorY="middle">
        {label}
      </Text>
      <Text position={[0, -0.075, 0.07]} fontSize={0.07} color="#facc15" anchorX="center" anchorY="middle">
        {value}
      </Text>
    </group>
  );
}

function XRControlConsole({ attempt, score, passed, onNudge }: { attempt: LearnerAttempt; score: number; passed: boolean; onNudge: SceneProps['onNudge'] }) {
  const nextEase = EASE_SEQUENCE[(EASE_SEQUENCE.indexOf(attempt.ease) + 1) % EASE_SEQUENCE.length];
  return (
    <group position={[0, 1.25, 1.45]} rotation={[-0.36, 0, 0]}>
      <mesh position={[0, 0.22, -0.04]}>
        <boxGeometry args={[4.9, 1.2, 0.08]} />
        <meshStandardMaterial color="#07111f" transparent opacity={0.74} roughness={0.42} metalness={0.18} />
      </mesh>
      <Text position={[-2.1, 0.63, 0.04]} fontSize={0.09} color="#93c5fd" anchorX="left">
        VR RAY CONSOLE
      </Text>
      <Text position={[1.1, 0.63, 0.04]} fontSize={0.12} color={passed ? '#86efac' : '#fbbf24'} anchorX="left">
        SCORE {score}/100
      </Text>
      <XRButton position={[-1.92, 0.2, 0.04]} label="Duration" value="-0.1s" onSelect={() => onNudge('duration', -0.1)} />
      <XRButton position={[-0.96, 0.2, 0.04]} label="Duration" value="+0.1s" onSelect={() => onNudge('duration', 0.1)} />
      <XRButton position={[0, 0.2, 0.04]} label="Ease" value={nextEase} onSelect={() => onNudge('ease', nextEase)} />
      <XRButton position={[0.96, 0.2, 0.04]} label="Overshoot" value="+0.1" onSelect={() => onNudge('overshoot', 0.1)} />
      <XRButton position={[1.92, 0.2, 0.04]} label="Overshoot" value="-0.1" onSelect={() => onNudge('overshoot', -0.1)} />
      <XRButton position={[-0.72, -0.22, 0.04]} label="Anticipation" value="+0.1" onSelect={() => onNudge('anticipation', 0.1)} />
      <XRButton position={[0.24, -0.22, 0.04]} label="Anticipation" value="-0.1" onSelect={() => onNudge('anticipation', -0.1)} />
      <XRButton position={[1.2, -0.22, 0.04]} label="Settle" value="+0.1" onSelect={() => onNudge('settleHold', 0.1)} />
    </group>
  );
}

function HeadsetHud({ schema, score, passed }: { schema: LessonSchema; score: number; passed: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const tempVector = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!group.current) return;
    group.current.visible = gl.xr.isPresenting;
    if (!gl.xr.isPresenting) return;
    camera.getWorldPosition(tempVector);
    camera.getWorldQuaternion(tempQuaternion);
    group.current.position.copy(tempVector).add(new THREE.Vector3(0, -0.16, -1.65).applyQuaternion(tempQuaternion));
    group.current.quaternion.copy(tempQuaternion);
  });

  return (
    <group ref={group} visible={false}>
      <mesh>
        <planeGeometry args={[1.6, 0.58]} />
        <meshBasicMaterial color="#06101c" transparent opacity={0.78} />
      </mesh>
      <Text position={[-0.72, 0.19, 0.01]} fontSize={0.055} color="#93c5fd" anchorX="left">
        {schema.briefing.principle.toUpperCase()}
      </Text>
      <Text position={[-0.72, 0.04, 0.01]} fontSize={0.07} color="#e0f2fe" anchorX="left">
        {passed ? 'Pass state reached' : 'Tune the motion until the score clears the gate'}
      </Text>
      <Text position={[-0.72, -0.14, 0.01]} fontSize={0.1} color={passed ? '#86efac' : '#fbbf24'} anchorX="left">
        {score}/100
      </Text>
    </group>
  );
}

function XRSessionReporter({ onVrStatus }: { onVrStatus?: (status: WebXRStatus) => void }) {
  const { gl } = useThree();
  useFrame(() => {
    onVrStatus?.({ supported: true, active: gl.xr.isPresenting, message: gl.xr.isPresenting ? 'VR session active' : 'WebXR canvas ready' });
  });
  return null;
}

function clampControlValue(id: LessonControlId, value: number, schema: LessonSchema): number {
  const control = schema.controls.find(item => item.id === id);
  if (!control || control.id === 'ease') return value;
  return Number(THREE.MathUtils.clamp(value, control.min, control.max).toFixed(2));
}

export default function SandboxScene({ duration, ease, overshoot, anticipation, settleHold, schema, score, passed, onNudge, onVrStatus }: SceneProps) {
  const [xrStatus, setXrStatus] = useState<WebXRStatus>({ supported: false, active: false, message: 'Checking WebXR support' });
  const attempt = { duration, ease, overshoot, anticipation, settleHold };

  useEffect(() => {
    let cancelled = false;
    async function checkSupport() {
      const xr = typeof navigator !== 'undefined' ? (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr : undefined;
      if (!xr?.isSessionSupported) {
        const status = { supported: false, active: false, message: 'WebXR unavailable in this browser. Desktop 3D mode remains active.' };
        if (!cancelled) {
          setXrStatus(status);
          onVrStatus?.(status);
        }
        return;
      }
      const supported = await xr.isSessionSupported('immersive-vr').catch(() => false);
      const status = { supported, active: false, message: supported ? 'WebXR immersive-vr supported. Quest Browser can enter the workbench.' : 'Immersive VR session not supported here. Desktop 3D mode remains active.' };
      if (!cancelled) {
        setXrStatus(status);
        onVrStatus?.(status);
      }
    }
    checkSupport();
    return () => { cancelled = true; };
  }, [onVrStatus]);

  async function enterVR() {
    if (!xrStatus.supported) {
      const status = { ...xrStatus, message: 'VR entry blocked: this browser did not report immersive-vr support.' };
      setXrStatus(status);
      onVrStatus?.(status);
      return;
    }
    try {
      await Promise.resolve(xrStore.enterVR());
      const status = { supported: true, active: true, message: 'VR session request sent. Use controller rays on the console.' };
      setXrStatus(status);
      onVrStatus?.(status);
    } catch (error) {
      const status = { supported: true, active: false, message: error instanceof Error ? error.message : 'VR entry failed.' };
      setXrStatus(status);
      onVrStatus?.(status);
    }
  }

  function nudge(id: LessonControlId, delta: number | LearnerAttempt['ease']) {
    if (id === 'ease') return onNudge(id, delta as LearnerAttempt['ease']);
    const current = attempt[id];
    const next = clampControlValue(id, current + Number(delta), schema);
    onNudge(id, next - current);
  }

  return (
    <>
      <div className="vrDockPanel">
        <button className="vrDock" onClick={enterVR} disabled={!xrStatus.supported}>Enter VR Workbench</button>
        <p>{xrStatus.message}</p>
      </div>
      <Canvas shadows camera={{ position: schema.scene.cameraPosition, fov: 44 }} gl={{ antialias: true, alpha: false }}>
        <XR store={xrStore}>
          <XRSessionReporter onVrStatus={(status) => { setXrStatus(status); onVrStatus?.(status); }} />
          <color attach="background" args={["#05070d"]} />
          <fog attach="fog" args={["#05070d", 7, 13]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[4, 6, 4]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} />
          <pointLight position={[-3.4, 2.8, 1.8]} intensity={1.2} color="#38bdf8" />
          <pointLight position={[3.2, 2.2, -1.6]} intensity={0.9} color="#f59e0b" />
          <StudioWorkbench schema={schema} />
          <CurveRibbon ease={ease} overshoot={overshoot} />
          <AnimatedPlate duration={duration} ease={ease} overshoot={overshoot} anticipation={anticipation} settleHold={settleHold} />
          <XRControlConsole attempt={attempt} score={score} passed={passed} onNudge={nudge} />
          <HeadsetHud schema={schema} score={score} passed={passed} />
          <OrbitControls target={schema.scene.targetPosition} enablePan={false} minDistance={4.2} maxDistance={8.8} />
          <Environment preset="warehouse" />
        </XR>
      </Canvas>
    </>
  );
}
