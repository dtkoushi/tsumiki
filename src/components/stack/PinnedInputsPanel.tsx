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
    const actions = {
        updateInput,
        setReference: setInputRef,
        setInputReference: setInputInputRef,
        setRefExpression,
        removeReference,
        removeInput,
    };

    return (
        <div className="w-72 shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                    <Pin size={12} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {ja['ui.pinnedInputs']}
                    </span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                </button>
            </div>

            {/* Pinned Input Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {pinnedInputs.map(({ cardId, inputKey }) => {
                    const card = cards.find(c => c.id === cardId);
                    if (!card) return null;
                    const def = registry.get(card.type);
                    if (!def) return null;
                    const dynamicConfig = def.getInputConfig ? def.getInputConfig(card) : {};
                    const resolvedInputConfig = { ...(def.inputConfig || {}), ...dynamicConfig };
                    const inputConf = resolvedInputConfig[inputKey];
                    if (!inputConf) return null;

                    const unitMode = (card.unitMode || 'mm') as 'mm' | 'm';
                    const unitLabel = inputConf.unitType ? getUnitLabel(inputConf.unitType as any, unitMode) : '';
                    const cardIndex = cards.findIndex(c => c.id === cardId);
                    const upstreamCards = cards.slice(0, cardIndex);

                    return (
                        <div key={`${cardId}-${inputKey}`}
                            className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-blue-500 font-semibold">{card.alias}</span>
                                    <span className="text-[10px] text-slate-400 ml-1">
                                        {t(inputConf.label)}
                                        {unitLabel && <span className="ml-0.5">[{unitLabel}]</span>}
                                    </span>
                                </div>
                                <button
                                    onClick={() => unpinInput(cardId, inputKey)}
                                    className="text-slate-300 hover:text-rose-400 transition-colors"
                                    title={ja['ui.unpin']}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            <SmartInput
                                cardId={cardId}
                                inputKey={inputKey}
                                card={card}
                                actions={actions}
                                upstreamCards={upstreamCards}
                                placeholder={unitLabel ? '0' : ''}
                                unitMode={unitMode}
                                inputType={inputConf.unitType as any}
                            />
                        </div>
                    );
                })}
                {pinnedInputs.length === 0 && (
                    <div className="text-xs text-slate-400 italic text-center py-8">
                        カード入力行のピンアイコンをクリックすると<br />ここに表示されます
                    </div>
                )}
            </div>
        </div>
    );
};
