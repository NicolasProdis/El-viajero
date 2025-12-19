
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';

type DottedGlowBackgroundProps = {
  className?: string;
  gap?: number;
  radius?: number;
  color?: string;
  glowColor?: string;
  opacity?: number;
  speedMin?: number;
  speedMax?: number;
  speedScale?: number;
  evolutionStage?: number;
};

export default function DottedGlowBackground({
  className,
  gap = 12,
  radius = 2,
  color = "rgba(255,255,255,0.1)",
  glowColor = "rgba(255, 255, 255, 0.8)",
  opacity = 1,
  speedMin = 0.5,
  speedMax = 1.5,
  speedScale = 0.8,
  evolutionStage = 1,
}: DottedGlowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const ctx = el.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stopped = false;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      el.width = Math.max(1, Math.floor(width * dpr));
      el.height = Math.max(1, Math.floor(height * dpr));
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    setTimeout(resize, 0);

    let dots: { x: number; y: number; phase: number; speed: number; sizeMult: number; offsetPhase: number }[] = [];

    const regenDots = () => {
      dots = [];
      const { width, height } = container.getBoundingClientRect();
      const cols = Math.ceil(width / gap) + 2;
      const rows = Math.ceil(height / gap) + 2;
      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
          const x = i * gap + (j % 2 === 0 ? 0 : gap * 0.5);
          const y = j * gap;
          dots.push({
            x,
            y,
            phase: Math.random() * Math.PI * 2,
            speed: speedMin + Math.random() * (speedMax - speedMin),
            sizeMult: 0.5 + Math.random() * 1.5,
            offsetPhase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    regenDots();
    window.addEventListener("resize", regenDots);

    const draw = (now: number) => {
      if (stopped) return;
      const { width, height } = container.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = opacity;

      const time = (now / 1000) * speedScale;

      dots.forEach((d) => {
        const mod = (time * d.speed + d.phase) % 2;
        const lin = mod < 1 ? mod : 2 - mod;
        let intensity = 0.1 + 0.9 * (lin * lin);

        // Efectos específicos por evolución
        let drawX = d.x;
        let drawY = d.y;
        let currentRadius = radius * d.sizeMult;

        if (evolutionStage === 2) {
          // El Jardín de los Ecos: Balanceo suave (sway)
          drawX += Math.sin(time + d.offsetPhase) * 8;
          drawY += Math.cos(time * 0.5 + d.offsetPhase) * 4;
        } else if (evolutionStage === 3) {
          // El Santuario de Cristal: Centelleo nítido y formas angulares
          intensity = Math.pow(intensity, 3); // Centelleo más agresivo
        } else if (evolutionStage === 4) {
          // La Ciudad de las Estrellas: Estrellas parpadeantes
          const twinkle = Math.sin(time * 5 + d.phase * 10) * 0.5 + 0.5;
          intensity *= (0.7 + twinkle * 0.3);
          if (d.sizeMult > 1.8) {
              // Estrellas más grandes ocasionales
              currentRadius *= 1.2;
          }
        }

        ctx.beginPath();
        
        if (evolutionStage === 3 && d.phase > Math.PI) {
            // Dibujar diamantes/cristales en el mundo 3 para algunas partículas
            const s = currentRadius * 1.5;
            ctx.moveTo(drawX, drawY - s);
            ctx.lineTo(drawX + s, drawY);
            ctx.lineTo(drawX, drawY + s);
            ctx.lineTo(drawX - s, drawY);
            ctx.closePath();
        } else {
            ctx.arc(drawX, drawY, currentRadius, 0, Math.PI * 2);
        }
        
        if (intensity > 0.7) {
           ctx.fillStyle = glowColor;
           ctx.shadowColor = glowColor;
           ctx.shadowBlur = (evolutionStage === 4 ? 12 : 8) * (intensity - 0.7) * 3;
        } else {
           ctx.fillStyle = color;
           ctx.shadowBlur = 0;
        }
        
        ctx.globalAlpha = opacity * (intensity > 0.7 ? 1 : 0.3 + intensity * 0.5); 
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", regenDots);
      ro.disconnect();
    };
  }, [gap, radius, color, glowColor, opacity, speedMin, speedMax, speedScale, evolutionStage]);

  return (
    <div ref={containerRef} className={className} style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
