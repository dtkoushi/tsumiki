
import React from 'react';
import { Columns } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps, CardStrategy } from '../../lib/registry/types';

// --- Local Types ---

interface BeamOutputs {
    M_max: number;
    V_max: number;
    Mx: number;
    Qx: number;
}

// --- Strategies ---

const UniformLoadStrategy: CardStrategy<BeamOutputs> = {
    id: 'uniform',
    label: 'Distributed Load',
    inputConfig: {
        L: { label: 'Span', unitType: 'length', default: 4000 },
        w: { label: 'Load (w)', unitType: 'load', default: 10 },
        x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
    },
    calculate: (inputs) => {
        const L = inputs['L'] || 0;
        const w = inputs['w'] || 0;
        const x_loc = inputs['x_loc'];

        const M_max = (w * Math.pow(L, 2)) / 8;
        const V_max = (w * L) / 2;
        let Mx = 0;
        let Qx = 0;

        if (x_loc !== undefined && x_loc >= 0 && x_loc <= L) {
            Mx = ((w * L) / 2) * x_loc - (w * Math.pow(x_loc, 2)) / 2;
            Qx = ((w * L) / 2) - (w * x_loc);
        }

        return { M_max, V_max, Mx, Qx };
    }
};

const PointLoadStrategy: CardStrategy<BeamOutputs> = {
    id: 'point',
    label: 'Point Load',
    inputConfig: {
        L: { label: 'Span', unitType: 'length', default: 4000 },
        P: { label: 'Load (P)', unitType: 'force', default: 1000 },
        x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
    },
    calculate: (inputs) => {
        const L = inputs['L'] || 0;
        const P = inputs['P'] || 0;
        const x_loc = inputs['x_loc'];

        const M_max = (P * L) / 4;
        const V_max = P / 2;
        let Mx = 0;
        let Qx = 0;

        if (x_loc !== undefined && x_loc >= 0 && x_loc <= L) {
            if (x_loc <= L / 2) {
                Mx = (P / 2) * x_loc;
                Qx = P / 2;
            } else {
                Mx = (P / 2) * (L - x_loc);
                Qx = -P / 2;
            }
        }
        return { M_max, V_max, Mx, Qx };
    }
};

const BeamStrategies: CardStrategy<BeamOutputs>[] = [
    UniformLoadStrategy,
    PointLoadStrategy
];

// --- Definition ---
import { BeamVisualization } from './beam/BeamVisualization';

export const BeamCardDef = createStrategyDefinition<BeamOutputs>({
    type: 'BEAM',
    title: 'Simple Beam',
    icon: Columns,
    description: 'Calculate shear and moment for a simple beam.',
    strategyKey: 'loadType',
    strategies: BeamStrategies,
    outputConfig: {
        M_max: { label: 'M_max', unitType: 'moment' },
        V_max: { label: 'V_max', unitType: 'force' },
        Mx: { label: 'Mx', unitType: 'moment' },
        Qx: { label: 'Qx', unitType: 'force' },
    },
    visualization: BeamVisualization,
});
