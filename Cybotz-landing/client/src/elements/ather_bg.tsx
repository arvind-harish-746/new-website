"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

interface AetherFlowHeroProps {
    showContent?: boolean;
    densityMultiplier?: number;
    /** Pause the constellation while the intro splash is covering the page. */
    suspended?: boolean;
}

const AetherFlowHero = ({ showContent = true, densityMultiplier = 2.4, suspended = false }: AetherFlowHeroProps) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

    React.useEffect(() => {
        if (suspended) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        
        const mouse: { x: number | null; y: number | null; radius: number } = { 
            x: null, 
            y: null, 
            radius: 180 
        };

        const cyanPalette = [
            'rgba(0, 240, 255, 0.9)',
            'rgba(56, 189, 248, 0.85)',
            'rgba(34, 211, 238, 0.75)',
            'rgba(14, 165, 233, 0.7)',
            'rgba(125, 211, 252, 0.8)'
        ];

        class Particle {
            x: number;
            y: number;
            directionX: number;
            directionY: number;
            size: number;
            baseSize: number;
            color: string;
            alpha: number;
            isPulseNode: boolean;
            pulsePhase: number;

            constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string, isPulseNode = false) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.baseSize = size;
                this.color = color;
                this.alpha = 0.4 + Math.random() * 0.5;
                this.isPulseNode = isPulseNode;
                this.pulsePhase = Math.random() * Math.PI * 2;
            }

            draw() {
                if (!ctx) return;
                
                if (this.isPulseNode) {
                    this.pulsePhase += 0.03;
                    const glowRadius = this.baseSize * (1.8 + 0.6 * Math.sin(this.pulsePhase));
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2, false);
                    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
                    ctx.fill();
                    ctx.restore();
                }

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }

            update() {
                if (!canvas) return;
                if (this.x > canvas.width || this.x < 0) {
                    this.directionX = -this.directionX;
                }
                if (this.y > canvas.height || this.y < 0) {
                    this.directionY = -this.directionY;
                }

                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < mouse.radius + this.size && distance > 0) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const force = (mouse.radius - distance) / mouse.radius;
                        this.x -= forceDirectionX * force * 4.5;
                        this.y -= forceDirectionY * force * 4.5;
                    }
                }

                this.x += this.directionX;
                this.y += this.directionY;
                this.draw();
            }
        }

        let particles: Particle[] = [];

        function init() {
            if (!canvas) return;
            particles = [];
            
            // Responsive particle density calculation:
            // Mobile screens (< 768px): Maintain rich density (~100-130 particles) so mobile viewport has vibrant depth.
            // Laptop / Desktop screens (>= 768px): Restored to clean original constellation (~75-135 particles) avoiding dense particle clutter.
            const isMobile = canvas.width < 768;
            let numberOfParticles: number;

            if (isMobile) {
                const rawCount = Math.floor(((canvas.height * canvas.width) / 3800) * (densityMultiplier / 2));
                numberOfParticles = Math.min(Math.max(rawCount, 100), 130);
            } else {
                // Laptop / Desktop density: balanced count (~180-320 particles)
                const rawCount = Math.floor((canvas.height * canvas.width) / 7200);
                numberOfParticles = Math.min(Math.max(rawCount, 180), 320);
            }

            for (let i = 0; i < numberOfParticles; i++) {
                const isPulseNode = i % 14 === 0;
                const size = isPulseNode 
                    ? (Math.random() * 1.8) + 2.4 
                    : (Math.random() * 2.0) + 1.1;
                const x = (Math.random() * ((canvas.width - size * 2) - (size * 2)) + size * 2);
                const y = (Math.random() * ((canvas.height - size * 2) - (size * 2)) + size * 2);
                const speed = (Math.random() * 0.45) + 0.1;
                const angle = Math.random() * Math.PI * 2;
                const directionX = Math.cos(angle) * speed;
                const directionY = Math.sin(angle) * speed;
                const color = cyanPalette[Math.floor(Math.random() * cyanPalette.length)];

                particles.push(new Particle(x, y, directionX, directionY, size, color, isPulseNode));
            }
        }

        const resizeCanvas = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function animate() {
            if (!canvas || !ctx) return;
            animationFrameId = requestAnimationFrame(animate);
            ctx.fillStyle = 'rgba(10, 15, 29, 1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
            }
            connect();
        }

        function connect() {
            if (!canvas || !ctx) return;
            const maxConnectDistanceSq = 135 * 135;

            for (let a = 0; a < particles.length; a++) {
                // Check connectivity with nearby particles
                for (let b = a + 1; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < maxConnectDistanceSq) {
                        const ratio = 1 - (distSq / maxConnectDistanceSq);
                        const opacity = ratio * 0.52;
                        
                        let isNearMouse = false;
                        if (mouse.x !== null && mouse.y !== null) {
                            const mdx = mouse.x - particles[a].x;
                            const mdy = mouse.y - particles[a].y;
                            if (mdx * mdx + mdy * mdy < mouse.radius * mouse.radius) {
                                isNearMouse = true;
                            }
                        }

                        ctx.strokeStyle = isNearMouse 
                            ? `rgba(255, 255, 255, ${Math.min(opacity * 1.6, 0.95)})` 
                            : `rgba(0, 230, 255, ${opacity})`;
                        ctx.lineWidth = isNearMouse ? 2.0 : 1.35;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        animate();

        const handleMouseMove = (event: MouseEvent) => {
            mouse.x = event.x;
            mouse.y = event.y;
        };

        const handleMouseOut = () => {
            mouse.x = null;
            mouse.y = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseOut);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseOut);
            cancelAnimationFrame(animationFrameId);
        };
    }, [suspended]);

    const fadeUpVariants: any = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.2 + 0.5,
                duration: 0.8,
                ease: "easeInOut",
            },
        }),
    };

    return (
        <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></canvas>

            {showContent && (
                <div className="relative z-10 text-center p-6">
                    <motion.div
                        custom={0}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6 backdrop-blur-sm"
                    >
                        <Zap className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-medium text-gray-200">
                            Dynamic Rendering Engine
                        </span>
                    </motion.div>

                    <motion.h1
                        custom={1}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 text-white"
                    >
                        Aether Flow
                    </motion.h1>

                    <motion.p
                        custom={2}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="max-w-2xl mx-auto text-lg text-gray-400 mb-10"
                    >
                        An intelligent, adaptive framework for creating fluid digital experiences that feel alive and respond to user interaction in real-time.
                    </motion.p>

                    <motion.div
                        custom={3}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <button className="px-8 py-4 bg-white text-black font-semibold rounded-lg shadow-lg hover:bg-gray-200 transition-colors duration-300 flex items-center gap-2 mx-auto">
                            Explore the Engine
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AetherFlowHero;
