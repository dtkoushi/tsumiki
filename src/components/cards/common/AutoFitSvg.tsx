
import React, { useRef, useState, useEffect } from 'react';
import type { Point, DimensionDef } from '../section/drawingStrategies';

interface AutoFitSvgProps {
    // Geometry in World Coordinates
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    path?: string; // The main shape path (optional)
    dimensions?: DimensionDef[]; // Dimensions to render

    // Customization
    padding?: number; // default 40
    strokeWidth?: number; // default 2
    height?: number | string; // default 240px
    className?: string;

    // Custom Elements (rendered in World Coordinate Space)
    children?: React.ReactNode | ((scale: number) => React.ReactNode);
}

/**
 * A hook to measure the size of an HTML element.
 */
function useContainerSize() {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    useEffect(() => {
        if (!ref.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // Use contentRect for precise content box size
                setSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return { ref, size };
}

export const AutoFitSvg: React.FC<AutoFitSvgProps> = ({
    bounds,
    path,
    dimensions = [],
    padding = 40,
    strokeWidth = 2,
    height = 240,
    className = "",
    children
}) => {
    const { ref, size } = useContainerSize();
    const { width: W, height: H } = size;

    // 1. Calculate Transform
    // Bounds size
    const bW = bounds.maxX - bounds.minX;
    const bH = bounds.maxY - bounds.minY;

    // Scale to fit container with padding
    const availableW = W - padding * 2;
    const availableH = H - padding * 2;

    // Avoid division by zero
    const safeBW = bW || 1;
    const safeBH = bH || 1;

    // Scale: px / unit
    const scale = Math.min(availableW / safeBW, availableH / safeBH) || 1;

    // Translation to center
    // Center of bounds in World
    const centerWX = (bounds.minX + bounds.maxX) / 2;
    const centerWY = (bounds.minY + bounds.maxY) / 2;

    // Center of container in Screen
    const centerSX = W / 2;
    const centerSY = H / 2;

    // Adjusted Transform function (Y-down assumed for SVG)
    const worldToScreen = (p: Point) => ({
        x: (p.x - centerWX) * scale + centerSX,
        y: (p.y - centerWY) * scale + centerSY
    });

    // Generate Path transform for <g>
    // translate(centerSX, centerSY) scale(scale) translate(-centerWX, -centerWY)
    const transformString = `translate(${centerSX}, ${centerSY}) scale(${scale}) translate(${-centerWX}, ${-centerWY})`;

    const containerStyle = typeof height === 'number' ? { height: `${height}px` } : { height };

    return (
        <div ref={ref} style={containerStyle} className={`w-full relative overflow-hidden select-none ${className}`}>
            {/* Only render SVG if specific size is available, otherwise just placeholder to measure */}
            {W > 0 && H > 0 && (
                <svg width={W} height={H} className="block">
                    {/* Shape Layer */}
                    <g transform={transformString}>
                        {path && (
                            <path
                                d={path}
                                fill="none"
                                stroke="currentColor"
                                // Counter-scale stroke width so it remains constant px regardless of zoom
                                strokeWidth={strokeWidth / scale}
                                vectorEffect="non-scaling-stroke"
                                className="text-slate-700 dark:text-slate-300 transition-all duration-300 ease-out"
                            />
                        )}
                        {/* Custom Children */}
                        {typeof children === 'function' ? children(scale) : children}
                    </g>

                    {/* Dimensions Layer (Screen Coordinates) */}
                    <g className="text-slate-500">
                        {dimensions.map((dim, i) => {
                            const start = worldToScreen(dim.start);
                            const end = worldToScreen(dim.end);
                            const offset = (dim.offset || 0); // screen px offset

                            // Vector for dimension line
                            const dx = end.x - start.x;
                            const dy = end.y - start.y;
                            const len = Math.sqrt(dx * dx + dy * dy) || 1;

                            // Normal vector (normalized)
                            const nx = -dy / len;
                            const ny = dx / len;

                            // Offset points
                            const p1 = { x: start.x + nx * offset, y: start.y + ny * offset };
                            const p2 = { x: end.x + nx * offset, y: end.y + ny * offset };

                            // Label position (midpoint of dim line)
                            const midX = (p1.x + p2.x) / 2;
                            const midY = (p1.y + p2.y) / 2;

                            return (
                                <g key={i}>
                                    {/* Dimension Line */}
                                    <line
                                        x1={p1.x} y1={p1.y}
                                        x2={p2.x} y2={p2.y}
                                        stroke="currentColor"
                                        strokeWidth={1}
                                        opacity={0.5}
                                    />

                                    {/* Extension Lines */}
                                    <line x1={start.x} y1={start.y} x2={p1.x} y2={p1.y} stroke="currentColor" strokeWidth={1} strokeDasharray="2 2" opacity={0.3} />
                                    <line x1={end.x} y1={end.y} x2={p2.x} y2={p2.y} stroke="currentColor" strokeWidth={1} strokeDasharray="2 2" opacity={0.3} />

                                    {/* Label */}
                                    <text
                                        x={midX}
                                        y={midY}
                                        dy={offset > 0 ? -4 : 12 /* Flip text side based on offset direction */}
                                        textAnchor="middle"
                                        fontSize={11}
                                        fill="currentColor"
                                        className="font-mono font-medium"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {dim.label}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            )}
        </div>
    );
};
