
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
    H: number;
    B: number;
    tw: number;
    tf: number;
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

    // 規格値があればそれを使い、なければ幾何式でフォールバック
    const A_calc        = 2 * b * tf_ + hw * tw_;
    const Ix_calc       = (b * Math.pow(h, 3)) / 12 - ((b - tw_) * Math.pow(hw, 3)) / 12;
    const Iy_calc       = (2 * tf_ * Math.pow(b, 3)) / 12 + (hw * Math.pow(tw_, 3)) / 12;
    const Zpx_calc      = tf_ * b * hw + (tw_ * Math.pow(hw, 2)) / 4;
    const Zpy_calc      = (tf_ * Math.pow(b, 2)) / 2 + (hw * Math.pow(tw_, 2)) / 4;

    const A        = sec.A        ?? A_calc;
    const Ix       = sec.Ix       ?? Ix_calc;
    const Iy       = sec.Iy       ?? Iy_calc;
    const Zpx      = sec.Zpx      ?? Zpx_calc;
    const Zpy      = sec.Zpy      ?? Zpy_calc;
    const Zx       = sec.Zx       ?? (h > 0 ? Ix / (h / 2) : 0);
    const Zy       = sec.Zy       ?? (b > 0 ? Iy / (b / 2) : 0);
    const lambda_f = sec.lambda_f ?? (tf_ > 0 ? (b / 2) / tf_ : 0);
    const lambda_w = sec.lambda_w ?? (tw_ > 0 ? hw / tw_ : 0);
    const ix       = sec.ix       ?? (A > 0 ? Math.sqrt(Ix / A) : 0);
    const iy       = sec.iy       ?? (A > 0 ? Math.sqrt(Iy / A) : 0);

    // 応力依存値は常に計算（Fy/σy は規格値に含まれない）
    const Mpx      = sy * Zpx;
    const Mx       = Zx * fy;
    const My       = Zy * fy;
    const Mpy      = Zpy * sy;
    const Qy       = (sy / Math.sqrt(3)) * hw * tw_;

    return { A, Ix, Iy, Zx, Zpx, Zy, Zpy, lambda_f, lambda_w, ix, iy, Mpx, Mx, My, Mpy, Qy, H: sec.H, B: sec.B, tw: sec.tw, tf: sec.tf };
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
        A:        { label: '断面積',           unitType: 'area',    symbol: 'A'       },
        Ix:       { label: '断面二次モーメント（強軸）', unitType: 'inertia', symbol: 'Ix'      },
        Iy:       { label: '断面二次モーメント（弱軸）', unitType: 'inertia', symbol: 'Iy'      },
        Zx:       { label: '断面係数（強軸・弾性）',    unitType: 'modulus', symbol: 'Zx'      },
        Zpx:      { label: '塑性断面係数（強軸）',      unitType: 'modulus', symbol: 'Zpx'     },
        Zy:       { label: '断面係数（弱軸・弾性）',    unitType: 'modulus', symbol: 'Zy'      },
        Zpy:      { label: '塑性断面係数（弱軸）',      unitType: 'modulus', symbol: 'Zpy'     },
        lambda_f: { label: 'フランジ幅厚比',            unitType: 'none',    symbol: 'λ_f'     },
        lambda_w: { label: 'ウェブ幅厚比',              unitType: 'none',    symbol: 'λ_w'     },
        ix:       { label: '断面二次半径（強軸）',       unitType: 'length',  symbol: 'ix'      },
        iy:       { label: '断面二次半径（弱軸）',       unitType: 'length',  symbol: 'iy'      },
        Mpx:      { label: '全塑性モーメント（強軸・σy）', unitType: 'moment',  symbol: 'Mpx'     },
        Mx:       { label: '弾性曲げ耐力（強軸・Fy）',   unitType: 'moment',  symbol: 'Mx'      },
        My:       { label: '弾性曲げ耐力（弱軸・Fy）',   unitType: 'moment',  symbol: 'My'      },
        Mpy:      { label: '全塑性モーメント（弱軸・σy）', unitType: 'moment',  symbol: 'Mpy'     },
        Qy:       { label: '降伏せん断耐力',             unitType: 'force',   symbol: 'Qy'      },
        H:        { label: '断面高さ',                   unitType: 'length',  hidden: true },
        B:        { label: 'フランジ幅',                 unitType: 'length',  hidden: true },
        tw:       { label: 'ウェブ厚',                   unitType: 'length',  hidden: true },
        tf:       { label: 'フランジ厚',                 unitType: 'length',  hidden: true },
    },

    visualization: SectionHSelectVisualization,
};

import { registry } from '../../lib/registry/registry';
registry.register(SectionHSelectDef);
