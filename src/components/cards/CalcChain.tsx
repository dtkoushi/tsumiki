import { Calculator } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';

interface CalcChainOutputs { result: number }

export const CalcChainCardDef = createCardDefinition<CalcChainOutputs>({
    type: 'CALC_CHAIN',
    title: '逐次演算',
    description: '初期値に演算ステップを順番に適用して最終結果を計算します。',
    icon: Calculator,
    sidebar: { category: 'analysis' },

    defaultInputs: { init: { value: 0 } },
    inputConfig: {
        init: { label: '初期値', unitType: 'none' },
    },
    outputConfig: {
        result: { label: '結果', unitType: 'none' },
    },

    dynamicRowGroups: [{
        groupLabel: '演算ステップ',
        rowLabel:   'ステップ',
        minCount:   1,
        fields: [
            {
                keyPrefix:    'op',
                label:        '演算子',
                options: [
                    { value: '+', label: '＋（加算）' },
                    { value: '-', label: '－（減算）' },
                    { value: '*', label: '×（乗算）' },
                    { value: '/', label: '÷（除算）' },
                ],
                defaultValue: '+',
                width:        'sm',
            },
            {
                keyPrefix:    'val',
                label:        '値',
                unitType:     'none',
                defaultValue: 0,
            },
        ],
    }],

    calculate: (inputs, rawInputs) => {
        const indices = Object.keys(rawInputs || {})
            .filter(k => /^op_\d+$/.test(k))
            .map(k => parseInt(k.split('_')[1]))
            .sort((a, b) => a - b);

        let result = inputs['init'] ?? 0;
        for (const n of indices) {
            const op  = rawInputs?.[`op_${n}`]?.value ?? '+';
            const val = inputs[`val_${n}`] ?? 0;
            if      (op === '+') result = result + val;
            else if (op === '-') result = result - val;
            else if (op === '*') result = result * val;
            else if (op === '/') result = val !== 0 ? result / val : result;
        }
        return { result };
    },
});

import { registry } from '../../lib/registry/registry';
registry.register(CalcChainCardDef);
