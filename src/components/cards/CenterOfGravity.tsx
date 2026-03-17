import { Crosshair } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { registry } from '../../lib/registry/registry';

interface CogOutputs { x_G: number; y_G: number; W_total: number }

export const CenterOfGravityCardDef = createCardDefinition<CogOutputs>({
    type: 'CENTER_OF_GRAVITY',
    title: '重心位置',
    description: '各部材の座標と重量から重心位置を計算します。',
    icon: Crosshair,
    sidebar: { category: 'balance', order: 2 },

    defaultInputs: {},
    inputConfig: {},
    outputConfig: {
        x_G:     { label: '重心 x 座標', unitType: 'length', symbol: 'x_G' },
        y_G:     { label: '重心 y 座標', unitType: 'length', symbol: 'y_G' },
        W_total: { label: '合計重量',  unitType: 'force',  symbol: 'W'   },
    },

    dynamicRowGroups: [{
        groupLabel: '部材・荷重リスト',
        rowLabel: '部材',
        minCount: 1,
        fields: [
            { keyPrefix: 'x', label: 'x 座標', unitType: 'length', symbol: (i) => `x_${i}`, defaultValue: 0 },
            { keyPrefix: 'y', label: 'y 座標', unitType: 'length', symbol: (i) => `y_${i}`, defaultValue: 0 },
            { keyPrefix: 'W', label: '重量',    unitType: 'force',  symbol: (i) => `W_${i}`, defaultValue: 0 },
        ],
    }],

    calculate: (inputs, rawInputs) => {
        const indices = Object.keys(rawInputs || {})
            .filter(k => /^W_\d+$/.test(k))
            .map(k => parseInt(k.split('_')[1]))
            .sort((a, b) => a - b);

        let sumW = 0, sumWx = 0, sumWy = 0;
        for (const n of indices) {
            const W = inputs[`W_${n}`] ?? 0;
            const x = inputs[`x_${n}`] ?? 0;
            const y = inputs[`y_${n}`] ?? 0;
            sumW  += W;
            sumWx += W * x;
            sumWy += W * y;
        }

        const x_G = sumW !== 0 ? sumWx / sumW : 0;
        const y_G = sumW !== 0 ? sumWy / sumW : 0;

        return { x_G, y_G, W_total: sumW };
    },
});

registry.register(CenterOfGravityCardDef);
