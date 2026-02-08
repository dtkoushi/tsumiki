
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';

// --- UI Component ---


import { calculateBeamAt, type BeamModel } from '../../lib/mechanics/beam';

// --- UI Component ---

const VerifyUI: React.FC<CardComponentProps> = ({ card }) => {
    const isOk = card.outputs['isOk'] === 1;
    const ratio = card.outputs['ratio'] || 0;
    const M_at_x = card.outputs['M_at_x'] || 0;

    // Visualization of where x is?
    // Maybe just simple text for now.

    return (
        <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${isOk ? 'text-emerald-500' : 'text-rose-500'}`}>
            <CheckCircle2 size={40} className={`mb-2 ${isOk ? 'opacity-100' : 'opacity-50'}`} />

            <div className="text-center mb-4">
                <span className="text-3xl font-bold font-mono">
                    {ratio.toFixed(2)}
                </span>
                <span className="block text-xs font-bold uppercase tracking-wider opacity-75">
                    Stress Ratio
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm opacity-80 mb-2">
                <div className="flex flex-col items-center">
                    <span className="font-mono">{M_at_x.toFixed(0)}</span>
                    <span className="text-[10px] uppercase">M at loc</span>
                </div>
                <div className="flex flex-col items-center">
                    {/* Assuming outputs also has allowable? No, inputs.fb is explicit input, but we compare calculated sigma */}
                    <span className="font-mono">{card.outputs['sigma']?.toFixed(1) || 0}</span>
                    <span className="text-[10px] uppercase">Actual σ</span>
                </div>
            </div>

            <span className="text-xs font-bold uppercase tracking-wider bg-current text-white dark:text-slate-900 px-2 py-1 rounded">
                {isOk ? 'PASSED' : 'FAILED'}
            </span>
        </div>
    );
};

// --- Definition ---

interface VerifyOutputs {
    sigma: number;
    ratio: number;
    isOk: number;
    M_at_x: number; // Calculated Moment at x_loc
}

export const VerifyCardDef = createCardDefinition<VerifyOutputs>({
    type: 'VERIFY',
    title: 'Section Check',
    icon: CheckCircle2,
    description: 'Check beam section at specific location.',

    defaultInputs: {
        beam: { value: null }, // Expecting connection from Beam
        section: { value: null }, // Expecting connection from Section (gives Z)
        material: { value: null }, // Expecting connection from Material (gives fb)
        x_loc: { value: 1000 },
    },

    calculate: (inputs) => {
        // Inputs from connections
        // Note: Connections are currently flattening outputs into inputs.
        // So Beam's output `structuralModel` should be available as `inputs['structuralModel']` IF the connection mapping is correct.
        // However, standard connection usually maps specific keys. 
        // We will assume the user connects Beam to this card, and we need to look for `structuralModel`.
        // BUT, `inputs` in calculate are numbers? No, they can be anything if defined in inputConfig?
        // Wait, Tsumiki's `CardInput` value is `any`.
        // But `calculate` receives `Record<string, any>` where values are extracted.

        const structuralModel = inputs['structuralModel'] as BeamModel | undefined;
        // Also fallback to manual M input if model not present?
        const manualM = inputs['M'] as number || 0;

        // Z and fb
        const Z = inputs['Z'] as number || 0;
        const fb = inputs['fb'] as number || 0;
        const x_loc = inputs['x_loc'] as number || 0;

        let M = manualM;
        if (structuralModel) {
            // Calculate M at x_loc using the model!
            const res = calculateBeamAt(structuralModel, x_loc);
            M = res.M;
        }

        const sigma = Z !== 0 ? Math.abs(M) / Z : 0; // Absolute moment for stress check (usually)
        const ratio = fb !== 0 ? sigma / fb : 0;
        const isOk = ratio <= 1.0 ? 1 : 0;

        return { sigma, ratio, isOk, M_at_x: M };
    },

    inputConfig: {
        // Source Inputs (Connection targets)
        structuralModel: { label: 'Beam Model', unitType: 'none' },
        Z: { label: 'Section Mod (Z)', unitType: 'modulus' },
        fb: { label: 'Allowable (fb)', unitType: 'stress' },

        // Local Inputs
        x_loc: { label: 'Check Loc (x)', unitType: 'length', default: 1000 },

        // Fallback
        M: { label: 'Manual M', unitType: 'moment' },
    },
    outputConfig: {
        sigma: { label: 'Stress (σ)', unitType: 'stress' },
        ratio: { label: 'Ratio', unitType: 'ratio' },
        isOk: { label: 'Status', unitType: 'none' },
        M_at_x: { label: 'M at x', unitType: 'moment' },
    },
    visualization: VerifyUI,
});

