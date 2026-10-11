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
      const netMid = netTop + network.offsetHeight * 0.5 - vh * 0.5;
      const mastTop = docTop(mastery);
      const contactTop = docTop(contact);
      const contactMid = contactTop + contact.offsetHeight * 0.5 - vh * 0.5;

      let padX = 0.55;
      let padY = -0.05;
      if (pad) {
        const rect = pad.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        padX = (cx / Math.max(window.innerWidth, 1)) * 2 - 1;
        padY = -((cy / Math.max(vh, 1)) * 2 - 1);
      }

      const stage = width < 1280 ? 0.5 : 0.58;
      const k1: Key = { ...idle, prop: 52 };
      const k2: Key = { x: 0.1, y: 0.52, s: 0.3, yaw: deg(-70), pitch: deg(14), roll: deg(-16), explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 1, altitude: 0.45 };
      const k3: Key = { x: 0.38, y: 0, s: stage, yaw: deg(35), pitch: deg(10), roll: 0, explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 1, altitude: 0.35 };
      const k4: Key = { ...k3, yaw: deg(65), explode: 1 };
      const k5: Key = { ...k3, y: 0.02, s: stage - 0.03, yaw: deg(110), pitch: deg(18), explode: 0, blueprint: 1 };
      const k6: Key = { ...k3, y: 0.06, s: stage - 0.06, yaw: deg(180), pitch: deg(62), blueprint: 0, sensor: 1 };
      const k7: Key = { x: 0.86, y: 0.62, s: 0.18, yaw: deg(-40), pitch: deg(12), roll: deg(14), explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 1, altitude: 0.5 };
      const k8: Key = { x: 1.35, y: 0.8, s: 0.16, yaw: deg(-60), pitch: deg(16), roll: deg(20), explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 0, altitude: 0.4 };
      const k9: Key = { x: padX, y: padY + 0.12, s: 0.34, yaw: deg(20), pitch: deg(6), roll: 0, explode: 0, blueprint: 0, sensor: 0, prop: 52, opacity: 1, altitude: 0.28 };
      const k10: Key = { ...k9, y: padY, pitch: 0, prop: 0, altitude: 0 };

      const heroSplit = heroTop + heroH * 0.4;
      let pose = k1;
      if (y < heroSplit) pose = k1;
      else if (y < telemMid) pose = mix(k1, k2, easeInOut(clamp01((y - heroSplit) / Math.max(1, telemMid - heroSplit))));
      else if (y < pinStart) pose = mix(k2, k3, easeOut(clamp01((y - telemMid) / Math.max(1, pinStart - telemMid))));
      else if (pinU < 1 && y < netTop - vh * 0.2) {
        if (pinU < 0.33) pose = mix(k3, k4, easeInOut(pinU / 0.33));
        else if (pinU < 0.66) pose = mix(k4, k5, easeInOut((pinU - 0.33) / 0.33));
        else pose = mix(k5, k6, easeInOut((pinU - 0.66) / 0.34));
      } else if (y < netMid) pose = mix(k6, k7, easeInOut(clamp01((y - (netTop - vh * 0.8)) / Math.max(1, netMid - (netTop - vh * 0.8)))));
      else if (y < mastTop + mastery.offsetHeight * 0.45) {
        const u = clamp01((y - (mastTop - vh * 0.1)) / Math.max(1, vh * 0.5));
        pose = mix(k7, k8, easeInOut(u));
      } else if (y < contactMid) pose = mix(k8, k9, expo(clamp01((y - (contactTop - vh * 0.3)) / Math.max(1, contactMid - (contactTop - vh * 0.3)))));
      else pose = mix(k9, k10, easeOut(clamp01((y - contactMid) / Math.max(1, vh * 0.45))));

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
    apply();

    return () => {
      window.removeEventListener("resize", apply);
      ScrollTrigger.removeEventListener("refresh", apply);
      trigger.kill();
    };
  }, [active]);
}
