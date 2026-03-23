
import { Layers } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { num } from '../../lib/utils/inputField';

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
    sidebar: { category: 'cross_section', order: 3 },

    defaultInputs: {
        N: { value: 0 },
        M: { value: 0 },
        A: { value: 1 },
        Z: { value: 1 },
    },

    inputConfig: {
        N: num({ label: '軸力（正=引張・負=圧縮）', unitType: 'force',   symbol: 'N' }),
        M: num({ label: '曲げモーメント',           unitType: 'moment',  symbol: 'M' }),
        A: num({ label: '断面積',                   unitType: 'area',    symbol: 'A' }),
        Z: num({ label: '断面係数',                 unitType: 'modulus', symbol: 'Z' }),
    },

    outputConfig: {
        sigma_c:   { label: '軸応力',   unitType: 'stress', symbol: 'σ_c',   formula: 'N / A',         formulaInputKeys: ['N', 'A'] },
        sigma_b:   { label: '曲げ応力', unitType: 'stress', symbol: 'σ_b',   formula: 'M / Z',         formulaInputKeys: ['M', 'Z'] },
        sigma_max: { label: '最大応力', unitType: 'stress', symbol: 'σ_max', formula: 'σ_c + |σ_b|' },
        sigma_min: { label: '最小応力', unitType: 'stress', symbol: 'σ_min', formula: 'σ_c − |σ_b|' },
    },

    calculate: ({ N, M, A, Z }) => {
        const sigma_c   = A > 0 ? (N || 0) / A : 0;           // 引張正
        const sigma_b   = Z > 0 ? (M || 0) / Z : 0;           // M の向きを保持
        const sigma_max = sigma_c + Math.abs(sigma_b);          // 最大（絶対）
        const sigma_min = sigma_c - Math.abs(sigma_b);          // 最小（絶対）
        return { sigma_c, sigma_b, sigma_max, sigma_min };
    },
});

import { registry } from '../../lib/registry/registry';
registry.register(CombinedStressCardDef);
