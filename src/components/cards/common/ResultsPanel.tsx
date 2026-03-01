
import React from 'react';
import { Pin } from 'lucide-react';
import { clsx } from 'clsx';
import { formatOutput, getUnitLabel, type OutputUnitType, type UnitMode } from '../../../lib/utils/unitFormatter';
import { useTsumikiStore } from '../../../store/useTsumikiStore';
import { ja, type JaKey } from '../../../lib/i18n/ja';

const t = (key: string): string => (key in ja ? ja[key as JaKey] : key);

export interface ResultField {
    key: string;
    label: string;
    unitType: OutputUnitType;
}

interface ResultsPanelProps {
    cardId: string;
    outputs: Record<string, any>;
    fields: ResultField[];
    unitMode: UnitMode;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ cardId, outputs, fields, unitMode }) => {
    const pinnedOutputs = useTsumikiStore(state => state.pinnedOutputs);
    const pinOutput = useTsumikiStore(state => state.pinOutput);
    const unpinOutput = useTsumikiStore(state => state.unpinOutput);

    if (fields.length === 0) return null;

    return (
        <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('ui.results')}</label>
            <div className="bg-slate-800 shadow-inner text-white rounded-lg p-3 space-y-2 font-mono text-sm overflow-hidden">
                {fields.map(({ key, label, unitType }) => {
                    const isPinned = pinnedOutputs.some(p => p.cardId === cardId && p.outputKey === key);
                    const value = outputs[key];
                    const isRatio = unitType === 'ratio';
                    const ratioOk = isRatio && (value ?? 0) <= 1.0;
                    return (
                        <div key={key} className="flex justify-between items-center gap-2 border-b border-slate-700/50 last:border-0 pb-1 last:pb-0">
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => isPinned ? unpinOutput(cardId, key) : pinOutput(cardId, key)}
                                    className={clsx(
                                        'p-0.5 rounded transition-colors',
                                        isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-300'
                                    )}
                                    title={isPinned ? t('ui.unpin') : t('ui.pinToPanel')}
                                >
                                    <Pin size={10} />
                                </button>
                                <span className="text-slate-400 text-xs">{label}:</span>
                            </div>
                            <span
                                className={clsx(
                                    'truncate text-right w-full font-mono text-sm',
                                    isRatio
                                        ? ratioOk ? 'text-emerald-400' : 'text-rose-400'
                                        : 'text-emerald-400'
                                )}
                                title={value?.toString()}
                            >
                                {formatOutput(value, unitType, unitMode)}
                                {unitType !== 'ratio' && unitType !== 'none' && (
                                    <span className="text-slate-500 ml-1 text-[10px]">{getUnitLabel(unitType, unitMode)}</span>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
