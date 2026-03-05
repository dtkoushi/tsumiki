
import React from 'react';
import { Building2 } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { AutoFitSvg } from './common/AutoFitSvg';
import { drawLabel } from './common/svgPrimitives';

// --- Types ---

interface BearingPressureOutputs {
    q_max: number;
    q_min: number;
    ratio: number;
    e: number;
    e_allow: number;
}

// --- Visualization ---

const BearingPressureVisualization: React.FC<CardComponentProps> = ({ card }) => {
    const ri = card.resolvedInputs ?? {};
    const N  = (ri['N']  as number) ?? 0;
    const M  = (ri['M']  as number) ?? 0;
    const B  = (ri['B']  as number) ?? 1000;
    const L  = (ri['L']  as number) ?? 1000;

    const q_avg   = B > 0 && L > 0 ? N / (B * L) : 0;
    const q_diff  = B > 0 && L > 0 ? 6 * Math.abs(M) / (B * B * L) : 0;
    const q_left  = M >= 0 ? q_avg + q_diff : q_avg - q_diff;
    const q_right = M >= 0 ? q_avg - q_diff : q_avg + q_diff;

    // Display width fixed at 120; heights proportional to pressure
    const W = 120;
    const maxQ = Math.max(Math.abs(q_left), Math.abs(q_right), 1e-6);
    const maxH = 60;
    const toH = (q: number) => (q / maxQ) * maxH;

    const fndH = 16;
    const fndTop = 0;
    const fndBot = fndH;

    const hLeft  = toH(q_left);
    const hRight = toH(q_right);

    const bounds = {
        minX: -30,
        minY: fndTop - 10,
        maxX: W + 30,
        maxY: fndBot + maxH + 20,
    };

    const polyPoints = [
        `0,${fndBot}`,
        `${W},${fndBot}`,
        `${W},${fndBot + hRight}`,
        `0,${fndBot + hLeft}`,
    ].join(' ');

    return (
        <AutoFitSvg bounds={bounds} padding={16} height={200}>
            {(s) => (
                <g>
                    {/* Foundation block */}
                    <rect
                        x={0} y={fndTop} width={W} height={fndH}
                        fill="#cbd5e1" stroke="#475569" strokeWidth={1.5 / s}
                    />

                    {/* Pressure distribution */}
                    <polygon
                        points={polyPoints}
                        fill="rgba(59,130,246,0.2)"
                        stroke="#3b82f6"
                        strokeWidth={1.5 / s}
                    />

                    {/* q_max / q_min labels */}
                    {drawLabel(
                        q_left >= q_right ? 0 : W,
                        fndBot + Math.max(hLeft, hRight) + 4 / s,
                        `q_max`,
                        s,
                        { color: '#3b82f6', anchor: q_left >= q_right ? 'start' : 'end', baseline: 'hanging' },
                    )}
                    {drawLabel(
                        q_left < q_right ? 0 : W,
                        fndBot + Math.min(hLeft, hRight) + 4 / s,
                        `q_min`,
                        s,
                        { color: '#64748b', anchor: q_left < q_right ? 'start' : 'end', baseline: 'hanging' },
                    )}

                    {/* Ground hatch */}
                    {Array.from({ length: 8 }, (_, i) => {
                        const x = (i + 0.5) * (W / 8);
                        return (
                            <line
                                key={i}
                                x1={x} y1={fndBot}
                                x2={x - 6 / s} y2={fndBot + 6 / s}
                                stroke="#64748b" strokeWidth={1 / s} opacity={0.4}
                            />
                        );
                    })}
                </g>
            )}
        </AutoFitSvg>
    );
};

// --- Definition ---

export const BearingPressureCardDef = createCardDefinition<BearingPressureOutputs>({
    type: 'BEARING_PRESSURE',
    title: '基礎接地圧の検討',
    description: '基礎底面の接地圧を計算し、許容地耐力と比較します',
    icon: Building2,
    sidebar: { category: 'verify', order: 5 },

    defaultInputs: {
        N:  { value: 100000 },
        M:  { value: 0 },
        B:  { value: 1000 },
        L:  { value: 1000 },
        qa: { value: 0.2 },
    },

    inputConfig: {
        N:  { label: '鉛直力合計 N',     unitType: 'force' },
        M:  { label: '転倒モーメント M',  unitType: 'moment' },
        B:  { label: '基礎幅 B',          unitType: 'length' },
        L:  { label: '基礎奥行き L',      unitType: 'length' },
        qa: { label: '許容地耐力 qa',     unitType: 'stress' },
    },

    outputConfig: {
        q_max:   { label: '最大接地圧 q_max',          unitType: 'stress' },
        q_min:   { label: '最小接地圧 q_min',          unitType: 'stress' },
        ratio:   { label: '検定比 q_max/qa',           unitType: 'ratio' },
        e:       { label: '偏心距離 e = M/N',          unitType: 'length' },
        e_allow: { label: 'kern 限界 e_allow = B/6',   unitType: 'length' },
    },

    calculate: ({ N, M, B, L, qa }) => {
        const area    = (B || 0) * (L || 0);
        const q_avg   = area > 0 ? (N || 0) / area : 0;
        const q_diff  = area > 0 && B ? 6 * Math.abs(M || 0) / (area * B) : 0;
        const q_max   = q_avg + q_diff;
        const q_min   = q_avg - q_diff;
        const ratio   = qa > 0 ? q_max / qa : 0;
        const e       = N !== 0 ? Math.abs(M || 0) / Math.abs(N) : 0;
        const e_allow = (B || 0) / 6;
        return { q_max, q_min, ratio, e, e_allow };
    },

    visualization: BearingPressureVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(BearingPressureCardDef);
