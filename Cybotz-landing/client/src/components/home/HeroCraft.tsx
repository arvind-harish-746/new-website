import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DroneHud } from "./DroneHud";

const MODEL = "/models/drone.glb";

useGLTF.setDecoderPath("/draco/");

/**
 * Production DJI FPV (SDC PERFORMANCE, CC BY 4.0). Materials stay as authored.
 * See client/public/models/LICENSE.txt.
 */
function StudioLights() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pmrem.dispose();
      if (scene.environment === env) scene.environment = null;
    };
  }, [gl, scene]);

  return (
    <>
      <hemisphereLight args={["#f7fbff", "#c5d2df", 0.95]} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[3.4, 6.2, 2.6]} intensity={1.65} color="#fffaf6" />
      <directionalLight position={[-4.2, 2.1, -1.6]} intensity={0.55} color="#d5e4f4" />
      <directionalLight position={[0.4, 0.8, 4.5]} intensity={0.4} color="#fff3e8" />
    </>
  );
}

function DroneModel({ reduce }: { reduce: boolean }) {
  const { scene } = useGLTF(MODEL, "/draco/", false);
  const rig = useRef<THREE.Group>(null);
  const spins = useRef<THREE.Object3D[]>([]);
  const pointer = useRef({ x: 0, y: 0 });

  const fitted = useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const max = Math.max(size.x, size.y, size.z) || 1;
    root.scale.setScalar(2.35 / max);
    const found: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (/spins|propeller|rotor|blade/i.test(obj.name)) found.push(obj);
    });
    spins.current = found;
    return root;
  }, [scene]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    const group = rig.current;
    if (!group) return;
    const hero = document.getElementById("sec-hero");
    let progress = 0;
    if (hero) {
      const rect = hero.getBoundingClientRect();
      progress = THREE.MathUtils.clamp(-rect.top / Math.max(rect.height, 1), 0, 1);
    }
    const hover = reduce ? 0 : Math.sin(state.clock.elapsedTime * 1.15) * 0.07;
    const tiltX = reduce ? 0.12 : 0.12 + pointer.current.y * 0.16;
    const tiltZ = reduce ? 0 : -pointer.current.x * 0.2;
    const yaw = reduce ? 0.55 : 0.42 + progress * 0.85 + pointer.current.x * 0.22;
    group.position.y = THREE.MathUtils.damp(group.position.y, hover - progress * 0.12, 4, dt);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, tiltX, 4, dt);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, tiltZ, 4, dt);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, yaw, 3.2, dt);
    if (!reduce) {
      const step = dt * 26;
      for (const node of spins.current) node.rotateY(step);
    }
  });

  return (
    <group ref={rig}>
      <primitive object={fitted} />
    </group>
  );
}

function markHeroWebgl(on: boolean) {
  if (on) document.documentElement.dataset.heroWebgl = "on";
  else delete document.documentElement.dataset.heroWebgl;
}

function HeroCanvas({ paused, reduce }: { paused: boolean; reduce: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const live = visible && !paused;

  useEffect(() => {
    const node = wrap.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "160px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    markHeroWebgl(live);
    return () => markHeroWebgl(false);
  }, [live]);

  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  return (
    <div ref={wrap} className="drone-hud drone-rig hero-webgl" aria-hidden="true">
      <Canvas
        dpr={mobile ? [1, 1.25] : [1, 1.5]}
        frameloop={live ? "always" : "demand"}
        camera={{ position: [0.35, 0.42, 2.7], fov: 30, near: 0.05, far: 24 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, 0.02, 0);
        }}
      >
        <StudioLights />
        <DroneModel reduce={reduce || paused} />
      </Canvas>
    </div>
  );
}

class HeroErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export function HeroCraft({ paused = false }: { paused?: boolean }) {
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [glOk] = useState(() => (typeof window === "undefined" ? false : webglAvailable()));

  if (reduce || !glOk) return <DroneHud paused />;

  return (
    <HeroErrorBoundary fallback={<DroneHud paused />}>
      <Suspense fallback={<DroneHud paused />}>
        <HeroCanvas paused={paused} reduce={false} />
      </Suspense>
    </HeroErrorBoundary>
  );
}
