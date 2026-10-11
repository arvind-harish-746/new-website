import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll motion for the homepage only.
 *
 * GSAP ScrollTrigger ships with the gsap package already used by the splash — no Lenis,
 * no extra three.js scene. Native scrolling stays intact for mid-range phones. Reveals
 * that must stay readable use immediateRender:false so a failed trigger never hides copy.
 * Pins are desktop-only and short; phones get CSS view-timeline fades instead.
 */
export function useHomeMotion(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.querySelector<HTMLElement>(".home-stage");
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const counters = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));
    const seen = new WeakSet<HTMLElement>();

    const runCount = (el: HTMLElement) => {
      const target = Number(el.dataset.count || 0);
      const suffix = el.dataset.suffix ?? "";
      if (!Number.isFinite(target)) return;
      if (reduce) {
        el.textContent = `${target}${suffix}`;
        return;
      }
      const state = { n: 0 };
      el.textContent = `0${suffix}`;
      gsap.to(state, {
        n: target,
        duration: 1.15,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = `${Math.round(state.n)}${suffix}`;
        },
      });
    };

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          if (seen.has(el)) return;
          seen.add(el);
          runCount(el);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.55 }
    );
    if (!reduce) counters.forEach((el) => counterObserver.observe(el));

    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>(".home-stage .scroll-in").forEach((el) => {
        gsap.from(el, {
          y: 26,
          duration: 0.75,
          ease: "power3.out",
          immediateRender: false,
          clearProps: "transform",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });

      const parallax = root.querySelector(".home-parallax");
      if (parallax) {
        gsap.to(parallax, {
          y: -40,
          ease: "none",
          scrollTrigger: {
            trigger: "#sec-network",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    });

    mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()")) return;
      gsap.utils.toArray<HTMLElement>(".home-stage .scroll-in").forEach((el) => {
        gsap.from(el, {
          y: 18,
          duration: 0.6,
          ease: "power2.out",
          immediateRender: false,
          clearProps: "transform",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        });
      });
    });

    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 450);

    return () => {
      window.clearTimeout(refresh);
      counterObserver.disconnect();
      mm.revert();
    };
  }, [active]);
}
