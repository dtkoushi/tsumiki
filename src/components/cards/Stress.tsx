
import { Activity } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { ja } from '../../lib/i18n/ja';

// --- Types ---

interface StressOutputs {
    sigma_b: number;
    tau: number;
    sigma_eq: number;
}

// --- Definition ---

export const StressCardDef = createCardDefinition<StressOutputs>({
    type: 'STRESS',
    title: ja['card.stress.title'],
    icon: Activity,
    description: ja['card.stress.description'],

    defaultInputs: {
        M: { value: 0 },
        V: { value: 0 },
        Z: { value: 1 },
        A: { value: 1 },
    },

    inputConfig: {
        M: { label: ja['card.stress.inputs.M'], unitType: 'moment' },
        V: { label: ja['card.stress.inputs.V'], unitType: 'force' },
        Z: { label: ja['card.stress.inputs.Z'], unitType: 'modulus' },
        A: { label: ja['card.stress.inputs.A'], unitType: 'area' },
    },

    outputConfig: {
        sigma_b: { label: ja['card.stress.outputs.sigma_b'], unitType: 'stress' },
        tau:     { label: ja['card.stress.outputs.tau'],     unitType: 'stress' },
        sigma_eq:{ label: ja['card.stress.outputs.sigma_eq'],unitType: 'stress' },
    },

    sidebar: { category: 'analysis', order: 2 },

    calculate: (inputs) => {
        const M = inputs['M'] || 0;
        const V = inputs['V'] || 0;
        const Z = inputs['Z'] || 0;
        const A = inputs['A'] || 0;

        // σ_b = M / Z  (bending stress, N/mm²)
        const sigma_b = Z > 0 ? M / Z : 0;

        // τ = (3/2) · |V| / A  (max shear stress, N/mm²)
        // NOTE: factor 3/2 assumes a rectangular cross-section. For other shapes
        // (I-beam: ~1.0–1.2, circle: 4/3) the shear distribution differs.
        const tau = A > 0 ? 1.5 * Math.abs(V) / A : 0;

        // σ_eq = √(σ_b² + 3τ²)  (von Mises equivalent stress)
        const sigma_eq = Math.sqrt(sigma_b * sigma_b + 3 * tau * tau);

        return { sigma_b, tau, sigma_eq };
    },
});
