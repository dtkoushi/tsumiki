
import { Zap } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';

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
        F:  { label: '直交力 F（引張・圧縮）', unitType: 'force' },
        V:  { label: '平行力 V（せん断）',     unitType: 'force' },
        a:  { label: 'のど厚 a（≒0.7×サイズ）', unitType: 'length' },
        l:  { label: '溶接長さ l',             unitType: 'length' },
        fw: { label: '許容応力度 fw',           unitType: 'stress' },
    },

    outputConfig: {
        A_w:       { label: 'のど断面積 A_w = a×l',    unitType: 'area' },
        sigma_perp:{ label: '直交応力 σ⊥ = F/A_w',     unitType: 'stress' },
        tau_par:   { label: '平行せん断 τ∥ = V/A_w',   unitType: 'stress' },
        f_eq:      { label: '合成応力 f_eq = √(σ²+τ²)', unitType: 'stress' },
        ratio:     { label: '検定比 f_eq/fw',           unitType: 'ratio' },
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
