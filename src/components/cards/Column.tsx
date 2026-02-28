
import { Landmark } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { ja } from '../../lib/i18n/ja';

// --- Types ---

interface ColumnOutputs {
    Le: number;
    i_gyration: number;
    lambda: number;
    N_cr: number;
    sigma_cr: number;
}

// Factory that creates a column strategy for the given end-condition (by k factor)
function makeColumnStrategy(id: string, label: string, k: number): CardStrategy<ColumnOutputs> {
    return {
        id,
        label,
        inputConfig: {},
        calculate: (inputs) => {
            const L  = inputs['L']  || 0;
            const E  = inputs['E']  || 0;
            const A  = inputs['A']  || 0;
            const I  = inputs['I']  || 0;

            const Le         = k * L;
            const i_gyration = A > 0 ? Math.sqrt(I / A) : 0;
            const lambda     = i_gyration > 0 ? Le / i_gyration : 0;
            const N_cr       = Le > 0 ? (Math.PI ** 2 * E * I) / (Le ** 2) : 0;
            const sigma_cr   = A > 0 ? N_cr / A : 0;

            return { Le, i_gyration, lambda, N_cr, sigma_cr };
        },
    };
}

// --- Strategies (one per end condition) ---

const Strategies: CardStrategy<ColumnOutputs>[] = [
    makeColumnStrategy('pinned_pinned', ja['card.column.endCondition.pinned_pinned'], 1.0),
    makeColumnStrategy('fixed_free',    ja['card.column.endCondition.fixed_free'],    2.0),
    makeColumnStrategy('fixed_pinned',  ja['card.column.endCondition.fixed_pinned'],  0.7),
    makeColumnStrategy('fixed_fixed',   ja['card.column.endCondition.fixed_fixed'],   0.5),
];

// --- Definition ---

export const ColumnCardDef = createStrategyDefinition<ColumnOutputs>({
    type: 'COLUMN',
    title: ja['card.column.title'],
    icon: Landmark,
    description: ja['card.column.description'],

    strategyAxes: [
        {
            key: 'endCondition',
            label: ja['card.column.axis.endCondition'],
            options: [
                { label: ja['card.column.endCondition.pinned_pinned'], value: 'pinned_pinned' },
                { label: ja['card.column.endCondition.fixed_free'],    value: 'fixed_free' },
                { label: ja['card.column.endCondition.fixed_pinned'],  value: 'fixed_pinned' },
                { label: ja['card.column.endCondition.fixed_fixed'],   value: 'fixed_fixed' },
            ],
            default: 'pinned_pinned',
        },
    ],

    strategies: Strategies,

    sidebar: { category: 'analysis', order: 4 },

    commonInputConfig: {
        L: { label: ja['card.column.inputs.L'],  unitType: 'length'  as const, default: 3000 },
        E: { label: ja['card.column.inputs.E'],  unitType: 'modulus' as const, default: 205000 },
        A: { label: ja['card.column.inputs.A'],  unitType: 'area'    as const, default: 5000 },
        I: { label: ja['card.column.inputs.I'],  unitType: 'inertia' as const, default: 1e7 },
    },

    outputConfig: {
        Le:         { label: ja['card.column.outputs.Le'],          unitType: 'length' },
        i_gyration: { label: ja['card.column.outputs.i_gyration'],  unitType: 'length' },
        lambda:     { label: ja['card.column.outputs.lambda'],      unitType: 'none' },
        N_cr:       { label: ja['card.column.outputs.N_cr'],        unitType: 'force' },
        sigma_cr:   { label: ja['card.column.outputs.sigma_cr'],    unitType: 'stress' },
    },
});

import { registry } from '../../lib/registry';
registry.register(ColumnCardDef);
