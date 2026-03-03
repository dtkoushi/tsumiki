
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
        .map(n => ({ n, xi: (ri[`x_${n}`] as number) ?? B / 2 }));

    const horizontals = indices
        .filter(n => card.inputs[`type_${n}`]?.value === 'horizontal')
        .map(n => ({ n, hi: (ri[`h_${n}`] as number) || 0 }));

    // World scale: B = 100 units
    const bW = 100;
    const scale1 = bW / B;

    // Body height: based on max h_i, but capped
    const maxH = Math.max(...horizontals.map(e => e.hi), B);
    const rawBodyH = maxH * scale1;
    const bodyH = Math.min(rawBodyH, bW * 2.5);

    const arrowLenN = 24;
    const arrowLenH = 36;
    const hArrowX = -arrowLenH;

    const pad = bW * 0.6;
    const bounds = {
        minX: -pad - arrowLenH,
        minY: -arrowLenN - bW * 0.25,
        maxX: bW + bW * 0.25,
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

                    {/* Pivot circle at bottom-right corner */}
                    <circle
                        cx={bW} cy={bodyH}
                        r={4 / s}
                        fill="#ef4444" stroke="#ef4444" strokeWidth={1 / s}
                    />

                    {/* Vertical load arrows: positioned at x_i from left */}
                    {verticals.map(({ n, xi }, i) => {
                        const cx = Math.max(0, Math.min(xi * scale1, bW));
                        return (
                            <g key={n}>
                                {drawArrow(
                                    cx, -arrowLenN,
                                    cx, 0,
                                    s,
                                    { color: '#3b82f6', label: `N${i + 1}`, labelSide: 'start' },
                                )}
                            </g>
                        );
                    })}

                    {/* Horizontal load arrows: pointing right at each h_i height */}
                    {horizontals.map(({ n, hi }, i) => {
                        const hScaled = hi * scale1;
                        const hClamped = Math.min(hScaled, bodyH);
                        const arrowY = bodyH - hClamped;
                        return (
                            <g key={n}>
                                {drawArrow(
                                    hArrowX, arrowY,
                                    0, arrowY,
                                    s,
                                    { color: '#f97316', label: `H${i + 1}`, labelSide: 'start' },
                                )}
                                {drawDashedLine(
                                    hArrowX * 0.5, bodyH,
                                    hArrowX * 0.5, arrowY,
                                    s,
                                    { color: '#94a3b8' },
                                )}
                                {drawLabel(
                                    hArrowX * 0.5 - 8 / s,
                                    (bodyH + arrowY) / 2,
                                    `h${i + 1}`,
                                    s,
                                    { color: '#94a3b8', anchor: 'end' },
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

    // Ms, Mo are computed about the right-edge toe (pivot).
    // Ms = Σ N_i × (B − x_i)   [x_i: distance from left edge]
    // Mo = Σ H_i × h_i
    // e  = |B/2 − (Ms − Mo) / ΣN|
    calculate: (inputs, rawInputs) => {
        const B = inputs['B'] ?? 2000;

        const indices = Object.keys(rawInputs || {})
            .filter(k => /^type_\d+$/.test(k))
            .map(k => parseInt(k.split('_')[1]))
            .sort((a, b) => a - b);

        let sumN = 0, Ms = 0, Mo = 0;
        for (const n of indices) {
            const type = rawInputs?.[`type_${n}`]?.value ?? 'vertical';
            const val  = inputs[`val_${n}`] ?? 0;
            if (type === 'vertical') {
                const x = inputs[`x_${n}`] ?? B / 2;
                sumN += val;
                Ms   += val * (B - x);   // moment arm to right-edge toe
            } else {
                const h = inputs[`h_${n}`] ?? 0;
                Mo += val * h;
            }
        }

        const e = sumN !== 0 ? Math.abs(B / 2 - (Ms - Mo) / sumN) : 0;

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
