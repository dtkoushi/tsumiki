
import { Square } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';

// --- Types ---

interface SectionRectOutputs {
    A: number;
    Ix: number;
    Iy: number;
    Zx: number;
    Zy: number;
    Zpx: number;
    Zpy: number;
    ix: number;
    iy: number;
    Mx: number;
    My: number;
    Mpx: number;
    Mpy: number;
}

// --- Visualization ---

const RectSectionVisual: VisualizationStrategy = {
    id: 'rect',
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
        const t = inputs['t'] || 0;
        const Bi = Math.max(B - 2 * t, 0);
        const Hi = Math.max(H - 2 * t, 0);
        const outerPath = `M 0 0 H ${B} V ${H} H 0 Z`;
        const innerPath = t > 0 && Bi > 0 && Hi > 0
            ? `M ${t} ${t} H ${t + Bi} V ${t + Hi} H ${t} Z`
            : null;
        return (
            <>
                <path
                    d={outerPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2 / scale}
                    vectorEffect="non-scaling-stroke"
                    className="transition-all duration-300 ease-out"
                />
                {innerPath && (
                    <path
                        d={innerPath}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5 / scale}
                        strokeDasharray={`${6 / scale} ${3 / scale}`}
                        vectorEffect="non-scaling-stroke"
                        className="transition-all duration-300 ease-out"
                    />
                )}
            </>
        );
    }
};

const SectionRectVisualization = createVisualizationComponent({
    strategyAxes: [{ key: '__fixed__', default: 'rect' }],
    strategies: [RectSectionVisual],
    height: 240,
    padding: 40
});

// --- Definition ---

export const SectionRectDef = createCardDefinition<SectionRectOutputs>({
    type: 'SECTION_RECT',
    title: '矩形断面',
    description: '矩形（長方形）断面の断面特性を計算します',
    icon: Square,
    sidebar: { category: 'section', order: 1 },

    defaultInputs: {
        B: { value: 300 },
        H: { value: 600 },
        t: { value: 0 },
        Fy: { value: 235 },
        sigma_y: { value: 235 },
    },
    inputConfig: {
        B:       { label: '幅 B',                    unitType: 'length', symbol: 'B' },
        H:       { label: '高さ H',                  unitType: 'length', symbol: 'H' },
        t:       { label: '板厚 t（中実=0）',         unitType: 'length', symbol: 't' },
        Fy:      { label: '降伏応力度 Fy（F値）',      unitType: 'stress', symbol: 'Fy' },
        sigma_y: { label: '降伏応力度 σy（実勢値）',   unitType: 'stress', symbol: 'σy' },
    },
    outputConfig: {
        A:   { label: '断面積',           unitType: 'area',    formula: 'B × H',        symbol: 'A',    formulaInputKeys: ['B', 'H'] },
        Ix:  { label: '断面二次モーメント（強軸）', unitType: 'inertia', formula: 'B × H³ / 12', symbol: 'I_x', formulaInputKeys: ['B', 'H'] },
        Iy:  { label: '断面二次モーメント（弱軸）', unitType: 'inertia', formula: 'H × B³ / 12', symbol: 'I_y', formulaInputKeys: ['H', 'B'] },
        Zx:  { label: '断面係数（強軸・弾性）',     unitType: 'modulus', formula: 'I_x / (H/2)', symbol: 'Z_x', formulaInputKeys: ['H'] },
        Zy:  { label: '断面係数（弱軸・弾性）',     unitType: 'modulus', formula: 'I_y / (B/2)', symbol: 'Z_y', formulaInputKeys: ['B'] },
        Zpx: { label: '塑性断面係数（強軸）',       unitType: 'modulus', formula: 'B × H² / 4',  symbol: 'Z_px', formulaInputKeys: ['B', 'H'] },
        Zpy: { label: '塑性断面係数（弱軸）',       unitType: 'modulus', formula: 'H × B² / 4',  symbol: 'Z_py', formulaInputKeys: ['H', 'B'] },
        ix:  { label: '断面二次半径（強軸）',       unitType: 'length',  formula: '√(I_x / A)', symbol: 'i_x' },
        iy:  { label: '断面二次半径（弱軸）',       unitType: 'length',  formula: '√(I_y / A)', symbol: 'i_y' },
        Mx:  { label: '弾性曲げ耐力（強軸・Fy）',   unitType: 'moment',  formula: 'Z_x × Fy',   symbol: 'M_x',  formulaInputKeys: ['Fy'] },
        My:  { label: '弾性曲げ耐力（弱軸・Fy）',   unitType: 'moment',  formula: 'Z_y × Fy',   symbol: 'M_y',  formulaInputKeys: ['Fy'] },
        Mpx: { label: '全塑性モーメント（強軸・σy）', unitType: 'moment', formula: 'Z_px × σy',  symbol: 'M_px', formulaInputKeys: ['sigma_y'] },
        Mpy: { label: '全塑性モーメント（弱軸・σy）', unitType: 'moment', formula: 'Z_py × σy',  symbol: 'M_py', formulaInputKeys: ['sigma_y'] },
    },

    getOutputConfig: (card) => {
        const tVal = parseFloat(String(card.inputs['t']?.value ?? '0')) || 0;
        if (tVal > 0) {
            return {
                A:  { label: '断面積',                   unitType: 'area',    formula: 'B × H − (B−2t) × (H−2t)', symbol: 'A',    formulaInputKeys: ['B', 'H', 't'] },
                Ix: { label: '断面二次モーメント（強軸）', unitType: 'inertia', formula: '(B×H³ − (B−2t)×(H−2t)³) / 12', symbol: 'I_x', formulaInputKeys: ['B', 'H', 't'] },
                Iy: { label: '断面二次モーメント（弱軸）', unitType: 'inertia', formula: '(H×B³ − (H−2t)×(B−2t)³) / 12', symbol: 'I_y', formulaInputKeys: ['H', 'B', 't'] },
                Zx:  { label: '断面係数（強軸・弾性）', unitType: 'modulus', formula: 'I_x / (H/2)',                            symbol: 'Z_x',  formulaInputKeys: ['H'] },
                Zy:  { label: '断面係数（弱軸・弾性）', unitType: 'modulus', formula: 'I_y / (B/2)',                            symbol: 'Z_y',  formulaInputKeys: ['B'] },
                Zpx: { label: '塑性断面係数（強軸）',   unitType: 'modulus', formula: '(B×H² − (B−2t)×(H−2t)²) / 4',           symbol: 'Z_px', formulaInputKeys: ['B', 'H', 't'] },
                Zpy: { label: '塑性断面係数（弱軸）',   unitType: 'modulus', formula: '(H×B² − (H−2t)×(B−2t)²) / 4',           symbol: 'Z_py', formulaInputKeys: ['H', 'B', 't'] },
            };
        }
        return {};
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    calculate: ({ B, H, t, Fy, fy, sigma_y } : any) => {
        const b  = B || 0;
        const h  = H || 0;
        const tk = t || 0;
        const bi = tk > 0 ? Math.max(b - 2 * tk, 0) : 0;
        const hi = tk > 0 ? Math.max(h - 2 * tk, 0) : 0;
        const A   = b * h - bi * hi;
        const Ix  = (b * Math.pow(h, 3) - bi * Math.pow(hi, 3)) / 12;
        const Iy  = (h * Math.pow(b, 3) - hi * Math.pow(bi, 3)) / 12;
        const Zx  = h > 0 ? Ix / (h / 2) : 0;
        const Zy  = b > 0 ? Iy / (b / 2) : 0;
        const Zpx = (b * Math.pow(h, 2) - bi * Math.pow(hi, 2)) / 4;
        const Zpy = (h * Math.pow(b, 2) - hi * Math.pow(bi, 2)) / 4;
        const ix  = A > 0 ? Math.sqrt(Ix / A) : 0;
        const iy  = A > 0 ? Math.sqrt(Iy / A) : 0;
        const fyVal = Fy || fy || 0; // fy: backward compat with pre-rename saves
        const Mx  = Zx * fyVal;
        const My  = Zy * fyVal;
        const Mpx = Zpx * (sigma_y || fyVal);
        const Mpy = Zpy * (sigma_y || fyVal);
        return { A, Ix, Iy, Zx, Zy, Zpx, Zpy, ix, iy, Mx, My, Mpx, Mpy };
    },
    visualization: SectionRectVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(SectionRectDef);
