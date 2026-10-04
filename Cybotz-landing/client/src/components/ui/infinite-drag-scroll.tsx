import React, {
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
  createContext,
  useCallback,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  wrap,
  type PanInfo,
} from "framer-motion";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { LiquidGlassImage } from "./LiquidGlassSkeleton";

// Types
export type GalleryVariant = "default" | "masonry" | "polaroid";

export interface GalleryPhoto {
  id?: string;
  _id?: string;
  page?: "labs" | "workshops";
  title?: string;
  alt?: string;
  src: string;
  tag?: string;
  addedBy?: string;
}

// Create Context
const GridVariantContext = createContext<GalleryVariant | undefined>(undefined);

/**
 * Normalizes any image URL or file path so that it is web-safe and never relies
 * on absolute OS paths (e.g. C:\... or file://...)
 */
export function normalizeImagePath(src: string, defaultFolder: "labs" | "workshops" = "labs"): string {
  if (!src) return "";

  // 1. External URLs or base64 data URLs
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }

  // 2. Normalize Windows backslashes
  let clean = src.replace(/\\/g, "/").trim();

  // 3. Strip any full file-system drive prefix (e.g., C:/Users/.../client/public/...)
  const publicImagesIdx = clean.toLowerCase().indexOf("public/images/");
  if (publicImagesIdx !== -1) {
    clean = clean.substring(publicImagesIdx + "public".length);
  } else {
    const publicIdx = clean.toLowerCase().indexOf("public/");
    if (publicIdx !== -1) {
      clean = clean.substring(publicIdx + "public".length);
    }
  }

  // Strip drive letter if still present (e.g. C:/ or c:/)
  clean = clean.replace(/^[a-zA-Z]:\/?/, "/");

  // 4. If it's just a raw filename like "labs-1.jpeg"
  if (!clean.includes("/")) {
    clean = `/images/${defaultFolder}/${clean}`;
  }

  // 5. Ensure leading slash for web root relative path
  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }

  return clean;
}

export const DraggableContainer = ({
  className,
  children,
  variant = "masonry",
  onResetRef,
  onDragStateChange,
}: {
  className?: string;
  children: React.ReactNode;
  variant?: GalleryVariant;
  onResetRef?: React.MutableRefObject<(() => void) | null>;
  onDragStateChange?: (isDragging: boolean) => void;
}) => {
  const containerBoxRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const isHoveredRef = useRef(false);
  const isInViewRef = useRef(false);
  const isInteractingRef = useRef(false);
  const hoverTimerRef = useRef<any>(null);

  const halfWidthRef = useRef(0);
  const halfHeightRef = useRef(0);
  const momentumAnimRef = useRef<number | null>(null);
  const dragDistanceRef = useRef(0);

  const stopMomentum = useCallback(() => {
    if (momentumAnimRef.current !== null) {
      cancelAnimationFrame(momentumAnimRef.current);
      momentumAnimRef.current = null;
    }
  }, []);

  const updateDimensions = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    const w = el.scrollWidth || el.offsetWidth;
    const h = el.scrollHeight || el.offsetHeight;
    if (w > 50 && h > 50) {
      halfWidthRef.current = w / 2;
      halfHeightRef.current = h / 2;
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const t1 = setTimeout(updateDimensions, 100);
    const t2 = setTimeout(updateDimensions, 400);
    const t3 = setTimeout(updateDimensions, 1000);

    const el = gridRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      updateDimensions();
    });
    ro.observe(el);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro.disconnect();
      stopMomentum();
    };
  }, [updateDimensions, variant, children, stopMomentum]);

  // Viewport detection: only auto-scroll when client has scrolled down to the gallery
  useEffect(() => {
    const el = containerBoxRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.15 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Continuous diagonal downward auto-scroll
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const autoScrollTick = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Scroll diagonally downwards when visible, not hovered, not dragged, not in inertia
      if (
        isInViewRef.current &&
        !isInteractingRef.current &&
        !isHoveredRef.current &&
        momentumAnimRef.current === null
      ) {
        const halfW = halfWidthRef.current;
        const halfH = halfHeightRef.current;
        if (halfW && halfH) {
          // Diagonal downward movement: shifts downwards (+Y) and to the right (+X)
          const speedX = 20 * dt;
          const speedY = 28 * dt;

          const nextX = wrap(-halfW, 0, x.get() + speedX);
          const nextY = wrap(-halfH, 0, y.get() + speedY);

          x.set(nextX);
          y.set(nextY);
        }
      }

      animId = requestAnimationFrame(autoScrollTick);
    };

    animId = requestAnimationFrame(autoScrollTick);

    return () => {
      cancelAnimationFrame(animId);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [x, y]);

  // Expose reset view callback
  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        stopMomentum();
        animate(x, 0, { type: "spring", stiffness: 220, damping: 24 });
        animate(y, 0, { type: "spring", stiffness: 220, damping: 24 });
      };
    }
  }, [x, y, onResetRef, stopMomentum]);

  // Pan Handlers: uses purely incremental deltas to completely eliminate twitching/fighting
  const handlePanStart = () => {
    stopMomentum();
    isInteractingRef.current = true;
    dragDistanceRef.current = 0;
    onDragStateChange?.(true);
  };

  const handlePan = (_: any, info: PanInfo) => {
    dragDistanceRef.current += Math.hypot(info.delta.x, info.delta.y);
    const halfW = halfWidthRef.current;
    const halfH = halfHeightRef.current;
    if (!halfW || !halfH) return;

    // Continuous, seamless wrapping without sudden jumps
    const nextX = wrap(-halfW, 0, x.get() + info.delta.x);
    const nextY = wrap(-halfH, 0, y.get() + info.delta.y);

    x.set(nextX);
    y.set(nextY);
  };

  const handlePanEnd = (_: any, info: PanInfo) => {
    setTimeout(() => {
      onDragStateChange?.(false);
      isInteractingRef.current = false;
    }, 700);

    const halfW = halfWidthRef.current;
    const halfH = halfHeightRef.current;
    if (!halfW || !halfH) return;

    // Apply natural physical inertia deceleration
    let vx = (info.velocity.x / 60) * 0.75;
    let vy = (info.velocity.y / 60) * 0.75;

    const maxSpeed = 35;
    vx = Math.max(-maxSpeed, Math.min(maxSpeed, vx));
    vy = Math.max(-maxSpeed, Math.min(maxSpeed, vy));

    if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) return;

    const friction = 0.94;

    const glide = () => {
      vx *= friction;
      vy *= friction;

      if (Math.abs(vx) < 0.08 && Math.abs(vy) < 0.08) {
        momentumAnimRef.current = null;
        return;
      }

      const nextX = wrap(-halfW, 0, x.get() + vx);
      const nextY = wrap(-halfH, 0, y.get() + vy);

      x.set(nextX);
      y.set(nextY);

      momentumAnimRef.current = requestAnimationFrame(glide);
    };

    stopMomentum();
    momentumAnimRef.current = requestAnimationFrame(glide);
  };

  // Wheel handling: isolated to container hover so outer webpage scroll is never blocked
  useEffect(() => {
    const boxElement = containerBoxRef.current;
    if (!boxElement) return;

    const handleWheelScroll = (event: WheelEvent) => {
      if (!isHoveredRef.current) return;
      event.preventDefault();
      stopMomentum();

      const halfW = halfWidthRef.current;
      const halfH = halfHeightRef.current;
      if (!halfW || !halfH) return;

      const deltaX = event.deltaX || 0;
      const deltaY = event.deltaY || 0;

      const nextX = wrap(-halfW, 0, x.get() - deltaX * 1.2);
      const nextY = wrap(-halfH, 0, y.get() - deltaY * 1.2);

      x.set(nextX);
      y.set(nextY);
    };

    boxElement.addEventListener("wheel", handleWheelScroll, { passive: false });
    return () => {
      boxElement.removeEventListener("wheel", handleWheelScroll);
    };
  }, [x, y, stopMomentum]);

  return (
    <GridVariantContext.Provider value={variant}>
      <div
        ref={containerBoxRef}
        onMouseEnter={() => {
          isHoveredRef.current = true;
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        }}
        onMouseLeave={() => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = setTimeout(() => {
            isHoveredRef.current = false;
          }, 400);
        }}
        className="w-full h-full relative overflow-hidden select-none touch-none"
      >
        <motion.div
          className={cn(
            "grid h-fit w-fit cursor-grab active:cursor-grabbing grid-cols-[repeat(2,max-content)] grid-rows-[repeat(2,max-content)] will-change-transform touch-none select-none",
            className
          )}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          style={{ x, y }}
          ref={gridRef}
        >
          {children}
        </motion.div>
      </div>
    </GridVariantContext.Provider>
  );
};

// Pre-computed known aspect ratios for baseline images to prevent any initial layout jump
const KNOWN_ASPECT_RATIOS: Record<string, number> = {
  // Labs images
  "labs-1.jpeg": 1600 / 1066,
  "labs-1.webp": 1600 / 1066,
  "labs-2.jpeg": 1600 / 838,
  "labs-2.webp": 1600 / 838,
  "labs-3.jpeg": 1600 / 900,
  "labs-3.webp": 1600 / 900,
  "labs-4.png": 962 / 506,
  "labs-4.webp": 962 / 506,
  "labs-5.png": 545 / 901,
  "labs-5.webp": 545 / 901,
  "labs-6.jpeg": 1600 / 1066,
  "labs-6.webp": 1600 / 1066,
  "labs-7.jpeg": 1600 / 1066,
  "labs-7.webp": 1600 / 1066,
  "labs-8.jpeg": 1600 / 1066,
  "labs-8.webp": 1600 / 1066,
  // Workshops images
  "workshop-1.jpeg": 1280 / 853,
  "workshop-1.webp": 1280 / 853,
  "workshop-2.jpeg": 1280 / 720,
  "workshop-2.webp": 1280 / 720,
  "workshop-3.jpeg": 1204 / 1600,
  "workshop-3.webp": 1204 / 1600,
  "workshop-4.jpeg": 1280 / 853,
  "workshop-4.webp": 1280 / 853,
  "workshop-5.jpeg": 1220 / 738,
  "workshop-5.webp": 1220 / 738,
  "workshop-6.jpeg": 1220 / 711,
  "workshop-6.webp": 1220 / 711,
  "workshop-7.jpeg": 1220 / 656,
  "workshop-7.webp": 1220 / 656,
  "workshop-8.jpeg": 1220 / 1529,
  "workshop-8.webp": 1220 / 1529,
};

export function getKnownAspectRatio(src: string): number {
  if (!src) return 1.5;
  for (const [key, ratio] of Object.entries(KNOWN_ASPECT_RATIOS)) {
    if (src.includes(key) || src.endsWith(key)) {
      return ratio;
    }
  }
  return 1.5;
}

export const GridItem = ({
  children,
  className,
  aspectRatio,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  aspectRatio?: number | string;
  style?: React.CSSProperties;
}) => {
  const variant = useContext(GridVariantContext);

  const gridItemStyles = cva(
    "overflow-hidden will-change-transform select-none flex-none shrink-0 transition-all duration-300",
    {
      variants: {
        variant: {
          default:
            "rounded-xl border border-cyan-500/25 bg-slate-900/80 shadow-lg hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(0,240,255,0.25)]",
          masonry:
            "rounded-xl border border-cyan-500/30 bg-slate-900/85 shadow-xl hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(0,240,255,0.35)]",
          polaroid:
            "p-2 sm:p-2.5 pb-5 sm:pb-6 bg-white border border-white/95 shadow-2xl even:rotate-1 odd:-rotate-1 hover:rotate-0 hover:scale-105 transition-transform ease-out duration-300 rounded-xl",
        },
      },
      defaultVariants: {
        variant: "masonry",
      },
    }
  );

  return (
    <div
      className={cn(gridItemStyles({ variant, className }))}
      style={{
        ...(aspectRatio ? { aspectRatio: String(aspectRatio) } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const GridBody = memo(
  ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    const variant = useContext(GridVariantContext);

    const gridBodyStyles = cva(
      "flex flex-col gap-10 sm:gap-14 md:gap-16 p-6 sm:p-8 md:p-10 w-max h-max",
      {
        variants: {
          variant: {
            default: "gap-8 p-6 sm:gap-12 sm:p-8 md:gap-14 md:p-10",
            masonry: "gap-10 p-6 sm:gap-14 sm:p-8 md:gap-16 md:p-10",
            polaroid: "gap-10 p-6 sm:gap-14 sm:p-8 md:gap-16 md:p-10",
          },
        },
        defaultVariants: {
          variant: "masonry",
        },
      }
    );

    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(gridBodyStyles({ variant, className }))}
          >
            {children}
          </div>
        ))}
      </>
    );
  }
);

GridBody.displayName = "GridBody";

/**
 * High-Level Component: PortalGalleryWindow
 * Static embedded component for Labs and Workshops pages.
 */
interface PortalGalleryWindowProps {
  page: "labs" | "workshops";
  title?: string;
  subtitle?: string;
  initialPhotos?: GalleryPhoto[];
  className?: string;
}

export const DEFAULT_LABS_PHOTOS: GalleryPhoto[] = [
  { id: "lab-1", src: "/images/labs/labs-1.jpeg" },
  { id: "lab-2", src: "/images/labs/labs-2.jpeg" },
  { id: "lab-3", src: "/images/labs/labs-3.jpeg" },
  { id: "lab-4", src: "/images/labs/labs-4.png" },
  { id: "lab-5", src: "/images/labs/labs-5.png" },
  { id: "lab-6", src: "/images/labs/labs-6.jpeg" },
  { id: "lab-7", src: "/images/labs/labs-7.jpeg" },
  { id: "lab-8", src: "/images/labs/labs-8.jpeg" },
];

export const DEFAULT_WORKSHOPS_PHOTOS: GalleryPhoto[] = [
  { id: "workshop-1", src: "/images/workshops/workshop-1.jpeg" },
  { id: "workshop-2", src: "/images/workshops/workshop-2.jpeg" },
  { id: "workshop-3", src: "/images/workshops/workshop-3.jpeg" },
  { id: "workshop-4", src: "/images/workshops/workshop-4.jpeg" },
  { id: "workshop-5", src: "/images/workshops/workshop-5.jpeg" },
  { id: "workshop-6", src: "/images/workshops/workshop-6.jpeg" },
  { id: "workshop-7", src: "/images/workshops/workshop-7.jpeg" },
  { id: "workshop-8", src: "/images/workshops/workshop-8.jpeg" },
];

export const PortalGalleryWindow: React.FC<PortalGalleryWindowProps> = ({
  page,
  title,
  subtitle,
  initialPhotos = [],
  className,
}) => {
  const getDefaultPhotos = useCallback((p: "labs" | "workshops") => {
    return p === "labs" ? DEFAULT_LABS_PHOTOS : DEFAULT_WORKSHOPS_PHOTOS;
  }, []);

  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => {
    if (initialPhotos && initialPhotos.length > 0) return initialPhotos;
    return page === "labs" ? DEFAULT_LABS_PHOTOS : DEFAULT_WORKSHOPS_PHOTOS;
  });
  const [isLoadingPhotos, setIsLoadingPhotos] = useState<boolean>(false);
  const [variant, setVariant] = useState<GalleryVariant>("masonry");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const isDraggingRef = useRef(false);
  const resetCanvasRef = useRef<(() => void) | null>(null);

  const defaultHeading =
    page === "labs"
      ? "Here's a sneak peek into our labs:"
      : "Here's a sneak peek into our workshops:";

  const defaultSub =
    page === "labs"
      ? "Interactive tour of live maker spaces, flight benches, and hardware builds"
      : "Hands-on flight piloting, sensor programming, and live robotics challenges";

  // Load photos from API or fallback to active files
  const loadGalleryPhotos = useCallback(async () => {
    const baselineDefaults = page === "labs" ? DEFAULT_LABS_PHOTOS : DEFAULT_WORKSHOPS_PHOTOS;

    try {
      const res = await fetch(`/api/gallery?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.photos) && data.photos.length > 0) {
          // Filter out any stale legacy references
          const valid = data.photos.filter((p: any) =>
            p.src && !p.src.includes("lab-drone-chassis") && !p.src.includes("workshop-drone-flight")
          );
          if (valid.length > 0) {
            setPhotos(valid);
            setIsLoadingPhotos(false);
            return;
          }
        }
      }
    } catch {
      // Backend offline or starting up
    }

    // Check LocalStorage fallback
    try {
      const cached = localStorage.getItem(`cybotz_gallery_v4_${page}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((p: any) =>
            p.src && !p.src.includes("lab-drone-chassis") && !p.src.includes("workshop-drone-flight")
          );
          if (valid.length > 0) {
            setPhotos(valid);
            setIsLoadingPhotos(false);
            return;
          }
        }
      }
    } catch {
      // Ignore
    }

    // Fallback directly to verified baseline defaults
    if (initialPhotos && initialPhotos.length > 0) {
      setPhotos(initialPhotos);
    } else {
      setPhotos(baselineDefaults);
      try {
        localStorage.setItem(`cybotz_gallery_v4_${page}`, JSON.stringify(baselineDefaults));
      } catch { }
    }
    setIsLoadingPhotos(false);
  }, [page, initialPhotos]);

  useEffect(() => {
    loadGalleryPhotos();

    const handleGalleryUpdated = (e: any) => {
      if (!e.detail || e.detail.page === page || e.detail.page === "all") {
        loadGalleryPhotos();
      }
    };

    window.addEventListener("cybotz-gallery-updated", handleGalleryUpdated);
    return () => {
      window.removeEventListener("cybotz-gallery-updated", handleGalleryUpdated);
    };
  }, [loadGalleryPhotos, page]);

  const [detectedRatios, setDetectedRatios] = useState<Record<string, number>>({});

  const handleImageLoad = (src: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.naturalWidth && target.naturalHeight) {
      const ratio = target.naturalWidth / target.naturalHeight;
      setDetectedRatios((prev) => {
        if (prev[src] === ratio) return prev;
        return { ...prev, [src]: ratio };
      });
    }
  };

  // Helper to get natural spacing based on portrait vs landscape
  const getPhotoMargin = (ratio: number) => {
    if (ratio >= 1.7) {
      // Ultra wide landscape
      return "mr-8 sm:mr-10 md:mr-12";
    }
    if (ratio >= 1.2) {
      // Standard landscape
      return "mr-6 sm:mr-8 md:mr-10";
    }
    if (ratio <= 0.85) {
      // Portrait
      return "mr-5 sm:mr-6 md:mr-8";
    }
    // Square / Near square
    return "mr-6 sm:mr-7 md:mr-9";
  };

  const itemHeight = isExpanded ? 280 : 185;

  // Build a seamless cycling pool of photos so every row is rich, full, and has zero empty gaps
  const photoPool = photos.length > 0
    ? photos.length >= 18
      ? photos
      : [...photos, ...photos, ...photos]
    : [];

  const row1Photos = photoPool.filter((_, i) => i % 3 === 0);
  const row2Photos = photoPool.filter((_, i) => i % 3 === 1);
  const row3Photos = photoPool.filter((_, i) => i % 3 === 2);

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-in-out select-none",
        isExpanded
          ? "w-screen relative left-1/2 -translate-x-1/2 max-w-none z-30 px-2 sm:px-6 lg:px-8 my-8"
          : "w-full relative my-6 sm:my-10",
        className
      )}
    >
      {/* Outer Portal Window Frame */}
      <div
        className={cn(
          "relative flex flex-col w-full rounded-2xl border border-cyan-500/30 bg-[#090D16] font-mono text-white overflow-hidden shadow-2xl backdrop-blur-xl ring-1 ring-cyan-500/20 transition-all duration-500 ease-in-out",
          isExpanded
            ? "h-[880px] sm:h-[960px] lg:h-[1020px] shadow-[0_0_60px_rgba(0,240,255,0.25)]"
            : "h-[620px] sm:h-[680px] lg:h-[720px]"
        )}
      >

        {/* Portal Window Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-cyan-500/20 shrink-0 select-none backdrop-blur-md gap-3 z-10">

          {/* Left Side: Mac dots + Heading */}
          <div className="flex items-center gap-3 min-w-0">
            {/* 3 Mac-style Cyber Dots */}
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400/50" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/50" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/50" />
            </div>

            {/* Heading */}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-bold tracking-wide text-cyan-300 truncate">
                {title || defaultHeading}
              </h3>
            </div>
          </div>

          {/* Right Side: View Controls & Expand Toggle */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Variant Switcher Pills */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-cyan-500/20 text-xs">
              <button
                type="button"
                onClick={() => setVariant("masonry")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  variant === "masonry"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                    : "text-gray-400 hover:text-white"
                )}
                title="Masonry Staggered Flow"
              >
                Masonry
              </button>
              <button
                type="button"
                onClick={() => setVariant("polaroid")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  variant === "polaroid"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                    : "text-gray-400 hover:text-white"
                )}
                title="Framed Cards"
              >
                Framed
              </button>
              <button
                type="button"
                onClick={() => setVariant("default")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  variant === "default"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                    : "text-gray-400 hover:text-white"
                )}
                title="Standard Cyber Flow"
              >
                Grid
              </button>
            </div>

            {/* Reset Canvas Position */}
            <button
              type="button"
              onClick={() => {
                if (resetCanvasRef.current) resetCanvasRef.current();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs transition-colors cursor-pointer border border-cyan-500/20"
              title="Reset view to origin"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline text-[11px]">Center</span>
            </button>

            {/* Expand / Minimize Window Mode */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border text-xs font-mono font-bold",
                isExpanded
                  ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                  : "bg-slate-800 text-gray-300 hover:text-white border-cyan-500/20 hover:bg-slate-700"
              )}
              title={isExpanded ? "Collapse to Standard View" : "Expand to Full Window Width & 1.5x Height"}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden sm:inline text-[11px]">{isExpanded ? "Standard" : "Expand"}</span>
            </button>
          </div>
        </div>

        {/* Gallery Interactive Canvas */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-[#070B14] select-none touch-none">

          {/* Subtle Grid Tech Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,240,255,0.3) 1px, transparent 0)`,
              backgroundSize: "28px 28px",
            }}
          />

          {/* Draggable Infinite Canvas */}
          <DraggableContainer
            variant={variant}
            onResetRef={resetCanvasRef}
            onDragStateChange={(dragging) => {
              isDraggingRef.current = dragging;
            }}
          >
            <GridBody>
              {/* Row 1 */}
              <div className={cn("flex flex-row items-center flex-nowrap shrink-0", variant === "masonry" && "pl-0")}>
                {row1Photos.map((item, idx) => {
                  const resolvedSrc = normalizeImagePath(item.src, page);
                  const ratio = detectedRatios[resolvedSrc] || getKnownAspectRatio(resolvedSrc);
                  const itemWidth = Math.round(itemHeight * ratio);
                  const spacingClass = getPhotoMargin(ratio);
                  return (
                    <GridItem
                      key={`r1-${item.id || idx}-${idx}`}
                      aspectRatio={ratio}
                      style={{ width: `${itemWidth}px`, height: `${itemHeight}px` }}
                      className={cn(
                        "relative group select-none transition-all duration-300",
                        spacingClass
                      )}
                    >
                      <div
                        className="relative w-full h-full overflow-hidden select-none cursor-pointer rounded-lg sm:rounded-xl"
                        onClick={() => {
                          if (!isDraggingRef.current) {
                            setActivePhoto(item);
                          }
                        }}
                      >
                        {/* Pure Image Display - Dynamically sized to natural aspect ratio */}
                        <LiquidGlassImage
                          src={resolvedSrc}
                          alt=""
                          aspectRatio={ratio}
                          draggable={false}
                          className="pointer-events-none absolute inset-0 h-full w-full select-none"
                          imgClassName="transition-transform duration-500 group-hover:scale-105 object-cover w-full h-full"
                          showSlowNetworkBadge={false}
                          loading="eager"
                          onLoad={(e) => handleImageLoad(resolvedSrc, e)}
                        />

                        {/* Subtle hover cyan border glow */}
                        <div className="absolute inset-0 border border-transparent group-hover:border-cyan-400/60 rounded-lg sm:rounded-xl pointer-events-none transition-colors" />
                      </div>
                    </GridItem>
                  );
                })}
              </div>

              {/* Row 2 */}
              <div className={cn("flex flex-row items-center flex-nowrap shrink-0", variant === "masonry" && "pl-8 sm:pl-14 md:pl-20")}>
                {row2Photos.map((item, idx) => {
                  const resolvedSrc = normalizeImagePath(item.src, page);
                  const ratio = detectedRatios[resolvedSrc] || getKnownAspectRatio(resolvedSrc);
                  const itemWidth = Math.round(itemHeight * ratio);
                  const spacingClass = getPhotoMargin(ratio);
                  return (
                    <GridItem
                      key={`r2-${item.id || idx}-${idx}`}
                      aspectRatio={ratio}
                      style={{ width: `${itemWidth}px`, height: `${itemHeight}px` }}
                      className={cn(
                        "relative group select-none transition-all duration-300",
                        spacingClass
                      )}
                    >
                      <div
                        className="relative w-full h-full overflow-hidden select-none cursor-pointer rounded-lg sm:rounded-xl"
                        onClick={() => {
                          if (!isDraggingRef.current) {
                            setActivePhoto(item);
                          }
                        }}
                      >
                        {/* Pure Image Display - Dynamically sized to natural aspect ratio */}
                        <LiquidGlassImage
                          src={resolvedSrc}
                          alt=""
                          aspectRatio={ratio}
                          draggable={false}
                          className="pointer-events-none absolute inset-0 h-full w-full select-none"
                          imgClassName="transition-transform duration-500 group-hover:scale-105 object-cover w-full h-full"
                          showSlowNetworkBadge={false}
                          loading="eager"
                          onLoad={(e) => handleImageLoad(resolvedSrc, e)}
                        />

                        {/* Subtle hover cyan border glow */}
                        <div className="absolute inset-0 border border-transparent group-hover:border-cyan-400/60 rounded-lg sm:rounded-xl pointer-events-none transition-colors" />
                      </div>
                    </GridItem>
                  );
                })}
              </div>

              {/* Row 3 */}
              <div className={cn("flex flex-row items-center flex-nowrap shrink-0", variant === "masonry" && "pl-4 sm:pl-7 md:pl-10")}>
                {row3Photos.map((item, idx) => {
                  const resolvedSrc = normalizeImagePath(item.src, page);
                  const ratio = detectedRatios[resolvedSrc] || getKnownAspectRatio(resolvedSrc);
                  const itemWidth = Math.round(itemHeight * ratio);
                  const spacingClass = getPhotoMargin(ratio);
                  return (
                    <GridItem
                      key={`r3-${item.id || idx}-${idx}`}
                      aspectRatio={ratio}
                      style={{ width: `${itemWidth}px`, height: `${itemHeight}px` }}
                      className={cn(
                        "relative group select-none transition-all duration-300",
                        spacingClass
                      )}
                    >
                      <div
                        className="relative w-full h-full overflow-hidden select-none cursor-pointer rounded-lg sm:rounded-xl"
                        onClick={() => {
                          if (!isDraggingRef.current) {
                            setActivePhoto(item);
                          }
                        }}
                      >
                        {/* Pure Image Display - Dynamically sized to natural aspect ratio */}
                        <LiquidGlassImage
                          src={resolvedSrc}
                          alt=""
                          aspectRatio={ratio}
                          draggable={false}
                          className="pointer-events-none absolute inset-0 h-full w-full select-none"
                          imgClassName="transition-transform duration-500 group-hover:scale-105 object-cover w-full h-full"
                          showSlowNetworkBadge={false}
                          loading="eager"
                          onLoad={(e) => handleImageLoad(resolvedSrc, e)}
                        />

                        {/* Subtle hover cyan border glow */}
                        <div className="absolute inset-0 border border-transparent group-hover:border-cyan-400/60 rounded-lg sm:rounded-xl pointer-events-none transition-colors" />
                      </div>
                    </GridItem>
                  );
                })}
              </div>
            </GridBody>
          </DraggableContainer>

          {/* Bottom HUD Hint Removed */}
        </div>

        {/* Clean Lightbox for Enlarged Photo Preview */}
        {activePhoto && (
          <div
            className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setActivePhoto(null)}
          >
            <div
              className="relative max-w-5xl max-h-[85vh] bg-slate-900/90 border border-cyan-500/40 rounded-2xl overflow-hidden p-2 shadow-2xl flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-950/80 border border-cyan-500/40 flex items-center justify-center text-gray-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </button>

              <div className="relative max-w-full max-h-[75vh] rounded-xl overflow-hidden bg-black/90 flex items-center justify-center">
                <img
                  src={normalizeImagePath(activePhoto.src, page)}
                  alt=""
                  className="max-h-[75vh] max-w-full w-auto h-auto object-contain select-none"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PortalGalleryWindow;
