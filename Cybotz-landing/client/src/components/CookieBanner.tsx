import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "cybotz_cookie_consent";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let consent: string | null = null;
    try {
      consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch {
      return;
    }
    if (consent) return;

    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const actions = document.querySelector(".hero-actions");
        if (actions) {
          const rect = actions.getBoundingClientRect();
          const barTop = window.innerHeight - (window.innerWidth < 768 ? 96 : 88);
          if (rect.bottom > barTop && rect.top < window.innerHeight) {
            arm();
            return;
          }
        }
        setIsVisible(true);
        document.documentElement.classList.add("cookie-open");
      }, 2500);
    };

    const intro = document.documentElement.dataset.intro;
    const phase = document.documentElement.dataset.introPhase;
    if (intro && intro !== "off" && phase !== "settled") {
      window.addEventListener("cybotz-intro-settled", arm, { once: true });
    } else {
      arm();
    }

    return () => window.clearTimeout(timer);
  }, []);

  const save = (value: string) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      /* storage blocked */
    }
    setIsVisible(false);
    document.documentElement.classList.remove("cookie-open");
  };

  if (!isVisible) return null;

  return (
    <aside className="cookie-bar" aria-label="Cookie consent banner">
      <p>Essential storage for booking and sessions.</p>
      <button type="button" className="yes" onClick={() => save("true")}>Accept</button>
      <button type="button" className="no" onClick={() => save("essential")}>Essential only</button>
    </aside>
  );
}
