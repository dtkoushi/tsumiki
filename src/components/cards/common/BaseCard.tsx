import React, { useState } from 'react';
import { GripVertical, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { Card } from '../../../types';
import { useTsumikiStore } from '../../../store/useTsumikiStore';
import { useSortableItem } from '../../stack/useSortableItem';
import { clsx } from 'clsx';

interface BaseCardProps {
    card: Card;
    icon: React.ReactNode;
    children: React.ReactNode;
    color?: string; // Tailwind border-color class
}

export const BaseCard: React.FC<BaseCardProps> = ({ card, icon, children, color = "border-slate-200" }) => {
    const { removeCard, updateCardUnit, updateCardAlias } = useTsumikiStore();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Use sortable context
    const { attributes, listeners, setNodeRef, style, isDragging, isDragOverlay } = useSortableItem();

    const unitMode = card.unitMode || 'mm';

    return (
        <div ref={setNodeRef} style={style} className="relative group outline-none mb-4">
            {/* Card Container */}
            <div className={clsx(
                "bg-white rounded-xl shadow-sm border-l-4 transition-all duration-200",
                color,
                isDragging ? "shadow-2xl scale-[1.02] rotate-1 opacity-90 z-50 cursor-grabbing ring-2 ring-blue-400" : "hover:shadow-md",
                isDragOverlay ? "shadow-2xl scale-[1.02] rotate-1 cursor-grabbing ring-2 ring-blue-400" : ""
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white rounded-t-xl">
                    <div className="flex items-center gap-3">
                        {/* Drag Handle */}
                        <div
                            {...attributes}
                            {...listeners}
                            className={clsx(
                                "text-slate-300 hover:text-slate-500 p-1 -ml-2 rounded hover:bg-slate-100 transition-colors outline-none",
                                isDragging ? "cursor-grabbing" : "cursor-grab"
                            )}
                        >
                            <GripVertical size={20} />
                        </div>

                        {/* Toggle Collapse */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <div className={clsx("p-2 rounded-lg bg-slate-50 text-slate-600", color.replace('border-', 'text-').replace('400', '600'))}>
                            {icon}
                        </div>

                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{card.type}</span>
                            <input
                                type="text"
                                value={card.alias}
                                onChange={(e) => updateCardAlias(card.id, e.target.value)}
                                className="font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-0 text-sm hover:bg-slate-50 rounded px-1 -ml-1 leading-tight w-32"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Unit Toggle */}
                        <button
                            onClick={() => updateCardUnit(card.id, unitMode === 'mm' ? 'm' : 'mm')}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            title="Toggle Units (mm, N ↔ m, kN)"
                        >
                            {unitMode === 'mm' ? 'MM, N' : 'M, kN'}
                        </button>

                        <button
                            onClick={() => removeCard(card.id)}
                            className="text-slate-300 hover:text-red-400 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!isCollapsed && (
                    <div className="p-4 space-y-4">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};
