
import { Hexagon } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { ja } from '../../lib/i18n/ja';

// --- Local Types ---

interface MaterialOutputs {
    F: number;
    E: number;
    gamma: number;
}

// --- Strategies ---

const SS400Strategy: CardStrategy<MaterialOutputs> = {
    id: 'ss400',
    label: 'SS400',
    inputConfig: {},
    calculate: () => ({ F: 235, E: 205000, gamma: 78.5 })
};

const SN400BStrategy: CardStrategy<MaterialOutputs> = {
    id: 'sn400b',
    label: 'SN400B',
    inputConfig: {},
    calculate: () => ({ F: 235, E: 205000, gamma: 78.5 })
};

const SN490BStrategy: CardStrategy<MaterialOutputs> = {
    id: 'sn490b',
    label: 'SN490B',
    inputConfig: {},
    calculate: () => ({ F: 325, E: 205000, gamma: 78.5 })
};

const SM490Strategy: CardStrategy<MaterialOutputs> = {
    id: 'sm490',
    label: 'SM490',
    inputConfig: {},
    calculate: () => ({ F: 325, E: 205000, gamma: 78.5 })
};

const ConcreteStrategy: CardStrategy<MaterialOutputs> = {
    id: 'concrete',
    label: 'コンクリート',
    inputConfig: {
        Fc: { label: '設計基準強度 Fc', unitType: 'stress', default: 24 },
    },
    calculate: (inputs) => {
        const Fc = inputs['Fc'] ?? 24;
        const E = 33500 * Math.pow(Fc / 60, 1 / 3);  // AIJ RC規準式
        return { F: Fc, E, gamma: 24.0 };
    },
};

const MaterialStrategies: CardStrategy<MaterialOutputs>[] = [
    SS400Strategy,
    SN400BStrategy,
    SN490BStrategy,
    SM490Strategy,
    ConcreteStrategy,
];

// --- Definition ---

export const MaterialCardDef = createStrategyDefinition<MaterialOutputs>({
    type: 'MATERIAL',
    title: ja['card.material.title'],
    icon: Hexagon,
    description: ja['card.material.description'],
    strategyAxes: [{
        key: 'grade',
        label: ja['card.material.axis.grade'],
        options: [
            { label: 'SS400', value: 'ss400' },
            { label: 'SN400B', value: 'sn400b' },
            { label: 'SN490B', value: 'sn490b' },
            { label: 'SM490', value: 'sm490' },
            { label: 'コンクリート', value: 'concrete' },
        ],
        default: 'ss400',
    }],
    strategies: MaterialStrategies,
    sidebar: { category: 'material', order: 1 },
    outputConfig: {
        F: { label: ja['card.material.outputs.designStrength'], unitType: 'stress' },
        E: { label: ja['card.material.outputs.youngsModulus'], unitType: 'stress' },
        gamma: { label: '単位体積重量 γ [kN/m³]', unitType: 'none' },
    },
});

import { registry } from '../../lib/registry/registry';
registry.register(MaterialCardDef);
