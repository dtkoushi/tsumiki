
import { Hexagon } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { ja } from '../../lib/i18n/ja';

// --- Local Types ---

interface MaterialOutputs {
    F: number;
    E: number;
}

// --- Strategies ---

const SS400Strategy: CardStrategy<MaterialOutputs> = {
    id: 'ss400',
    label: 'SS400',
    inputConfig: {},
    calculate: () => ({ F: 235, E: 205000 })
};

const SN400BStrategy: CardStrategy<MaterialOutputs> = {
    id: 'sn400b',
    label: 'SN400B',
    inputConfig: {},
    calculate: () => ({ F: 235, E: 205000 })
};

const SN490BStrategy: CardStrategy<MaterialOutputs> = {
    id: 'sn490b',
    label: 'SN490B',
    inputConfig: {},
    calculate: () => ({ F: 325, E: 205000 })
};

const SM490Strategy: CardStrategy<MaterialOutputs> = {
    id: 'sm490',
    label: 'SM490',
    inputConfig: {},
    calculate: () => ({ F: 325, E: 205000 })
};

const MaterialStrategies: CardStrategy<MaterialOutputs>[] = [
    SS400Strategy,
    SN400BStrategy,
    SN490BStrategy,
    SM490Strategy
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
        ],
        default: 'ss400',
    }],
    strategies: MaterialStrategies,
    sidebar: { category: 'geometry', order: 2 },
    outputConfig: {
        F: { label: ja['card.material.outputs.designStrength'], unitType: 'stress' },
        E: { label: ja['card.material.outputs.youngsModulus'], unitType: 'stress' },
    },
});

import { registry } from '../../lib/registry';
registry.register(MaterialCardDef);
