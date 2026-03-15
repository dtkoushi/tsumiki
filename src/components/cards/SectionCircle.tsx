
import { Circle } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';

// --- Types ---

interface SectionCircleOutputs {
    A: number;
    I: number;
    Z: number;
    Zp: number;
    ix: number;
    Mx: number;
    Mp: number;
}

// --- Visualization ---

const CircleSectionVisual: VisualizationStrategy = {
    id: 'circle',
    getBounds: (inputs) => {
        const D = inputs['D'] || 100;
        const r = D / 2;
        return { minX: -r, minY: -r, maxX: r, maxY: r };
    },
    getDimensions: (inputs) => {
        const D = inputs['D'] || 100;
        return [
            {
                type: 'horizontal',
                start: { x: -D / 2, y: D / 2 },
                end:   { x:  D / 2, y: D / 2 },
                label: `D=${D}`,
                offset: 20,
            },
        ];
    },
    draw: (inputs, scale) => {
        const D = inputs['D'] || 100;
        const t = inputs['t'] || 0;
        const r  = D / 2;
        const ri = r - t;
        return (
            <>
                <circle
                    cx={0} cy={0} r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2 / scale}
                    vectorEffect="non-scaling-stroke"
                />
                {t > 0 && ri > 0 && (
                    <circle
                        cx={0} cy={0} r={ri}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5 / scale}
                        strokeDasharray={`${6 / scale} ${3 / scale}`}
                        vectorEffect="non-scaling-stroke"
                    />
                )}
            </>
        );
    },
};

const SectionCircleVisualization = createVisualizationComponent({
    strategyAxes: [{ key: '__fixed__', default: 'circle' }],
    strategies: [CircleSectionVisual],
    height: 240,
    padding: 40,
});

// --- Definition ---

export const SectionCircleDef = createCardDefinition<SectionCircleOutputs>({
    type: 'SECTION_CIRCLE',
    title: '円形断面',
    description: '円形（中実・中空）断面の断面特性を計算します',
    icon: Circle,
    sidebar: { category: 'section', order: 4 },

    defaultInputs: {
        D: { value: 200 },
        t: { value: 0 },
        Fy: { value: 235 },
        sigma_y: { value: 235 },
    },

    inputConfig: {
        D: { label: '外径 D', unitType: 'length' },
        t: { label: '板厚 t（中実=0）', unitType: 'length' },
        Fy: { label: '降伏応力度 Fy（F値）', unitType: 'stress' },
        sigma_y: { label: '降伏応力度 σy（実勢値）', unitType: 'stress' },
    },

    outputConfig: {
        A:  { label: '断面積 A',       unitType: 'area' },
        I:  { label: '断面二次モーメント I', unitType: 'inertia' },
        Z:  { label: '断面係数 Z（弾性）', unitType: 'modulus' },
        Zp: { label: '塑性断面係数 Zp', unitType: 'modulus' },
        ix: { label: 'i', unitType: 'length' },
        Mx: { label: 'M（弾性・Fy）', unitType: 'moment' },
        Mp: { label: 'M_p（全塑性・σy）', unitType: 'moment' },
    },

    reportNarrative: (ins, outs) => {
        const D_  = ins.find(r => r.key === 'D')?.displayValue  ?? '–';
        const t_  = ins.find(r => r.key === 't')?.displayValue  ?? '–';
        const Fy_ = ins.find(r => r.key === 'Fy')?.displayValue ?? '–';
        const A_  = outs.find(r => r.key === 'A')?.displayValue ?? '–';
        const I_  = outs.find(r => r.key === 'I')?.displayValue ?? '–';
        const Z_  = outs.find(r => r.key === 'Z')?.displayValue ?? '–';
        const Mx_ = outs.find(r => r.key === 'Mx')?.displayValue ?? '–';
        const tVal = ins.find(r => r.key === 't')?.value ?? 0;

        if (tVal > 0) {
            return [
                `D_i = D − 2t = ${D_} − 2×${t_}`,
                `A = π/4 × (D² − D_i²) = ${A_}`,
                `I = π/64 × (D⁴ − D_i⁴) = ${I_}`,
                `Z = I / (D/2) = ${Z_}`,
                `M = Z × Fy = ${Z_} × ${Fy_} = ${Mx_}`,
            ];
        }
        return [
            `A = π/4 × D² = π/4 × ${D_}² = ${A_}`,
            `I = π/64 × D⁴ = ${I_}`,
            `Z = I / (D/2) = ${Z_}`,
            `M = Z × Fy = ${Z_} × ${Fy_} = ${Mx_}`,
        ];
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    calculate: ({ D, t, Fy, fy, sigma_y } : any) => {
        const d  = D || 0;
        const tk = t || 0;
        const Di = tk > 0 ? Math.max(d - 2 * tk, 0) : 0;
        const A  = (Math.PI / 4) * (d * d - Di * Di);
        const I  = (Math.PI / 64) * (Math.pow(d, 4) - Math.pow(Di, 4));
        const Z  = d > 0 ? I / (d / 2) : 0;
        const Zp = (Math.pow(d, 3) - Math.pow(Di, 3)) / 6;
        const ix = A > 0 ? Math.sqrt(I / A) : 0;
        const fyVal = Fy || fy || 0; // fy: backward compat with pre-rename saves
        const Mx = Z * fyVal;
        const Mp = Zp * (sigma_y || fyVal);
        return { A, I, Z, Zp, ix, Mx, Mp };
    },

    visualization: SectionCircleVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(SectionCircleDef);
