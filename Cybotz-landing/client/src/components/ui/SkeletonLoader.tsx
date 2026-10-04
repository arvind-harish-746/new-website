import React from 'react';
import {
  LiquidGlassSkeleton,
  LiquidGlassImage,
  LiquidGlassCardSkeleton,
  LiquidGlassGallerySkeleton,
  LiquidGlassSlowNetworkBanner,
} from './LiquidGlassSkeleton';

export {
  LiquidGlassSkeleton,
  LiquidGlassImage,
  LiquidGlassCardSkeleton,
  LiquidGlassGallerySkeleton,
  LiquidGlassSlowNetworkBanner,
};

interface SkeletonProps {
  className?: string;
  count?: number;
}

/**
 * Enhanced Liquid Glass Skeleton element
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`liquid-glass-base rounded-lg relative overflow-hidden animate-[liquid-glass-pulse_3s_ease-in-out_infinite] ${className}`}
    >
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 liquid-glass-shimmer pointer-events-none" />
    </div>
  );
}

/**
 * Enhanced Liquid Glass Blog Card Skeleton
 */
export function BlogCardSkeleton({ count = 3 }: SkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-8 rounded-2xl liquid-glass-base flex flex-col justify-between space-y-6 shadow-xl animate-[liquid-glass-pulse_3s_ease-in-out_infinite]"
        >
          {/* Top Liquid Glass Media */}
          <div className="w-full h-48 rounded-xl liquid-glass-base relative overflow-hidden border border-cyan-500/20">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="absolute inset-0 liquid-glass-shimmer" />
          </div>

          {/* Category Tag Pills */}
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          {/* Title & Body */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-14 w-full" />
          </div>

          {/* Meta Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-cyan-500/15">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Enhanced Liquid Glass Curriculum Skeleton
 */
export function CurriculumSkeleton({ count = 3 }: SkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-8 rounded-2xl liquid-glass-base flex flex-col justify-between space-y-6 shadow-xl animate-[liquid-glass-pulse_3s_ease-in-out_infinite]"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-7 w-2/5" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="pt-4 border-t border-cyan-500/15 flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
