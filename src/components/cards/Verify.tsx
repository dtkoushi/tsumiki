
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';

// --- UI Component ---

const VerifyUI: React.FC<CardComponentProps> = ({ card }) => {
    const isOk = card.outputs['isOk'] === 1;
    const ratio = card.outputs['ratio'] || 0;

    return (
        <div className={`w-full h-full flex items-center justify-center p-6 ${isOk ? 'text-emerald-500' : 'text-rose-500'}`}>
            <div className="flex flex-col items-center gap-2">
                <CheckCircle2 size={40} className={isOk ? 'opacity-100' : 'opacity-50'} />
                <span className="text-2xl font-bold font-mono">
                    {ratio.toFixed(2)}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">
                    {isOk ? 'OK' : 'NG'}
                </span>
            </div>
        </div>
    );
};

// --- Definition ---

// --- Local Types ---

interface VerifyOutputs {
    sigma: number;
    ratio: number;
    isOk: number;
}

export const VerifyCardDef = createCardDefinition<VerifyOutputs>({
    type: 'VERIFY',
    title: 'Verify',
    icon: CheckCircle2,
    description: 'Compare actual vs allowable values.',

    defaultInputs: {
        M: { value: 0 },
        fb: { value: 0 },
        Z: { value: 0 },
    },
    calculate: (inputs) => {
        const M = inputs['M'] || 0;
        const fb = inputs['fb'] || 0;
        const Z = inputs['Z'] || 0;

        const sigma = Z !== 0 ? M / Z : 0;
        const ratio = fb !== 0 ? sigma / fb : 0;
        const isOk = ratio <= 1.0 ? 1 : 0;

        return { sigma, ratio, isOk };
    },

    inputConfig: {
        M: { label: 'Moment (M)', unitType: 'moment' },
        fb: { label: 'Allowable (fb)', unitType: 'stress' },
        Z: { label: 'Section Mod (Z)', unitType: 'modulus' },
    },
    outputConfig: {
        sigma: { label: 'Stress (σ)', unitType: 'stress' },
        ratio: { label: 'Ratio', unitType: 'ratio' },
        isOk: { label: 'Status', unitType: 'none' }, // Added to match type
    },
    visualization: VerifyUI,
});
