import React from 'react';
import { Pin, X } from 'lucide-react';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import { registry } from '../../lib/registry';
import { SmartInput } from '../common/SmartInput';
import { getUnitLabel } from '../../lib/utils/unitFormatter';
import { ja, type JaKey } from '../../lib/i18n/ja';

const isJaKey = (key: string): key is JaKey => key in ja;
const t = (key: string) => isJaKey(key) ? ja[key] : key;

export const PinnedInputsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const cards = useTsumikiStore(state => state.cards);
    const pinnedInputs = useTsumikiStore(state => state.pinnedInputs);
    const unpinInput = useTsumikiStore(state => state.unpinInput);
    const updateInput = useTsumikiStore(state => state.updateInput);
    const setInputRef = useTsumikiStore(state => state.setInputRef);
    const setInputInputRef = useTsumikiStore(state => state.setInputInputRef);
    const setRefExpression = useTsumikiStore(state => state.setRefExpression);
    const removeReference = useTsumikiStore(state => state.removeReference);
    const removeInput = useTsumikiStore(state => state.removeInput);
    const updateCardUnit = useTsumikiStore(state => state.updateCardUnit);
    const actions = {
        updateInput,
        setReference: setInputRef,
        setInputReference: setInputInputRef,
        setRefExpression,
        removeReference,
        removeInput,
        updateCardUnit,
    };

    return (
        <div className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center">
            {/* Left label */}
            <div className="px-4 py-2 flex items-center gap-1.5 shrink-0">
                <Pin size={11} className="text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {ja['ui.pinnedInputs']}
                </span>
            </div>
            <div className="h-4 w-px bg-slate-200 shrink-0 mx-1" />

            {/* Chip scroll area — overflow here so dropdowns can escape */}
            <div className="flex-1 flex items-center gap-2 px-2 py-2 overflow-x-auto min-w-0">
                {pinnedInputs.map(({ cardId, inputKey }) => {
                    const cardIndex = cards.findIndex(c => c.id === cardId);
                    if (cardIndex === -1) return null;
                    const card = cards[cardIndex];
                    const def = registry.get(card.type);
                    if (!def) return null;
                    const dynamicConfig = def.getInputConfig ? def.getInputConfig(card) : {};
                    const resolvedInputConfig = { ...(def.inputConfig ?? {}), ...dynamicConfig };
                    const inputConf = resolvedInputConfig[inputKey];
                    if (!inputConf) return null;

                    const unitMode = (card.unitMode || 'mm') as 'mm' | 'm';
                    const unitLabel = inputConf.kind === 'numeric' && inputConf.unitType ? getUnitLabel(inputConf.unitType, unitMode) : '';
                    const upstreamCards = cards.slice(0, cardIndex);

                    return (
                        <div key={`${cardId}-${inputKey}`}
                            className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-2 py-1.5 shrink-0">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-blue-500 font-semibold leading-none">{card.alias}</span>
                                <span className="text-[10px] text-slate-400 leading-none mt-0.5">
                                    {t(inputConf.label)}{unitLabel && ` [${unitLabel}]`}
                                </span>
                            </div>
                            <div className="w-32">
                                <SmartInput
                                    cardId={cardId}
                                    inputKey={inputKey}
                                    card={card}
                                    actions={actions}
                                    upstreamCards={upstreamCards}
                                    placeholder={unitLabel ? '0' : ''}
                                    unitMode={unitMode}
                                    inputType={inputConf.kind === 'numeric' ? inputConf.unitType : undefined}
                                />
                            </div>
                            <button
                                onClick={() => unpinInput(cardId, inputKey)}
                                className="text-slate-300 hover:text-rose-400 transition-colors"
                                title={ja['ui.unpin']}
                            >
                                <X size={11} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Close button */}
            <button
                onClick={onClose}
                className="px-3 shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                title={ja['ui.close']}
            >
                <X size={14} />
            </button>
        </div>
    );
};
