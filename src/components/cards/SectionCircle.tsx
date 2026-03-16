
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
        D:       { label: '外径 D',                unitType: 'length', symbol: 'D' },
        t:       { label: '板厚 t（中実=0）',       unitType: 'length', symbol: 't' },
        Fy:      { label: '降伏応力度 Fy（F値）',   unitType: 'stress', symbol: 'Fy' },
        sigma_y: { label: '降伏応力度 σy（実勢値）', unitType: 'stress', symbol: 'σy' },
    },

    outputConfig: {
        A:  { label: '断面積',             unitType: 'area',    formula: 'π/4 × D²',  symbol: 'A',   formulaInputKeys: ['D'] },
        I:  { label: '断面二次モーメント', unitType: 'inertia', formula: 'π/64 × D⁴', symbol: 'I',   formulaInputKeys: ['D'] },
        Z:  { label: '断面係数（弾性）',   unitType: 'modulus', formula: 'I / (D/2)',  symbol: 'Z',   formulaInputKeys: ['D'] },
        Zp: { label: '塑性断面係数',       unitType: 'modulus', formula: 'D³ / 6',    symbol: 'Z_p', formulaInputKeys: ['D'] },
        ix: { label: '断面二次半径',       unitType: 'length',  formula: '√(I / A)',   symbol: 'i' },
        Mx: { label: '弾性曲げ耐力（Fy）', unitType: 'moment',  formula: 'Z × Fy',    symbol: 'M_x', formulaInputKeys: ['Fy'] },
        Mp: { label: '全塑性モーメント（σy）', unitType: 'moment', formula: 'Zp × σy', symbol: 'M_p', formulaInputKeys: ['sigma_y'] },
    },

    getOutputConfig: (card) => {
        const tVal = parseFloat(String(card.inputs['t']?.value ?? '0')) || 0;
        if (tVal > 0) {
            return {
                A:  { label: '断面積',             unitType: 'area',    formula: 'π/4 × (D² − (D−2t)²)',  symbol: 'A',   formulaInputKeys: ['D', 't'] },
                I:  { label: '断面二次モーメント', unitType: 'inertia', formula: 'π/64 × (D⁴ − (D−2t)⁴)', symbol: 'I',   formulaInputKeys: ['D', 't'] },
                Z:  { label: '断面係数（弾性）',   unitType: 'modulus', formula: 'I / (D/2)',               symbol: 'Z',   formulaInputKeys: ['D'] },
                Zp: { label: '塑性断面係数',       unitType: 'modulus', formula: '(D³ − (D−2t)³) / 6',    symbol: 'Z_p', formulaInputKeys: ['D', 't'] },
            };
        }
        return {};
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
