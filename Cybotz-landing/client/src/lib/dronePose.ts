/** Shared spring target. Scroll and the intro write it; the canvas only reads it. */

export type DroneTarget = {
  x: number;
  y: number;
  s: number;
  yaw: number;
  pitch: number;
  roll: number;
  explode: number;
  blueprint: number;
  sensor: number;
  prop: number;
  opacity: number;
  altitude: number;
  rim: string;
};

export const deg = (n: number) => (n * Math.PI) / 180;

export const live: DroneTarget = {
  x: 0.46,
  y: 0.04,
  s: 0.62,
  yaw: deg(28),
  pitch: deg(8),
  roll: 0,
  explode: 0,
  blueprint: 0,
  sensor: 0,
  prop: 52,
  opacity: 1,
  altitude: 0.35,
  rim: "",
};

/** While true, the scroll sampler must not overwrite the intro tween. */
export let introDriving = false;

export function setIntroDriving(on: boolean) {
  introDriving = on;
}

export function writePose(partial: Partial<DroneTarget>) {
  Object.assign(live, partial);
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribePose(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function publishPose() {
  listeners.forEach((fn) => fn());
}

export function heroKey(width: number): Pick<DroneTarget, "x" | "y" | "s" | "yaw" | "pitch" | "roll"> {
  const yaw = deg(28);
  const pitch = deg(6);
  if (width < 768) return { x: 0, y: -0.08, s: 0.52, yaw, pitch, roll: 0 };
  if (width < 1024) return { x: 0, y: -0.22, s: 0.58, yaw, pitch, roll: 0 };
  if (width < 1280) return { x: 0.74, y: 0.02, s: 0.98, yaw, pitch, roll: 0 };
  return { x: 0.84, y: 0.0, s: 1.12, yaw, pitch, roll: 0 };
}

/** Centered, large enough to read on the paper field while the intro flies. */
export function approachKey(width: number): Pick<DroneTarget, "x" | "y" | "s" | "yaw" | "pitch" | "roll"> {
  const yaw = deg(22);
  const pitch = deg(8);
  if (width < 768) return { x: 0, y: 0, s: 0.78, yaw, pitch, roll: 0 };
  return { x: 0, y: 0.02, s: 0.92, yaw, pitch, roll: 0 };
}
