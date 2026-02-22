
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';

// --- UI Component ---

const VerifyUI: React.FC<CardComponentProps> = ({ card }) => {
    const isOk = card.outputs['isOk'] === 1;
    const ratio = card.outputs['ratio'] ?? 0;
    const margin = card.outputs['margin'] ?? 0;

    return (
        <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${isOk ? 'text-emerald-500' : 'text-rose-500'}`}>
            <CheckCircle2 size={40} className={`mb-2 ${isOk ? 'opacity-100' : 'opacity-50'}`} />

            <div className="text-center mb-3">
                <span className="text-3xl font-bold font-mono">
                    {ratio.toFixed(3)}
                </span>
                <span className="block text-xs font-bold uppercase tracking-wider opacity-75">
                    Ratio
                </span>
            </div>

            <div className="text-center mb-4">
                <span className="text-lg font-mono">
                    {margin.toFixed(3)}
                </span>
                <span className="block text-xs uppercase opacity-75">
                    Margin
                </span>
            </div>

            <span className="text-xs font-bold uppercase tracking-wider bg-current text-white dark:text-slate-900 px-2 py-1 rounded">
                {isOk ? 'PASSED' : 'FAILED'}
            </span>
        </div>
    );
};

// --- Definition ---

interface VerifyOutputs {
    ratio: number;
    margin: number;
    isOk: number;
}

export const VerifyCardDef = createCardDefinition<VerifyOutputs>({
    type: 'VERIFY',
    title: 'Verify',
    icon: CheckCircle2,
    description: 'Check value against allowable (ratio = |value| / allowable).',

    defaultInputs: {
        value: { value: 0 },
        allowable: { value: 1 },
    },

    calculate: (inputs) => {
        const value = (inputs['value'] as number) || 0;
        const allowable = (inputs['allowable'] as number) || 0;
        const ratio = allowable !== 0 ? Math.abs(value) / allowable : 0;
        const margin = 1 - ratio;
        const isOk = ratio <= 1.0 ? 1 : 0;
        return { ratio, margin, isOk };
    },

    inputConfig: {
        value: { label: 'Value', unitType: 'none' },
        allowable: { label: 'Allowable', unitType: 'none' },
    },
    outputConfig: {
        ratio: { label: 'Ratio', unitType: 'ratio' },
        margin: { label: 'Margin', unitType: 'ratio' },
        isOk: { label: 'Status', unitType: 'none' },
    },
    visualization: VerifyUI,
});
