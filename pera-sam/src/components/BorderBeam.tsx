import { useEffect, useRef } from 'react';

let _beamId = 0;

interface BorderBeamProps {
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  /** Width of the travelling beam in pixels (the comet streak length) */
  beamLength?: number;
  /** Border radius of the parent card in pixels */
  borderRadius?: number;
  /** Reverse the direction the beam travels */
  reverse?: boolean;
}

/**
 * BorderBeam — a thin light streak that travels along the card border.
 *
 * Renders an SVG on top of the card with:
 *  - A faint static border (rgba white/blue tint)
 *  - An animated bright streak travelling around the perimeter via
 *    stroke-dashoffset animation
 *
 * Parent must have: position: relative; overflow: hidden;
 */
export const BorderBeam = ({
  duration = 5,
  delay = 0,
  colorFrom = 'rgba(180, 210, 255, 0)',
  colorTo = 'rgba(160, 200, 255, 1)',
  borderWidth = 1.5,
  beamLength = 80,
  borderRadius = 16,
  reverse = false,
}: BorderBeamProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const svg = svgRef.current;
    const rect = rectRef.current;
    if (!svg || !rect) return;

    const parent = svg.parentElement;
    if (!parent) return;

    const updateSize = () => {
      const w = parent.offsetWidth;
      const h = parent.offsetHeight;
      const r = borderRadius;

      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(h));
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

      rect.setAttribute('width', String(w - borderWidth));
      rect.setAttribute('height', String(h - borderWidth));
      rect.setAttribute('rx', String(r));
      rect.setAttribute('ry', String(r));
      rect.setAttribute('x', String(borderWidth / 2));
      rect.setAttribute('y', String(borderWidth / 2));
    };

    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(parent);

    // Animate stroke-dashoffset to move the streak around the perimeter
    let startTime: number | null = null;

    const animate = (ts: number) => {
      if (!startTime) startTime = ts - (delay * 1000);
      const elapsed = (ts - startTime) / 1000;
      const perimeter = rect.getTotalLength ? rect.getTotalLength() : 0;

      if (perimeter > 0) {
        const progress = (elapsed % duration) / duration; // 0 → 1
        // dasharray: visible streak length, then gap to fill the rest
        rect.setAttribute('stroke-dasharray', `${beamLength} ${perimeter - beamLength}`);
        // dashoffset direction controls CW vs CCW travel
        const offset = reverse
          ? progress * perimeter
          : perimeter - progress * perimeter;
        rect.setAttribute('stroke-dashoffset', String(offset));
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [duration, delay, beamLength, borderWidth, borderRadius, reverse]);

  const gradId = useRef(`beam-grad-${++_beamId}`).current;

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 10, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="50%" stopColor={colorTo} />
          <stop offset="100%" stopColor={colorFrom} />
        </linearGradient>
      </defs>

      {/* Static faint border */}
      <rect
        x={borderWidth / 2}
        y={borderWidth / 2}
        rx={borderRadius}
        ry={borderRadius}
        fill="none"
        stroke="rgba(100, 150, 255, 0.12)"
        strokeWidth={borderWidth}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Animated beam streak */}
      <rect
        ref={rectRef}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={borderWidth + 1}
        strokeLinecap="round"
        style={{
          filter: 'drop-shadow(0 0 3px rgba(140, 190, 255, 0.9)) drop-shadow(0 0 6px rgba(120, 160, 255, 0.5))',
        }}
      />
    </svg>
  );
};
