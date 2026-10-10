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
import { DroneHud } from "./DroneHud";

gsap.registerPlugin(ScrollTrigger);

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

/** Front-right and a little above: a three-quarter hero view. */
const VIEW_DIR = new THREE.Vector3(1.02, 0.4, 1.18).normalize();
/** Unit sphere at the origin stays inside this NDC half-extent. */
const NDC_LIMIT = 0.76;

type Pose = { x: number; y: number; s: number; yaw: number; pitch: number; roll: number };

/** Desktop flight, NDC x right / y up. Edges and gaps, then a settle beside contact. */
const DESKTOP_PATH: Pose[] = [
  { x: 0.42, y: 0.1, s: 0.38, yaw: 0.48, pitch: 0.12, roll: 0.05 },
  { x: 0.84, y: 0.02, s: 0.24, yaw: 1.35, pitch: 0.36, roll: -0.7 },
  { x: -0.82, y: -0.02, s: 0.2, yaw: 2.55, pitch: -0.18, roll: 0.7 },
  { x: -0.86, y: -0.42, s: 0.18, yaw: 3.55, pitch: 0.42, roll: -0.22 },
  { x: 0.86, y: -0.48, s: 0.2, yaw: 4.6, pitch: 0.08, roll: 0.48 },
  { x: 0.88, y: 0.22, s: 0.2, yaw: 5.55, pitch: -0.3, roll: -0.6 },
  { x: 0.84, y: -0.08, s: 0.24, yaw: 6.2, pitch: 0.1, roll: 0.05 },
];

/** Mobile stays smaller and rides the right edge instead of crossing the copy. */
const MOBILE_PATH: Pose[] = [
  { x: 0.0, y: -0.05, s: 0.36, yaw: 0.42, pitch: 0.1, roll: 0.04 },
  { x: 0.7, y: -0.58, s: 0.16, yaw: 1.2, pitch: 0.24, roll: -0.42 },
  { x: 0.74, y: -0.5, s: 0.15, yaw: 2.05, pitch: 0.04, roll: 0.26 },
  { x: 0.66, y: -0.6, s: 0.17, yaw: 2.75, pitch: 0.08, roll: 0.02 },
];

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
  camera.far = dist * 20;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    camera.position.copy(VIEW_DIR).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.near = Math.max(0.01, dist / 90);
    camera.far = dist * 12;
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
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    frameCamera(persp, points, aspect);
  }, [camera, points, size]);

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

function catmull(keys: Pose[], t: number, field: keyof Pose) {
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

function samplePath(keys: Pose[], t: number): Pose {
  return {
    x: catmull(keys, t, "x"),
    y: catmull(keys, t, "y"),
    s: Math.max(0.08, catmull(keys, t, "s")),
    yaw: catmull(keys, t, "yaw"),
    pitch: catmull(keys, t, "pitch"),
    roll: catmull(keys, t, "roll"),
  };
}

function blendPose(a: Pose, b: Pose, t: number): Pose {
  const k = t * t * (3 - 2 * t);
  return {
    x: THREE.MathUtils.lerp(a.x, b.x, k),
    y: THREE.MathUtils.lerp(a.y, b.y, k),
    s: THREE.MathUtils.lerp(a.s, b.s, k),
    yaw: THREE.MathUtils.lerp(a.yaw, b.yaw, k),
    pitch: THREE.MathUtils.lerp(a.pitch, b.pitch, k),
    roll: THREE.MathUtils.lerp(a.roll, b.roll, k),
  };
}

/** Hero cell in viewport NDC, plus a scale that keeps the framed sphere inside it. */
function measureSlot(): Pose | null {
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
    yaw: 0.48,
    pitch: 0.12,
    roll: 0.05,
  };
}

function contactFade() {
  const contact = document.getElementById("sec-contact");
  if (!contact) return 1;
  const rect = contact.getBoundingClientRect();
  if (rect.bottom > window.innerHeight * 0.42) return 1;
  return THREE.MathUtils.clamp(rect.bottom / (window.innerHeight * 0.42), 0, 1);
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
  const spins = useRef<THREE.Object3D[]>([]);
  const { camera, size } = useThree();

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

  useFrame((state, dt) => {
    const craft = flight.current;
    const body = rig.current;
    if (!craft || !body) return;

    const mobile = size.width < 768;
    const progress = reduce ? 0 : progressRef.current;
    const slot = measureSlot();
    const path = samplePath(mobile ? MOBILE_PATH : DESKTOP_PATH, progress);
    let pose = path;
    if (reduce) {
      pose = slot ?? path;
    } else if (slot && progress < 0.14) {
      pose = blendPose(slot, path, progress / 0.14);
    }

    const time = state.clock.elapsedTime;
    const bob = reduce ? 0 : Math.sin(time * 2.5) * 0.03;
    const driftYaw = reduce ? 0 : Math.sin(time * 0.55) * 0.22;
    const driftRoll = reduce ? 0 : Math.sin(time * 0.9) * 0.1;
    pose = { ...pose, y: pose.y + bob, yaw: pose.yaw + driftYaw, roll: pose.roll + driftRoll };

    const persp = camera as THREE.PerspectiveCamera;
    persp.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(persp.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(persp.matrixWorld, 1);
    const dist = persp.position.length();
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2);
    const halfW = halfH * Math.max(persp.aspect, 0.35);
    craft.position.set(0, 0, 0).addScaledVector(right, pose.x * halfW).addScaledVector(up, pose.y * halfH);
    craft.scale.setScalar(pose.s);

    body.rotation.order = "YXZ";
    body.rotation.y = THREE.MathUtils.damp(body.rotation.y, pose.yaw, 6, dt);
    body.rotation.x = THREE.MathUtils.damp(body.rotation.x, pose.pitch, 6, dt);
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, pose.roll, 6, dt);

    if (!reduce) {
      const step = dt * 52;
      for (const node of spins.current) node.rotateY(step);
    }

    const edge = THREE.MathUtils.clamp(Math.abs(pose.x) / 0.48, 0, 1);
    const crossing = progress > 0.1 && progress < 0.92 ? 0.62 + 0.38 * edge : 1;
    const fade = contactFade();
    const opacity = reduce ? (slot ? 1 : 0) : crossing * fade;
    if (layerRef.current) layerRef.current.style.opacity = opacity.toFixed(3);
  });

  return (
    <group ref={flight}>
      <FramingCamera points={fitted.points} />
      {shadowMap && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, fitted.shadow.y, 0]} renderOrder={-1}>
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

function HeroCanvas({ paused, reduce }: { paused: boolean; reduce: boolean }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [hidden, setHidden] = useState(false);
  const live = !paused && !hidden;

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    markHeroWebgl(live);
    return () => markHeroWebgl(false);
  }, [live]);

  useEffect(() => {
    if (reduce) return;
    const trigger = ScrollTrigger.create({
      trigger: "#sec-hero",
      start: "top top",
      endTrigger: "#sec-contact",
      end: "center center",
      scrub: 0.45,
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
  }, [reduce]);

  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  const canvas = (
    <div ref={layerRef} className="flight-canvas" aria-hidden="true">
      <Canvas
        dpr={mobile ? [1, 1.15] : [1, 1.35]}
        frameloop={live ? "always" : "demand"}
        camera={{ position: [1.6, 0.9, 2.1], fov: 32, near: 0.05, far: 40 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <StudioLights />
        <DroneModel reduce={reduce} progressRef={progressRef} layerRef={layerRef} />
      </Canvas>
    </div>
  );

  return (
    <>
      <div className="hero-flight-slot" />
      {createPortal(canvas, document.body)}
    </>
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

  if (!glOk) return <DroneHud paused />;

  return (
    <HeroErrorBoundary fallback={<DroneHud paused />}>
      <Suspense fallback={<DroneHud paused />}>
        <HeroCanvas paused={paused} reduce={reduce} />
      </Suspense>
    </HeroErrorBoundary>
  );
}
