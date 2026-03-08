
import React from 'react';
import { SVG_COLOR, SVG_FONT_FAMILY, SVG_FONT_SIZE, SVG_FONT_WEIGHT } from './svgTheme';

export const C_BEAM   = SVG_COLOR.beam;
export const C_POINT  = SVG_COLOR.red;
export const C_DIST   = SVG_COLOR.blue;
export const C_MOMENT = SVG_COLOR.violet;

// ─── Scale-based helpers (world coordinates, beam at y = 0) ───────────────────
//
// All coordinates are in world units (mm).
// scale = px / world-unit (provided by AutoFitSvg).
// Pixel sizes are expressed as N/scale so they appear as N px at any zoom level.

export type BoundaryDraw = 'simple' | 'cantilever' | 'fixed_fixed' | 'fixed_pinned';

export const getBeamBounds = (L: number) => {
    const VU = L / 20;
    return { minX: -VU * 4, maxX: L + VU * 2, minY: -VU * 6, maxY: VU * 4 };
};

export const drawScaledFixedSupport = (x: number, scale: number, side: 'left' | 'right'): JSX.Element => {
    const h = 14 / scale;
    const dir = side === 'left' ? -1 : 1;
    return (
        <g>
            <line x1={x} y1={-h} x2={x} y2={h} stroke={C_BEAM} strokeWidth={2 / scale} />
            {[-h, -h / 2, 0, h / 2, h].map((dy, i) => (
                <line key={i} x1={x} y1={dy} x2={x + dir * 8 / scale} y2={dy + 6 / scale}
                    stroke={C_BEAM} strokeWidth={1 / scale} />
            ))}
        </g>
    );
};

export const drawScaledPinSupport = (x: number, scale: number): JSX.Element => {
    const ms = 8 / scale;
    return (
        <g>
            <polygon points={`${x - ms},${ms * 2} ${x + ms},${ms * 2} ${x},0`}
                fill="none" stroke={C_BEAM} strokeWidth={1.5 / scale} />
            <line x1={x - ms - 4 / scale} y1={ms * 2} x2={x + ms + 4 / scale} y2={ms * 2}
                stroke={C_BEAM} strokeWidth={1.5 / scale} />
        </g>
    );
};

export const drawScaledRollerSupport = (x: number, scale: number): JSX.Element => {
    const ms = 8 / scale;
    return (
        <g>
            <circle cx={x} cy={ms} r={ms} fill="none" stroke={C_BEAM} strokeWidth={1.5 / scale} />
            <line x1={x - ms - 4 / scale} y1={ms * 2} x2={x + ms + 4 / scale} y2={ms * 2}
                stroke={C_BEAM} strokeWidth={1.5 / scale} />
        </g>
    );
};

export const drawScaledBeamAndSupports = (L: number, scale: number, boundary: BoundaryDraw): JSX.Element => (
    <g>
        <line x1={0} y1={0} x2={L} y2={0} stroke={C_BEAM} strokeWidth={3 / scale} strokeLinecap="round" />
        {(boundary === 'cantilever' || boundary === 'fixed_fixed' || boundary === 'fixed_pinned')
            ? drawScaledFixedSupport(0, scale, 'left')
            : drawScaledPinSupport(0, scale)}
        {boundary === 'simple' && drawScaledRollerSupport(L, scale)}
        {boundary === 'fixed_fixed' && drawScaledFixedSupport(L, scale, 'right')}
        {boundary === 'fixed_pinned' && drawScaledPinSupport(L, scale)}
        <text x={0} y={24 / scale} textAnchor="middle" dominantBaseline="middle"
            fontSize={SVG_FONT_SIZE.sm / scale} fill={SVG_COLOR.muted}
            fontFamily={SVG_FONT_FAMILY}>x=0</text>
    </g>
);

/**
 * Draw a distributed load from world position a to b.
 * heightScale (default 1.0): relative magnitude for multi-load diagrams (BeamMulti).
 */
export const drawScaledDistLoad = (a: number, b: number, scale: number, val: number, label?: string, heightScale = 1.0): JSX.Element => {
    const ms = 8 / scale;
    const distH = ms * 5 * heightScale;
    const distW = Math.max(b - a, 6 / scale);
    const numArrows = Math.min(7, Math.max(2, Math.round(distW * scale / 28) + 1));
    const s = val >= 0 ? -1 : 1;
    const farY = s * distH;
    return (
        <g>
            <rect x={a} y={Math.min(farY, 0)} width={distW} height={distH}
                fill={C_DIST} fillOpacity={0.08} stroke="none" />
            <line x1={a} y1={farY} x2={a + distW} y2={farY} stroke={C_DIST} strokeWidth={1.5 / scale} />
            <line x1={a} y1={farY} x2={a} y2={0} stroke={C_DIST} strokeWidth={1 / scale} />
            <line x1={a + distW} y1={farY} x2={a + distW} y2={0} stroke={C_DIST} strokeWidth={1 / scale} />
            {Array.from({ length: numArrows }, (_, i) => {
                const tx = a + (numArrows > 1 ? (i / (numArrows - 1)) * distW : distW / 2);
                return (
                    <g key={i}>
                        <line x1={tx} y1={farY - s * 2 / scale} x2={tx} y2={s / scale}
                            stroke={C_DIST} strokeWidth={1 / scale} />
                        <polygon points={`${tx - 4 / scale},${s * ms} ${tx + 4 / scale},${s * ms} ${tx},0`}
                            fill={C_DIST} />
                    </g>
                );
            })}
            {label && (
                <text x={a + distW / 2} y={s < 0 ? farY - 4 / scale : farY + 12 / scale}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={SVG_FONT_SIZE.md / scale} fill={C_DIST}
                    fontWeight={SVG_FONT_WEIGHT.bold} fontFamily={SVG_FONT_FAMILY}>
                    {label}
                </text>
            )}
        </g>
    );
};

/**
 * Draw a point load at world position a.
 * heightScale (default 1.0): relative magnitude for multi-load diagrams (BeamMulti).
 */
export const drawScaledPointLoad = (a: number, scale: number, P: number, label?: string, heightScale = 1.0): JSX.Element => {
    const ms = 8 / scale;
    const loadH = ms * 5 * heightScale;
    const s = P >= 0 ? -1 : 1;
    const farY = s * loadH;
    return (
        <g>
            <line x1={a} y1={farY} x2={a} y2={s / scale} stroke={C_POINT} strokeWidth={2 / scale} />
            <polygon points={`${a - 5 / scale},${s * (ms + 2 / scale)} ${a + 5 / scale},${s * (ms + 2 / scale)} ${a},0`}
                fill={C_POINT} />
            {label && (
                <text x={a} y={s < 0 ? farY - 4 / scale : farY + 12 / scale}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={SVG_FONT_SIZE.md / scale} fill={C_POINT}
                    fontWeight={SVG_FONT_WEIGHT.bold} fontFamily={SVG_FONT_FAMILY}>
                    {label}
                </text>
            )}
        </g>
    );
};

/**
 * Draw a moment load (arc + arrowhead) at world position a.
 * heightScale (default 1.0): relative magnitude for multi-load diagrams (BeamMulti).
 */
export const drawScaledMomentLoad = (a: number, scale: number, val: number, label?: string, heightScale = 1.0): JSX.Element => {
    const r = 16 / scale * heightScale;
    const clockwise = val >= 0;
    const N_pts = 20;
    const pts = Array.from({ length: N_pts + 1 }, (_, i) => {
        const angle = (i / N_pts) * (3 * Math.PI / 2);
        const y = clockwise ? r * Math.sin(angle) : -r * Math.sin(angle);
        return `${a + r * Math.cos(angle)},${y}`;
    });
    const ey = clockwise ? -r : r;
    const aw = 4 / scale;
    const al = 7 / scale;
    return (
        <g>
            <polyline points={pts.join(' ')} fill="none" stroke={C_MOMENT} strokeWidth={1.5 / scale} />
            <polygon points={`${a - al},${ey - aw} ${a + aw * 1.2},${ey} ${a - al},${ey + aw}`}
                fill={C_MOMENT} />
            {label && (
                <text x={a + r + 4 / scale} y={4 / scale}
                    textAnchor="start" dominantBaseline="middle"
                    fontSize={SVG_FONT_SIZE.md / scale} fill={C_MOMENT}
                    fontWeight={SVG_FONT_WEIGHT.bold} fontFamily={SVG_FONT_FAMILY}>
                    {label}
                </text>
            )}
        </g>
    );
};

interface FixedSupportProps {
    x: number;
    beamY: number;
    side: 'left' | 'right';
}

export const DrawFixedSupport: React.FC<FixedSupportProps> = ({ x, beamY, side }) => {
    const dir = side === 'left' ? -1 : 1;
    const h = 14;
    return (
        <g>
            <line x1={x} y1={beamY - h} x2={x} y2={beamY + h} stroke={C_BEAM} strokeWidth="2" />
            {[-h, -h / 2, 0, h / 2, h].map((dy, i) => (
                <line key={i} x1={x} y1={beamY + dy}
                    x2={x + dir * 8} y2={beamY + dy + 6}
                    stroke={C_BEAM} strokeWidth="1" />
            ))}
        </g>
    );
};

interface SupportProps {
    x: number;
    beamY: number;
}

export const DrawPinSupport: React.FC<SupportProps> = ({ x, beamY }) => {
    const ms = 8;
    return (
        <g>
            <polygon
                points={`${x - ms},${beamY + ms * 2} ${x + ms},${beamY + ms * 2} ${x},${beamY}`}
                fill="none" stroke={C_BEAM} strokeWidth="1.5"
            />
            <line x1={x - ms - 4} y1={beamY + ms * 2}
                x2={x + ms + 4} y2={beamY + ms * 2}
                stroke={C_BEAM} strokeWidth="1.5" />
        </g>
    );
};

export const DrawRollerSupport: React.FC<SupportProps> = ({ x, beamY }) => {
    const ms = 8;
    return (
        <g>
            <circle cx={x} cy={beamY + ms} r={ms}
                fill="none" stroke={C_BEAM} strokeWidth="1.5" />
            <line x1={x - ms - 4} y1={beamY + ms * 2}
                x2={x + ms + 4} y2={beamY + ms * 2}
                stroke={C_BEAM} strokeWidth="1.5" />
        </g>
    );
};
