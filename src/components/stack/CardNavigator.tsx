import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import { registry } from '../../lib/registry';

export const CardNavigator: React.FC = () => {
    const cards = useTsumikiStore((state) => state.cards);

    const handleClick = (cardId: string) => {
        document
            .querySelector(`[data-card-id="${cardId}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <aside className="w-44 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 py-3 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigator</span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
                {cards.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center px-3 pt-6">No cards yet</p>
                ) : (
                    cards.map((card) => {
                        const def = registry.get(card.type);
                        return (
                            <button
                                key={card.id}
                                onClick={() => handleClick(card.id)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center gap-1.5">
                                    {card.error && (
                                        <AlertCircle size={10} className="text-red-400 shrink-0" />
                                    )}
                                    {def && (
                                        <def.icon size={10} className="text-slate-400 shrink-0" />
                                    )}
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        {card.type}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-600 font-medium truncate mt-0.5 group-hover:text-blue-600">
                                    {card.alias}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </aside>
    );
};
