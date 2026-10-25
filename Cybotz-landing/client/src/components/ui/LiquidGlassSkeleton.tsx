import React, { useState, useEffect } from "react";
import { WifiOff, AlertCircle, RefreshCw, Zap, Image as ImageIcon } from "lucide-react";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";

interface LiquidGlassSkeletonProps {
  className?: string;
  variant?: "card" | "image" | "text" | "avatar" | "pill" | "custom";
  children?: React.ReactNode;
  pulse?: boolean;
}

/**
 * Base Liquid Glass Skeleton block
 * Delivers frosted glass refraction, specular highlight bevels, and fluid caustic shimmer
 */
export const LiquidGlassSkeleton: React.FC<LiquidGlassSkeletonProps> = ({
  className = "",
  variant = "custom",
  children,
  pulse = true,
}) => {
  const variantStyles = {
    card: "w-full rounded-2xl h-80",
    image: "w-full h-full rounded-xl min-h-[160px]",
    text: "h-4 rounded-md w-full",
    avatar: "w-12 h-12 rounded-full",
    pill: "h-6 w-20 rounded-full",
    custom: "",
  }[variant];

  return (
    <div
      className={`relative overflow-hidden liquid-glass-base ${pulse ? "animate-[liquid-glass-pulse_3s_ease-in-out_infinite]" : ""} ${variantStyles} ${className}`}
    >
      {/* Glossy top specular reflection line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent pointer-events-none z-10" />

      {/* Fluid Liquid Caustic Shimmer Wave */}
      <div className="absolute inset-0 liquid-glass-shimmer pointer-events-none z-10" />

      {/* Ambient subtle cyan glow center */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {children && <div className="relative z-20 h-full w-full">{children}</div>}
    </div>
  );
};

interface LiquidGlassImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  skeletonClassName?: string;
  aspectRatio?: string | number;
  fallbackSrc?: string;
  showSlowNetworkBadge?: boolean;
}

/**
 * Liquid Glass Image Loader
 * Protects users on slow client connections by displaying a liquid glass skeleton
 * with fluid caustic wave shimmer until the high-res image finishes downloading.
 */
export const LiquidGlassImage: React.FC<LiquidGlassImageProps> = ({
  src,
  alt,
  className = "",
  imgClassName = "",
  skeletonClassName = "",
  aspectRatio,
  fallbackSrc,
  showSlowNetworkBadge = true,
  onError,
  onLoad,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSlowSimulated, setIsSlowSimulated] = useState(false);
  const network = useNetworkQuality();
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  // Check if image is already loaded from cache immediately
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  // If network is slow and image is taking longer than 800ms, indicate network streaming
  useEffect(() => {
    let timer: any;
    if (!isLoaded && !hasError && network.isSlow) {
      timer = setTimeout(() => {
        setIsSlowSimulated(true);
      }, 700);
    } else {
      setIsSlowSimulated(false);
    }
    return () => clearTimeout(timer);
  }, [isLoaded, hasError, network.isSlow]);

  // Reset states on src change
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
      setHasError(false);
    } else {
      setIsLoaded(false);
      setHasError(false);
    }
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        ...(aspectRatio ? { aspectRatio: String(aspectRatio) } : {}),
        ...props.style,
      }}
    >
      {/* Liquid Glass Skeleton shown while downloading / on slow network */}
      {!isLoaded && !hasError && (
        <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-4 ${skeletonClassName}`}>
          <LiquidGlassSkeleton className="w-full h-full rounded-xl">
            <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center select-none">
              {/* Refractive Glass Icon Core */}
              <div className="relative mb-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                  <ImageIcon size={18} className="animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400/80 border-2 border-slate-900 animate-ping" />
              </div>

              {/* Status text */}
              <p className="text-[11px] font-mono text-cyan-300/90 font-bold tracking-wide">
                {network.isSlow ? "Streaming high-res asset..." : "Loading preview..."}
              </p>

              {/* Slow network indicator pill */}
              {showSlowNetworkBadge && network.isSlow && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono animate-fade-in">
                  <Zap size={10} className="text-amber-400" />
                  <span>Slow connection ({network.effectiveType.toUpperCase()})</span>
                </div>
              )}
            </div>
          </LiquidGlassSkeleton>
        </div>
      )}

      {/* Actual Image with smooth fade-in */}
      <img
        ref={imgRef}
        src={hasError && fallbackSrc ? fallbackSrc : src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-700 ease-out select-none ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${imgClassName}`}
        onLoad={(e) => {
          setIsLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          if (!hasError && fallbackSrc) {
            setHasError(true);
          } else {
            setHasError(true);
            setIsLoaded(true);
          }
          onError?.(e);
        }}
        {...props}
      />

      {/* Error Fallback Glass Card */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md border border-cyan-500/20 text-center font-mono select-none">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-2">
            <AlertCircle size={20} />
          </div>
          <p className="text-xs font-bold text-cyan-300 line-clamp-1">{alt || "Visual Asset"}</p>
          <span className="text-[10px] text-gray-500 mt-1">Ready for capture</span>
        </div>
      )}
    </div>
  );
};

/**
 * Liquid Glass Card Skeleton
 * Full composite card loader for blogs, curriculum items, or lab experiments
 */
export const LiquidGlassCardSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 1,
  className = "",
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`p-6 sm:p-8 rounded-2xl liquid-glass-base flex flex-col justify-between space-y-5 animate-[liquid-glass-pulse_3s_ease-in-out_infinite] ${className}`}
        >
          {/* Top Media Placeholder */}
          <div className="relative w-full h-44 rounded-xl overflow-hidden liquid-glass-base border border-cyan-500/20">
            <div className="absolute inset-0 liquid-glass-shimmer" />
            <div className="absolute inset-0 flex items-center justify-center text-cyan-400/50">
              <ImageIcon size={28} className="animate-pulse" />
            </div>
          </div>

          {/* Badges / Category row */}
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-md bg-cyan-500/10 border border-cyan-500/20 relative overflow-hidden">
              <div className="absolute inset-0 liquid-glass-shimmer" />
            </div>
            <div className="h-5 w-24 rounded-md bg-cyan-500/10 border border-cyan-500/20 relative overflow-hidden">
              <div className="absolute inset-0 liquid-glass-shimmer" />
            </div>
          </div>

          {/* Headline bar */}
          <div className="space-y-2">
            <div className="h-6 w-5/6 rounded-lg bg-white/10 relative overflow-hidden">
              <div className="absolute inset-0 liquid-glass-shimmer" />
            </div>
            <div className="h-4 w-full rounded-md bg-white/5 relative overflow-hidden">
              <div className="absolute inset-0 liquid-glass-shimmer" />
            </div>
            <div className="h-4 w-3/4 rounded-md bg-white/5 relative overflow-hidden">
              <div className="absolute inset-0 liquid-glass-shimmer" />
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-4 border-t border-cyan-500/15 flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-white/5 relative overflow-hidden">
              <div className="absolute inset-0 liquid-glass-shimmer" />
            </div>
            <div className="h-4 w-20 rounded bg-cyan-500/10 relative overflow-hidden">
              <div className="absolute inset-0 liquid-glass-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Liquid Glass Gallery Item Skeleton
 * Styled to perfectly match the photo windows in the infinite-drag-scroll gallery
 */
export const LiquidGlassGallerySkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 p-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative h-56 sm:h-72 md:h-84 rounded-xl liquid-glass-base border border-cyan-500/30 overflow-hidden flex flex-col justify-end p-4 shadow-xl animate-[liquid-glass-pulse_3s_ease-in-out_infinite]"
        >
          <div className="absolute inset-0 liquid-glass-shimmer pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center text-cyan-400/40">
            <ImageIcon size={32} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Non-intrusive floating slow network notification banner
 */
export const LiquidGlassSlowNetworkBanner: React.FC = () => {
  const network = useNetworkQuality();
  const [dismissed, setDismissed] = useState(false);

  if (!network.isSlow || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 z-40 max-w-sm p-3.5 rounded-2xl liquid-glass-base border border-amber-500/40 shadow-[0_8px_32px_rgba(245,158,11,0.2)] font-mono text-white text-xs animate-bounce-in backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
          <Zap size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-amber-300">Slow Connection Active</p>
          <p className="text-[11px] text-gray-300 mt-0.5">
            Liquid glass skeleton streaming enabled for smooth performance ({network.effectiveType.toUpperCase()}).
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-white p-1 text-[11px] cursor-pointer"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
