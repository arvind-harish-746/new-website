import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, PerformanceMonitor, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { useSplashGate } from "@/components/SplashScreen";
import { live, subscribePose } from "@/lib/dronePose";

const MODEL = "/models/drone.glb";

useGLTF.setDecoderPath("/draco/");
useGLTF.preload(MODEL, "/draco/", false);

const VIEW_DIR = new THREE.Vector3(1.02, 0.1, 1.18).normalize();
const NDC_LIMIT = 0.7;

function posedCorners(box: THREE.Box3) {
  const base: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) base.push(new THREE.Vector3(x, y, z));
    }
  }
  const poses: Array<[number, number, number]> = [
    [0.49, 0.14, 0],
    [1.15, 0.31, -0.28],
    [3.14, 1.08, 0],
  ];
  const points: THREE.Vector3[] = [];
  for (const [yaw, pitch, roll] of poses) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, "YXZ"));
    for (const corner of base) points.push(corner.clone().applyQuaternion(q));
  }
  return points;
}

function frameCamera(camera: THREE.PerspectiveCamera, points: THREE.Vector3[], aspect: number, fov: number) {
  camera.fov = fov;
  let radius = 0.001;
  for (const point of points) radius = Math.max(radius, point.length());
  const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * Math.max(aspect, 0.35));
  let dist = radius / Math.sin(Math.min(vHalf, hHalf));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    camera.position.copy(VIEW_DIR).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    camera.near = Math.max(0.01, dist / 90);
    camera.far = dist * 30;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
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
    const fov = size.width < 768 ? 34 : 30;
    frameCamera(persp, points, size.width / Math.max(size.height, 1), fov);
    invalidate();
  }, [camera, points, size, invalidate]);
  return null;
}

function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  gradient.addColorStop(0, "rgba(11, 22, 32, 0.72)");
  gradient.addColorStop(1, "rgba(11, 22, 32, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function blurTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(64, 64, 18, 64, 64, 62);
  gradient.addColorStop(0, "rgba(14, 16, 20, 0)");
  gradient.addColorStop(0.42, "rgba(14, 16, 20, 0.05)");
  gradient.addColorStop(0.72, "rgba(14, 16, 20, 0.55)");
  gradient.addColorStop(1, "rgba(14, 16, 20, 0.15)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function tuneMaterials(root: THREE.Object3D) {
  const names: string[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material;
    const list = Array.isArray(source) ? source : [source];
    list.forEach((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      const name = mat.name || "";
      if (names.length < 24 && !names.includes(name)) names.push(name);
      const next = new THREE.MeshPhysicalMaterial({
        name,
        map: mat.map,
        color: mat.color,
        roughness: 0.42,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1,
      });
      if (/carbone|carbon/i.test(name)) next.roughness = 0.5;
      if (/metall|metal|motor/i.test(name)) {
        next.metalness = 1;
        next.roughness = 0.28;
        next.clearcoat = 0.05;
      }
      if (/lens|glass/i.test(name)) {
        next.color.set("#0A0F14");
        next.roughness = 0.04;
        next.envMapIntensity = 2;
      }
      if (/rubber|prop|spin/i.test(name)) next.roughness = 0.35;
      mat.dispose();
      mesh.material = next;
    });
  });
  if (import.meta.env.DEV) console.info("[drone] materials", names.join(", "));
}

function integrate(pos: number, vel: number, target: number, dt: number) {
  const omega = 6;
  const zeta = 0.86;
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

function DroneModel({ reduce, layerRef }: { reduce: boolean; layerRef: React.RefObject<HTMLDivElement | null> }) {
  const { scene } = useGLTF(MODEL, "/draco/", false);
  const flight = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const spins = useRef<THREE.Object3D[]>([]);
  const discs = useRef<THREE.Mesh[]>([]);
  const glows = useRef<THREE.Mesh[]>([]);
  const bodyMats = useRef<THREE.Material[]>([]);
  const coneRef = useRef<THREE.Mesh>(null);
  const parts = useRef<{ child: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3 }[]>([]);
  const edges = useRef<THREE.LineSegments[]>([]);
  const { camera, size } = useThree();
  const notifyModelReady = useSplashGate().notifyModelReady;
  const spring = useRef({ x: 0.2, y: 0.1, s: 0.3, vx: 0, vy: 0, vs: 0, yaw: 0.2, ready: false });
  const spinRate = useRef(0);
  const axes = useRef({ right: new THREE.Vector3(), up: new THREE.Vector3() });
  const tickerAt = useRef(0);
  const told = useRef(false);
  const projectTmp = useRef(new THREE.Vector3());
  const projectNdc = useRef(new THREE.Vector3());
  const calloutNodes = useRef<null | {
    svg: SVGSVGElement;
    parts: { line: SVGLineElement; dot: SVGCircleElement; text: SVGTextElement }[];
  }>(null);
  const reticleEl = useRef<HTMLElement | null>(null);

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
    tuneMaterials(root);
    const box = new THREE.Box3().setFromObject(root);
    const pivot = new THREE.Group();
    pivot.add(root);
    const found: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (/spins|propeller|rotor|blade/i.test(obj.name)) found.push(obj);
    });
    spins.current = found;
    if (import.meta.env.DEV) console.info("[drone] prop nodes", found.length);

    let host: THREE.Object3D = root;
    while (host.children.length === 1) host = host.children[0];
    const airframe = host.children.find((child) => child.children.length > 8) ?? host;
    parts.current = airframe.children
      .filter((child) => !/text/i.test(child.name))
      .map((child) => {
        const center = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
        const dir = center.clone();
        if (dir.length() < 0.05) dir.set(0, 0.2, 0);
        dir.normalize().multiplyScalar(0.62 * Math.max(center.length(), 0.15));
        return { child, base: child.position.clone(), dir };
      });

    const edgeMat = new THREE.LineBasicMaterial({ color: "#0575CE", transparent: true, opacity: 0 });
    const built: THREE.LineSegments[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position")?.count ?? 0;
      if (count < 80 || count > 9000 || built.length > 18) return;
      const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), edgeMat);
      mesh.add(lines);
      built.push(lines);
    });
    edges.current = built;

    const footprint = box.getSize(new THREE.Vector3());
    const span = Math.min(footprint.x, footprint.z);
    pivot.updateMatrixWorld(true);
    const propLocal = new THREE.Vector3(0.55, 0.08, 0.2);
    const sample = new THREE.Vector3();
    let propReach = 0;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const attr = mesh.geometry.getAttribute("position");
      if (!attr || attr.count < 24) return;
      const step = Math.max(1, Math.floor(attr.count / 280));
      for (let i = 0; i < attr.count; i += step) {
        sample.fromBufferAttribute(attr, i);
        mesh.localToWorld(sample);
        pivot.worldToLocal(sample);
        const reach = sample.length();
        if (reach > propReach) {
          propReach = reach;
          propLocal.copy(sample);
        }
      }
    });
    const armTips: THREE.Vector3[] = [];
    const bins = new Map<number, { reach: number; point: THREE.Vector3 }>();
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (mesh.userData.led || mesh.userData.disc) return;
      const attr = mesh.geometry.getAttribute("position");
      if (!attr || attr.count < 24) return;
      const step = Math.max(1, Math.floor(attr.count / 180));
      for (let i = 0; i < attr.count; i += step) {
        sample.fromBufferAttribute(attr, i);
        mesh.localToWorld(sample);
        pivot.worldToLocal(sample);
        const reach = Math.hypot(sample.x, sample.z);
        const bin = Math.floor(((Math.atan2(sample.x, sample.z) + Math.PI) / (Math.PI * 2)) * 4) % 4;
        const prev = bins.get(bin);
        if (!prev || reach > prev.reach) bins.set(bin, { reach, point: sample.clone() });
      }
    });
    bins.forEach((bin) => armTips.push(bin.point));

    const halo = (color: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      const texture = new THREE.CanvasTexture(canvas);
      if (!ctx) return texture;
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.12, color);
      gradient.addColorStop(0.45, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      texture.needsUpdate = true;
      return texture;
    };
    const cyanHalo = halo("rgba(56,182,255,0.9)");
    const orangeHalo = halo("rgba(249,116,5,0.9)");
    const glowMeshes: THREE.Mesh[] = [];
    armTips.forEach((tip, index) => {
      const color = index % 2 === 0 ? "#38B6FF" : "#F97405";
      const at = tip.clone().multiplyScalar(0.88);
      at.y += 0.015;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.0045, 8, 6),
        new THREE.MeshBasicMaterial({ color, toneMapped: false })
      );
      bulb.position.copy(at);
      bulb.userData.led = true;
      pivot.add(bulb);
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.014, 16),
        new THREE.MeshBasicMaterial({
          map: index % 2 === 0 ? cyanHalo : orangeHalo,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      glow.position.copy(at);
      glow.userData.led = true;
      pivot.add(glow);
      glowMeshes.push(glow);
    });
    glows.current = glowMeshes;

    const map = blurTexture();
    const discMat = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const made: THREE.Mesh[] = [];
    const discHosts = armTips.length ? armTips : [propLocal];
    discHosts.forEach((tip) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.11, 28), discMat.clone());
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(tip);
      disc.visible = false;
      disc.userData.disc = true;
      pivot.add(disc);
      made.push(disc);
    });
    if (!made.length && found.length) {
      found.forEach((node) => {
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.11, 28), discMat.clone());
        disc.rotation.x = -Math.PI / 2;
        disc.visible = false;
        node.add(disc);
        made.push(disc);
      });
    }
    discs.current = made;

    const cloud: THREE.Vector3[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || /text/i.test(`${mesh.name} ${mesh.parent?.name || ""}`)) return;
      const attr = mesh.geometry.getAttribute("position");
      if (!attr) return;
      const step = Math.max(1, Math.floor(attr.count / 220));
      for (let i = 0; i < attr.count && cloud.length < 8000; i += step) {
        sample.fromBufferAttribute(attr, i);
        mesh.localToWorld(sample);
        pivot.worldToLocal(sample);
        cloud.push(sample.clone());
      }
    });
    const nearest = (target: THREE.Vector3) => cloud.reduce((best, point) => (
      point.distanceToSquared(target) < best.distanceToSquared(target) ? point : best
    ), cloud[0] ?? target);
    const centroid = (points: THREE.Vector3[]) => {
      const sum = new THREE.Vector3();
      if (!points.length) return sum;
      points.forEach((point) => sum.add(point));
      return sum.multiplyScalar(1 / points.length);
    };
    const maxReach = cloud.reduce((best, point) => Math.max(best, Math.hypot(point.x, point.z)), 0.01);
    const armBins: THREE.Vector3[][] = [[], [], [], []];
    cloud.forEach((point) => {
      const reach = Math.hypot(point.x, point.z);
      if (reach < maxReach * 0.35) return;
      const bin = Math.floor(((Math.atan2(point.x, point.z) + Math.PI) / (Math.PI * 2)) * 4) % 4;
      armBins[bin].push(point);
    });
    const arm = armBins.reduce((best, bin) => (bin.length > best.length ? bin : best), armBins[0]);
    const armMax = arm.reduce((best, point) => Math.max(best, Math.hypot(point.x, point.z)), 0.01);
    const propPts = arm.filter((point) => Math.hypot(point.x, point.z) > armMax * 0.82);
    const motorPts = arm.filter((point) => {
      const reach = Math.hypot(point.x, point.z);
      return reach > armMax * 0.48 && reach < armMax * 0.72;
    });
    const propAnchor = centroid(propPts.length ? propPts : arm.length ? arm : [propLocal]);
    const motorLocal = centroid(motorPts.length ? motorPts : [propAnchor.clone().multiplyScalar(0.68)]);
    const denseAt = (bin: THREE.Vector3[], radius: number) => {
      const sample = bin.filter((_, index) => index % 4 === 0);
      let best = sample[0] ?? bin[0];
      let bestScore = -1;
      sample.forEach((point) => {
        const reach = Math.hypot(point.x, point.z);
        if (Math.abs(reach - radius) > radius * 0.16) return;
        let neighbors = 0;
        sample.forEach((other) => {
          if (point.distanceToSquared(other) < 0.003) neighbors += 1;
        });
        if (neighbors > bestScore) {
          bestScore = neighbors;
          best = point;
        }
      });
      return best;
    };
    const arms = armBins
      .filter((bin) => bin.length > 8)
      .map((bin) => {
        const peak = bin.reduce((best, point) => Math.max(best, Math.hypot(point.x, point.z)), 0.01);
        return { outer: denseAt(bin, peak * 0.9), inner: denseAt(bin, peak * 0.58) };
      });
    const camSum = new THREE.Vector3();
    let camCount = 0;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const host = `${mesh.parent?.name || ""} ${mesh.name}`;
      if (!/camera/i.test(host)) return;
      const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      pivot.worldToLocal(center);
      camSum.add(center);
      camCount += 1;
    });
    let cameraLocal = camCount
      ? camSum.multiplyScalar(1 / camCount)
      : new THREE.Vector3(0, 0.04, box.max.z * 0.55);
    if (cameraLocal.length() < 0.22) cameraLocal = new THREE.Vector3(0, 0.04, Math.max(0.38, box.max.z * 0.55));
    cameraLocal = nearest(cameraLocal);
    const mats: THREE.Material[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      list.forEach((mat) => {
        if (!mat || !(mat instanceof THREE.Material)) return;
        if (!mats.includes(mat)) mats.push(mat);
      });
    });
    bodyMats.current = mats;
    return {
      root: pivot,
      points: posedCorners(box),
      shadow: { y: box.min.y + 0.02, w: span * 1.05, d: span * 0.62 },
      anchors: {
        prop: propAnchor,
        motor: motorLocal,
        camera: cameraLocal,
        fc: nearest(new THREE.Vector3(0, 0.04, 0)),
      },
      arms,
    };
  }, [scene]);

  const shadowMap = useMemo(() => shadowTexture(), []);

  useFrame((state, rawDt) => {
    const craft = flight.current;
    const body = rig.current;
    if (!craft || !body) return;
    const dt = Math.min(rawDt, 0.05);
    const persp = camera as THREE.PerspectiveCamera;
    const { right, up } = axes.current;
    body.rotation.order = "YXZ";

    const spr = spring.current;
    if (!spr.ready || reduce) {
      spr.x = live.x;
      spr.y = live.y;
      spr.s = live.s;
      spr.yaw = live.yaw;
      spr.vx = 0;
      spr.vy = 0;
      spr.vs = 0;
      spr.ready = true;
    }
    if (!reduce) {
      [spr.x, spr.vx] = integrate(spr.x, spr.vx, live.x, dt);
      [spr.y, spr.vy] = integrate(spr.y, spr.vy, live.y, dt);
      [spr.s, spr.vs] = integrate(spr.s, spr.vs, live.s, dt);
      spr.yaw = THREE.MathUtils.damp(spr.yaw, live.yaw, 6, dt);
    }

    const speed = Math.hypot(spr.vx, spr.vy);
    const idle = speed < 0.02 ? 1 : speed > 0.1 ? 0 : 1 - (speed - 0.02) / 0.08;
    const grounded = live.altitude < 0.04 && live.prop < 2;
    const t = state.clock.elapsedTime;
    const bob = reduce || grounded ? 0 : Math.sin(t * Math.PI * 2 * 0.42) * 0.008 * idle;
    const drift = reduce || grounded ? 0 : Math.sin(t * Math.PI * 2 * 0.17) * 0.004 * idle;

    persp.updateMatrixWorld();
    right.setFromMatrixColumn(persp.matrixWorld, 0);
    up.setFromMatrixColumn(persp.matrixWorld, 1);
    const dist = Math.max(persp.position.length(), 0.001);
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2);
    const halfW = halfH * Math.max(persp.aspect, 0.35);
    craft.position.set(0, 0, 0).addScaledVector(right, (spr.x + drift) * halfW).addScaledVector(up, (spr.y + bob) * halfH);
    craft.scale.setScalar(Math.max(0.08, spr.s));

    const bank = THREE.MathUtils.clamp(-spr.vx * 0.45, -0.31, 0.31);
    const nose = THREE.MathUtils.clamp(speed * 0.18, 0, 0.21);
    const yawTravel = THREE.MathUtils.clamp(spr.vx * 0.3, -0.35, 0.35);
    const micro = reduce || grounded ? 0 : Math.sin(t * Math.PI * 2 * 0.31) * 0.0105 * idle;
    body.rotation.y = THREE.MathUtils.damp(body.rotation.y, spr.yaw + yawTravel, 6, dt);
    body.rotation.x = THREE.MathUtils.damp(body.rotation.x, live.pitch + nose, 6, dt);
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, live.roll + bank + micro, 6, dt);

    const targetRate = reduce ? 0 : live.prop;
    spinRate.current = THREE.MathUtils.damp(spinRate.current, targetRate, 4, dt);
    const fast = spinRate.current > 20 && !reduce;
    for (const node of spins.current) {
      node.visible = !fast;
      if (!fast) node.rotateY(spinRate.current * dt);
    }
    for (const glow of glows.current) glow.quaternion.copy(persp.quaternion);
    for (const disc of discs.current) {
      disc.visible = fast || reduce;
      const mat = disc.material as THREE.MeshBasicMaterial;
      mat.opacity = reduce ? 0.35 : 0.8;
      if (fast) disc.rotateZ(3 * dt);
    }

    const explode = reduce ? 0 : live.explode;
    for (const part of parts.current) {
      part.child.position.copy(part.base).addScaledVector(part.dir, explode);
    }
    const blueprint = reduce ? 0 : live.blueprint;
    const bodyOpacity = 1 - blueprint * 0.92;
    for (const mat of bodyMats.current) {
      mat.transparent = blueprint > 0.02;
      mat.opacity = blueprint > 0.02 ? bodyOpacity : 1;
    }
    for (const line of edges.current) {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = blueprint;
      line.visible = blueprint > 0.04;
    }

    if (shadowRef.current) {
      const hide = live.sensor > 0.45;
      shadowRef.current.visible = !hide && live.opacity > 0.2;
      const alt = live.altitude;
      const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 * (1 - THREE.MathUtils.clamp(alt / 0.7, 0, 1));
      const grow = 1 + alt * 0.6;
      shadowRef.current.scale.set(grow, grow, 1);
    }

    if (coneRef.current) {
      coneRef.current.visible = live.sensor > 0.02;
      const mat = coneRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 * live.sensor;
    }

    if (layerRef.current) layerRef.current.style.opacity = live.opacity.toFixed(3);

    if (!told.current) {
      told.current = true;
      document.documentElement.dataset.droneFrame = "1";
      window.dispatchEvent(new Event("cybotz-drone-frame"));
    }

    const settled = Math.hypot(spr.vx, spr.vy) < 0.03 && Math.abs(spr.s - live.s) < 0.05;
    const showCallouts = size.width >= 1280
      && settled
      && document.documentElement.dataset.hero === "on"
      && document.documentElement.dataset.introPhase !== "flight";
    if (calloutNodes.current && !calloutNodes.current.svg.isConnected) calloutNodes.current = null;
    if (!reticleEl.current || !reticleEl.current.isConnected) {
      reticleEl.current = document.getElementById("hero-reticle");
    }
    if (!showCallouts) {
      calloutNodes.current?.svg.classList.remove("is-live");
      reticleEl.current?.classList.remove("is-live");
    } else {
      if (reticleEl.current) {
        craft.updateMatrixWorld(true);
        const tmp = projectTmp.current.set(0, 0, 0);
        craft.localToWorld(tmp);
        const ndc = tmp.project(camera);
        const rx = (ndc.x * 0.5 + 0.5) * size.width;
        const ry = (-ndc.y * 0.5 + 0.5) * size.height;
        reticleEl.current.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`;
        reticleEl.current.classList.add("is-live");
      }
      if (!calloutNodes.current) {
        const svg = document.getElementById("hero-callouts");
        if (svg instanceof SVGSVGElement) {
          const parts = ["prop", "motor", "camera", "fc"].map((id) => {
            const group = svg.querySelector(`[data-part="${id}"]`);
            return {
              line: group?.querySelector("line") as SVGLineElement,
              dot: group?.querySelector("circle") as SVGCircleElement,
              text: group?.querySelector("text") as SVGTextElement,
            };
          });
          if (parts.every((part) => part.line && part.dot && part.text)) {
            calloutNodes.current = { svg, parts };
          }
        }
      }
      const nodes = calloutNodes.current;
      if (nodes) {
        craft.updateMatrixWorld(true);
        const w = size.width;
        const h = size.height;
        if (nodes.svg.dataset.w !== String(w) || nodes.svg.dataset.h !== String(h)) {
          nodes.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
          nodes.svg.dataset.w = String(w);
          nodes.svg.dataset.h = String(h);
        }
        const keys = ["prop", "motor", "camera", "fc"] as const;
        const points = keys.map((key) => {
          const tmp = projectTmp.current;
          tmp.copy(fitted.anchors[key]);
          fitted.root.localToWorld(tmp);
          const ndc = projectNdc.current.copy(tmp).project(camera);
          return { x: (ndc.x * 0.5 + 0.5) * w, y: (-ndc.y * 0.5 + 0.5) * h };
        });
        const projectLocal = (vec: THREE.Vector3) => {
          const tmp = projectTmp.current;
          tmp.copy(vec);
          fitted.root.localToWorld(tmp);
          const ndc = projectNdc.current.copy(tmp).project(camera);
          return { x: (ndc.x * 0.5 + 0.5) * w, y: (-ndc.y * 0.5 + 0.5) * h };
        };
        const visibleArms = fitted.arms
          .map((arm) => ({ outer: projectLocal(arm.outer), inner: projectLocal(arm.inner) }))
          .filter((arm) => arm.outer.x > 64 && arm.outer.x < w - 48 && arm.outer.y > 96 && arm.outer.y < h - 64);
        const showPart = (index: number, on: boolean) => {
          const node = nodes.parts[index];
          const display = on ? "" : "none";
          node.line.style.display = display;
          node.dot.style.display = display;
          node.text.style.display = display;
        };
        if (visibleArms.length) {
          const fc = points[3];
          visibleArms.sort((a, b) => {
            const da = (a.outer.x - fc.x) ** 2 + (a.outer.y - fc.y) ** 2;
            const db = (b.outer.x - fc.x) ** 2 + (b.outer.y - fc.y) ** 2;
            return db - da;
          });
          points[0] = visibleArms[0].outer;
          points[1] = visibleArms[0].inner;
          showPart(0, true);
          showPart(1, true);
        } else {
          showPart(0, false);
          showPart(1, false);
        }
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const point of points) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
        const labelW = [128, 176, 132, 196];
        const row = 16;
        const gap = 26;
        const stack = points.length * row + (points.length - 1) * gap;
        const right = maxX + 28;
        const top = minY - 20;
        const mode: "right" | "above" | "hide" = w - right >= 210
          ? "right"
          : top - 88 >= stack
            ? "above"
            : "hide";
        if (mode === "hide") {
          nodes.svg.classList.remove("is-live");
        } else {
        const order = points.map((point, index) => ({ index, ax: point.x, ay: point.y }));
        order.sort((a, b) => a.ay - b.ay);
        const columnX = mode === "right"
          ? Math.min(right, w - 210)
          : Math.max(w * 0.42, Math.min(minX - 8, w * 0.62));
        let cursor = mode === "right"
          ? THREE.MathUtils.clamp(minY, 100, h - stack - 24)
          : Math.max(96, top - stack);
        order.forEach((item) => {
          item.ay = points[item.index].y;
          const node = nodes.parts[item.index];
          const labelX = columnX;
          const labelY = cursor + row * 0.75;
          cursor += row + gap;
          const anchor = points[item.index];
          node.line.setAttribute("x1", labelX.toFixed(1));
          node.line.setAttribute("y1", labelY.toFixed(1));
          node.line.setAttribute("x2", anchor.x.toFixed(1));
          node.line.setAttribute("y2", anchor.y.toFixed(1));
          node.dot.setAttribute("cx", anchor.x.toFixed(1));
          node.dot.setAttribute("cy", anchor.y.toFixed(1));
          node.text.setAttribute("x", (labelX + 10).toFixed(1));
          node.text.setAttribute("y", labelY.toFixed(1));
          node.text.setAttribute("text-anchor", "start");
          node.text.setAttribute("data-w", String(labelW[item.index]));
        });
        nodes.svg.classList.add("is-live");
        }
      }
    }

    if (t - tickerAt.current > 0.1) {
      tickerAt.current = t;
      const ticker = document.getElementById("flight-ticker");
      if (ticker) {
        const alt = (1.2 + spr.y * 0.4).toFixed(1);
        const hdg = Math.round((THREE.MathUtils.radToDeg(body.rotation.y) + 360) % 360);
        ticker.textContent = `ALT ${alt} m · HDG ${hdg}° · BAT 98%`;
      }
    }
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, fitted.shadow.y - 0.02, 0]} renderOrder={-2}>
        <planeGeometry args={[fitted.shadow.w * 1.2, fitted.shadow.d * 0.7]} />
        <meshBasicMaterial color="#9AABBA" transparent opacity={0.08} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={rig}>
        <primitive object={fitted.root} />
        <mesh ref={coneRef} position={[0, -0.05, 0.55]} visible={false} rotation={[1.15, 0, 0]}>
          <coneGeometry args={[0.34, 0.9, 20, 1, true]} />
          <meshBasicMaterial color="#0575CE" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function RigLights() {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.02;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    scene.environmentIntensity = 0.9;
    scene.environmentRotation.set(0, 1.2, 0);
  }, [gl, scene]);
  return (
    <>
      <directionalLight position={[-3.2, 6.4, 3.4]} intensity={2.4} color="#FFF8F0" />
      <directionalLight position={[4.2, 1.6, -4.6]} intensity={0.16} color="#C5E4FF" />
      <directionalLight position={[-2.8, 0.2, -3.2]} intensity={0.1} color="#F97405" />
      <directionalLight position={[0.2, -1.4, 3.2]} intensity={0.35} color="#FFFFFF" />
    </>
  );
}

function HeroCanvas({ reduce }: { reduce: boolean }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  const [loop, setLoop] = useState<"always" | "demand">(reduce ? "demand" : "always");
  const [dpr, setDpr] = useState(1.25);
  const [mounted, setMounted] = useState(true);
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;

  useEffect(() => subscribePose(() => {
    const opacity = live.opacity;
    setLoop(document.hidden || reduce || opacity < 0.04 ? "demand" : "always");
  }), [reduce]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const hero = document.getElementById("sec-hero");
    if (!hero || !mobile) return;
    const observer = new IntersectionObserver(
      ([entry]) => setMounted(!!entry?.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [mobile]);

  const canvas = (
    <>
    <div ref={layerRef} className="flight-canvas" aria-hidden="true">
      {mounted && !hidden && (
        <Canvas
          dpr={mobile ? [1, Math.min(dpr, 1.25)] : [1, Math.min(dpr, 1.5)]}
          frameloop={loop}
          camera={{ position: [1.6, 0.9, 2.1], fov: mobile ? 34 : 30, near: 0.05, far: 80 }}
          gl={{ alpha: true, antialias: !mobile, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.02;
          }}
        >
          <PerformanceMonitor onDecline={() => setDpr(1)} />
          <RigLights />
          <Suspense fallback={null}>
            <Environment files="/env/studio_small_09_1k.hdr" />
          </Suspense>
          <Suspense fallback={null}>
            <DroneModel reduce={reduce} layerRef={layerRef} />
          </Suspense>
        </Canvas>
      )}
    </div>
    <svg id="hero-reticle" className="hero-reticle" viewBox="0 0 240 240" aria-hidden="true">
      <circle cx="120" cy="120" r="108" fill="none" stroke="#0575CE" strokeWidth="1" />
      <circle cx="120" cy="120" r="68" fill="none" stroke="#0575CE" strokeWidth="1" strokeDasharray="3 7" />
      <path d="M120 6 V34 M120 206 V234 M6 120 H34 M206 120 H234" stroke="#F97405" strokeWidth="1.5" />
      <circle cx="120" cy="120" r="3" fill="#F97405" />
    </svg>
    <svg id="hero-callouts" className="hero-callouts" aria-hidden="true">
      {([
        ["prop", "PROPELLER"],
        ["motor", "BRUSHLESS MOTOR"],
        ["camera", "FPV CAMERA"],
        ["fc", "FLIGHT CONTROLLER"],
      ] as const).map(([id, label]) => (
        <g className="callout" data-part={id} key={id}>
          <line x1="0" y1="0" x2="0" y2="0" />
          <circle r="4" />
          <text>{label}</text>
        </g>
      ))}
    </svg>
    </>
  );

  return createPortal(canvas, document.body);
}

class HeroErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function webglOk() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return false;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (mem != null && mem < 4) return false;
    if (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency < 4) return false;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return false;
    return true;
  } catch {
    return false;
  }
}

export function HeroCraft() {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [glOk] = useState(() => (typeof window === "undefined" ? false : webglOk()));
  if (!glOk) return null;
  return (
    <HeroErrorBoundary>
      <HeroCanvas reduce={reduce} />
    </HeroErrorBoundary>
  );
}
