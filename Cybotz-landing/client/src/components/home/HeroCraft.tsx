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
import { useSplashGate, type IntroMode } from "@/components/SplashScreen";
import { ReducedSplash, VideoSplash, type SplashHandoff } from "@/components/home/VideoSplash";
import { useLocation } from "wouter";

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

const POS_TOP_LEFT: Key = { x: -0.74, y: 0.62, s: 0.50 };
const POS_BOTTOM_RIGHT: Key = { x: 0.81, y: -0.73, s: 0.44 };
const POS_BOTTOM_LEFT: Key = { x: -0.74, y: -0.62, s: 0.46 };

function lerpKey(a: Key, b: Key, t: number): Key {
  const c = THREE.MathUtils.clamp(t, 0, 1);
  return {
    x: THREE.MathUtils.lerp(a.x, b.x, c),
    y: THREE.MathUtils.lerp(a.y, b.y, c),
    s: THREE.MathUtils.lerp(a.s, b.s, c),
  };
}

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
    s: Math.min(0.82, (half / NDC_LIMIT) * 1.8),
  };
}

function flightTarget(
  isHome: boolean,
  scrollProgress: number,
  reduce: boolean
): Key {
  if (reduce) {
    return POS_BOTTOM_RIGHT;
  }

  if (isHome) {
    const slot = measureSlot() ?? { x: 0.50, y: 0.08, s: 0.74 };
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    // 1. At scroll = 0, stay at the gap next to title (slot).
    // As scrolling begins (0 to 0.18): move from slot to top-left corner (POS_TOP_LEFT)
    if (p <= 0.18) {
      const t1 = p / 0.18;
      const smooth1 = t1 * t1 * (3 - 2 * t1);
      return lerpKey(slot, POS_TOP_LEFT, smooth1);
    }

    // 2. As scrolling down continues (0.18 to 0.52): move diagonally from top-left to bottom-right (POS_BOTTOM_RIGHT)
    const t2 = THREE.MathUtils.clamp((p - 0.18) / (0.52 - 0.18), 0, 1);
    const smooth2 = t2 * t2 * (3 - 2 * t2);
    return lerpKey(POS_TOP_LEFT, POS_BOTTOM_RIGHT, smooth2);
  }

  // Other webpages: hover in bottom right corner
  return POS_BOTTOM_RIGHT;
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

interface RotorRef {
  group: THREE.Group;
  axis: THREE.Vector3;
  dir: number;
}

const PROPELLER_CENTERS = [
  new THREE.Vector3(-1.6883, -0.5106, -0.748), // Front Left (Quad 0)
  new THREE.Vector3(1.553, -0.512, -0.744), // Front Right (Quad 1)
  new THREE.Vector3(-1.9142, -1.9355, 1.2543), // Rear Left (Quad 2)
  new THREE.Vector3(1.7592, -1.936, 1.2554), // Rear Right (Quad 3)
];
const PROPELLER_AXIS = new THREE.Vector3(0, 0.9428, 0.3335).normalize();

function splitMeshToQuads(mesh: THREE.Mesh, centers: THREE.Vector3[]) {
  const orig = mesh.geometry;
  const posAttr = orig.attributes.position;
  const normAttr = orig.attributes.normal;
  const uvAttr = orig.attributes.uv;
  const index = orig.index;
  if (!posAttr) return [];

  const subMeshes: { q: number; subMesh: THREE.Mesh }[] = [];

  for (let q = 0; q < 4; q++) {
    const center = centers[q];
    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUvs: number[] = [];
    const newIndices: number[] = [];
    const oldToNew = new Map<number, number>();

    const triCount = index ? index.count / 3 : posAttr.count / 3;

    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const x0 = posAttr.getX(i0);
      const z0 = posAttr.getZ(i0);
      const quad = (x0 >= 0 ? 1 : 0) + (z0 >= 0 ? 2 : 0);
      if (quad !== q) continue;

      for (let k = 0; k < 3; k++) {
        const oldIdx = index ? index.getX(t * 3 + k) : t * 3 + k;
        let newIdx = oldToNew.get(oldIdx);
        if (newIdx === undefined) {
          newIdx = newPositions.length / 3;
          oldToNew.set(oldIdx, newIdx);
          newPositions.push(
            posAttr.getX(oldIdx) - center.x,
            posAttr.getY(oldIdx) - center.y,
            posAttr.getZ(oldIdx) - center.z
          );
          if (normAttr) {
            newNormals.push(normAttr.getX(oldIdx), normAttr.getY(oldIdx), normAttr.getZ(oldIdx));
          }
          if (uvAttr) {
            newUvs.push(uvAttr.getX(oldIdx), uvAttr.getY(oldIdx));
          }
        }
        newIndices.push(newIdx);
      }
    }

    if (newIndices.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(newPositions, 3));
      if (newNormals.length > 0) {
        geom.setAttribute("normal", new THREE.Float32BufferAttribute(newNormals, 3));
      }
      if (newUvs.length > 0) {
        geom.setAttribute("uv", new THREE.Float32BufferAttribute(newUvs, 2));
      }
      geom.setIndex(newIndices);
      geom.computeBoundingBox();
      geom.computeBoundingSphere();
      const subMesh = new THREE.Mesh(geom, mesh.material);
      subMeshes.push({ q, subMesh });
    }
  }

  return subMeshes;
}

function DroneModel({
  isHome,
  reduce,
  progressRef,
  layerRef,
  introRef,
  handoffRef,
}: {
  isHome: boolean;
  reduce: boolean;
  progressRef: MutableRefObject<number>;
  layerRef: RefObject<HTMLDivElement | null>;
  introRef: MutableRefObject<IntroMode>;
  handoffRef: MutableRefObject<SplashHandoff>;
}) {
  const { scene } = useGLTF(MODEL, "/draco/", false);
  const flight = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const rotors = useRef<RotorRef[]>([]);
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

    // Identify the propellers group (SpineB) and separate into 4 rotating rotors
    const activeRotors: RotorRef[] = [];
    root.traverse((obj) => {
      if (/spineb/i.test(obj.name)) {
        const spineGroup = obj;
        const rotorGroups = [
          new THREE.Group(),
          new THREE.Group(),
          new THREE.Group(),
          new THREE.Group(),
        ];
        rotorGroups.forEach((g, q) => {
          g.position.copy(PROPELLER_CENTERS[q]);
          g.name = `Propeller_${q}`;
          spineGroup.add(g);
          activeRotors.push({
            group: g,
            axis: PROPELLER_AXIS.clone(),
            dir: q === 0 || q === 3 ? 1 : -1,
          });
        });

        const meshChildren = spineGroup.children.filter(
          (c): c is THREE.Mesh => (c as THREE.Mesh).isMesh
        );

        for (const child of meshChildren) {
          const splits = splitMeshToQuads(child, PROPELLER_CENTERS);
          for (const { q, subMesh } of splits) {
            rotorGroups[q].add(subMesh);
          }
          spineGroup.remove(child);
        }
      }
    });

    rotors.current = activeRotors;

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
    const mode = introRef.current;
    const mobile = size.width < 768;
    const { right, up } = axes.current;
    body.rotation.order = "YXZ";

    const blend = mode === "video" ? THREE.MathUtils.clamp(handoffRef.current.blend, 0, 1) : 0;
    const showShadow = mode === "none" || mode === "reduced" || (mode === "video" && blend > 0.35);
    if (shadowRef.current) shadowRef.current.visible = showShadow;

    if (mode === "pending" || mode === "classic" || (mode === "video" && blend <= 0)) {
      craft.scale.setScalar(0.001);
      if (layerRef.current) layerRef.current.style.opacity = "0";
      return;
    }

    if (mode === "video") {
      const k = THREE.MathUtils.smoothstep(blend, 0, 1);
      const pose = flightTarget(isHome, 0, false);
      const now = {
        x: THREE.MathUtils.lerp(0, pose.x, k),
        y: THREE.MathUtils.lerp(0.04, pose.y, k),
        s: THREE.MathUtils.lerp(Math.min(0.98, pose.s * 1.42), pose.s, k),
      };
      const spr = spring.current;
      spr.x = now.x;
      spr.y = now.y;
      spr.s = now.s;
      spr.vx = 0;
      spr.vy = 0;
      spr.vs = 0;
      spr.ready = true;
      placeOnView(craft, persp, now, 0, right, up);
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, 0.48, 6, dt);
      body.rotation.x = THREE.MathUtils.damp(body.rotation.x, 0.1, 6, dt);
      body.rotation.z = THREE.MathUtils.damp(body.rotation.z, 0, 6, dt);
      const step = dt * 64;
      for (const r of rotors.current) {
        r.group.rotateOnAxis(r.axis, step * r.dir);
      }
      if (layerRef.current) {
        layerRef.current.style.backgroundColor = "transparent";
        layerRef.current.style.opacity = k.toFixed(3);
      }
      return;
    }

    if (layerRef.current) layerRef.current.style.backgroundColor = "transparent";

    const target = flightTarget(
      isHome,
      reduce ? 0 : progressRef.current,
      reduce
    );
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

    // Compute direct vector from drone position to camera so the front view looks straight at the user
    const toCam = new THREE.Vector3().subVectors(persp.position, craft.position).normalize();
    const restingYaw = Math.atan2(toCam.x, toCam.z);
    const restingPitch = -Math.asin(THREE.MathUtils.clamp(toCam.y, -1, 1));

    const roll = reduce ? 0 : THREE.MathUtils.clamp(-spr.vx * 0.62, -0.95, 0.95);
    const pitch = reduce ? restingPitch : THREE.MathUtils.clamp(restingPitch - speed * 0.28, -0.85, 0.1);
    const yaw = reduce ? restingYaw : restingYaw + THREE.MathUtils.clamp(-spr.vx * 0.36, -0.55, 0.55);

    const damp = reduce ? 1 : 8;
    body.rotation.y = THREE.MathUtils.damp(body.rotation.y, yaw, damp, dt);
    body.rotation.x = THREE.MathUtils.damp(body.rotation.x, pitch, damp, dt);
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, roll, damp, dt);

    if (!reduce) {
      const step = dt * 64;
      for (const r of rotors.current) {
        r.group.rotateOnAxis(r.axis, step * r.dir);
      }
    }

    if (layerRef.current) layerRef.current.style.opacity = "1";
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
  const { intro, finishIntro, notifyModelReady } = useSplashGate();
  const [location, setLocation] = useLocation();
  const isHome = location === "/";
  const layerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const introRef = useRef(intro);
  const handoffRef = useRef<SplashHandoff>({ blend: 0 });
  const [hidden, setHidden] = useState(false);
  introRef.current = intro;
  const live = !hidden && intro !== "classic";

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      notifyModelReady();
    }
  }, [isMobile, notifyModelReady]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    markHeroWebgl(live);
    return () => markHeroWebgl(false);
  }, [live]);

  // Page scroll tracking on Home: glides diagonally from top-left to bottom-right
  useEffect(() => {
    if (reduce || intro !== "none" || isMobile || !isHome) return;
    const trigger = ScrollTrigger.create({
      start: 0,
      end: () => Math.max(document.documentElement.scrollHeight - window.innerHeight, 1),
      scrub: 0.1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => {
      window.clearTimeout(refresh);
      trigger.kill();
    };
  }, [reduce, intro, isMobile, isHome]);

  const handleContactClick = () => {
    if (location !== "/") {
      setLocation("/");
      setTimeout(() => {
        const target = document.getElementById("sec-contact") || document.getElementById("reach-us");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 200);
    } else {
      const target = document.getElementById("sec-contact") || document.getElementById("reach-us");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  if (isMobile) {
    return (
      <>
        {intro === "video" && <VideoSplash handoffRef={handoffRef} onDone={finishIntro} />}
        {intro === "reduced" && <ReducedSplash onDone={finishIntro} />}
      </>
    );
  }

  const frameloop = !live || reduce ? "demand" : "always";

  const canvas = (
    <div
      ref={layerRef}
      className="flight-canvas pointer-events-none"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Canvas
        style={{ pointerEvents: "none" }}
        dpr={[1, 1.25]}
        frameloop={frameloop}
        camera={{ position: [1.6, 0.9, 2.1], fov: 32, near: 0.05, far: 80 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <StudioLights />
        <DroneModel
          isHome={isHome}
          reduce={reduce}
          progressRef={progressRef}
          layerRef={layerRef}
          introRef={introRef}
          handoffRef={handoffRef}
        />
      </Canvas>
    </div>
  );

  // The drone itself is the link to the Contact Us section when at bottom-right
  const droneLink = !isMobile && (
    <div
      onClick={handleContactClick}
      className="fixed z-40 cursor-pointer pointer-events-auto rounded-full"
      style={{
        right: "max(12px, calc(9.5vw - 90px))",
        bottom: "max(12px, calc(13.5vh - 80px))",
        width: "190px",
        height: "170px",
      }}
      title="Contact Us"
      aria-label="Click drone to contact Cybotz"
    />
  );

  return (
    <>
      {createPortal(canvas, document.body)}
      {droneLink && createPortal(droneLink, document.body)}
      {intro === "video" && <VideoSplash handoffRef={handoffRef} onDone={finishIntro} />}
      {intro === "reduced" && <ReducedSplash onDone={finishIntro} />}
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
  const { intro, abortToClassic, finishIntro, notifyModelReady } = useSplashGate();

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      notifyModelReady();
    }
  }, [isMobile, notifyModelReady]);

  if (isMobile || !glOk) return null;

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
