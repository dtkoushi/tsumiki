
import React from 'react';
import { SVG_COLOR, SVG_FONT_FAMILY, SVG_FONT_SIZE } from './svgTheme';

// ─── Generic SVG Primitives (world coordinates, scale-aware) ────────────────
//
// All coordinates are in world units (mm). `scale` = px / world-unit
// (provided by AutoFitSvg or computed manually).
// Pixel-fixed sizes (stroke widths, fonts, arrowheads) are expressed as N/scale
// so they appear as N px regardless of zoom level.
//
// For beam-specific helpers (supports, loads), see beamSvgHelpers.tsx.

export interface ArrowOpts {
    color?: string;
    strokeWidth?: number;
    label?: string;
    /** 'above' | 'below' | 'start' | 'end' — label placement relative to arrow */
    labelSide?: 'above' | 'below' | 'start' | 'end';
    labelColor?: string;
    fontSize?: number;
}

/**
 * Draw an arrow from (x1,y1) to (x2,y2) in world coordinates.
 * Arrowhead at (x2,y2). Pixel sizes are fixed via scale.
 */
export const drawArrow = (
    x1: number, y1: number, x2: number, y2: number,
    scale: number, opts: ArrowOpts = {},
): JSX.Element => {
    const {
        color = SVG_COLOR.muted,
        strokeWidth = 1.5,
        label,
        labelSide = 'end',
        labelColor,
        fontSize = SVG_FONT_SIZE.xs,
    } = opts;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) return <></>;

    // Unit vector along arrow direction
    const ux = dx / len;
    const uy = dy / len;
    // Perpendicular
    const px = -uy;
    const py = ux;

    const headLen = 6 / scale;
    const headW = 3 / scale;

    const tipX = x2;
    const tipY = y2;
    const baseX = x2 - ux * headLen;
    const baseY = y2 - uy * headLen;

    const arrowPoints = [
        `${tipX},${tipY}`,
        `${baseX + px * headW},${baseY + py * headW}`,
        `${baseX - px * headW},${baseY - py * headW}`,
    ].join(' ');

    // Label positioning
    let lx = x2;
    let ly = y2;
    let anchor: 'start' | 'middle' | 'end' = 'start';
    const labelOffset = 4 / scale;
    if (labelSide === 'end') {
        lx = x2 + ux * labelOffset;
        ly = y2 + uy * labelOffset;
        anchor = 'start';
    } else if (labelSide === 'start') {
        lx = x1 - ux * labelOffset;
        ly = y1 - uy * labelOffset;
        anchor = 'end';
    } else if (labelSide === 'above') {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        lx = mx + px * labelOffset * 2;
        ly = my + py * labelOffset * 2;
        anchor = 'middle';
    } else if (labelSide === 'below') {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        lx = mx - px * labelOffset * 2;
        ly = my - py * labelOffset * 2;
        anchor = 'middle';
    }

    return (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color} strokeWidth={strokeWidth / scale} />
            <polygon points={arrowPoints} fill={color} />
            {label && (
                <text x={lx} y={ly}
                    textAnchor={anchor} dominantBaseline="middle"
                    fontSize={fontSize / scale} fill={labelColor ?? color}
                    fontFamily={SVG_FONT_FAMILY}>
                    {label}
                </text>
            )}
        </g>
    );
};

export interface LabelOpts {
    color?: string;
    fontSize?: number;
    anchor?: 'start' | 'middle' | 'end';
    baseline?: 'auto' | 'middle' | 'hanging';
}

/**
 * Draw a text label at (x,y) in world coordinates with pixel-fixed font size.
 */
export const drawLabel = (
    x: number, y: number, text: string,
    scale: number, opts: LabelOpts = {},
): JSX.Element => {
    const {
        color = SVG_COLOR.muted,
        fontSize = SVG_FONT_SIZE.xs,
        anchor = 'middle',
        baseline = 'middle',
    } = opts;
    return (
        <text x={x} y={y}
            textAnchor={anchor} dominantBaseline={baseline}
            fontSize={fontSize / scale} fill={color}
            fontFamily={SVG_FONT_FAMILY}>
            {text}
        </text>
    );
};

export interface DashedLineOpts {
    color?: string;
    strokeWidth?: number;
    dashArray?: string;
}

/**
 * Draw a dashed line from (x1,y1) to (x2,y2) in world coordinates.
 */
export const drawDashedLine = (
    x1: number, y1: number, x2: number, y2: number,
    scale: number, opts: DashedLineOpts = {},
): JSX.Element => {
    const {
        color = '#cbd5e1',
        strokeWidth = 1,
        dashArray = '5,3',
    } = opts;
    return (
        <line x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={strokeWidth / scale}
            strokeDasharray={dashArray.split(',').map(v => `${parseFloat(v) / scale}`).join(',')} />
    );
};

export interface RectOpts {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}

/**
 * Draw a rectangle at (x,y) with size (w,h) in world coordinates.
 */
export const drawRect = (
    x: number, y: number, w: number, h: number,
    scale: number, opts: RectOpts = {},
): JSX.Element => {
    const {
        fill = '#f1f5f9',
        stroke = '#94a3b8',
        strokeWidth = 1.5,
    } = opts;
    return (
        <rect x={x} y={y} width={w} height={h}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth / scale} />
    );
};
