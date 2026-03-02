
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
    [key: string]: number;
}

// --- Visualization ---

const OverturnVisualization: React.FC<CardComponentProps> = ({ card }) => {
    const ri = card.resolvedInputs ?? {};
    const B  = (ri['B'] as number) || 2000;

    // Collect N_i and H_i / h_i entries
    const nEntries = Object.entries(ri)
        .filter(([k]) => /^N_\d+$/.test(k))
        .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
        .map(([key, val]) => ({ key, val: (val as number) || 0 }));

    const hEntries = Object.entries(ri)
        .filter(([k]) => /^H_\d+$/.test(k))
        .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
        .map(([key, val]) => {
            const idx = key.split('_')[1];
            const hi = (ri[`h_${idx}`] as number) || 0;
            return { key, val: (val as number) || 0, hi };
        });

    // World scale: B = 100 units
    const bW = 100;

    // Body height: based on max h_i, but capped
    const maxH = Math.max(...hEntries.map(e => e.hi), B);
    const scale1 = bW / B;
    const rawBodyH = maxH * scale1;
    const bodyH = Math.min(rawBodyH, bW * 2.5);

    const arrowLenN = 24;
    const arrowLenH = 36;

    // Spread N arrows across block width
    const nCount = Math.max(nEntries.length, 1);
    const nStep = bW / (nCount + 1);

    // H arrows: positioned at their h_i heights (measured from bottom = ground)
    // y in SVG: 0=top, bodyH=bottom (ground)
    // h_i is measured from the bottom, so y = bodyH - h_i * scale1, clamped within [0, bodyH]
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

                    {/* N_i arrows: evenly spread across top, pointing down */}
                    {nEntries.map(({ key }, i) => {
                        const idx = i + 1;
                        const cx = nStep * idx;
                        return (
                            <g key={key}>
                                {drawArrow(
                                    cx, -arrowLenN,
                                    cx, 0,
                                    s,
                                    { color: '#3b82f6', label: `N${idx}`, labelSide: 'start' },
                                )}
                            </g>
                        );
                    })}

                    {/* H_i arrows: pointing right at each h_i height */}
                    {hEntries.map(({ key, hi }, i) => {
                        const idx = i + 1;
                        const hScaled = hi * scale1;
                        const hClamped = Math.min(hScaled, bodyH);
                        const arrowY = bodyH - hClamped;
                        return (
                            <g key={key}>
                                {drawArrow(
                                    hArrowX, arrowY,
                                    0, arrowY,
                                    s,
                                    { color: '#f97316', label: `H${idx}`, labelSide: 'start' },
                                )}
                                {/* Dashed vertical line showing h_i */}
                                {drawDashedLine(
                                    hArrowX * 0.5, bodyH,
                                    hArrowX * 0.5, arrowY,
                                    s,
                                    { color: '#94a3b8' },
                                )}
                                {drawLabel(
                                    hArrowX * 0.5 - 8 / s,
                                    (bodyH + arrowY) / 2,
                                    `h${idx}`,
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
        B:   { value: 2000  },
        N_1: { value: 10000 },
        H_1: { value: 1000  },
        h_1: { value: 3000  },
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

    dynamicInputGroups: [
        {
            keyPrefix:      'N',
            inputLabel:     '鉛直荷重 N_i',
            rowLabel:       '荷重',
            inputUnitType:  'force',
            outputKeyFn:    (key) => `ms_${key.split('_')[1]}`,
            outputLabel:    '安定モーメント貢献',
            outputUnitType: 'moment',
            defaultValue:   10000,
            minCount:       1,
            addLabel:       '鉛直荷重を追加',
            outputIndexFn:  (key) => { const m = key.match(/^ms_(\d+)$/); return m ? m[1] : null; },
        },
        {
            keyPrefix:      'H',
            inputLabel:     '水平力 H_i',
            rowLabel:       '水平力',
            inputUnitType:  'force',
            outputKeyFn:    (key) => `fh_${key.split('_')[1]}`,
            outputLabel:    '水平力 (参照)',
            outputUnitType: 'force',
            defaultValue:   1000,
            minCount:       1,
            addLabel:       '水平力を追加',
            outputIndexFn:  (key) => { const m = key.match(/^fh_(\d+)$/); return m ? m[1] : null; },
        },
        {
            keyPrefix:      'h',
            inputLabel:     '作用高さ h_i',
            rowLabel:       '高さ',
            inputUnitType:  'length',
            outputKeyFn:    (key) => `mo_${key.split('_')[1]}`,
            outputLabel:    '転倒モーメント貢献',
            outputUnitType: 'moment',
            defaultValue:   3000,
            minCount:       1,
            addLabel:       '作用高さを追加',
            outputIndexFn:  (key) => { const m = key.match(/^mo_(\d+)$/); return m ? m[1] : null; },
        },
    ],

    calculate: (inputs) => {
        const B = inputs['B'] ?? 2000;
        const arm = B / 2;

        const nEntries = Object.entries(inputs).filter(([k]) => /^N_\d+$/.test(k));
        const HEntries = Object.entries(inputs).filter(([k]) => /^H_\d+$/.test(k));

        const outputs: Record<string, number> = {
            Ms: 0, Mo: 0, Fs: 0, e: 0, e_allow: B / 6,
        };

        let sumN = 0, Ms = 0;
        for (const [key, Ni] of nEntries) {
            const idx = key.split('_')[1];
            const msi = Ni * arm;
            outputs[`ms_${idx}`] = msi;
            sumN += Ni;
            Ms += msi;
        }

        let Mo = 0;
        for (const [key, Hi] of HEntries) {
            const idx = key.split('_')[1];
            const hi = inputs[`h_${idx}`] ?? 0;
            outputs[`fh_${idx}`] = Hi;
            const moi = Hi * hi;
            outputs[`mo_${idx}`] = moi;
            Mo += moi;
        }

        outputs['Ms'] = Ms;
        outputs['Mo'] = Mo;
        outputs['Fs'] = Mo > 0 ? Ms / Mo : Infinity;
        outputs['e'] = sumN !== 0 ? Mo / sumN : 0;
        outputs['e_allow'] = B / 6;

        return outputs;
    },

    visualization: OverturnVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(OverturnCardDef);
