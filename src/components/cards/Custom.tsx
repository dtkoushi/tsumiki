
import React, { useState, useEffect } from 'react';
import { Calculator, X, Plus } from 'lucide-react';
import { all, create } from 'mathjs';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';

// Initialize mathjs
const math = create(all, {});

// --- UI Component ---

const CustomUI: React.FC<CardComponentProps> = ({ card, actions }) => {
    // Local state for variable management
    const [variables, setVariables] = useState<string[]>([]);
    const [formula, setFormula] = useState(card.inputs['formula']?.value || '');

    // Initialize variables from inputs on mount
    useEffect(() => {
        const inputKeys = Object.keys(card.inputs).filter(k => k !== 'formula');
        setVariables(inputKeys);
        setFormula(card.inputs['formula']?.value || '');
    }, [card.id]); // Only runs on mount or id change, not on input changes to avoid loop

    // But we need to sync formula when it changes from outside or initial load
    useEffect(() => {
        if (card.inputs['formula']?.value !== formula) {
            setFormula(card.inputs['formula']?.value || '');
        }
    }, [card.inputs['formula']?.value]);

    const handleAddVariable = () => {
        const newVar = prompt('Enter variable name (e.g. x, y, width):');
        if (newVar && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newVar)) {
            if (!variables.includes(newVar)) {
                const newVars = [...variables, newVar];
                setVariables(newVars);
                actions.updateInput(card.id, newVar, 0); // Initialize with 0
            }
        }
    };

    const handleRemoveVariable = (key: string) => {
        const newVars = variables.filter(v => v !== key);
        setVariables(newVars);
        // We can't strictly remove inputs from the card state via actions currently,
        // but we can just stop rendering them.
        // Ideally we'd have a removeInput action.
    };

    const handleFormulaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setFormula(newVal);
        actions.updateInput(card.id, 'formula', newVal);
    };

    return (
        <div className="w-full h-full p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Formula</label>
                <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none h-20"
                    value={formula}
                    onChange={handleFormulaChange}
                    placeholder="e.g. a * b + 10"
                />
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variables</label>
                    <button
                        onClick={handleAddVariable}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                        <Plus size={12} /> Add
                    </button>
                </div>

                <div className="space-y-2">
                    {variables.map(key => (
                        <div key={key} className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500 w-12 truncate" title={key}>{key}</span>
                            <input
                                type="number"
                                className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-right text-sm focus:outline-none focus:border-blue-500"
                                value={card.inputs[key]?.value || 0}
                                onChange={(e) => actions.updateInput(card.id, key, parseFloat(e.target.value))}
                            />
                            <button onClick={() => handleRemoveVariable(key)} className="text-slate-400 hover:text-rose-500">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    {variables.length === 0 && (
                        <div className="text-xs text-slate-400 italic text-center py-2">No variables defined</div>
                    )}
                </div>
            </div>

            <div className="pt-2 border-t border-slate-100 mt-auto">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Result</span>
                    <span className="font-mono text-lg font-bold text-emerald-500">
                        {card.outputs['result']?.toFixed(2) ?? '---'}
                    </span>
                </div>
            </div>
        </div>
    );
};

// --- Definition ---

export const CustomCardDef = createCardDefinition({
    type: 'CUSTOM',
    title: 'Custom Formula',
    icon: Calculator,
    description: 'Define your own variables and formula.',
    defaultInputs: {
        formula: { value: 'a + b' },
        a: { value: 1 },
        b: { value: 2 },
    },
    // Custom logic for calculation using mathjs
    calculate: (inputs, rawInputs) => {
        try {
            const formula = rawInputs?.['formula']?.value;
            if (typeof formula !== 'string' || !formula) return {};

            // Evaluate formula with inputs
            const result = math.evaluate(formula, inputs);

            // If result is valid number
            if (typeof result === 'number' && !isNaN(result)) {
                return { result };
            } else if (typeof result === 'object') {
                const outputs: Record<string, number> = {};
                Object.entries(result).forEach(([k, v]) => {
                    if (typeof v === 'number') outputs[k] = v;
                });
                return outputs;
            }

            return { result: Number(result) };
        } catch (e) {
            return { result: 0 };
        }
    },
    inputConfig: {}, // Handled in Visualization
    outputConfig: {}, // Handled in Visualization
    visualization: CustomUI,
});
