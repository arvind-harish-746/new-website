import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSplashGate } from "@/components/SplashScreen";

gsap.registerPlugin(ScrollTrigger);

const MODEL = "/models/drone.glb";

useGLTF.setDecoderPath("/draco/");
useGLTF.preload(MODEL, "/draco/", false);

/**
 * Production DJI FPV (SDC PERFORMANCE, CC BY 4.0). Materials stay as authored.
 * See client/public/models/LICENSE.txt.
 *
 * Scroll stays native. An underdamped spring chases the scroll target so the
 * drone glides, overshoots, and settles. Hijacking scroll would fight ScrollTrigger.
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

/** Front-right and a little above: a three-quarter hero view. */
const VIEW_DIR = new THREE.Vector3(1.02, 0.4, 1.18).normalize();
/** Unit sphere at the origin stays inside this NDC half-extent. */
const NDC_LIMIT = 0.76;

type Key = { x: number; y: number; s: number };

/** Big left / right / left sweeps. Rotation comes from spring velocity, not these keys. */
/** Stay on the right so the copy on the left stays clear. The first key is replaced by the hero slot. */
const DESKTOP_PATH: Key[] = [
  { x: 0.52, y: 0.02, s: 0.76 },
  { x: 0.68, y: 0.24, s: 0.5 },
  { x: 0.4, y: -0.16, s: 0.52 },
  { x: 0.74, y: 0.18, s: 0.44 },
  { x: 0.46, y: -0.3, s: 0.4 },
  { x: 0.62, y: -0.46, s: 0.36 },
];

/** Smaller and lower-right, clear of the stacked headline. */
const MOBILE_PATH: Key[] = [
  { x: 0.42, y: -0.34, s: 0.38 },
  { x: 0.58, y: -0.12, s: 0.3 },
  { x: 0.36, y: -0.48, s: 0.28 },
  { x: 0.52, y: -0.6, s: 0.24 },
];

/** Where the video drone is hovering when the glass clears: near frame center. */
const HOVER_DESKTOP: Key = { x: -0.04, y: 0.05, s: 1.05 };
const HOVER_MOBILE: Key = { x: 0.0, y: 0.02, s: 0.74 };

function posedCorners(box: THREE.Box3) {
  const base: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) base.push(new THREE.Vector3(x, y, z));
    }
  }
  const poses: Array<[number, number, number, number]> = [
    [0.48, 0.12, 0.05, 0],
    [0.48, 0.12, 0.05, 0.04],
    [1.2, 0.32, -0.62, 0.04],
  ];
  const points: THREE.Vector3[] = [];
  for (const [yaw, pitch, roll, hover] of poses) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, "YXZ"));
    for (const corner of base) {
      const posed = corner.clone().applyQuaternion(q);
      posed.y += hover;
      points.push(posed);
    }
  }
  return points;
}

function frameCamera(camera: THREE.PerspectiveCamera, points: THREE.Vector3[], aspect: number) {
  let radius = 0.001;
  for (const point of points) radius = Math.max(radius, point.length());
  const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * Math.max(aspect, 0.35));
  let dist = radius / Math.sin(Math.min(vHalf, hHalf));
  camera.near = 0.01;
  camera.far = dist * 30;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    camera.position.copy(VIEW_DIR).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.near = Math.max(0.01, dist / 90);
    camera.far = dist * 30;
    camera.updateProjectionMatrix();
    let maxAbs = 0;
    for (const point of points) {
      const ndc = point.clone().project(camera);
      maxAbs = Math.max(maxAbs, Math.abs(ndc.x), Math.abs(ndc.y));
    }
    if (maxAbs <= NDC_LIMIT || maxAbs === 0) break;
    dist *= Math.max(1.04, maxAbs / NDC_LIMIT);
  }
}

function FramingCamera({ points }: { points: THREE.Vector3[] }) {
  const { camera, size, invalidate } = useThree();

  useLayoutEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    frameCamera(persp, points, aspect);
    invalidate();
  }, [camera, points, size, invalidate]);

  return null;
}

function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 122);
  gradient.addColorStop(0, "rgba(16, 32, 51, 0.28)");
  gradient.addColorStop(0.42, "rgba(16, 32, 51, 0.12)");
  gradient.addColorStop(1, "rgba(16, 32, 51, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 0 while the scroll-scrub video covers the page, 1 once the hero drone should show. */
function droneReveal() {
  const raw = document.documentElement.dataset.droneReveal;
  if (raw == null || raw === "") return 1;
  const value = Number(raw);
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 1;
}

function catmull(keys: Key[], t: number, field: keyof Key) {
  const n = keys.length - 1;
  const x = THREE.MathUtils.clamp(t, 0, 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const u = x - i;
  const pick = (index: number) => keys[THREE.MathUtils.clamp(index, 0, n)][field];
  const p0 = pick(i - 1);
  const p1 = pick(i);
  const p2 = pick(i + 1);
  const p3 = pick(i + 2);
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
  );
}

function samplePath(keys: Key[], t: number): Key {
  return {
    x: catmull(keys, t, "x"),
    y: catmull(keys, t, "y"),
    s: Math.max(0.12, catmull(keys, t, "s")),
  };
}

/** Hero cell in viewport NDC. Scale fits the framed sphere inside the slot. */
function measureSlot(): Key | null {
  const el = document.querySelector(".hero-flight-slot");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const half = Math.min(rect.width / window.innerWidth, rect.height / window.innerHeight) * 0.84;
  return {
    x: (cx / window.innerWidth) * 2 - 1,
    y: -((cy / window.innerHeight) * 2 - 1) + 0.045,
    s: half / NDC_LIMIT,
  };
}

function flightTarget(progress: number, mobile: boolean, reduce: boolean): Key {
  const slot = measureSlot();
  if (reduce) {
    return slot ?? (mobile ? MOBILE_PATH[0] : DESKTOP_PATH[0]);
  }
  const keys = (mobile ? MOBILE_PATH : DESKTOP_PATH).map((key) => ({ ...key }));
  if (slot) {
    const cap = mobile ? 0.42 : 0.86;
    const gain = mobile ? 1.15 : 2;
    keys[0] = {
      x: mobile ? Math.max(0.34, slot.x + 0.22) : slot.x,
      y: mobile ? slot.y - 0.28 : slot.y,
      s: Math.min(cap, slot.s * gain),
    };
  }
  return samplePath(keys, progress);
}

function contactFade() {
  const contact = document.getElementById("sec-contact");
  if (!contact) return 1;
  const rect = contact.getBoundingClientRect();
  if (rect.bottom > window.innerHeight * 0.42) return 1;
  return THREE.MathUtils.clamp(rect.bottom / (window.innerHeight * 0.42), 0, 1);
}

function integrate(pos: number, vel: number, target: number, dt: number) {
  const omega = 7.5;
  const zeta = 0.68;
  const steps = Math.max(1, Math.ceil(dt / 0.016));
  const h = dt / steps;
  let p = pos;
  let v = vel;
  for (let i = 0; i < steps; i += 1) {
    const acc = omega * omega * (target - p) - 2 * zeta * omega * v;
    v += acc * h;
    p += v * h;
  }
  return [p, v] as const;
}

function placeOnView(
  craft: THREE.Group,
  camera: THREE.PerspectiveCamera,
  pose: Key,
  bobY: number,
  right: THREE.Vector3,
  up: THREE.Vector3,
) {
  camera.updateMatrixWorld();
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  up.setFromMatrixColumn(camera.matrixWorld, 1);
  const dist = Math.max(camera.position.length(), 0.001);
  const halfH = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const halfW = halfH * Math.max(camera.aspect, 0.35);
  craft.position.set(0, 0, 0).addScaledVector(right, pose.x * halfW).addScaledVector(up, (pose.y + bobY) * halfH);
  craft.scale.setScalar(Math.max(0.001, pose.s));
}

function DroneModel({
  reduce,
  progressRef,
  layerRef,
}: {
  reduce: boolean;
  progressRef: MutableRefObject<number>;
  layerRef: RefObject<HTMLDivElement | null>;
}) {
  const { scene } = useGLTF(MODEL, "/draco/", false);
  const flight = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const spins = useRef<THREE.Object3D[]>([]);
  const { camera, size } = useThree();
  const notifyModelReady = useSplashGate().notifyModelReady;
  const spring = useRef({ x: 0, y: 0, s: 0.7, vx: 0, vy: 0, vs: 0, ready: false });
  const axes = useRef({ right: new THREE.Vector3(), up: new THREE.Vector3() });

  useEffect(() => {
    notifyModelReady();
  }, [notifyModelReady]);

  const fitted = useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    const initial = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(initial.radius, 1e-4);
    root.position.sub(initial.center);
    root.scale.multiplyScalar(1 / radius);
    root.updateMatrixWorld(true);
    const recentered = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
    root.position.sub(recentered.center);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const pivot = new THREE.Group();
    pivot.add(root);
    const found: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (/spins|propeller|rotor|blade/i.test(obj.name)) found.push(obj);
    });
    spins.current = found;
    const footprint = box.getSize(new THREE.Vector3());
    const span = Math.min(footprint.x, footprint.z);
    const shadow = { y: box.min.y + 0.015, w: span * 1.05, d: span * 0.62 };
    const points = posedCorners(box);
    const halfW = shadow.w / 2;
    const halfD = shadow.d / 2;
    for (const x of [-halfW, halfW]) {
      for (const z of [-halfD, halfD]) points.push(new THREE.Vector3(x, shadow.y, z));
    }
    return { root: pivot, shadow, points };
  }, [scene]);

  const shadowMap = useMemo(() => shadowTexture(), []);

  useFrame((state, rawDt) => {
    const craft = flight.current;
    const body = rig.current;
    if (!craft || !body) return;
    const dt = Math.min(rawDt, 0.05);
    const persp = camera as THREE.PerspectiveCamera;
    const mobile = size.width < 768;
    const { right, up } = axes.current;
    body.rotation.order = "YXZ";
    const reveal = droneReveal();
    const appear = reduce ? 1 : THREE.MathUtils.smoothstep(reveal, 0.02, 0.45);
    if (shadowRef.current) shadowRef.current.visible = appear > 0.4;
    if (layerRef.current) layerRef.current.style.backgroundColor = "transparent";

    const slot = flightTarget(reduce ? 0 : progressRef.current, mobile, reduce);
    const hover = mobile ? HOVER_MOBILE : HOVER_DESKTOP;
    const handoff = reduce ? 1 : THREE.MathUtils.smoothstep(reveal, 0.34, 1);
    const target = {
      x: THREE.MathUtils.lerp(hover.x, slot.x, handoff),
      y: THREE.MathUtils.lerp(hover.y, slot.y, handoff),
      s: THREE.MathUtils.lerp(hover.s, slot.s, handoff),
    };
    const spr = spring.current;
    if (!spr.ready || reduce) {
      spr.x = target.x;
      spr.y = target.y;
      spr.s = target.s;
      spr.vx = 0;
      spr.vy = 0;
      spr.vs = 0;
      spr.ready = true;
    }
    if (!reduce) {
      [spr.x, spr.vx] = integrate(spr.x, spr.vx, target.x, dt);
      [spr.y, spr.vy] = integrate(spr.y, spr.vy, target.y, dt);
      [spr.s, spr.vs] = integrate(spr.s, spr.vs, target.s, dt);
    }

    const speed = Math.hypot(spr.vx, spr.vy);
    const idle = 1 - THREE.MathUtils.clamp(speed * 5, 0, 1);
    const bob = reduce ? 0 : Math.sin(state.clock.elapsedTime * 2.6) * (0.012 + 0.03 * idle);
    placeOnView(craft, persp, { x: spr.x, y: spr.y, s: Math.max(0.12, spr.s) }, bob, right, up);

    const roll = reduce ? 0.05 : THREE.MathUtils.clamp(-spr.vx * 0.62, -0.95, 0.95);
    const pitch = reduce ? 0.12 : THREE.MathUtils.clamp(0.1 - speed * 0.24, -0.5, 0.12);
    const yaw = reduce ? 0.48 : 0.48 + THREE.MathUtils.clamp(-spr.vx * 0.36, -0.55, 0.55);
    const damp = reduce ? 1 : 8;
    body.rotation.y = THREE.MathUtils.damp(body.rotation.y, yaw, damp, dt);
    body.rotation.x = THREE.MathUtils.damp(body.rotation.x, pitch, damp, dt);
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, roll, damp, dt);

    if (!reduce) {
      const step = dt * 52;
      for (const node of spins.current) node.rotateY(step);
    }

    const cover = reveal < 0.98 ? 0 : 1 - THREE.MathUtils.smoothstep(Math.abs(spr.x), 0.2, 0.68);
    const opacity = (reduce ? 1 : (1 - cover * 0.42) * contactFade()) * appear;
    if (layerRef.current) layerRef.current.style.opacity = opacity.toFixed(3);
  });

  return (
    <group ref={flight}>
      <FramingCamera points={fitted.points} />
      {shadowMap && (
        <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, fitted.shadow.y, 0]} renderOrder={-1}>
          <planeGeometry args={[fitted.shadow.w, fitted.shadow.d]} />
          <meshBasicMaterial map={shadowMap} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <group ref={rig}>
        <primitive object={fitted.root} />
      </group>
    </group>
  );
}

function markHeroWebgl(on: boolean) {
  if (on) document.documentElement.dataset.heroWebgl = "on";
  else delete document.documentElement.dataset.heroWebgl;
}

function HeroCanvas({ reduce }: { reduce: boolean }) {
  const { intro } = useSplashGate();
  const layerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [hidden, setHidden] = useState(false);
  const [revealOn, setRevealOn] = useState(false);
  const live = !hidden && intro !== "classic";

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    let raf = 0;
    const watch = () => {
      const value = Number(document.documentElement.dataset.droneReveal || "1");
      const on = value > 0.01;
      setRevealOn((prev) => (prev === on ? prev : on));
      raf = requestAnimationFrame(watch);
    };
    raf = requestAnimationFrame(watch);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    markHeroWebgl(live);
    return () => markHeroWebgl(false);
  }, [live]);

  useEffect(() => {
    if (reduce || intro !== "none") return;
    const trigger = ScrollTrigger.create({
      trigger: "#sec-hero",
      start: "top top",
      endTrigger: "#sec-contact",
      end: "center center",
      scrub: 0,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => {
      window.clearTimeout(refresh);
      trigger.kill();
    };
  }, [reduce, intro]);

  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const frameloop = !live || reduce || !revealOn ? "demand" : "always";

  const canvas = (
    <div ref={layerRef} className="flight-canvas" style={{ opacity: reduce ? 1 : 0 }} aria-hidden="true">
      {(reduce || revealOn) && (
        <Canvas
          dpr={mobile ? [1, 1.1] : [1, 1.25]}
          frameloop={frameloop}
          camera={{ position: [1.6, 0.9, 2.1], fov: 32, near: 0.05, far: 80 }}
          gl={{ alpha: true, antialias: !mobile, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <StudioLights />
          <DroneModel reduce={reduce} progressRef={progressRef} layerRef={layerRef} />
        </Canvas>
      )}
    </div>
  );

  return (
    <>
      <div className="hero-flight-slot" />
      {createPortal(canvas, document.body)}
    </>
  );
}

class HeroErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export function HeroCraft() {
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [glOk] = useState(() => (typeof window === "undefined" ? false : webglOk()));
  const { intro, abortToClassic, finishIntro } = useSplashGate();

  if (!glOk) return <div className="hero-flight-slot" aria-hidden="true" />;

  return (
    <HeroErrorBoundary
      fallback={<div className="hero-flight-slot" aria-hidden="true" />}
      onFail={() => {
        if (intro === "pending") abortToClassic();
        else if (intro === "video" || intro === "reduced") finishIntro();
      }}
    >
      <Suspense fallback={<div className="hero-flight-slot hero-flight-shimmer" aria-hidden="true" />}>
        <HeroCanvas reduce={reduce} />
      </Suspense>
    </HeroErrorBoundary>
  );
}

function webglOk() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
