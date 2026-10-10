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

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reduce) return;
      const card = (event.target as HTMLElement | null)?.closest?.<HTMLElement>(".flight-card");
      if (!card || !root.contains(card)) return;
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      card.style.setProperty("--rx", `${(-py * 5).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(px * 7).toFixed(2)}deg`);
    };

    const onPointerOut = (event: PointerEvent) => {
      const card = (event.target as HTMLElement | null)?.closest?.<HTMLElement>(".flight-card");
      if (!card) return;
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    };

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerout", onPointerOut);

    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const scans = gsap.utils.toArray<HTMLElement>(".service-card .card-scan");
      if (scans.length) {
        const sequence = gsap.timeline({
          scrollTrigger: {
            trigger: ".services-pin",
            start: "top 96px",
            end: "+=65%",
            pin: true,
            scrub: 0.4,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        scans.forEach((scan, index) => {
          sequence.fromTo(scan, { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 0.6 }, index * 0.28);
        });
      }

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
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerout", onPointerOut);
      mm.revert();
    };
  }, [active]);
}
