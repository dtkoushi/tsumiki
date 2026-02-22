
import React from 'react';
import { Layers } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { formatOutput, type UnitMode } from '../../lib/utils/unitFormatter';
import { resolveInput } from '../../lib/utils/cardHelpers';

// ─── SVG Visualization ────────────────────────────────────────────────────────
//
// 偶力 (couple): 距離 d_i ごとに NA 上側 (+d_i) に +N_i →、下側 (-d_i) に -N_i ← を描く。
// 各ペアが対称になることで偶力の本質が視覚化される。

const CoupleSvg: React.FC<CardComponentProps> = ({ card, upstreamCards }) => {
    const unitMode = (card.unitMode ?? 'mm') as UnitMode;

    const distKeys = Object.keys(card.inputs)
        .filter(k => /^d_\d+$/.test(k))
        .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

    // d_i は NA からの距離（正値）、N_i は上側の偶力（正値）
    const points = distKeys.map(key => {
        const idx = key.split('_')[1];
        const d = Math.abs(resolveInput(card, key, upstreamCards));
        const N = Math.abs(card.outputs[`n_${idx}`] ?? 0);
        return { key, d, N };
    }).filter(p => p.d > 0);

    const k = card.outputs['k'] ?? 0;

    if (points.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">
                距離を入力してください
            </div>
        );
    }

    // ── Layout ────────────────────────────────────────────────────────────────
    const W = 260, H = 170;
    const beamCX  = 130;
    const beamW   = 14;
    const beamX1  = beamCX - beamW / 2;   // left  edge of cross-section
    const beamX2  = beamCX + beamW / 2;   // right edge of cross-section
    const cy      = H / 2;                // neutral axis y
    const dExtent = cy - 20;              // max pixel reach from NA
    const arrowMaxL = 82;                 // max arrow length

    const maxD = Math.max(...points.map(p => p.d));
    const maxN = Math.max(...points.map(p => p.N), 1e-12);

    // y position: sign=+1 → above NA, sign=-1 → below NA
    const toY   = (d: number, sign: 1 | -1) => cy - sign * (d / maxD) * dExtent;
    const toLen = (N: number) => (N / maxN) * arrowMaxL;

    const nUnit = unitMode === 'm' ? 'kN' : 'N';
    const kUnit = unitMode === 'm' ? 'kN/m' : 'N/mm';

    // Sort descending by d (largest distance = furthest from NA = first)
    const sorted = [...points].sort((a, b) => b.d - a.d);

    // Stress-distribution envelope polygons.
    // Above NA (right side): trace beam edge top→bottom, then arrow tips bottom→top.
    // Below NA (left  side): trace beam edge bottom→top, then arrow tips top→bottom.
    // Both include the NA point so the triangle closes at y=cy, N=0.
    const showEnv = sorted.length >= 1;
    const envAbove = showEnv
        ? [`${beamX2},${cy}`,
           ...sorted.map(p => `${beamX2},${toY(p.d, 1)}`),
           ...sorted.slice().reverse().map(p => `${beamX2 + toLen(p.N)},${toY(p.d, 1)}`),
           `${beamX2},${cy}`,
          ].join(' ')
        : '';
    const envBelow = showEnv
        ? [`${beamX1},${cy}`,
           ...sorted.map(p => `${beamX1},${toY(p.d, -1)}`),
           ...sorted.slice().reverse().map(p => `${beamX1 - toLen(p.N)},${toY(p.d, -1)}`),
           `${beamX1},${cy}`,
          ].join(' ')
        : '';

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">

            {/* Neutral axis */}
            <line x1={4} y1={cy} x2={W - 4} y2={cy}
                stroke="#cbd5e1" strokeWidth="1" strokeDasharray="5,3" />
            <text x={beamCX} y={cy - 3} textAnchor="middle" fontSize="7" fill="#94a3b8">
                N.A.
            </text>

            {/* Beam cross-section */}
            <rect x={beamX1} y={cy - dExtent - 2}
                width={beamW} height={dExtent * 2 + 4}
                fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Stress-distribution envelopes (above / below NA, symmetric) */}
            {showEnv && (
                <>
                    <polygon points={envAbove}
                        fill="rgba(59,130,246,0.09)" stroke="rgba(59,130,246,0.3)"
                        strokeWidth="1" strokeDasharray="3,2" />
                    <polygon points={envBelow}
                        fill="rgba(59,130,246,0.09)" stroke="rgba(59,130,246,0.3)"
                        strokeWidth="1" strokeDasharray="3,2" />
                </>
            )}

            {/* Per-pair arrows: +Ni above NA (→), −Ni below NA (←) */}
            {points.map(p => {
                const yA   = toY(p.d,  1);        // above NA
                const yB   = toY(p.d, -1);        // below NA (mirror)
                const len  = toLen(p.N);
                const endR = beamX2 + len;         // right arrow tip (above NA)
                const endL = beamX1 - len;         // left  arrow tip (below NA)
                const nDisplay = formatOutput(p.N, 'force', unitMode);

                return (
                    <g key={p.key}>
                        {/* ── Above NA: dot + right arrow → ── */}
                        <circle cx={beamX2} cy={yA} r={2.5} fill="#3b82f6" />
                        {len > 3 && (
                            <>
                                <line x1={beamX2} y1={yA} x2={endR} y2={yA}
                                    stroke="#3b82f6" strokeWidth="1.5" />
                                <polygon
                                    points={`${endR},${yA} ${endR-6},${yA-3} ${endR-6},${yA+3}`}
                                    fill="#3b82f6" />
                                <text x={endR + 4} y={yA}
                                    textAnchor="start" fontSize="7.5"
                                    fill="#059669" dominantBaseline="middle">
                                    {nDisplay}{nUnit}
                                </text>
                            </>
                        )}

                        {/* ── Below NA: dot + left arrow ← (same magnitude) ── */}
                        <circle cx={beamX1} cy={yB} r={2.5} fill="#3b82f6" />
                        {len > 3 && (
                            <>
                                <line x1={beamX1} y1={yB} x2={endL} y2={yB}
                                    stroke="#3b82f6" strokeWidth="1.5" />
                                <polygon
                                    points={`${endL},${yB} ${endL+6},${yB-3} ${endL+6},${yB+3}`}
                                    fill="#3b82f6" />
                                <text x={endL - 4} y={yB}
                                    textAnchor="end" fontSize="7.5"
                                    fill="#059669" dominantBaseline="middle">
                                    {nDisplay}{nUnit}
                                </text>
                            </>
                        )}
                    </g>
                );
            })}

            {/* k label */}
            {k !== 0 && (
                <text x={beamCX} y={H - 4} textAnchor="middle" fontSize="7" fill="#94a3b8">
                    k = {k.toExponential(3)} {kUnit}
                </text>
            )}
        </svg>
    );
};

// ─── Card Definition ──────────────────────────────────────────────────────────

export const CoupleCardDef = createCardDefinition({
    type: 'COUPLE',
    title: '偶力変換',
    icon: Layers,
    description: '曲げモーメントを偶力に変換する。各 d_i ごとに +d_i に +N_i、−d_i に −N_i が生じる（N_i × 2d_i の和 = M）。',

    // d_i: NA からの距離（正値）。+d_i に +Ni、-d_i に -Ni が自動で生じる。
    defaultInputs: {
        M:   { value: 0 },
        d_1: { value: 500 },
        d_2: { value: 300 },
    },

    inputConfig: {
        M: { label: '曲げモーメント M', unitType: 'moment' },
    },

    outputConfig: {},

    dynamicInputGroup: {
        keyPrefix:      'd',
        inputLabel:     '距離 d（NA から）',
        inputUnitType:  'length',
        outputKeyFn:    (key) => `n_${key.split('_')[1]}`,
        outputLabel:    '偶力 N',
        outputUnitType: 'force',
        defaultValue:   300,
        minCount:       1,
        addLabel:       '追加',
    },

    // 偶力の式: M = Σ(Ni × 2 × di), Ni = k × di → k = M / (2 × Σdi²)
    // d_i は正値（NA からの距離）として扱う
    calculate: (inputs) => {
        const M = inputs['M'] ?? 0;

        const distEntries = Object.entries(inputs)
            .filter(([k]) => /^d_\d+$/.test(k))
            .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

        const outputs: Record<string, number> = { k: 0 };
        if (distEntries.length === 0) return outputs;

        // Use |d| — direction is implicit (couples are always symmetric about NA)
        const sumD2 = distEntries.reduce((sum, [, d]) => sum + d * d, 0);
        if (sumD2 === 0) {
            distEntries.forEach(([key]) => { outputs[`n_${key.split('_')[1]}`] = 0; });
            return outputs;
        }

        // M = Σ(Ni × 2 × di) = 2k × Σdi²  →  k = M / (2 × Σdi²)
        const k = M / (2 * sumD2);
        outputs['k'] = k;

        distEntries.forEach(([key, d]) => {
            outputs[`n_${key.split('_')[1]}`] = k * Math.abs(d);
        });

        return outputs;
    },

    visualization: CoupleSvg,
});
