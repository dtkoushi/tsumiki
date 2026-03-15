
import { RectangleHorizontal } from 'lucide-react';
import type { CardDefinition } from '../../lib/registry/types';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';
import { H_SECTIONS, byCategory, findHSection, CATEGORY_DEFAULTS } from '../../lib/data/hSections';
import type { HFlangeCategory } from '../../lib/data/hSections';

// --- Types ---

interface SectionHSelectOutputs {
    A: number;
    Ix: number;
    Iy: number;
    Zx: number;
    Zpx: number;
    Zy: number;
    Zpy: number;
    lambda_f: number;
    lambda_w: number;
    ix: number;
    iy: number;
    Mpx: number;
    Mx: number;
    My: number;
    Mpy: number;
    Qy: number;
}

// --- Visualization ---

const HSectionSelectVisual: VisualizationStrategy = {
    id: 'h_beam',
    getBounds: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return { minX: 0, minY: 0, maxX: B, maxY: H };
    },
    getDimensions: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return [
            {
                type: 'horizontal',
                start: { x: 0, y: H },
                end: { x: B, y: H },
                label: `B=${B}`,
                offset: 20
            },
            {
                type: 'vertical',
                start: { x: 0, y: 0 },
                end: { x: 0, y: H },
                label: `H=${H}`,
                offset: 20
            }
        ];
    },
    draw: (inputs, scale) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        const tw = inputs['tw'] || 6;
        const tf = inputs['tf'] || 9;
        const y_tf_bot = tf;
        const y_bf_top = H - tf;

        const path = `
            M 0 0
            H ${B}
            v ${tf}
            h ${-(B - tw) / 2}
            V ${y_bf_top}
            h ${(B - tw) / 2}
            v ${tf}
            H 0
            v ${-tf}
            h ${(B - tw) / 2}
            V ${y_tf_bot}
            h ${-(B - tw) / 2}
            Z
        `;
        return (
            <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth={2 / scale}
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-300 ease-out"
            />
        );
    }
};

const SectionHSelectVisualization = createVisualizationComponent({
    strategyAxes: [{ key: '__fixed__', default: 'h_beam' }],
    strategies: [HSectionSelectVisual],
    height: 240,
    padding: 40,
    transformInputs: (rawInputs) => {
        const sectionName = rawInputs['section']?.value ?? '';
        const sec = findHSection(sectionName) ?? H_SECTIONS[0];
        return { H: sec.H, B: sec.B, tw: sec.tw, tf: sec.tf };
    },
});

// --- Calculation ---

function calcHSection(inputs: Record<string, number>, rawInputs?: Record<string, any>): SectionHSelectOutputs {
    const sectionName = rawInputs?.['section']?.value ?? '';
    const sec = findHSection(sectionName);
    if (!sec) {
        throw new Error(`断面 "${sectionName}" が見つかりません。フランジ幅カテゴリを変更した場合は断面形状を再選択してください。`);
    }

    const h   = sec.H;
    const b   = sec.B;
    const tw_ = sec.tw;
    const tf_ = sec.tf;
    const fy  = inputs['Fy'] || 0;
    const sy  = inputs['sigma_y'] || 0;

    const hw = h - 2 * tf_;

    const A        = 2 * b * tf_ + hw * tw_;
    const Ix       = (b * Math.pow(h, 3)) / 12 - ((b - tw_) * Math.pow(hw, 3)) / 12;
    const Iy       = (2 * tf_ * Math.pow(b, 3)) / 12 + (hw * Math.pow(tw_, 3)) / 12;
    const Zx       = h > 0 ? Ix / (h / 2) : 0;
    const Zy       = b > 0 ? Iy / (b / 2) : 0;
    const Zpx      = tf_ * b * hw + (tw_ * Math.pow(hw, 2)) / 4;
    const Zpy      = (tf_ * Math.pow(b, 2)) / 2 + (hw * Math.pow(tw_, 2)) / 4;
    const lambda_f = tf_ > 0 ? (b / 2) / tf_ : 0;
    const lambda_w = tw_ > 0 ? hw / tw_ : 0;
    const ix       = A > 0 ? Math.sqrt(Ix / A) : 0;
    const iy       = A > 0 ? Math.sqrt(Iy / A) : 0;
    const Mpx      = sy * Zpx;
    const Mx       = Zx * fy;
    const My       = Zy * fy;
    const Mpy      = Zpy * sy;
    const Qy       = (sy / Math.sqrt(3)) * hw * tw_;

    return { A, Ix, Iy, Zx, Zpx, Zy, Zpy, lambda_f, lambda_w, ix, iy, Mpx, Mx, My, Mpy, Qy };
}

// --- Definition ---

const FLANGE_OPTIONS = [
    { value: 'narrow', label: '細幅 (B ≤ 150)' },
    { value: 'medium', label: '中幅 (B 172–201)' },
    { value: 'wide',   label: '広幅 (B ≥ 250)' },
];

export const SectionHSelectDef: CardDefinition<SectionHSelectOutputs> = {
    type: 'SECTION_H_SELECT',
    title: 'H形断面（規格選択）',
    description: 'フランジ幅カテゴリからH形鋼規格断面を選択し、断面特性を計算します',
    icon: RectangleHorizontal,
    sidebar: { category: 'section', order: 5 },

    defaultInputs: {
        flangeType: { value: 'narrow' },
        section:    { value: 'H-200×100×5.5×8' },
        Fy:         { value: 235 },
        sigma_y:    { value: 235 },
    },

    // Static: flangeType axis selector
    inputConfig: {
        flangeType: {
            label: 'フランジ幅',
            type: 'select',
            options: FLANGE_OPTIONS,
            default: 'narrow',
        },
    },

    // Dynamic: section options change based on flangeType
    getInputConfig: (card) => {
        const flangeType = (card.inputs['flangeType']?.value ?? 'narrow') as HFlangeCategory;
        const options = byCategory(flangeType).map(s => ({ value: s.name, label: s.name }));
        return {
            section: {
                label: '断面形状',
                type: 'select' as const,
                options,
                default: CATEGORY_DEFAULTS[flangeType],
            },
            Fy: {
                label: '降伏応力度 Fy（F値）',
                unitType: 'stress' as const,
            },
            sigma_y: {
                label: '降伏応力度 σy（実勢値）',
                unitType: 'stress' as const,
            },
        };
    },

    calculate: calcHSection,

    outputConfig: {
        A:        { label: '断面積 A',             unitType: 'area' },
        Ix:       { label: 'I_x',                  unitType: 'inertia' },
        Iy:       { label: 'I_y',                  unitType: 'inertia' },
        Zx:       { label: 'Z_x（弾性）',           unitType: 'modulus' },
        Zpx:      { label: 'Z_px（塑性）',          unitType: 'modulus' },
        Zy:       { label: 'Z_y（弾性）',           unitType: 'modulus' },
        Zpy:      { label: 'Z_py（塑性）',          unitType: 'modulus' },
        lambda_f: { label: 'λ_f フランジ幅厚比',    unitType: 'none' },
        lambda_w: { label: 'λ_w ウェブ幅厚比',      unitType: 'none' },
        ix:       { label: 'i_x',                  unitType: 'length' },
        iy:       { label: 'i_y',                  unitType: 'length' },
        Mpx:      { label: 'M_px（全塑性・σy）',    unitType: 'moment' },
        Mx:       { label: 'M_x（弾性・Fy）',       unitType: 'moment' },
        My:       { label: 'M_y（弾性・Fy）',       unitType: 'moment' },
        Mpy:      { label: 'M_py（全塑性・σy）',    unitType: 'moment' },
        Qy:       { label: '降伏せん断耐力 Qy（σy）', unitType: 'force' },
    },

    visualization: SectionHSelectVisualization,
};

import { registry } from '../../lib/registry/registry';
registry.register(SectionHSelectDef);
