
import React from 'react';
import { Plus, X, Pin } from 'lucide-react';
import { clsx } from 'clsx';
import { BaseCard } from './BaseCard';
import { SmartInput } from '../../common/SmartInput';
import { formatOutput, getUnitLabel, type OutputUnitType, type UnitMode } from '../../../lib/utils/unitFormatter';
import type { CardComponentProps, CardActions, DynamicInputGroupConfig } from '../../../lib/registry/types';
import type { Card } from '../../../types';
import { registry } from '../../../lib/registry';
import { useTsumikiStore } from '../../../store/useTsumikiStore';

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

const DynamicGroupSection = ({
    config, card, actions, upstreamCards, unitMode
}: {
    config: DynamicInputGroupConfig;
    card: Card;
    actions: CardActions;
    upstreamCards: Card[];
    unitMode: UnitMode;
}) => {
    const { keyPrefix, inputLabel, inputUnitType, outputKeyFn, outputLabel, outputUnitType, defaultValue = 0, minCount = 1, addLabel = 'Add' } = config;

    const pattern = new RegExp(`^${keyPrefix}_\\d+$`);
    const keys = Object.keys(card.inputs)
        .filter(k => pattern.test(k))
        .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

    const handleAdd = () => {
        const nums = keys.map(k => parseInt(k.split('_')[1]));
        const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        actions.updateInput(card.id, `${keyPrefix}_${next}`, defaultValue);
    };

    const dUnitLabel = getUnitLabel(inputUnitType, unitMode);
    const nUnitLabel = getUnitLabel(outputUnitType, unitMode);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {inputLabel} → {outputLabel}
                </label>
                <button
                    onClick={handleAdd}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                >
                    <Plus size={12} /> {addLabel}
                </button>
            </div>

            {keys.length > 0 && (
                <div className="grid grid-cols-[1fr_12px_1fr_20px] gap-x-2 items-center px-1">
                    <span className="text-[10px] text-slate-400">{inputLabel} [{dUnitLabel}]</span>
                    <span />
                    <span className="text-[10px] text-slate-400 text-right">{outputLabel} [{nUnitLabel}]</span>
                    <span />
                </div>
            )}

            {keys.map(key => {
                const outputKey = outputKeyFn(key);
                const outputVal = card.outputs[outputKey] ?? 0;
                return (
                    <div key={key} className="grid grid-cols-[1fr_12px_1fr_20px] gap-x-2 items-center">
                        <SmartInput
                            cardId={card.id}
                            inputKey={key}
                            card={card}
                            actions={actions}
                            upstreamCards={upstreamCards}
                            inputType={inputUnitType as any}
                            unitMode={unitMode}
                            placeholder="0"
                        />
                        <span className="text-slate-300 text-xs text-center">→</span>
                        <div className="text-right font-mono text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-1 truncate">
                            {formatOutput(outputVal, outputUnitType, unitMode)}
                        </div>
                        <button
                            onClick={() => actions.removeInput(card.id, key)}
                            className="text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center"
                            disabled={keys.length <= minCount}
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}

            {keys.length === 0 && (
                <div className="text-xs text-slate-400 italic text-center py-2">
                    {addLabel} ボタンで行を追加してください
                </div>
            )}
        </div>
    );
};

const OutputRow = ({
    name, config, card, unitMode, isPinned, onPinToggle
}: {
    name: string;
    config: { label: string; unitType: OutputUnitType };
    card: any;
    unitMode: UnitMode;
    isPinned: boolean;
    onPinToggle: () => void;
}) => (
    <div className="flex justify-between items-center gap-2 border-b border-slate-700/50 last:border-0 pb-1 last:pb-0">
        <div className="flex items-center gap-1 shrink-0">
            <button
                onClick={onPinToggle}
                className={clsx(
                    "p-0.5 rounded transition-colors",
                    isPinned ? "text-amber-400 hover:text-amber-300" : "text-slate-600 hover:text-slate-300"
                )}
                title={isPinned ? 'Unpin' : 'Pin to panel'}
            >
                <Pin size={10} />
            </button>
            <span className="text-slate-400 text-xs">{config.label}:</span>
        </div>
        <span className="truncate text-right w-full font-mono text-emerald-400" title={card.outputs[name]?.toString()}>
            {formatOutput(card.outputs[name], config.unitType, unitMode)}
            <span className="text-slate-500 ml-1 text-[10px]">
                {getUnitLabel(config.unitType, unitMode)}
            </span>
        </span>
    </div>
);

const GenericCardInner: React.FC<CardComponentProps> = ({ card, actions, upstreamCards }) => {
    const pinnedOutputs = useTsumikiStore(state => state.pinnedOutputs);
    const pinOutput = useTsumikiStore(state => state.pinOutput);
    const unpinOutput = useTsumikiStore(state => state.unpinOutput);

    const unitMode = (card.unitMode || 'mm') as UnitMode;
    const def = registry.get(card.type);

    if (!def) return null;

    // Resolve Input Config: Merge static (def.inputConfig) with dynamic (def.getInputConfig)
    const dynamicConfig = def.getInputConfig ? def.getInputConfig(card) : {};
    const resolvedInputConfig = { ...(def.inputConfig || {}), ...dynamicConfig };

    // Split inputs into Selectors and Standard Inputs
    const selectors = Object.entries(resolvedInputConfig).filter(([, config]) => config.type === 'select');
    const standardInputs = Object.entries(resolvedInputConfig).filter(([, config]) => config.type !== 'select');

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
                        <div className="space-y-2">
                            {standardInputs.map(([key, config]) => {
                                if (def.shouldRenderInput && !def.shouldRenderInput(card, key)) return null;
                                return <InputRow key={key} name={key} config={config} card={card} actions={actions} upstreamCards={upstreamCards} unitMode={unitMode} />;
                            })}
                        </div>
                    </div>
                )}

                {/* Dynamic Input Group (paired input → output rows with add/remove) */}
                {def.dynamicInputGroup && (
                    <DynamicGroupSection
                        config={def.dynamicInputGroup}
                        card={card}
                        actions={actions}
                        upstreamCards={upstreamCards}
                        unitMode={unitMode}
                    />
                )}

                {/* Visualization Area */}
                {def.visualization && (
                    <div className="w-full min-h-[120px] bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 relative overflow-hidden">
                        <def.visualization card={card} actions={actions} upstreamCards={upstreamCards} />
                    </div>
                )}

                {/* Calculation Error */}
                {card.error && (
                    <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 font-mono break-all">
                        ⚠ {card.error}
                    </div>
                )}

                {/* Outputs */}
                {!card.error && def.outputConfig && Object.keys(def.outputConfig).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Results</label>
                        <div className="bg-slate-800 shadow-inner text-white rounded-lg p-3 space-y-2 font-mono text-sm overflow-hidden">
                            {Object.entries(def.outputConfig).filter(([, config]) => !config.hidden).map(([key, config]) => {
                                const isPinned = pinnedOutputs.some(p => p.cardId === card.id && p.outputKey === key);
                                return (
                                    <OutputRow
                                        key={key}
                                        name={key}
                                        config={config}
                                        card={card}
                                        unitMode={unitMode}
                                        isPinned={isPinned}
                                        onPinToggle={() => isPinned ? unpinOutput(card.id, key) : pinOutput(card.id, key)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </BaseCard>
    );
};


export const GenericCard = React.memo(GenericCardInner);
