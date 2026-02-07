
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

// --- UI Component ---

const BeamUI: React.FC<CardComponentProps> = ({ card }) => {
    // Load Type: 'uniform' or 'point' (from strategy ID)
    // The input 'loadType' holds the strategy ID.
    const loadType = card.inputs['loadType']?.value || 'uniform';

    return (
        <div className="w-full h-full flex items-center justify-center p-6 text-slate-300">
            {/* Visual Placeholder for Beam Diagram */}
            <div className="flex flex-col items-center">
                <div className="relative w-32 h-0 border-b-2 border-current mb-1">
                    {/* Triangle Support */}
                    <div className="absolute left-0 top-0 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-current"></div>
                    {/* Roller Support */}
                    <div className="absolute right-0 top-[2px] w-2.5 h-2.5 rounded-full border border-current"></div>

                    {loadType === 'uniform' ? (
                        // Distributed Load
                        <div className="absolute bottom-2 left-0 right-0 h-3 bg-current/20 flex items-end justify-between px-1">
                            <div className="w-full border-b border-current"></div>
                        </div>
                    ) : (
                        // Point Load
                        <div className="absolute bottom-2 left-1/2 w-0.5 h-4 bg-current">
                            <div className="absolute top-0 -left-1 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-current"></div>
                        </div>
                    )}
                </div>
                <span className="text-[10px] font-mono mt-2">
                    {loadType === 'uniform' ? 'M = wL²/8' : 'M = PL/4'}
                </span>
            </div>
        </div>
    );
};

// --- Definition ---

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
    visualization: BeamUI,
});
