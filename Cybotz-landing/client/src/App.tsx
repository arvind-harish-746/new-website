import { useCallback, useEffect, useState } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import About from "./pages/About";
import Blogs from "./pages/Blogs";
import BlogPostDetail from "./pages/BlogPostDetail";
import Labs from "./pages/Labs";
import Workshops from "./pages/Workshops";
import OfflineOverlay from "./components/OfflineOverlay";
import MouseEffects from "@/elements/click_animation";
import ScrollProgressBar from "./components/ScrollProgressBar";
import ScrollToTop from "./components/ScrollToTop";
import CookieBanner from "./components/CookieBanner";
import OfflinePage from "./pages/OfflinePage";
import Portal from "./pages/Portal";
import StudentPortal from "./pages/StudentPortal";
import { captureUtmParams } from "./lib/utm";
import { markSplashSeen, shouldPlaySplash, webglAvailable } from "./lib/splash";
import SplashScreen, { SplashGateProvider, type IntroMode } from "./components/SplashScreen";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/blogs" component={Blogs} />
      <Route path="/blogs/:id" component={BlogPostDetail} />
      <Route path="/labs" component={Labs} />
      <Route path="/workshops" component={Workshops} />
      <Route path="/student" component={StudentPortal} />
      <Route path="/portal" component={Portal} />
      <Route path="/admin" component={Portal} />
      <Route path="/offline" component={OfflinePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function initialIntro(): IntroMode {
  if (typeof window === "undefined") return "none";
  if (!shouldPlaySplash(window.location.pathname)) return "none";
  if (!webglAvailable()) return "classic";
  return "pending";
}

function App() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [intro, setIntro] = useState<IntroMode>(initialIntro);
  const [suspendBackground, setSuspendBackground] = useState(() => initialIntro() !== "none");

  const finishIntro = useCallback(() => {
    setIntro("none");
    setSuspendBackground(false);
  }, []);

  const notifyModelReady = useCallback(() => {
    setIntro((current) => {
      if (current !== "pending") return current;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      return reduce ? "reduced" : "video";
    });
  }, []);

  const abortToClassic = useCallback(() => {
    setIntro((current) => (current === "pending" ? "classic" : current));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (intro === "none") {
      root.classList.remove("cybotz-splash-lock");
      delete root.dataset.splash;
      return;
    }
    markSplashSeen();
    root.classList.add("cybotz-splash-lock");
    if (intro !== "classic") root.dataset.splash = "on";
    if (intro !== "pending") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        finishIntro();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intro, finishIntro]);

  useEffect(() => {
    if (intro !== "pending") return;
    let live = true;
    const timer = window.setTimeout(() => {
      if (live) abortToClassic();
    }, 4500);
    // Warm the GLB and the splash video. A failed preload must not cancel
    // the intro; the model loader, the video element, and the timeout decide that.
    void fetch("/models/drone.glb").catch(() => {});
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    void fetch(mobile ? "/media/splash-mobile.mp4" : "/media/splash-desktop.mp4").catch(() => {});
    void import("@/components/home/HeroCraft");
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [intro, abortToClassic]);

  useEffect(() => {
    // Capture UTM tracking params across all entry routes (Task 10)
    captureUtmParams();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <SplashGateProvider
          value={{ suspendBackground, intro, notifyModelReady, finishIntro, abortToClassic }}
        >
          <div className="relative min-h-screen" inert={intro !== "none" ? true : undefined}>
            {isOffline && <OfflineOverlay onRetry={() => setIsOffline(!navigator.onLine)} />}
            <ScrollProgressBar />
            <MouseEffects showLabel={false} color="#0575CE" effectSize={60} />
            <Router />
            <ScrollToTop />
            <CookieBanner />
          </div>
          {intro === "pending" && (
            <div className="intro-veil" role="dialog" aria-modal="true" aria-label="Loading Cybotz">
              <button type="button" className="splash-skip" onClick={finishIntro}>
                Skip
              </button>
            </div>
          )}
          {intro === "classic" && (
            <SplashScreen
              onExitStart={() => setSuspendBackground(false)}
              onComplete={() => {
                finishIntro();
                const hash = window.location.hash;
                if (hash.length > 1) {
                  requestAnimationFrame(() => {
                    document.getElementById(hash.slice(1))?.scrollIntoView();
                  });
                }
              }}
            />
          )}
        </SplashGateProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
