
import React from 'react';
import { Hexagon } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps, CardStrategy } from '../../lib/registry/types';

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

// --- UI Component ---

const MaterialUI: React.FC<CardComponentProps> = () => {
    return (
        <div className="w-full h-full flex items-center justify-center p-6 text-slate-300">
            <Hexagon size={48} strokeWidth={1} />
        </div>
    );
};

// --- Definition ---

export const MaterialCardDef = createStrategyDefinition<MaterialOutputs>({
    type: 'MATERIAL',
    title: 'Material',
    icon: Hexagon,
    description: 'Select steel grade to determine allowable stress.',
    strategyKey: 'grade',
    strategies: MaterialStrategies,
    outputConfig: {
        F: { label: 'Design Strength (F)', unitType: 'stress' },
        E: { label: 'Young\'s Modulus (E)', unitType: 'stress' },
    },
    visualization: MaterialUI,
});
