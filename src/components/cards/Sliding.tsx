
import React from 'react';
import { MoveHorizontal } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { AutoFitSvg } from './common/AutoFitSvg';
import { drawArrow, drawLabel } from './common/svgPrimitives';

// --- Visualization ---

const SlidingVisualization: React.FC<CardComponentProps> = ({ card }) => {
    const ri  = card.resolvedInputs ?? {};
    const mu  = (ri['mu'] as number) ?? 0.5;
    const Fr  = (card.outputs['Fr'] as number) ?? 0;

    // Collect N_i entries (positive = compression/down, negative = uplift/up)
    const nEntries = Object.entries(ri)
        .filter(([k]) => /^N_\d+$/.test(k))
        .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
        .map(([key, val]) => ({ key, val: (val as number) || 0 }));

    const bW = 100;
    const bodyH = 60;
    const arrowLen = 28;

    // Spread N arrows across block width
    const count = Math.max(nEntries.length, 1);
    const step = bW / (count + 1);

    const topY = 0;
    const botY = bodyH;

    const pad = bW * 0.5;
    const frArrowLen = 40;

    const bounds = {
        minX: -pad - frArrowLen,
        minY: -arrowLen - 10,
        maxX: bW + pad,
        maxY: botY + bW * 0.3,
    };

    return (
        <AutoFitSvg bounds={bounds} padding={16} height={200}>
            {(s) => (
                <g>
                    {/* Ground hatch lines */}
                    <line
                        x1={-pad} y1={botY} x2={bW + pad * 0.5} y2={botY}
                        stroke="#64748b" strokeWidth={1.5 / s}
                    />
                    {Array.from({ length: 10 }, (_, i) => {
                        const x0 = -pad + i * bW * 0.2;
                        return (
                            <line
                                key={i}
                                x1={x0} y1={botY}
                                x2={x0 - bW * 0.08} y2={botY + bW * 0.08}
                                stroke="#64748b" strokeWidth={1 / s} opacity={0.5}
                            />
                        );
                    })}

                    {/* Structure body */}
                    <rect
                        x={0} y={topY} width={bW} height={bodyH}
                        fill="#e2e8f0" stroke="#64748b" strokeWidth={1.5 / s}
                        opacity={0.8}
                    />

                    {/* N_i arrows */}
                    {nEntries.map(({ key, val }, i) => {
                        const idx = i + 1;
                        const cx = step * idx;
                        const isNeg = val < 0;
                        const color = isNeg ? '#ef4444' : '#3b82f6';
                        const label = `N${idx}`;
                        // positive: arrow from above pointing down into block
                        // negative: arrow from bottom pointing up (uplift)
                        return isNeg ? (
                            drawArrow(
                                cx, topY,
                                cx, topY - arrowLen,
                                s,
                                { color, label, labelSide: 'end' },
                            )
                        ) : (
                            drawArrow(
                                cx, topY - arrowLen,
                                cx, topY,
                                s,
                                { color, label, labelSide: 'start' },
                            )
                        );
                    })}

                    {/* Fr arrow at base: Fr>0 → left-pointing (resisting), Fr<0 → right-pointing (failure) */}
                    {Fr !== 0 && (() => {
                        const frY = botY - 4 / s;
                        const color = Fr > 0 ? '#22c55e' : '#ef4444';
                        return Fr > 0
                            ? drawArrow(frArrowLen, frY, 0, frY, s, { color, label: 'Fr', labelSide: 'end' })
                            : drawArrow(-frArrowLen, frY, 0, frY, s, { color, label: 'Fr', labelSide: 'end' });
                    })()}

                    {/* μ label below block */}
                    {drawLabel(
                        bW / 2,
                        botY + bW * 0.12,
                        `μ = ${mu.toFixed(2)}`,
                        s,
                        { color: '#94a3b8', anchor: 'middle', baseline: 'hanging' },
                    )}
                </g>
            )}
        </AutoFitSvg>
    );
};

// --- Definition ---

export const SlidingCardDef = createCardDefinition<Record<string, number>>({
    type: 'SLIDING',
    title: '滑動の検討',
    description: '複数の鉛直荷重に対する摩擦抵抗力の合計を計算',
    icon: MoveHorizontal,

    sidebar: { category: 'balance', order: 4 },

    defaultInputs: {
        mu:  { value: 0.5   },
        N_1: { value: 10000 },
    },

    inputConfig: {
        mu: { label: '摩擦係数 μ', unitType: 'none' },
    },

    outputConfig: {
        Fr: { label: '摩擦抵抗力合計 Fr', unitType: 'force' },
    },

    dynamicInputGroups: [{
        keyPrefix:      'N',
        inputLabel:     '鉛直荷重',
        rowLabel:       '荷重',
        inputUnitType:  'force',
        outputKeyFn:    (key) => `fr_${key.split('_')[1]}`,
        outputLabel:    '摩擦力',
        outputUnitType: 'force',
        defaultValue:   10000,
        minCount:       1,
        addLabel:       '鉛直荷重を追加',
        outputIndexFn:  (key) => { const m = key.match(/^fr_(\d+)$/); return m ? m[1] : null; },
    }],

    calculate: (inputs) => {
        const mu = inputs['mu'] ?? 0.5;
        const nEntries = Object.entries(inputs)
            .filter(([k]) => /^N_\d+$/.test(k));
        const outputs: Record<string, number> = { Fr: 0 };
        let total = 0;
        for (const [key, n] of nEntries) {
            const idx = key.split('_')[1];
            const fri = mu * n;
            outputs[`fr_${idx}`] = fri;
            total += fri;
        }
        outputs['Fr'] = total;
        return outputs;
    },

    visualization: SlidingVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(SlidingCardDef);
