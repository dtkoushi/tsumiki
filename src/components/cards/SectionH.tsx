
import { RectangleHorizontal } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { num } from '../../lib/utils/inputField';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';

// --- Types ---

interface SectionHOutputs {
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

const HSectionVisual: VisualizationStrategy = {
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

const SectionHVisualization = createVisualizationComponent({
    strategyAxes: [{ key: '__fixed__', default: 'h_beam' }],
    strategies: [HSectionVisual],
    height: 240,
    padding: 40
});

// --- Definition ---

export const SectionHDef = createCardDefinition<SectionHOutputs>({
    type: 'SECTION_H',
    title: 'H形断面',
    description: 'H形鋼断面の断面特性・幅厚比・塑性断面係数を計算します',
    icon: RectangleHorizontal,
    sidebar: { category: 'section', order: 2 },

    defaultInputs: {
        H: { value: 200 },
        B: { value: 100 },
        tw: { value: 5.5 },
        tf: { value: 8 },
        Fy: { value: 235 },
        sigma_y: { value: 235 },
    },
    inputConfig: {
        H:       num({ label: '断面高さ H',            unitType: 'length', symbol: 'H' }),
        B:       num({ label: 'フランジ幅 B',          unitType: 'length', symbol: 'B' }),
        tw:      num({ label: 'ウェブ厚 tw',           unitType: 'length', symbol: 'tw' }),
        tf:      num({ label: 'フランジ厚 tf',         unitType: 'length', symbol: 'tf' }),
        Fy:      num({ label: '降伏応力度 Fy（F値）',   unitType: 'stress', symbol: 'Fy' }),
        sigma_y: num({ label: '降伏応力度 σy（実勢値）', unitType: 'stress', symbol: 'σy' }),
    },
    outputConfig: {
        A:        { label: '断面積',               unitType: 'area',    formula: '2×B×tf + (H−2tf)×tw',          symbol: 'A',    formulaInputKeys: ['B', 'tf', 'H', 'tw'] },
        Ix:       { label: '断面二次モーメント（強軸）', unitType: 'inertia', formula: 'B×H³/12 − (B−tw)×(H−2tf)³/12', symbol: 'I_x', formulaInputKeys: ['B', 'H', 'tw', 'tf'] },
        Iy:       { label: '断面二次モーメント（弱軸）', unitType: 'inertia', formula: '2×tf×B³/12 + (H−2tf)×tw³/12',        symbol: 'I_y',  formulaInputKeys: ['tf', 'B', 'H', 'tw'] },
        Zx:       { label: '断面係数（強軸・弾性）',   unitType: 'modulus', formula: 'I_x / (H/2)',                         symbol: 'Z_x',  formulaInputKeys: ['H'] },
        Zpx:      { label: '塑性断面係数（強軸）',    unitType: 'modulus', formula: 'tf×B×(H−2tf) + tw×(H−2tf)²/4',        symbol: 'Z_px', formulaInputKeys: ['tf', 'B', 'H', 'tw'] },
        Zy:       { label: '断面係数（弱軸・弾性）',   unitType: 'modulus', formula: 'I_y / (B/2)',                         symbol: 'Z_y',  formulaInputKeys: ['B'] },
        Zpy:      { label: '塑性断面係数（弱軸）',    unitType: 'modulus', formula: 'tf×B²/2 + (H−2tf)×tw²/4',             symbol: 'Z_py', formulaInputKeys: ['tf', 'B', 'H', 'tw'] },
        lambda_f: { label: 'フランジ幅厚比',         unitType: 'none',    formula: '(B/2) / tf',                   symbol: 'λ_f', formulaInputKeys: ['B', 'tf'] },
        lambda_w: { label: 'ウェブ幅厚比',           unitType: 'none',    formula: '(H−2tf) / tw',                 symbol: 'λ_w', formulaInputKeys: ['H', 'tf', 'tw'] },
        ix:       { label: '断面二次半径（強軸）',    unitType: 'length',  formula: '√(I_x / A)',                   symbol: 'i_x' },
        iy:       { label: '断面二次半径（弱軸）',    unitType: 'length',  formula: '√(I_y / A)',                   symbol: 'i_y' },
        Mpx:      { label: '全塑性モーメント（強軸・σy）', unitType: 'moment', formula: 'sigma_y × Z_px',               symbol: 'M_px', formulaInputKeys: ['sigma_y'] },
        Mx:       { label: '弾性曲げ耐力（強軸・Fy）',  unitType: 'moment', formula: 'Z_x × Fy',                   symbol: 'M_x',  formulaInputKeys: ['Fy'] },
        My:       { label: '弾性曲げ耐力（弱軸・Fy）',  unitType: 'moment', formula: 'Z_y × Fy',                   symbol: 'M_y',  formulaInputKeys: ['Fy'] },
        Mpy:      { label: '全塑性モーメント（弱軸・σy）', unitType: 'moment', formula: 'Z_py × sigma_y',               symbol: 'M_py', formulaInputKeys: ['sigma_y'] },
        Qy:       { label: '降伏せん断耐力（σy）',    unitType: 'force',   formula: '(sigma_y/√3) × hw × tw',           symbol: 'Q_y',  formulaInputKeys: ['sigma_y', 'tw'] },
    },

    calculate: ({ H, B, tw, tf, Fy, sigma_y }) => {
        const h = H || 0;
        const b = B || 0;
        const tw_ = tw || 0;
        const tf_ = tf || 0;
        const fy = Fy || 0;
        const sy = sigma_y || 0;

        const hw = h - 2 * tf_; // ウェブ内法高さ

        const A = 2 * b * tf_ + hw * tw_;
        const Ix = (b * Math.pow(h, 3)) / 12 - ((b - tw_) * Math.pow(hw, 3)) / 12;
        const Iy = (2 * tf_ * Math.pow(b, 3)) / 12 + (hw * Math.pow(tw_, 3)) / 12;
        const Zx = h > 0 ? Ix / (h / 2) : 0;
        const Zy = b > 0 ? Iy / (b / 2) : 0;
        const Zpx = tf_ * b * hw + (tw_ * Math.pow(hw, 2)) / 4;
        const Zpy = (tf_ * Math.pow(b, 2)) / 2 + (hw * Math.pow(tw_, 2)) / 4;
        const lambda_f = tf_ > 0 ? (b / 2) / tf_ : 0;
        const lambda_w = tw_ > 0 ? hw / tw_ : 0;
        const ix = A > 0 ? Math.sqrt(Ix / A) : 0;
        const iy = A > 0 ? Math.sqrt(Iy / A) : 0;
        const Mpx = sy * Zpx;
        const Mx = Zx * fy;
        const My = Zy * fy;
        const Mpy = Zpy * sy;
        const Qy = (sy / Math.sqrt(3)) * hw * tw_;

        return { A, Ix, Iy, Zx, Zpx, Zy, Zpy, lambda_f, lambda_w, ix, iy, Mpx, Mx, My, Mpy, Qy };
    },
    visualization: SectionHVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(SectionHDef);
