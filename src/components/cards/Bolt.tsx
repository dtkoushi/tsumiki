
import { Settings2 } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';

// --- Types ---

interface BoltOutputs {
    q_1: number;
    Q_allow: number;
    ratio: number;
}

// --- Strategies ---

const frictionStrategy: CardStrategy<BoltOutputs> = {
    id: 'friction',
    label: '摩擦接合（高力ボルト）',
    inputConfig: {
        f_allow: { label: '許容耐力/本', unitType: 'force' as const, default: 30000, symbol: 'f_allow' },
    },
    calculate: (inputs) => {
        const Q       = inputs['Q']       || 0;
        const n       = inputs['n']       || 1;
        const n_face  = inputs['n_face']  || 1;
        const f_allow = inputs['f_allow'] || 0;

        const q_1    = Math.abs(Q) / n;
        const Q_allow = f_allow * n_face;
        const ratio  = Q_allow > 0 ? q_1 / Q_allow : 0;
        return { q_1, Q_allow, ratio };
    },
};

const bearingStrategy: CardStrategy<BoltOutputs> = {
    id: 'bearing',
    label: '支圧接合（普通ボルト）',
    inputConfig: {
        t:         { label: '接合板厚',       unitType: 'length' as const, default: 9,   symbol: 't' },
        d:         { label: 'ボルト径',        unitType: 'length' as const, default: 20,  symbol: 'd' },
        F_b_allow: { label: '支圧許容応力度',  unitType: 'stress' as const, default: 270, symbol: 'F_b_allow' },
    },
    calculate: (inputs) => {
        const Q        = inputs['Q']        || 0;
        const n        = inputs['n']        || 1;
        const n_face   = inputs['n_face']   || 1;
        const t        = inputs['t']        || 0;
        const d        = inputs['d']        || 0;
        const F_b_allow= inputs['F_b_allow']|| 0;

        const q_1    = Math.abs(Q) / n;
        const Q_allow = F_b_allow * d * t * n_face;
        const ratio  = Q_allow > 0 ? q_1 / Q_allow : 0;
        return { q_1, Q_allow, ratio };
    },
};

// --- Definition ---

export const BoltCardDef = createStrategyDefinition<BoltOutputs>({
    type: 'BOLT',
    title: 'ボルトの検討',
    description: '高力ボルト（摩擦接合）または普通ボルト（支圧接合）の検定を行います',
    icon: Settings2,
    sidebar: { category: 'verify', order: 3 },

    strategyAxes: [
        {
            key: 'joinType',
            label: '接合方式',
            options: [
                { label: '摩擦接合（高力ボルト）', value: 'friction' },
                { label: '支圧接合（普通ボルト）', value: 'bearing' },
            ],
            default: 'friction',
        },
    ],

    strategies: [frictionStrategy, bearingStrategy],

    commonInputConfig: {
        n:      { label: 'ボルト本数',   unitType: 'none'  as const, default: 4, symbol: 'n' },
        Q:      { label: 'せん断力合計', unitType: 'force' as const,             symbol: 'Q' },
        n_face: { label: 'せん断面数',   unitType: 'none'  as const, default: 1, symbol: 'n_face' },
    },

    outputConfig: {
        q_1:    { label: '1本あたりの力', unitType: 'force', formula: '|Q| / n',       symbol: 'q_1',     formulaInputKeys: ['Q', 'n'] },
        Q_allow:{ label: '1本の許容耐力', unitType: 'force',                            symbol: 'Q_allow' },
        ratio:  { label: '検定比',        unitType: 'ratio', formula: 'q_1 / Q_allow', symbol: 'ratio' },
    },

    getOutputConfig: (card) => {
        const joinType = card.inputs['joinType']?.value ?? 'friction';
        if (joinType === 'friction') {
            return {
                Q_allow: { label: '1本の許容耐力', unitType: 'force', symbol: 'Q_allow',
                            formula: 'f_allow × n_face',
                            formulaInputKeys: ['f_allow', 'n_face'] },
            };
        } else {
            return {
                Q_allow: { label: '1本の許容耐力', unitType: 'force', symbol: 'Q_allow',
                            formula: 'F_b_allow × d × t × n_face',
                            formulaInputKeys: ['F_b_allow', 'd', 't', 'n_face'] },
            };
        }
    },
});

import { registry } from '../../lib/registry/registry';
registry.register(BoltCardDef);
