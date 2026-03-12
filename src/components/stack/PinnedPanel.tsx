import React from 'react';
import { Pin, X } from 'lucide-react';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import { registry } from '../../lib/registry';
import { formatOutput, getUnitLabel } from '../../lib/utils/unitFormatter';
import type { UnitMode } from '../../lib/utils/unitFormatter';
import { ja } from '../../lib/i18n/ja';

export const PinnedPanel: React.FC = () => {
    const cards = useTsumikiStore((state) => state.cards);
    const pinnedOutputs = useTsumikiStore((state) => state.pinnedOutputs);
    const unpinOutput = useTsumikiStore((state) => state.unpinOutput);
    if (pinnedOutputs.length === 0) return null;

    return (
        <div className="shrink-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex items-center">
            <div className="px-4 py-2 flex items-center gap-1.5 shrink-0">
                <Pin size={11} className="text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ja['ui.pinned']}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 shrink-0 mx-1" />
            <div className="flex-1 flex items-center gap-2 px-2 py-2 overflow-x-auto min-w-0">
                {pinnedOutputs.map(({ cardId, outputKey }) => {
                    const card = cards.find(c => c.id === cardId);
                    if (!card) return null;
                    const def = registry.get(card.type);
                    if (!def) return null;
                    const outputConf = def.outputConfig[outputKey] ?? (() => {
                        for (const dg of (def.dynamicInputGroups ?? [])) {
                            if (!dg.outputIndexFn) continue;
                            const idx = dg.outputIndexFn(outputKey);
                            if (idx) return { label: `${dg.outputLabel} ${idx}`, unitType: dg.outputUnitType };
                        }
                        return undefined;
                    })();
                    if (!outputConf) return null;
                    const unitMode = (card.unitMode || 'mm') as UnitMode;
                    const value = card.outputs[outputKey];

                    return (
                        <div
                            key={`out-${cardId}-${outputKey}`}
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
                                title={ja['ui.unpin']}
                            >
                                <X size={10} />
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="w-3 shrink-0" />
        </div>
    );
};
