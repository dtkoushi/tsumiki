
import { Zap } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { num } from '../../lib/utils/inputField';

// --- Types ---

interface WeldOutputs {
    A_w: number;
    sigma_perp: number;
    tau_par: number;
    f_eq: number;
    ratio: number;
}

// --- Definition ---

export const WeldCardDef = createCardDefinition<WeldOutputs>({
    type: 'WELD',
    title: '溶接部の検討',
    description: 'のど断面に作用する応力を計算し、許容応力度と比較します',
    icon: Zap,
    sidebar: { category: 'verify', order: 2 },

    defaultInputs: {
        F:  { value: 0 },
        V:  { value: 0 },
        a:  { value: 7 },
        l:  { value: 100 },
        fw: { value: 130 },
    },

    inputConfig: {
        F:  num({ label: '直交力（引張・圧縮）', unitType: 'force',  symbol: 'F' }),
        V:  num({ label: '平行力（せん断）',     unitType: 'force',  symbol: 'V' }),
        a:  num({ label: 'のど厚（≒0.7×サイズ）', unitType: 'length', symbol: 'a' }),
        l:  num({ label: '溶接長さ',             unitType: 'length', symbol: 'l' }),
        fw: num({ label: '許容応力度',           unitType: 'stress', symbol: 'fw' }),
    },

    outputConfig: {
        A_w:       { label: 'のど断面積',   unitType: 'area',   symbol: 'A_w',         formula: 'a × l',                         formulaInputKeys: ['a', 'l'] },
        sigma_perp:{ label: '直交応力',     unitType: 'stress', symbol: 'sigma_perp',  formula: 'F / A_w',                       formulaInputKeys: ['F'] },
        tau_par:   { label: '平行せん断',   unitType: 'stress', symbol: 'tau_par',     formula: 'V / A_w',                       formulaInputKeys: ['V'] },
        f_eq:      { label: '合成応力',     unitType: 'stress', symbol: 'f_eq',        formula: '√(sigma_perp² + tau_par²)',      formulaInputKeys: ['sigma_perp', 'tau_par'] },
        ratio:     { label: '検定比',       unitType: 'ratio',  symbol: 'ratio',       formula: 'f_eq / fw',                     formulaInputKeys: ['fw'] },
    },

    calculate: ({ F, V, a, l, fw }) => {
        const A_w        = (a || 0) * (l || 0);
        const sigma_perp = A_w > 0 ? Math.abs(F || 0) / A_w : 0;
        const tau_par    = A_w > 0 ? Math.abs(V || 0) / A_w : 0;
        const f_eq       = Math.sqrt(sigma_perp * sigma_perp + tau_par * tau_par);
        const ratio      = fw > 0 ? f_eq / fw : 0;
        return { A_w, sigma_perp, tau_par, f_eq, ratio };
    },
});

import { registry } from '../../lib/registry/registry';
registry.register(WeldCardDef);
