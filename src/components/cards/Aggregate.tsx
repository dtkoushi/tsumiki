import { Sigma } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';

interface AggregateOutputs {
    sum: number;
    average: number;
    min: number;
    max: number;
    count: number;
}

export const AggregateCardDef = createCardDefinition<AggregateOutputs>({
    type: 'AGGREGATE',
    title: '集計',
    description: '複数の値を集計して合計・平均・最大・最小を計算します。',
    icon: Sigma,
    sidebar: { category: 'analysis' },

    defaultInputs: { val_1: { value: 0 } },
    inputConfig: {},
    outputConfig: {
        sum:     { label: '合計', unitType: 'none' },
        average: { label: '平均', unitType: 'none' },
        min:     { label: '最小', unitType: 'none' },
        max:     { label: '最大', unitType: 'none' },
        count:   { label: '個数', unitType: 'none' },
    },

    dynamicInputGroups: [{
        keyPrefix:      'val',
        inputLabel:     '値',
        rowLabel:       '値',
        inputUnitType:  'none',
        outputKeyFn:    (k) => `_y_${k.split('_')[1]}`,
        outputLabel:    '',
        outputUnitType: 'none',
        defaultValue:   0,
        minCount:       1,
        addLabel:       '値を追加',
        showOutputFn:   () => false,
    }],

    calculate: (_inputs, _rawInputs, dynamicGroups) => {
        const vals = (dynamicGroups?.['val'] ?? []).map(e => e.value);
        if (vals.length === 0) return { sum: 0, average: 0, min: 0, max: 0, count: 0 };
        const sum = vals.reduce((a, b) => a + b, 0);
        return {
            sum,
            average: sum / vals.length,
            min: Math.min(...vals),
            max: Math.max(...vals),
            count: vals.length,
        };
    },
});

import { registry } from '../../lib/registry/registry';
registry.register(AggregateCardDef);
