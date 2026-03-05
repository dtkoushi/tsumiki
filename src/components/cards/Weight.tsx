import { Scale } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { registry } from '../../lib/registry/registry';

interface WeightOutputs { W_total: number }

export const WeightCardDef = createCardDefinition<WeightOutputs>({
    type: 'WEIGHT',
    title: '重量計算',
    description: '部材の形状と密度から総重量を計算します。',
    icon: Scale,
    sidebar: { category: 'balance', order: 1 },

    defaultInputs: {},
    inputConfig: {},
    outputConfig: {
        W_total: { label: '総重量 W', unitType: 'force' },
    },

    dynamicRowGroups: [{
        groupLabel: '部材リスト',
        rowLabel: '部材',
        minCount: 1,
        fields: [
            {
                keyPrefix: 'type',
                label: '形状',
                options: [
                    { value: 'rect',     label: '矩形断面 × 長さ' },
                    { value: 'circle',   label: '円形断面 × 長さ' },
                    { value: 'area_len', label: '断面積 × 長さ' },
                    { value: 'volume',   label: '体積直接入力' },
                ],
                defaultValue: 'rect',
            },
            {
                keyPrefix: 'w',
                label: '幅 B',
                unitType: 'length',
                hidden: (raw) => raw['type'] !== 'rect',
                defaultValue: 0,
            },
            {
                keyPrefix: 'h',
                label: '高さ H',
                unitType: 'length',
                hidden: (raw) => raw['type'] !== 'rect',
                defaultValue: 0,
            },
            {
                keyPrefix: 'd',
                label: '径 D',
                unitType: 'length',
                hidden: (raw) => raw['type'] !== 'circle',
                defaultValue: 0,
            },
            {
                keyPrefix: 'A',
                label: '断面積 A',
                unitType: 'area',
                hidden: (raw) => raw['type'] !== 'area_len',
                defaultValue: 0,
            },
            {
                keyPrefix: 'L',
                label: '長さ L',
                unitType: 'length',
                hidden: (raw) => raw['type'] === 'volume',
                defaultValue: 0,
            },
            {
                keyPrefix: 'V',
                label: '体積 V [mm³]',
                unitType: 'none',
                hidden: (raw) => raw['type'] !== 'volume',
                defaultValue: 0,
            },
            {
                keyPrefix: 'gamma',
                label: '密度 γ [kN/m³]',
                unitType: 'none',
                defaultValue: 78.5,
            },
        ],
    }],

    calculate: (inputs, rawInputs) => {
        const indices = Object.keys(rawInputs || {})
            .filter(k => /^type_\d+$/.test(k))
            .map(k => parseInt(k.split('_')[1]))
            .sort((a, b) => a - b);

        let W_total = 0;
        for (const n of indices) {
            const type    = rawInputs?.[`type_${n}`]?.value ?? 'rect';
            const gamma   = inputs[`gamma_${n}`] ?? 78.5;
            const gammaSI = gamma * 1e-6;  // kN/m³ → N/mm³

            let V = 0;
            if (type === 'volume') {
                V = inputs[`V_${n}`] ?? 0;
            } else if (type === 'area_len') {
                const A = inputs[`A_${n}`] ?? 0;
                const L = inputs[`L_${n}`] ?? 0;
                V = A * L;
            } else if (type === 'rect') {
                const w = inputs[`w_${n}`] ?? 0;
                const h = inputs[`h_${n}`] ?? 0;
                const L = inputs[`L_${n}`] ?? 0;
                V = w * h * L;
            } else if (type === 'circle') {
                const d = inputs[`d_${n}`] ?? 0;
                const L = inputs[`L_${n}`] ?? 0;
                V = Math.PI / 4 * d * d * L;
            }

            W_total += V * gammaSI;
        }

        return { W_total };
    },
});

registry.register(WeightCardDef);
