
import React from 'react';
import { BaseCard } from './BaseCard';
import { SmartInput } from '../../common/SmartInput';
import { formatOutput, getUnitLabel, type OutputUnitType, type UnitMode } from '../../../lib/utils/unitFormatter';
import type { CardComponentProps } from '../../../lib/registry/types';
import { registry } from '../../../lib/registry';

const SelectInput = ({ name, config, card, actions }: { name: string, config: any, card: any, actions: any }) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{config.label}</label>
        <div className="relative">
            <select
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded px-3 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-100"
                value={card.inputs[name]?.value || config.default || ''}
                onChange={(e) => actions.updateInput(card.id, name, e.target.value)}
            >
                {config.options?.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
        </div>
    </div>
);

const InputRow = ({ name, config, card, actions, upstreamCards, unitMode }: { name: string, config: any, card: any, actions: any, upstreamCards: any, unitMode: UnitMode }) => (
    <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
        <span className="text-sm text-slate-600 truncate mr-2 font-medium" title={config.label}>
            {config.label} <span className="text-xs text-slate-400 font-normal">({name})</span>
        </span>
        <div className="w-24">
            <SmartInput
                cardId={card.id}
                inputKey={name}
                card={card}
                actions={actions}
                upstreamCards={upstreamCards}
                placeholder={config.unitType ? getUnitLabel(config.unitType, unitMode) : ''}
                unitMode={unitMode}
                inputType={config.unitType as any}
            />
        </div>
    </div>
);

const OutputRow = ({ name, config, card, unitMode }: { name: string, config: { label: string, unitType: OutputUnitType }, card: any, unitMode: UnitMode }) => (
    <div className="flex justify-between items-end gap-2 border-b border-slate-700/50 last:border-0 pb-1 last:pb-0">
        <span className="text-slate-400 shrink-0 text-xs mb-0.5">{config.label}:</span>
        <span className="truncate text-right w-full font-mono text-emerald-400" title={card.outputs[name]?.toString()}>
            {formatOutput(card.outputs[name], config.unitType, unitMode)}
            <span className="text-slate-500 ml-1 text-[10px]">
                {getUnitLabel(config.unitType, unitMode)}
            </span>
        </span>
    </div>
);

export const GenericCard: React.FC<CardComponentProps> = ({ card, actions, upstreamCards }) => {


    const unitMode = (card.unitMode || 'mm') as UnitMode;
    const def = registry.get(card.type);

    if (!def) return null;

    // Resolve Input Config: Merge static (def.inputConfig) with dynamic (def.getInputConfig)
    const dynamicConfig = def.getInputConfig ? def.getInputConfig(card) : {};
    const resolvedInputConfig = { ...(def.inputConfig || {}), ...dynamicConfig };

    // Split inputs into Selectors and Standard Inputs
    const selectors = Object.entries(resolvedInputConfig).filter(([_, config]) => config.type === 'select');
    const standardInputs = Object.entries(resolvedInputConfig).filter(([_, config]) => config.type !== 'select');

    return (
        <BaseCard card={card} icon={<def.icon size={18} />} color="border-slate-400">
            <div className="flex flex-col gap-4">


                {/* Top Selectors Area */}
                {selectors.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 bg-white pb-2 border-b border-slate-100">
                        {selectors.map(([key, config]) => (
                            <SelectInput key={key} name={key} config={config} card={card} actions={actions} />
                        ))}
                    </div>
                )}

                {/* Standard Inputs */}
                {standardInputs.length > 0 && (
                    <div className="space-y-2">
                        {/* Only show label if there are inputs, but maybe we can skip the label to reuse space? 
                            Let's keep it for clarity if mixed. */}
                        {/* <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parameters</label> */}

                        <div className="space-y-2">
                            {standardInputs.map(([key, config]) => {
                                if (def.shouldRenderInput && !def.shouldRenderInput(card, key)) return null;
                                return <InputRow key={key} name={key} config={config} card={card} actions={actions} upstreamCards={upstreamCards} unitMode={unitMode} />;
                            })}
                        </div>
                    </div>
                )}

                {/* Visualization Area */}
                {def.visualization && (
                    <div className="w-full min-h-[120px] bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 relative overflow-hidden">
                        <def.visualization card={card} actions={actions} upstreamCards={upstreamCards} />
                    </div>
                )}

                {/* Outputs */}
                {def.outputConfig && Object.keys(def.outputConfig).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Results</label>
                        <div className="bg-slate-800 shadow-inner text-white rounded-lg p-3 space-y-2 font-mono text-sm overflow-hidden">
                            {Object.entries(def.outputConfig).map(([key, config]) => (
                                <OutputRow key={key} name={key} config={config} card={card} unitMode={unitMode} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </BaseCard>
    );
};
