import React, { useState, useRef, useEffect } from 'react';
import { Link2, Unlink } from 'lucide-react';
import { clsx } from 'clsx';
import type { Card } from '../../types';
import type { CardActions } from '../../lib/registry/types';
import { formatOutput, INPUT_FACTORS } from '../../lib/utils/unitFormatter';

interface SmartInputProps {
    cardId: string;
    inputKey: string;
    card: Card; // Need the card itself to access inputs
    actions: CardActions;
    upstreamCards: Card[];
    placeholder?: string;
    className?: string;
    unitMode?: 'mm' | 'm';
    inputType?: 'length' | 'force' | 'moment' | 'load' | 'stress' | 'modulus' | 'none';
}

export const SmartInput: React.FC<SmartInputProps> = ({
    cardId,
    inputKey,
    card,
    actions,
    upstreamCards,
    placeholder,
    className,
    unitMode = 'mm',
    inputType = 'none'
}) => {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState<string>('');
    const [isInvalidInput, setIsInvalidInput] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    const input = card.inputs[inputKey];

    // Determine if currently referencing
    const isReferencing = !!input?.ref;
    const referencedCard = isReferencing ? upstreamCards.find(c => c.id === input.ref!.cardId) : null;

    // Conversion factor: display value * factor = SI value
    const factor = unitMode === 'm' ? (INPUT_FACTORS[inputType] ?? 1) : 1;

    // Resolve display value
    const rawValue = input?.value;

    // Calculate the value to display when not focused (or when referenced)
    const getDisplayValue = () => {
        if (isReferencing) {
            if (!referencedCard) return '';
            const val = referencedCard.outputs[input.ref!.outputKey];
            if (typeof val !== 'number') return '[Model]';
            return formatOutput(val, inputType as any, unitMode);
        }

        if (rawValue !== undefined && rawValue !== '' && !isNaN(Number(rawValue))) {
            const val = Number(rawValue) / factor;
            return val.toString();
        }
        return rawValue?.toString() || '';
    };

    const displayValue = getDisplayValue();

    // Sync local value with prop value when not focused
    useEffect(() => {
        if (!isFocused) {
            setLocalValue(displayValue);
        }
    }, [displayValue, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
        setLocalValue(displayValue);
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (!isReferencing) {
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
        setIsInvalidInput(val !== '' && isNaN(Number(val)));
    };

    const handleSelectReference = (targetCard: Card, outputKey: string) => {
        actions.setReference(cardId, inputKey, targetCard.id, outputKey);
        setIsPickerOpen(false);
    };

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



    return (
        <div className="relative flex flex-col group/smart-input" ref={pickerRef}>
            <div className="relative flex items-center">
                <div className={clsx("relative w-full", isReferencing && "bg-blue-50/50 rounded")}>
                    <input
                        type="text"
                        className={clsx(
                            "w-full text-right text-sm border rounded-l px-2 py-1 focus:ring-1 focus:ring-blue-400 outline-none focus:z-10",
                            isReferencing
                                ? "text-slate-800 font-medium bg-blue-50 border-blue-200 cursor-default"
                                : isInvalidInput
                                    ? "bg-white border-red-400"
                                    : "bg-white border-slate-200",
                            className
                        )}
                        value={isFocused ? localValue : displayValue}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        readOnly={isReferencing}
                    />

                    {/* Tooltip for Linked Variable */}
                    {isReferencing && (
                        <div className="absolute bottom-full left-0 mb-1 opacity-0 group-hover/smart-input:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                            <div className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1 backdrop-blur-sm bg-slate-800/90 transform -translate-x-2">
                                {/* Arrow pointing down */}
                                <div className="absolute -bottom-1 left-3 w-2 h-2 bg-slate-800 rotate-45"></div>

                                <Link2 size={8} className="text-blue-200 shrink-0" />
                                <span className="font-mono max-w-[150px] truncate relative z-10">
                                    {referencedCard?.alias || '?'}.{input.ref!.outputKey}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => isReferencing ? actions.removeReference(cardId, inputKey) : setIsPickerOpen(!isPickerOpen)}
                    className={clsx(
                        "h-full px-2 border border-l-0 rounded-r transition-colors flex items-center justify-center -ml-[1px]",
                        isReferencing
                            ? "text-blue-500 hover:text-red-500 border-blue-200 bg-blue-50"
                            : "border-slate-200 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    )}
                    title={isReferencing ? `Linked to ${referencedCard?.alias || 'Unknown'}.${input.ref!.outputKey} (Click to unlink)` : "Link to variable"}
                >
                    {isReferencing ? <Unlink size={14} /> : <Link2 size={14} />}
                </button>
            </div>

            {isInvalidInput && !isReferencing && (
                <p className="text-[10px] text-red-500 mt-0.5 text-right" role="alert">
                    Invalid number
                </p>
            )}

            {isPickerOpen && !isReferencing && (
                <div className="absolute right-0 top-full mt-1 w-64 max-h-60 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide sticky top-0">
                        Select Source
                    </div>
                    {upstreamCards.length === 0 ? (
                        <div className="p-4 text-xs text-slate-400 text-center">
                            No upstream components available.
                        </div>
                    ) : (
                        <div className="p-1">
                            {upstreamCards.map(c => {
                                const outputs = Object.entries(c.outputs);
                                if (outputs.length === 0) return null;

                                return (
                                    <div key={c.id} className="mb-1">
                                        <div className="px-2 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1 bg-slate-50/50">
                                            <span className="text-[10px] bg-slate-200 rounded px-1 text-slate-500">{c.type}</span>
                                            {c.alias}
                                        </div>
                                        <div className="pl-2">
                                            {outputs.map(([key, val]) => (
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
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
