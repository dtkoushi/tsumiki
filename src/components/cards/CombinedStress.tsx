
import { Layers } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';

// --- Types ---

interface CombinedStressOutputs {
    sigma_c: number;
    sigma_b: number;
    sigma_max: number;
    sigma_min: number;
}

// --- Definition ---

export const CombinedStressCardDef = createCardDefinition<CombinedStressOutputs>({
    type: 'COMBINED_STRESS',
    title: '複合応力（軸力＋曲げ）',
    description: '軸力と曲げモーメントを組み合わせた断面応力を計算します（σ = N/A ± M/Z）',
    icon: Layers,
    sidebar: { category: 'analysis', order: 3 },

    defaultInputs: {
        N: { value: 0 },
        M: { value: 0 },
        A: { value: 1 },
        Z: { value: 1 },
    },

    inputConfig: {
        N: { label: '軸力 N（正=圧縮）', unitType: 'force' },
        M: { label: '曲げモーメント M', unitType: 'moment' },
        A: { label: '断面積 A', unitType: 'area' },
        Z: { label: '断面係数 Z', unitType: 'modulus' },
    },

    outputConfig: {
        sigma_c:   { label: '軸応力 σ_c = N/A',       unitType: 'stress' },
        sigma_b:   { label: '曲げ応力 σ_b = M/Z',     unitType: 'stress' },
        sigma_max: { label: '最大応力 σ_max = σ_c+σ_b', unitType: 'stress' },
        sigma_min: { label: '最小応力 σ_min = σ_c−σ_b', unitType: 'stress' },
    },

    calculate: ({ N, M, A, Z }) => {
        const sigma_c   = A > 0 ? (N || 0) / A : 0;
        const sigma_b   = Z > 0 ? Math.abs(M || 0) / Z : 0;
        const sigma_max = sigma_c + sigma_b;
        const sigma_min = sigma_c - sigma_b;
        return { sigma_c, sigma_b, sigma_max, sigma_min };
    },
});

import { registry } from '../../lib/registry/registry';
registry.register(CombinedStressCardDef);
