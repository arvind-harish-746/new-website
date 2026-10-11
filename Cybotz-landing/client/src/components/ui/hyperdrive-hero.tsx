"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface StarfieldCanvasProps {
  starColor?: "cyan" | "white" | "multi";
  numStars?: number;
  baseSpeed?: number;
  className?: string;
}

// Starfield Canvas Component with interactive warp speed
export const StarfieldCanvas: React.FC<StarfieldCanvasProps> = ({
  starColor = "multi",
  numStars = 800,
  baseSpeed = 2,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];
    let speed = baseSpeed;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const getStarColorPalette = (): string => {
      if (starColor === "cyan") {
        return "rgba(5, 117, 206, ALPHA)";
      }
      if (starColor === "white") {
        return "rgba(255, 255, 255, ALPHA)";
      }
      // "multi" palette: cyberpunk cyan, sky blue, and crisp white
      const rand = Math.random();
      if (rand < 0.55) {
        return "rgba(5, 117, 206, ALPHA)"; // Electric Cyan
      } else if (rand < 0.8) {
        return "rgba(56, 189, 248, ALPHA)"; // Sky Cyan
      } else {
        return "rgba(255, 255, 255, ALPHA)"; // Crisp White
      }
    };

    class Star {
      x: number;
      y: number;
      z: number;
      pz: number;
      colorTemplate: string;

      constructor() {
        if (!canvas) {
          this.x = 0;
          this.y = 0;
          this.z = 1000;
          this.pz = 1000;
          this.colorTemplate = "rgba(5, 117, 206, ALPHA)";
          return;
        }
        this.x = Math.random() * canvas.width - canvas.width / 2;
        this.y = Math.random() * canvas.height - canvas.height / 2;
        this.z = Math.random() * canvas.width;
        this.pz = this.z;
        this.colorTemplate = getStarColorPalette();
      }

      update() {
        if (!canvas) return;
        this.z = this.z - speed;
        if (this.z < 1) {
          this.z = canvas.width;
          this.x = Math.random() * canvas.width - canvas.width / 2;
          this.y = Math.random() * canvas.height - canvas.height / 2;
          this.pz = this.z;
        }
      }

      draw() {
        if (!ctx || !canvas) return;
        const sx = (this.x / this.z) * canvas.width / 2 + canvas.width / 2;
        const sy = (this.y / this.z) * canvas.height / 2 + canvas.height / 2;

        const r = Math.max(0.1, (1 - this.z / canvas.width) * 2.5);

        const px = (this.x / this.pz) * canvas.width / 2 + canvas.width / 2;
        const py = (this.y / this.pz) * canvas.height / 2 + canvas.height / 2;

        this.pz = this.z;

        const alpha = Math.min(1, Math.max(0.05, 1 - this.z / canvas.width));
        const stroke = this.colorTemplate.replace("ALPHA", alpha.toFixed(3));

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.lineWidth = r * 2;
        ctx.strokeStyle = stroke;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    const init = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
      }
    };

    const animate = () => {
      // Cybotz deep navy background trail clear for smooth motion blur
      ctx.fillStyle = "rgba(11, 16, 29, 0.22)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        star.update();
        star.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const dist = Math.abs(event.clientX - centerX);
      const maxDist = window.innerWidth / 2;
      // The closer to the center, the faster the warp speed
      speed = baseSpeed + (1 - dist / maxDist) * 18;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        const centerX = window.innerWidth / 2;
        const dist = Math.abs(touch.clientX - centerX);
        const maxDist = window.innerWidth / 2;
        speed = baseSpeed + (1 - dist / maxDist) * 16;
      }
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    resizeCanvas();
    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [starColor, numStars, baseSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 z-0 w-full h-full pointer-events-none", className)}
    />
  );
};
