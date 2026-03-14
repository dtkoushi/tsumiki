import React, { useState, useRef, useEffect } from 'react';
import { Link2, Unlink, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { Card } from '../../types';
import type { CardActions } from '../../lib/registry/types';
import { formatOutput, INPUT_FACTORS } from '../../lib/utils/unitFormatter';
import type { SmartInputUnitType } from '../../lib/registry/types';
import { applyExpression } from '../../lib/utils/cardHelpers';
import { ja } from '../../lib/i18n/ja';
import { registry } from '../../lib/registry/registry';

interface SmartInputProps {
    cardId: string;
    inputKey: string;
    card: Card; // Need the card itself to access inputs
    actions: CardActions;
    upstreamCards: Card[];
    upstreamInputConfigs?: Map<string, Record<string, { label: string; unitType?: import('../../lib/utils/unitFormatter').OutputUnitType }>>;
    placeholder?: string;
    className?: string;
    unitMode?: 'mm' | 'm';
    inputType?: SmartInputUnitType;
}

export const SmartInput: React.FC<SmartInputProps> = ({
    cardId,
    inputKey,
    card,
    actions,
    upstreamCards,
    upstreamInputConfigs,
    placeholder,
    className,
    unitMode = 'mm',
    inputType = 'none'
}) => {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState<string>('');
    const [isInvalidInput, setIsInvalidInput] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    const input = card.inputs[inputKey];

    // Determine if currently referencing
    const isReferencing = !!input?.ref;
    const referencedCard = isReferencing
        ? (input.ref!.cardId === cardId ? card : upstreamCards.find(c => c.id === input.ref!.cardId))
        : null;

    // Conversion factor: display value * factor = SI value
    const factor = unitMode === 'm' ? (INPUT_FACTORS[inputType as keyof typeof INPUT_FACTORS] ?? 1) : 1;

    // Resolve display value
    const rawValue = input?.value;

    // 参照元の生値（expression 適用前）
    const getRefRawValue = (): number | null => {
        if (!referencedCard) return null;
        const ref = input.ref!;
        if (ref.refType === 'input' && ref.inputKey) {
            const val = referencedCard.resolvedInputs?.[ref.inputKey];
            return typeof val === 'number' ? val : null;
        }
        const val = referencedCard.outputs[ref.outputKey ?? ''];
        return typeof val === 'number' ? val : null;
    };
    const refRawValue = isReferencing ? getRefRawValue() : null;
    const expressionResult = isReferencing && refRawValue !== null
        ? applyExpression(refRawValue, input.ref!.expression)
        : refRawValue;
    const hasExpressionError = isReferencing && refRawValue !== null
        && !!input.ref?.expression && expressionResult === null;

    // Calculate the value to display when not focused (or when referenced)
    const getDisplayValue = () => {
        if (isReferencing) {
            if (!referencedCard) return '';
            if (refRawValue === null) {
                // diagramModel 等の非数値出力
                const val = referencedCard.outputs[input.ref!.outputKey ?? ''];
                return typeof val === 'object' ? '[Model]' : '-';
            }
            // 式エラー時は生値を表示（計算エンジンもフォールバックで生値を使う）
            const displayVal = expressionResult ?? refRawValue;
            return formatOutput(displayVal, inputType, unitMode);
        }

        if (rawValue !== undefined && rawValue !== '' && !isNaN(Number(rawValue))) {
            const val = Number(rawValue) / factor;
            return val.toString();
        }
        return rawValue?.toString() || '';
    };

    const displayValue = getDisplayValue();

    const handleFocus = () => {
        setIsFocused(true);
        if (isReferencing) {
            setLocalValue(input.ref!.expression || '');
        } else {
            setLocalValue(displayValue);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (isReferencing) {
            actions.setRefExpression(cardId, inputKey, localValue);
        } else {
            const val = localValue;
            if (val === '' || isNaN(Number(val))) {
                actions.updateInput(cardId, inputKey, val);
            } else {
                actions.updateInput(cardId, inputKey, Number(val) * factor);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        if (!isReferencing) {
            setIsInvalidInput(val !== '' && isNaN(Number(val)));
        }
    };

    const openPicker = (open: boolean) => {
        setIsPickerOpen(open);
        if (open) setSearchQuery('');
    };

    const toggleCardCollapse = (cardId: string) => {
        setCollapsedCards(prev => {
            const next = new Set(prev);
            if (next.has(cardId)) next.delete(cardId);
            else next.add(cardId);
            return next;
        });
    };

    const handleSelectReference = (targetCard: Card, outputKey: string) => {
        actions.setReference(cardId, inputKey, targetCard.id, outputKey);
        setIsPickerOpen(false);
    };

    const handleSelectInputReference = (targetCard: Card, targetInputKey: string) => {
        actions.setInputReference(cardId, inputKey, targetCard.id, targetInputKey);
        setIsPickerOpen(false);
    };

    // 参照モードに切替わったときに isInvalidInput をリセット
    useEffect(() => {
        if (isReferencing) setIsInvalidInput(false);
    }, [isReferencing]);

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Tooltip content
    const refLabel = isReferencing
        ? `${referencedCard?.alias || '?'}.${input.ref!.refType === 'input' ? `inputs.${input.ref!.inputKey}` : input.ref!.outputKey}`
        : '';
    const expressionTooltip = isReferencing && input.ref!.expression && !hasExpressionError && refRawValue !== null
        ? ` → ${input.ref!.expression} → ${expressionResult?.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
        : '';

    return (
        <div className="relative flex flex-col group/smart-input" ref={pickerRef}>
            <div className="relative flex items-center">
                <div className={clsx("relative w-full", isReferencing && "bg-blue-50/50 rounded")}>
                    <input
                        type="text"
                        className={clsx(
                            "w-full text-right text-sm border rounded-l px-2 py-1 focus:ring-1 focus:ring-blue-400 outline-none focus:z-10",
                            isReferencing
                                ? (isInvalidInput || hasExpressionError)
                                    ? "text-slate-800 font-medium bg-red-50 border-red-400"
                                    : "text-slate-800 font-medium bg-blue-50 border-blue-200"
                                : isInvalidInput
                                    ? "bg-white border-red-400"
                                    : "bg-white border-slate-200",
                            className
                        )}
                        value={isFocused ? localValue : displayValue}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={isFocused && isReferencing ? 'v' : placeholder}
                    />

                    {/* Tooltip for Linked Variable */}
                    {isReferencing && (
                        <div className="absolute bottom-full left-0 mb-1 opacity-0 group-hover/smart-input:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                            <div className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1 backdrop-blur-sm bg-slate-800/90 transform -translate-x-2">
                                {/* Arrow pointing down */}
                                <div className="absolute -bottom-1 left-3 w-2 h-2 bg-slate-800 rotate-45"></div>

                                <Link2 size={8} className="text-blue-200 shrink-0" />
                                <span className="font-mono max-w-[200px] truncate relative z-10">
                                    {refLabel}{expressionTooltip}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => isReferencing ? actions.removeReference(cardId, inputKey) : openPicker(!isPickerOpen)}
                    className={clsx(
                        "h-full px-2 border border-l-0 rounded-r transition-colors flex items-center justify-center -ml-[1px]",
                        isReferencing
                            ? "text-blue-500 hover:text-red-500 border-blue-200 bg-blue-50"
                            : "border-slate-200 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    )}
                    title={isReferencing
                        ? `${refLabel}${expressionTooltip} ${ja['ui.linkedInfo']}`
                        : ja['ui.linkToVariable']}
                >
                    {isReferencing ? <Unlink size={14} /> : <Link2 size={14} />}
                </button>
            </div>

            {(isInvalidInput && !isReferencing) && (
                <p className="text-[10px] text-red-500 mt-0.5 text-right" role="alert">
                    {ja['ui.invalidNumber']}
                </p>
            )}

            {hasExpressionError && (
                <p className="text-[10px] text-red-500 mt-0.5 text-right" role="alert">
                    {ja['ui.invalidExpression']}
                </p>
            )}

            {isPickerOpen && !isReferencing && (
                <div className="absolute right-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
                        <div className="p-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                            {ja['ui.selectSource']}
                        </div>
                        <div className="px-2 pb-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={ja['ui.picker.search']}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-400 outline-none bg-white"
                            />
                        </div>
                    </div>
                    {upstreamCards.length === 0 ? (
                        <div className="p-4 text-xs text-slate-400 text-center">
                            {ja['ui.noUpstream']}
                        </div>
                    ) : (
                        <div className="p-1">
                            {(() => {
                                const q = searchQuery.toLowerCase();
                                return upstreamCards.map(c => {
                                const allOutputEntries = Object.entries(c.outputs);
                                const inputCfgs = upstreamInputConfigs?.get(c.id) ?? {};
                                const allInputEntries = Object.entries(inputCfgs).filter(([key]) => {
                                    const val = c.resolvedInputs?.[key];
                                    return typeof val === 'number' && isFinite(val);
                                });

                                const visibleOutputs = q
                                    ? allOutputEntries.filter(([key]) => key.toLowerCase().includes(q))
                                    : allOutputEntries;
                                const visibleInputs = q
                                    ? allInputEntries.filter(([key, cfg]) =>
                                        key.toLowerCase().includes(q) || cfg.label.toLowerCase().includes(q))
                                    : allInputEntries;

                                if (visibleOutputs.length === 0 && visibleInputs.length === 0) return null;

                                const isCollapsed = !q && collapsedCards.has(c.id);

                                return (
                                    <div key={c.id} className="mb-1">
                                        <button
                                            onClick={() => toggleCardCollapse(c.id)}
                                            className="w-full px-2 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1 bg-slate-50/50 hover:bg-slate-100 transition-colors"
                                        >
                                            {isCollapsed
                                                ? <ChevronRight size={12} className="text-slate-400 shrink-0" />
                                                : <ChevronDown size={12} className="text-slate-400 shrink-0" />}
                                            <span className="text-[10px] bg-slate-200 rounded px-1 text-slate-500">{c.type}</span>
                                            {c.alias}
                                        </button>

                                        {!isCollapsed && (
                                            <>
                                                {/* 入力値セクション */}
                                                {visibleInputs.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                                                            {ja['ui.picker.inputs']}
                                                        </div>
                                                        <div className="pl-2">
                                                            {visibleInputs.map(([key]) => {
                                                                const val = c.resolvedInputs?.[key];
                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        onClick={() => handleSelectInputReference(c, key)}
                                                                        className="w-full text-left flex items-center justify-between px-2 py-1.5 text-xs hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors group"
                                                                    >
                                                                        <span className="font-mono text-slate-600 group-hover:text-emerald-700">{key}</span>
                                                                        <span className="text-slate-400 group-hover:text-emerald-500">
                                                                            {typeof val === 'number'
                                                                                ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                                                : '-'}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}

                                                {/* 出力値セクション */}
                                                {visibleOutputs.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                                                            {ja['ui.picker.outputs']}
                                                        </div>
                                                        <div className="pl-2">
                                                            {visibleOutputs.map(([key, val]) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => handleSelectReference(c, key)}
                                                                    className="w-full text-left flex items-center justify-between px-2 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700 rounded transition-colors group"
                                                                >
                                                                    <span className="font-mono text-slate-600 group-hover:text-blue-700">{key}</span>
                                                                    <span className="text-slate-400 group-hover:text-blue-500">
                                                                        {typeof val === 'number'
                                                                            ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                                            : (typeof val === 'object' ? '[Model]' : val)}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            });
                            })()}
                        </div>
                    )}
                    {(() => {
                        const q = searchQuery.toLowerCase();
                        const SELF_KEY = '__self__';
                        const cardDef = registry.get(card.type);
                        const cardInputConfig = {
                            ...(cardDef?.inputConfig ?? {}),
                            ...(cardDef?.getInputConfig?.(card) ?? {}),
                        };
                        const allSameCardEntries = Object.entries(card.inputs).filter(([key]) => {
                            if (key === inputKey) return false;
                            const val = card.resolvedInputs?.[key];
                            return typeof val === 'number' && isFinite(val);
                        });
                        const visibleEntries = q
                            ? allSameCardEntries.filter(([key]) => {
                                const label = cardInputConfig[key]?.label ?? key;
                                return key.toLowerCase().includes(q) || label.toLowerCase().includes(q);
                            })
                            : allSameCardEntries;
                        if (visibleEntries.length === 0) return null;
                        const isCollapsed = !q && collapsedCards.has(SELF_KEY);
                        return (
                            <div className="p-1 border-t border-slate-100">
                                <button
                                    onClick={() => toggleCardCollapse(SELF_KEY)}
                                    className="w-full px-2 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1 bg-indigo-50/70 hover:bg-indigo-100 transition-colors"
                                >
                                    {isCollapsed
                                        ? <ChevronRight size={12} className="text-slate-400 shrink-0" />
                                        : <ChevronDown size={12} className="text-slate-400 shrink-0" />}
                                    <span className="text-[10px] bg-indigo-200 rounded px-1 text-indigo-600">{card.type}</span>
                                    {ja['ui.picker.thisCard']}
                                </button>
                                {!isCollapsed && (
                                    <>
                                        <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                                            {ja['ui.picker.inputs']}
                                        </div>
                                        <div className="pl-2">
                                            {visibleEntries.map(([key]) => {
                                                const val = card.resolvedInputs?.[key];
                                                const label = cardInputConfig[key]?.label ?? key;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => handleSelectInputReference(card, key)}
                                                        className="w-full text-left flex items-center justify-between px-2 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-700 rounded transition-colors group"
                                                    >
                                                        <span className="text-slate-600 group-hover:text-indigo-700">{label}</span>
                                                        <span className="text-slate-400 group-hover:text-indigo-500">
                                                            {typeof val === 'number'
                                                                ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                                : '-'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
