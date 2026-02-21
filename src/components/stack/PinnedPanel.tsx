import React from 'react';
import { Pin, X } from 'lucide-react';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import { registry } from '../../lib/registry';
import { formatOutput, getUnitLabel } from '../../lib/utils/unitFormatter';
import type { UnitMode } from '../../lib/utils/unitFormatter';

export const PinnedPanel: React.FC = () => {
    const cards = useTsumikiStore((state) => state.cards);
    const pinnedOutputs = useTsumikiStore((state) => state.pinnedOutputs);
    const unpinOutput = useTsumikiStore((state) => state.unpinOutput);

    if (pinnedOutputs.length === 0) return null;

    return (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm mb-4 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
                <Pin size={11} className="text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pinned</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {pinnedOutputs.map(({ cardId, outputKey }) => {
                    const card = cards.find(c => c.id === cardId);
                    if (!card) return null;
                    const def = registry.get(card.type);
                    if (!def) return null;
                    const outputConf = def.outputConfig[outputKey];
                    if (!outputConf) return null;
                    const unitMode = (card.unitMode || 'mm') as UnitMode;
                    const value = card.outputs[outputKey];

                    return (
                        <div
                            key={`${cardId}-${outputKey}`}
                            className="flex items-center gap-1.5 bg-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-mono"
                        >
                            <span className="text-slate-400 text-[10px]">{card.alias}.</span>
                            <span className="text-slate-300">{outputConf.label}:</span>
                            <span className="text-emerald-400 font-semibold">
                                {formatOutput(value, outputConf.unitType, unitMode)}
                            </span>
                            <span className="text-slate-500 text-[10px]">{getUnitLabel(outputConf.unitType, unitMode)}</span>
                            <button
                                onClick={() => unpinOutput(cardId, outputKey)}
                                className="ml-1 text-slate-500 hover:text-slate-300 transition-colors"
                                title="Unpin"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
