
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { AutoFitSvg } from './common/AutoFitSvg';
import { drawArrow, drawLabel, drawDashedLine } from './common/svgPrimitives';

// --- Types ---

interface OverturnOutputs {
    Mo: number;
    Ms: number;
    Fs: number;
    e: number;
    e_allow: number;
}

// --- Visualization ---

const OverturnVisualization: React.FC<CardComponentProps> = ({ card }) => {
    const ri = card.resolvedInputs ?? {};
    const B  = (ri['B'] as number) || 2000;

    const indices = Object.keys(card.inputs)
        .filter(k => /^type_\d+$/.test(k))
        .map(k => parseInt(k.split('_')[1]))
        .sort((a, b) => a - b);

    const verticals = indices
        .filter(n => card.inputs[`type_${n}`]?.value === 'vertical')
        .map(n => ({
            n,
            xi:  (ri[`x_${n}`]   as number) ?? B / 2,
            val: (ri[`val_${n}`] as number) || 0,
        }));

    const horizontals = indices
        .filter(n => card.inputs[`type_${n}`]?.value === 'horizontal')
        .map(n => ({
            n,
            hi:  (ri[`h_${n}`]   as number) || 0,
            val: (ri[`val_${n}`] as number) || 0,
        }));

    // Determine critical pivot side from sign of net overturning moment
    const Mo_net = horizontals.reduce((s, { val, hi }) => s + val * hi, 0);
    const pivotAtRight = Mo_net >= 0;

    // World scale: B = 100 units
    const bW = 100;
    const scale1 = bW / B;

    // Body height: based on max h_i, but capped
    const maxH = Math.max(...horizontals.map(e => e.hi), B);
    const rawBodyH = maxH * scale1;
    const bodyH = Math.min(rawBodyH, bW * 2.5);

    const arrowLenN = 24;
    const arrowLenH = 36;
    const hArrowX = -arrowLenH;  // left-side origin (negative H draws on right)

    const hasNegH = horizontals.some(h => h.val < 0);
    const pad = bW * 0.6;
    const bounds = {
        minX: -pad - arrowLenH,
        minY: -arrowLenN - bW * 0.25,
        maxX: bW + (hasNegH ? arrowLenH + bW * 0.25 : bW * 0.25),
        maxY: bodyH + bW * 0.3,
    };

    return (
        <AutoFitSvg bounds={bounds} padding={16} height={220}>
            {(s) => (
                <g>
                    {/* Ground hatch lines */}
                    <line
                        x1={-pad} y1={bodyH} x2={bW + bW * 0.2} y2={bodyH}
                        stroke="#64748b" strokeWidth={1.5 / s}
                    />
                    {Array.from({ length: 8 }, (_, i) => {
                        const x0 = -pad + i * bW * 0.22;
                        return (
                            <line
                                key={i}
                                x1={x0} y1={bodyH}
                                x2={x0 - bW * 0.09} y2={bodyH + bW * 0.09}
                                stroke="#64748b" strokeWidth={1 / s} opacity={0.5}
                            />
                        );
                    })}

                    {/* Structure body */}
                    <rect
                        x={0} y={0} width={bW} height={bodyH}
                        fill="#e2e8f0" stroke="#64748b" strokeWidth={1.5 / s}
                        opacity={0.8}
                    />

                    {/* Pivot circle: right for Mo_net ≥ 0, left for Mo_net < 0 */}
                    <circle
                        cx={pivotAtRight ? bW : 0} cy={bodyH}
                        r={4 / s}
                        fill="#ef4444" stroke="#ef4444" strokeWidth={1 / s}
                    />

                    {/* Vertical load arrows: positive=down, negative=up (uplift) */}
                    {verticals.map(({ n, xi, val }, i) => {
                        const cx      = Math.max(0, Math.min(xi * scale1, bW));
                        const uplift  = val < 0;
                        const color   = uplift ? '#ef4444' : '#3b82f6';
                        // arrowhead always at y=0 (structure top); tail above for downward, below-top for uplift
                        const [x1, y1, x2, y2] = uplift
                            ? [cx, 0, cx, -arrowLenN]   // arrowhead points up
                            : [cx, -arrowLenN, cx, 0];  // arrowhead points down
                        return (
                            <g key={n}>
                                {drawArrow(x1, y1, x2, y2, s, { color, label: `N${i + 1}`, labelSide: 'start' })}
                            </g>
                        );
                    })}

                    {/* Horizontal load arrows: positive=rightward (left side), negative=leftward (right side) */}
                    {horizontals.map(({ n, hi, val }, i) => {
                        const hScaled  = hi * scale1;
                        const hClamped = Math.min(hScaled, bodyH);
                        const arrowY   = bodyH - hClamped;
                        const reverse  = val < 0;
                        // positive: tail at hArrowX, tip at x=0 (left edge)
                        // negative: tail at bW-hArrowX, tip at x=bW (right edge)
                        const [ax1, ax2, dashX] = reverse
                            ? [bW - hArrowX, bW,  bW - hArrowX * 0.5]
                            : [hArrowX,      0,   hArrowX * 0.5      ];
                        return (
                            <g key={n}>
                                {drawArrow(
                                    ax1, arrowY, ax2, arrowY, s,
                                    { color: '#f97316', label: `H${i + 1}`, labelSide: 'start' },
                                )}
                                {drawDashedLine(dashX, bodyH, dashX, arrowY, s, { color: '#94a3b8' })}
                                {drawLabel(
                                    dashX + (reverse ? 8 / s : -8 / s),
                                    (bodyH + arrowY) / 2,
                                    `h${i + 1}`,
                                    s,
                                    { color: '#94a3b8', anchor: reverse ? 'start' : 'end' },
                                )}
                            </g>
                        );
                    })}

                    {/* B dimension at bottom */}
                    {drawDashedLine(
                        0, bodyH + bW * 0.12,
                        bW, bodyH + bW * 0.12,
                        s,
                        { color: '#94a3b8' },
                    )}
                    {drawLabel(
                        bW / 2,
                        bodyH + bW * 0.22,
                        'B',
                        s,
                        { color: '#94a3b8', anchor: 'middle', baseline: 'hanging' },
                    )}
                </g>
            )}
        </AutoFitSvg>
    );
};

// --- Definition ---

export const OverturnCardDef = createCardDefinition<OverturnOutputs>({
    type: 'OVERTURN',
    title: '転倒の検討',
    description: '複数の鉛直荷重・水平力による転倒安全率と偏心距離を確認',
    icon: RotateCcw,

    sidebar: { category: 'verify', order: 3 },

    defaultInputs: {
        B:      { value: 2000  },
        type_1: { value: 'vertical'   },
        val_1:  { value: 10000 },
        x_1:    { value: 1000  },   // B/2 = center
        type_2: { value: 'horizontal' },
        val_2:  { value: 1000  },
        h_2:    { value: 3000  },
    },

    inputConfig: {
        B: { label: '底面幅 B', unitType: 'length' },
    },

    outputConfig: {
        Ms:      { label: '安定モーメント Ms', unitType: 'moment' },
        Mo:      { label: '転倒モーメント Mo', unitType: 'moment' },
        Fs:      { label: '転倒安全率 Fs',    unitType: 'none'   },
        e:       { label: '偏心距離 e',        unitType: 'length' },
        e_allow: { label: '許容偏心 B/6',     unitType: 'length' },
    },

    dynamicRowGroups: [{
        groupLabel: '荷重リスト',
        addLabel:   '荷重を追加',
        rowLabel:   '荷重',
        minCount:   1,
        fields: [
            {
                keyPrefix:    'type',
                label:        '種別',
                options: [
                    { value: 'vertical',   label: '鉛直荷重 (N)' },
                    { value: 'horizontal', label: '水平力 (H)'   },
                ],
                defaultValue: 'vertical',
                width:        'md',
            },
            {
                keyPrefix:    'val',
                label:        '鉛直荷重 N',
                getLabel:     (raw) => raw['type'] === 'horizontal' ? '水平力 H' : '鉛直荷重 N',
                unitType:     'force',
                defaultValue: 0,
                width:        'sm',
            },
            {
                keyPrefix:    'x',
                label:        '位置 x (左端)',
                unitType:     'length',
                defaultValue: 1000,
                hidden:       (raw) => raw['type'] !== 'vertical',
                width:        'sm',
            },
            {
                keyPrefix:    'h',
                label:        '作用高さ h',
                unitType:     'length',
                defaultValue: 0,
                hidden:       (raw) => raw['type'] !== 'horizontal',
                width:        'sm',
            },
        ],
    }],

    // Critical toe is determined by sign of Mo_net = Σ H_i × h_i:
    //   Mo_net > 0 → right-toe overturning: Ms = Σ N_i(B−x_i), Mo = Mo_net
    //   Mo_net < 0 → left-toe overturning:  Ms = Σ N_i×x_i,     Mo = −Mo_net
    //   Mo_net = 0 → no overturning, Fs = ∞
    // Ms_left = ΣN×B − Ms_right, so both are derived from a single loop.
    // e = |x_R − B/2|, x_R = (Ms_left + Mo_net) / ΣN  (from moment equilibrium)
    calculate: (inputs, rawInputs) => {
        const B = inputs['B'] ?? 2000;

        const indices = Object.keys(rawInputs || {})
            .filter(k => /^type_\d+$/.test(k))
            .map(k => parseInt(k.split('_')[1]))
            .sort((a, b) => a - b);

        let sumN = 0, Ms_right = 0, Mo_net = 0;
        for (const n of indices) {
            const type = rawInputs?.[`type_${n}`]?.value ?? 'vertical';
            const val  = inputs[`val_${n}`] ?? 0;
            if (type === 'vertical') {
                const x = inputs[`x_${n}`] ?? B / 2;
                sumN     += val;
                Ms_right += val * (B - x);
            } else {
                const h = inputs[`h_${n}`] ?? 0;
                Mo_net  += val * h;
            }
        }

        const Ms_left = sumN * B - Ms_right;

        // Select critical toe
        let Ms: number, Mo: number;
        if (Mo_net > 0) {
            Ms = Ms_right; Mo = Mo_net;
        } else if (Mo_net < 0) {
            Ms = Ms_left;  Mo = -Mo_net;
        } else {
            Ms = Ms_right; Mo = 0;
        }

        // e = |x_R − B/2|, x_R derived from moment equilibrium about left toe
        const e = sumN !== 0
            ? Math.abs((Ms_left + Mo_net) / sumN - B / 2)
            : 0;

        return {
            Ms,
            Mo,
            Fs:      Mo > 0 ? Ms / Mo : Infinity,
            e,
            e_allow: B / 6,
        };
    },

    visualization: OverturnVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(OverturnCardDef);
