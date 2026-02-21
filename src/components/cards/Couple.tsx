
import React from 'react';
import { Layers } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import type { Card } from '../../types';
import { formatOutput, type UnitMode } from '../../lib/utils/unitFormatter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Resolve a SmartInput value (value or ref) to SI number
function resolveInput(card: Card, key: string, upstreamCards: Card[]): number {
    const inp = card.inputs[key];
    if (!inp) return 0;
    if (inp.ref) {
        const src = upstreamCards.find(c => c.id === inp.ref!.cardId);
        return src?.outputs[inp.ref!.outputKey] ?? 0;
    }
    return Number(inp.value ?? 0);
}

// ─── SVG Visualization ────────────────────────────────────────────────────────

const CoupleSvg: React.FC<CardComponentProps> = ({ card, upstreamCards }) => {
    const unitMode = (card.unitMode ?? 'mm') as UnitMode;

    const distKeys = Object.keys(card.inputs)
        .filter(k => /^d_\d+$/.test(k))
        .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

    const points = distKeys.map(key => {
        const idx = key.split('_')[1];
        const d = resolveInput(card, key, upstreamCards);
        const N = card.outputs[`n_${idx}`] ?? 0;
        return { key, d, N };
    }).filter(p => p.d !== 0);

    const k = card.outputs['k'] ?? 0;

    if (points.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">
                距離を入力してください
            </div>
        );
    }

    // ── Layout constants ──────────────────────────────────────────────────────
    // Positive N (d > 0, above NA) → right-side arrow →
    // Negative N (d < 0, below NA) → left-side arrow ←
    const W = 260, H = 160;
    const beamCX  = 130;
    const beamW   = 14;
    const beamX1  = beamCX - beamW / 2;  // left edge
    const beamX2  = beamCX + beamW / 2;  // right edge
    const cy      = H / 2;
    const dExtent = cy - 22;
    const arrowMaxL = 82;

    const maxAbsD = Math.max(...points.map(p => Math.abs(p.d)));
    const maxAbsN = Math.max(...points.map(p => Math.abs(p.N)), 1e-12);

    const toY   = (d: number) => cy - (d / maxAbsD) * dExtent;
    const toLen = (N: number) => (Math.abs(N) / maxAbsN) * arrowMaxL;

    const nUnit = unitMode === 'm' ? 'kN' : 'N';
    const kUnit = unitMode === 'm' ? 'kN/m' : 'N/mm';

    // Separate by sign and sort top→bottom within each group
    const posPoints = points.filter(p => p.N >= 0).sort((a, b) => b.d - a.d);
    const negPoints = points.filter(p => p.N <  0).sort((a, b) => b.d - a.d);

    // Stress envelopes per sign group (need ≥2 points in group)
    const posEnvStr = posPoints.length >= 2
        ? [...posPoints.map(p => `${beamX2},${toY(p.d)}`),
           ...posPoints.slice().reverse().map(p => `${beamX2 + toLen(p.N)},${toY(p.d)}`)
          ].join(' ')
        : '';
    const negEnvStr = negPoints.length >= 2
        ? [...negPoints.map(p => `${beamX1},${toY(p.d)}`),
           ...negPoints.slice().reverse().map(p => `${beamX1 - toLen(p.N)},${toY(p.d)}`)
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

            {/* Stress envelope – positive (right) */}
            {posEnvStr && (
                <polygon points={posEnvStr}
                    fill="rgba(59,130,246,0.09)" stroke="rgba(59,130,246,0.3)"
                    strokeWidth="1" strokeDasharray="3,2" />
            )}

            {/* Stress envelope – negative (left) */}
            {negEnvStr && (
                <polygon points={negEnvStr}
                    fill="rgba(239,68,68,0.09)" stroke="rgba(239,68,68,0.3)"
                    strokeWidth="1" strokeDasharray="3,2" />
            )}

            {/* Per-point arrows: N≥0 → right side (→), N<0 → left side (←) */}
            {points.map(p => {
                const y      = toY(p.d);
                const len    = toLen(p.N);
                const isPos  = p.N >= 0;
                const cx     = isPos ? beamX2 : beamX1;
                const endX   = isPos ? cx + len : cx - len;
                const color  = isPos ? '#3b82f6' : '#ef4444';
                const nDisplay = formatOutput(Math.abs(p.N), 'force', unitMode);

                return (
                    <g key={p.key}>
                        <circle cx={cx} cy={y} r={2.5} fill={color} />

                        {len > 3 && (
                            <>
                                <line x1={cx} y1={y} x2={endX} y2={y}
                                    stroke={color} strokeWidth="1.5" />
                                {/* Arrowhead: → for positive, ← for negative */}
                                {isPos
                                    ? <polygon points={`${endX},${y} ${endX-6},${y-3} ${endX-6},${y+3}`} fill={color} />
                                    : <polygon points={`${endX},${y} ${endX+6},${y-3} ${endX+6},${y+3}`} fill={color} />
                                }
                            </>
                        )}

                        <text
                            x={isPos ? endX + 4 : endX - 4}
                            y={y}
                            textAnchor={isPos ? 'start' : 'end'}
                            fontSize="7.5" fill="#059669" dominantBaseline="middle">
                            {nDisplay}{nUnit}
                        </text>
                    </g>
                );
            })}

            {/* k label at bottom */}
            {k !== 0 && (
                <text x={beamCX} y={H - 5} textAnchor="middle" fontSize="7" fill="#94a3b8">
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
    description: '曲げモーメントを線形分布の偶力に変換する（Ni ∝ di）。',

    defaultInputs: {
        M:   { value: 0 },
        d_1: { value:  500 },   // above NA (positive d → positive N)
        d_2: { value: -500 },   // below NA (negative d → negative N)
    },

    inputConfig: {
        M: { label: '曲げモーメント M', unitType: 'moment' },
    },

    outputConfig: {},

    dynamicInputGroup: {
        keyPrefix:     'd',
        inputLabel:    '距離 d',
        inputUnitType: 'length',
        outputKeyFn:   (key) => `n_${key.split('_')[1]}`,
        outputLabel:   '偶力 N',
        outputUnitType: 'force',
        defaultValue:  500,   // 500 mm SI default
        minCount:      1,
        addLabel:      '追加',
    },

    // All SI: M [Nmm], d_i [mm] → n_i [N], k [N/mm]
    calculate: (inputs) => {
        const M = inputs['M'] ?? 0;

        const distEntries = Object.entries(inputs)
            .filter(([k]) => /^d_\d+$/.test(k))
            .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

        const outputs: Record<string, number> = { k: 0 };

        if (distEntries.length === 0) return outputs;

        const sumD2 = distEntries.reduce((sum, [, d]) => sum + d * d, 0);

        if (sumD2 === 0) {
            distEntries.forEach(([key]) => {
                outputs[`n_${key.split('_')[1]}`] = 0;
            });
            return outputs;
        }

        const k = M / sumD2;
        outputs['k'] = k;

        distEntries.forEach(([key, d]) => {
            outputs[`n_${key.split('_')[1]}`] = k * d;
        });

        return outputs;
    },

    visualization: CoupleSvg,
});
