import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { deg, heroKey, introDriving, publishPose, writePose, type DroneTarget } from "@/lib/dronePose";

gsap.registerPlugin(ScrollTrigger);

type Key = Pick<DroneTarget, "x" | "y" | "s" | "yaw" | "pitch" | "roll" | "explode" | "blueprint" | "sensor" | "prop" | "opacity" | "altitude">;

const easeInOut = gsap.parseEase("power2.inOut");
const easeOut = gsap.parseEase("power3.out");
const expo = gsap.parseEase("expo.out");

function mix(a: Key, b: Key, t: number): Key {
  const k = { ...a };
  (Object.keys(a) as (keyof Key)[]).forEach((field) => {
    k[field] = a[field] + (b[field] - a[field]) * t;
  });
  return k;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function docTop(el: HTMLElement) {
  return el.getBoundingClientRect().top + window.scrollY;
}

function screenOf(pose: Key, vw: number, vh: number) {
  const cx = ((pose.x + 1) / 2) * vw;
  const cy = ((1 - pose.y) / 2) * vh;
  const rad = 0.42 * Math.max(0.08, pose.s) * vh;
  return { cx, cy, rad };
}

function toPose(pose: Key, cx: number, cy: number, vw: number, vh: number, s = pose.s): Key {
  return {
    ...pose,
    s,
    x: (cx / Math.max(vw, 1)) * 2 - 1,
    y: 1 - 2 * (cy / Math.max(vh, 1)),
  };
}

/** Keep the flyover in the gap above or below the numeral row. */
function dodgeTelemetry(pose: Key, vw: number, vh: number): Key {
  const rects = Array.from(document.querySelectorAll("#sec-telemetry .readout"))
    .map((el) => el.getBoundingClientRect())
    .filter((rect) => rect.width > 8 && rect.bottom > 0 && rect.top < vh);
  if (!rects.length) return pose;
  const box = screenOf(pose, vw, vh);
  const union = {
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    top: Math.min(...rects.map((rect) => rect.top)),
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
  };
  const vRad = box.rad * 0.7;
  const hits = box.cx + box.rad > union.left - 8
    && box.cx - box.rad < union.right + 8
    && box.cy + vRad > union.top - 8
    && box.cy - vRad < union.bottom + 8;
  if (!hits) return pose;
  const header = 88;
  const above = union.top - header;
  const below = vh - union.bottom;
  const need = vRad * 2 + 16;
  let cy = box.cy;
  let s = pose.s;
  let rad = vRad;
  if (above >= need) {
    cy = Math.min(union.top - rad - 14, header + above / 2);
    cy = Math.max(cy, header + rad);
  } else if (below >= need) {
    cy = Math.max(union.bottom + rad + 14, union.bottom + 20);
    cy = Math.min(cy, vh - rad - 8);
  } else {
    const gap = Math.max(above, below, 36);
    s = Math.max(0.12, Math.min(pose.s, (gap - 20) / (0.7 * vh)));
    rad = 0.42 * s * vh * 0.7;
    cy = above >= below ? header + rad + 6 : vh - rad - 10;
  }
  return toPose(pose, box.cx, cy, vw, vh, s);
}

/** Keep the network craft inside the map, clear of the school cards. */
function parkOnMap(pose: Key, vw: number, vh: number): Key {
  if (pose.opacity < 0.05) return pose;
  const map = document.querySelector("#sec-network .city-map");
  if (!(map instanceof Element)) return pose;
  const rect = map.getBoundingClientRect();
  if (rect.width < 40 || rect.bottom < vh * 0.12 || rect.top > vh * 0.82) return pose;
  const grid = document.querySelector("#sec-network .logo-grid");
  const gridRect = grid instanceof Element ? grid.getBoundingClientRect() : null;
  const s = Math.min(pose.s, 0.1);
  const rad = 0.34 * s * vh;
  let cx = rect.left + rect.width * 0.62;
  let cy = rect.top + Math.min(rect.height * 0.12, rad + 14);
  if (gridRect && gridRect.width > 8 && cx + rad > gridRect.left - 10) cx = gridRect.left - rad - 18;
  cx = Math.max(rect.left + rad + 8, Math.min(rect.right - rad - 8, cx));
  cy = Math.max(rect.top + rad + 10, Math.min(rect.bottom - rad - 8, cy));
  return toPose(pose, cx, cy, vw, vh, s);
}

/** Keep the craft off a block of copy. Prefers the gap underneath it. */
function dodgeCopy(pose: Key, selector: string, vw: number, vh: number): Key {
  if (pose.opacity < 0.05) return pose;
  const rects = Array.from(document.querySelectorAll(selector))
    .map((el) => el.getBoundingClientRect())
    .filter((rect) => rect.width > 8 && rect.bottom > 0 && rect.top < vh);
  if (!rects.length) return pose;
  const union = {
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    top: Math.min(...rects.map((rect) => rect.top)),
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
  };
  const box = screenOf(pose, vw, vh);
  const vRad = box.rad * 0.72;
  const hits = box.cx + box.rad > union.left - 16
    && box.cx - box.rad < union.right + 16
    && box.cy + vRad > union.top - 10
    && box.cy - vRad < union.bottom + 10;
  if (!hits) return pose;
  const cx = Math.min(vw * 0.42, Math.max(box.rad + 24, box.cx));
  let cy = union.bottom + vRad + 28;
  if (cy + vRad > vh - 16) cy = Math.max(96 + vRad, union.top - vRad - 20);
  return toPose(pose, cx, cy, vw, vh);
}

/** Slide the small night-band craft off the mastery heading when they meet. */
function dodgeHeading(pose: Key, vw: number, vh: number): Key {
  if (pose.opacity < 0.05) return pose;
  const heading = document.querySelector("#sec-mastery h2");
  if (!(heading instanceof HTMLElement)) return pose;
  const rect = heading.getBoundingClientRect();
  if (rect.width < 8 || rect.bottom < 0 || rect.top > vh) return pose;
  const box = screenOf(pose, vw, vh);
  const vRad = box.rad * 0.7;
  const hits = box.cx + box.rad > rect.left - 12
    && box.cx - box.rad < rect.right + 12
    && box.cy + vRad > rect.top - 8
    && box.cy - vRad < rect.bottom + 8;
  if (!hits) return pose;
  const cx = Math.min(vw - 12, Math.max(box.cx, vw - box.rad * 0.2));
  let cy = rect.bottom + vRad + 18;
  if (cy + vRad > vh - 12) cy = Math.max(88 + vRad, rect.top - vRad - 14);
  return toPose(pose, cx, cy, vw, vh);
}

function markHero() {
  const heroEl = document.getElementById("sec-hero");
  const root = document.documentElement;
  if (!heroEl) {
    root.dataset.hero = "off";
    return;
  }
  const rect = heroEl.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  const ticker = document.getElementById("flight-ticker");
  const tickerTop = ticker ? ticker.getBoundingClientRect().top : rect.bottom;
  const gone = rect.bottom < 72 || rect.top > vh * 0.82 || tickerTop < 80;
  root.dataset.hero = gone ? "off" : "on";
}

/**
 * One scroll sampler. Slot and section positions are read on refresh and resize,
 * never inside the WebGL frame loop.
 */
export function useDroneStage(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.querySelector<HTMLElement>(".home-stage");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const apply = () => {
      markHero();
      if (introDriving) return;
      const width = window.innerWidth;
      const hero = heroKey(width);
      const idle: Key = {
        ...hero,
        explode: 0,
        blueprint: 0,
        sensor: 0,
        prop: reduce ? 0 : 52,
        opacity: 1,
        altitude: 0.35,
      };
      if (reduce || width < 1024) {
        writePose(idle);
        publishPose();
        return;
      }

      const heroEl = document.getElementById("sec-hero");
      const telem = document.getElementById("sec-telemetry");
      const services = document.getElementById("sec-services");
      const network = document.getElementById("sec-network");
      const mastery = document.getElementById("sec-mastery");
      const contact = document.getElementById("sec-contact");
      const pad = document.querySelector<HTMLElement>(".landing-pad");
      if (!heroEl || !telem || !services || !network || !mastery || !contact) {
        writePose(idle);
        publishPose();
        return;
      }

      const y = window.scrollY;
      const vh = window.innerHeight;
      const heroTop = docTop(heroEl);
      const heroH = heroEl.offsetHeight;
      const telemMid = docTop(telem) + telem.offsetHeight * 0.5 - vh * 0.5;
      const pinStart = docTop(services);
      const pinSpan = Math.max(1, services.offsetHeight - vh);
      const pinU = clamp01((y - pinStart) / pinSpan);
      const netTop = docTop(network);
      const mastTop = docTop(mastery);
      const contactTop = docTop(contact);

      let padX = 0.55;
      let padY = -0.05;
      const mark = document.querySelector(".landing-pad svg");
      const padTarget = mark instanceof HTMLElement ? mark : pad;
      if (padTarget) {
        const rect = padTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        padX = (cx / Math.max(window.innerWidth, 1)) * 2 - 1;
        padY = -((cy / Math.max(vh, 1)) * 2 - 1);
      }

      const stage = width < 1280 ? 0.64 : 0.78;
      const k1: Key = { ...idle, prop: 52 };
      const k2: Key = { x: 0.1, y: 0.52, s: 0.3, yaw: deg(-70), pitch: deg(14), roll: deg(-16), explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 1, altitude: 0.45 };
      const k3: Key = { x: 0.38, y: 0, s: stage, yaw: deg(35), pitch: deg(10), roll: 0, explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 1, altitude: 0.35 };
      const k4: Key = { ...k3, yaw: deg(65), explode: 1 };
      const k5: Key = { ...k3, y: 0.02, s: stage - 0.03, yaw: deg(110), pitch: deg(18), explode: 0, blueprint: 1 };
      const k6: Key = { ...k3, y: 0.06, s: stage - 0.06, yaw: deg(180), pitch: deg(62), blueprint: 0, sensor: 1 };
      const k7: Key = { x: -0.42, y: -0.42, s: 0.16, yaw: deg(-40), pitch: deg(12), roll: deg(14), explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 1, altitude: 0.35 };
      const k8: Key = { x: 1.35, y: 0.8, s: 0.16, yaw: deg(-60), pitch: deg(16), roll: deg(20), explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 0, altitude: 0.4 };
      const k9: Key = { x: padX, y: padY + 0.2, s: 0.32, yaw: deg(12), pitch: deg(8), roll: 0, explode: 0, blueprint: 0, sensor: 0, prop: 20, opacity: 1, altitude: 0.2 };
      const k10: Key = { ...k9, y: padY, s: 0.4, yaw: 0, pitch: 0, roll: 0, prop: 0, altitude: 0 };

      const heroSplit = heroTop + heroH * 0.4;
      let pose = k1;
      if (y < heroSplit) pose = k1;
      else if (y < telemMid) pose = mix(k1, k2, easeInOut(clamp01((y - heroSplit) / Math.max(1, telemMid - heroSplit))));
      else if (y < pinStart) pose = mix(k2, k3, easeOut(clamp01((y - telemMid) / Math.max(1, pinStart - telemMid))));
      else if (pinU < 1 && y < netTop - vh * 0.15) {
        if (pinU < 0.08) pose = mix(k3, k4, easeInOut(pinU / 0.08));
        else if (pinU < 0.33) pose = k4;
        else if (pinU < 0.4) pose = mix(k4, k5, easeInOut((pinU - 0.33) / 0.07));
        else if (pinU < 0.66) pose = k5;
        else if (pinU < 0.74) pose = mix(k5, k6, easeInOut((pinU - 0.66) / 0.08));
        else pose = k6;
      } else if (y < netTop) pose = mix(k6, k7, easeInOut(clamp01((y - (netTop - vh * 0.55)) / Math.max(1, vh * 0.55))));
      else if (y < mastTop - vh * 0.25) pose = k7;
      else if (y < mastTop + mastery.offsetHeight * 0.45) {
        const u = clamp01((y - (mastTop - vh * 0.1)) / Math.max(1, vh * 0.5));
        pose = mix(k7, k8, easeInOut(u));
      } else if (padTarget) {
        const rect = padTarget.getBoundingClientRect();
        const onPad = rect.height > 40 && rect.top < vh * 0.68 && rect.bottom > vh * 0.32;
        if (onPad) pose = k10;
        else if (rect.top < vh + 40) pose = k9;
        else pose = mix(k8, k9, expo(clamp01((y - (contactTop - vh * 0.4)) / Math.max(1, vh * 0.35))));
      } else pose = k10;

      pose = dodgeTelemetry(pose, width, vh);
      pose = dodgeHeading(pose, width, vh);
      pose = parkOnMap(pose, width, vh);
      document.documentElement.dataset.landed = pose.prop < 1 && pose.altitude < 0.02 ? "1" : "0";
      writePose(pose);
      publishPose();
    };

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: apply,
    });
    ScrollTrigger.addEventListener("refresh", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, { passive: true });
    apply();

    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      ScrollTrigger.removeEventListener("refresh", apply);
      trigger.kill();
    };
  }, [active]);
}
