
import React from 'react';
import { Layers } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { AutoFitSvg } from './common/visualizationHelper';

// --- Types ---

interface SectionRCOutputs {
    A: number;
    Ig: number;
    Zg: number;
    pt: number;
    ft: number;
    Mcr: number;
}

// --- Visualization ---

const RCSectionVisualization: React.FC<CardComponentProps> = ({ card }) => {
    const b = Number(card.inputs['b']?.value) || 300;
    const H = Number(card.inputs['H']?.value) || 600;
    const d = Number(card.inputs['d']?.value) || 550;
    const cover = H - d; // 有効かぶり (近似)

    const bounds = { minX: 0, minY: 0, maxX: b, maxY: H };
    const dimensions = [
        {
            type: 'horizontal' as const,
            start: { x: 0, y: H },
            end: { x: b, y: H },
            label: `b=${b}`,
            offset: 20
        },
        {
            type: 'vertical' as const,
            start: { x: 0, y: 0 },
            end: { x: 0, y: H },
            label: `H=${H}`,
            offset: 20
        }
    ];

    return (
        <AutoFitSvg bounds={bounds} dimensions={dimensions} padding={40} height={240} className="text-slate-700 dark:text-slate-300">
            {(scale) => {
                const rebar_y = H - cover / 2;
                const r = Math.max(4 / scale, Math.min(b * 0.04, 12 / scale));
                const nBars = 4;
                const margin = b * 0.1;
                const spacing = (b - 2 * margin) / (nBars - 1);

                return (
                    <>
                        {/* 断面外形 */}
                        <rect
                            x={0} y={0}
                            width={b} height={H}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2 / scale}
                            vectorEffect="non-scaling-stroke"
                            className="transition-all duration-300 ease-out"
                        />
                        {/* かぶり線 */}
                        <line
                            x1={0} y1={rebar_y}
                            x2={b} y2={rebar_y}
                            stroke="currentColor"
                            strokeWidth={1 / scale}
                            strokeDasharray={`${6 / scale} ${3 / scale}`}
                            vectorEffect="non-scaling-stroke"
                            opacity={0.4}
                        />
                        {/* 鉄筋ドット */}
                        {Array.from({ length: nBars }, (_, i) => (
                            <circle
                                key={i}
                                cx={margin + i * spacing}
                                cy={rebar_y}
                                r={r}
                                fill="currentColor"
                                opacity={0.7}
                            />
                        ))}
                    </>
                );
            }}
        </AutoFitSvg>
    );
};

// --- Definition ---

export const SectionRCDef = createCardDefinition<SectionRCOutputs>({
    type: 'SECTION_RC',
    title: 'RC断面',
    description: 'RC（鉄筋コンクリート）断面の弾性特性・鉄筋比・ひび割れモーメントを計算します',
    icon: Layers,
    sidebar: { category: 'section', order: 3 },

    defaultInputs: {
        b: { value: 300 },
        H: { value: 600 },
        d: { value: 550 },
        at: { value: 1935 },
        Fc: { value: 24 },
    },
    inputConfig: {
        b: { label: '幅 b', unitType: 'length' },
        H: { label: '全高さ H', unitType: 'length' },
        d: { label: '有効せい d', unitType: 'length' },
        at: { label: '鉄筋断面積 at', unitType: 'area' },
        Fc: { label: '設計基準強度 Fc', unitType: 'stress' },
    },
    outputConfig: {
        A: { label: '総断面積 A', unitType: 'area' },
        Ig: { label: '全断面 I_g', unitType: 'inertia' },
        Zg: { label: '全断面 Z_g', unitType: 'modulus' },
        pt: { label: '鉄筋比 pt', unitType: 'none' },
        ft: { label: 'コンクリート引張強度 ft', unitType: 'stress' },
        Mcr: { label: 'ひび割れモーメント Mcr', unitType: 'moment' },
    },
    calculate: ({ b, H, d, at, Fc }) => {
        const bv = b || 0;
        const hv = H || 0;
        const dv = d || 0;
        const atv = at || 0;
        const fc = Fc || 0;

        const A = bv * hv;
        const Ig = (bv * Math.pow(hv, 3)) / 12;
        const Zg = hv > 0 ? Ig / (hv / 2) : 0;
        const pt = (bv > 0 && dv > 0) ? atv / (bv * dv) : 0;
        const ft = 0.56 * Math.sqrt(fc);
        const Mcr = hv > 0 ? ft * Ig / (hv / 2) : 0;

        return { A, Ig, Zg, pt, ft, Mcr };
    },
    visualization: RCSectionVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(SectionRCDef);
