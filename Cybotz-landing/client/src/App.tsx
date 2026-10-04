import { useEffect } from "react";
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
import { useState } from "react";

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

function App() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

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
      <ThemeProvider defaultTheme="dark">
        <div className="relative min-h-screen">
          {isOffline && <OfflineOverlay onRetry={() => setIsOffline(!navigator.onLine)} />}
          <ScrollProgressBar />
          <MouseEffects showLabel={false} color="#00F0FF" effectSize={60} />
          <Router />
          <ScrollToTop />
          <CookieBanner />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
