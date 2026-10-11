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

const VIEW_DIR = new THREE.Vector3(1.02, 0.4, 1.18).normalize();
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
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  gradient.addColorStop(0, "rgba(11, 22, 32, 0.45)");
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
  gradient.addColorStop(0, "rgba(26, 29, 33, 0)");
  gradient.addColorStop(0.55, "rgba(26, 29, 33, 0.08)");
  gradient.addColorStop(1, "rgba(26, 29, 33, 0.35)");
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
      if (/carbone|carbon|arm|frame/i.test(name) && !mat.map) next.color.set("#1A1D21");
      if (/carbone|carbon|arm|frame/i.test(name)) next.roughness = 0.55;
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
    parts.current = host.children
      .filter((child) => !/camera2/i.test(child.name))
      .map((child) => {
        const center = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
        const dir = center.clone();
        if (dir.length() < 0.05) dir.set(0, 0.2, 0);
        dir.normalize().multiplyScalar(0.35 * Math.max(center.length(), 0.15));
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

    const map = blurTexture();
    const discMat = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const made: THREE.Mesh[] = [];
    const hosts = found.length ? found : [pivot];
    hosts.forEach((node) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(found.length ? 0.16 : 0.22, 32), discMat.clone());
      disc.rotation.x = -Math.PI / 2;
      disc.visible = false;
      node.add(disc);
      made.push(disc);
    });
    discs.current = made;

    const led = (color: string, position: [number, number, number]) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, 0.025),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: color === "#0575CE" ? 2.5 : 2, roughness: 0.4 })
      );
      mesh.position.set(...position);
      pivot.add(mesh);
    };
    led("#0575CE", [0.08, 0.02, 0.42]);
    led("#F97405", [-0.04, 0.02, -0.4]);

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
    const motorLocal = propLocal.clone().multiplyScalar(0.86);
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
    const cameraLocal = camCount
      ? camSum.multiplyScalar(1 / camCount)
      : new THREE.Vector3(0, 0.04, box.max.z * 0.82);
    return {
      root: pivot,
      points: posedCorners(box),
      shadow: { y: box.min.y + 0.02, w: span * 1.05, d: span * 0.62 },
      anchors: {
        prop: propLocal,
        motor: motorLocal,
        camera: cameraLocal,
        fc: new THREE.Vector3(0, 0, 0),
      },
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
    const t = state.clock.elapsedTime;
    const bob = reduce ? 0 : Math.sin(t * Math.PI * 2 * 0.42) * 0.008 * idle;
    const drift = reduce ? 0 : Math.sin(t * Math.PI * 2 * 0.17) * 0.004 * idle;

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
    const micro = reduce ? 0 : Math.sin(t * Math.PI * 2 * 0.31) * 0.0105 * idle;
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
    for (const disc of discs.current) {
      disc.visible = fast || reduce;
      const mat = disc.material as THREE.MeshBasicMaterial;
      mat.opacity = reduce ? 0.35 : 0.9;
      if (fast) disc.rotateZ(3 * dt);
    }

    const explode = reduce ? 0 : live.explode;
    for (const part of parts.current) {
      part.child.position.copy(part.base).addScaledVector(part.dir, explode);
    }
    const blueprint = reduce ? 0 : live.blueprint;
    for (const line of edges.current) {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = blueprint;
      line.visible = blueprint > 0.02;
    }

    if (shadowRef.current) {
      const hide = live.sensor > 0.45;
      shadowRef.current.visible = !hide && live.opacity > 0.2;
      const alt = live.altitude;
      const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.28 * (1 - THREE.MathUtils.clamp(alt / 0.6, 0, 1));
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

    const showCallouts = size.width >= 1024
      && document.documentElement.dataset.hero !== "off"
      && document.documentElement.dataset.introPhase !== "flight";
    if (calloutNodes.current && !calloutNodes.current.svg.isConnected) calloutNodes.current = null;
    if (!showCallouts) {
      calloutNodes.current?.svg.classList.remove("is-live");
    } else {
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
          const point = { x: (ndc.x * 0.5 + 0.5) * w, y: (-ndc.y * 0.5 + 0.5) * h };
          if (key === "prop" || key === "motor") point.y += Math.max(8, 0.018 * spr.s * h);
          return point;
        });
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
        const reach = Math.max(64, 0.24 * spr.s * h);
        minX -= reach;
        maxX += reach;
        minY -= reach * 0.35;
        maxY += reach * 0.35;
        const labelW = 168;
        const side: "left" | "right" | "above" = w - maxX >= labelW + 20
          ? "right"
          : minX >= labelW + 20
            ? "left"
            : "above";
        const placed = points.map((point, index) => ({
          index,
          side,
          x: side === "left" ? minX : side === "right" ? maxX : point.x,
          y: side === "above" ? minY : point.y,
          ax: point.x,
          ay: point.y,
        }));
        if (side === "above") {
          placed.sort((a, b) => a.x - b.x);
          const span = Math.max(labelW, (maxX - minX) / Math.max(1, placed.length));
          placed.forEach((item, index) => {
            item.x = THREE.MathUtils.clamp(minX + span * (index + 0.5), labelW / 2 + 12, w - labelW / 2 - 12);
            item.y = minY;
          });
        } else {
          placed.sort((a, b) => a.y - b.y);
          for (let i = 1; i < placed.length; i += 1) {
            if (placed[i].y < placed[i - 1].y + 28) placed[i].y = placed[i - 1].y + 28;
          }
          for (let i = placed.length - 2; i >= 0; i -= 1) {
            if (placed[i].y > placed[i + 1].y - 28) placed[i].y = placed[i + 1].y - 28;
          }
        }
        placed.forEach((item) => {
          const node = nodes.parts[item.index];
          const labelX = side === "left"
            ? Math.max(labelW + 8, item.x)
            : side === "right"
              ? Math.min(w - labelW - 8, item.x)
              : item.x;
          const labelY = THREE.MathUtils.clamp(item.y, 96, h - 28);
          node.line.setAttribute("x1", labelX.toFixed(1));
          node.line.setAttribute("y1", labelY.toFixed(1));
          node.line.setAttribute("x2", item.ax.toFixed(1));
          node.line.setAttribute("y2", item.ay.toFixed(1));
          node.dot.setAttribute("cx", item.ax.toFixed(1));
          node.dot.setAttribute("cy", item.ay.toFixed(1));
          node.text.setAttribute("x", (side === "left" ? labelX - 12 : side === "right" ? labelX + 12 : labelX).toFixed(1));
          node.text.setAttribute("y", (labelY - (side === "above" ? 10 : -4)).toFixed(1));
          node.text.setAttribute("text-anchor", side === "left" ? "end" : side === "above" ? "middle" : "start");
        });
        nodes.svg.classList.add("is-live");
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
      <group ref={rig}>
        <primitive object={fitted.root} />
        <mesh ref={coneRef} position={[0.15, 0.35, 0.2]} visible={false} rotation={[0.6, 0, 0]}>
          <coneGeometry args={[0.22, 0.7, 16, 1, true]} />
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
    gl.toneMappingExposure = 1.05;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    scene.environmentIntensity = 0.9;
    scene.environmentRotation.set(0, 1.2, 0);
  }, [gl, scene]);
  return (
    <>
      <directionalLight position={[-3, 5.5, 3.5]} intensity={2.2} color="#FFF4E8" />
      <directionalLight position={[2.5, 1.5, -4]} intensity={1.6} color="#9FD4FF" />
      <directionalLight position={[0, -2, 3]} intensity={0.25} color="#FFFFFF" />
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
            gl.toneMappingExposure = 1.05;
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
