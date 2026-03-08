
// SVG design tokens — single source of truth for all SVG text/color styles.
//
// fontSize usage:
//   - World-coordinate SVGs (beamSvgHelpers, svgPrimitives): divide by scale → N/scale
//   - Fixed-viewBox SVGs (Diagram, Deflection, AutoFitSvg): use directly as px

export const SVG_FONT_SIZE = {
    xs:  7,   // arrow labels, auxiliary text
    sm:  9,   // axis labels (x=0, x_n markers)
    md: 10,   // load/force value labels
    lg: 11,   // dimension annotations (AutoFitSvg)
} as const;

export const SVG_FONT_FAMILY = 'ui-monospace, SFMono-Regular, monospace';

export const SVG_FONT_WEIGHT = {
    normal: 400,
    bold:   600,
} as const;

export const SVG_COLOR = {
    beam:   '#475569',  // slate-600  — beam line
    muted:  '#94a3b8',  // slate-400  — axis labels, auxiliary text
    blue:   '#3b82f6',  // blue-500   — distributed load, M diagram
    red:    '#ef4444',  // red-500    — point load
    green:  '#10b981',  // emerald-500 — Q diagram, OK indicator
    violet: '#8b5cf6',  // violet-500 — moment load
    amber:  '#f59e0b',  // amber-500  — x_n markers
    teal:   '#059669',  // emerald-600 — Couple force labels (reserved for Couple.tsx)
} as const;
