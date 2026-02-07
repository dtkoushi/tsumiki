import React, { useMemo } from 'react';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import { registry } from '../../lib/registry';
import { GenericCard } from '../cards/common/GenericCard';



import { Ghost } from 'lucide-react';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import type { Card } from '../../types';

export const StackArea: React.FC = () => {
    const cards = useTsumikiStore((state) => state.cards);
    const moveCard = useTsumikiStore((state) => state.moveCard);

    // Actions
    const updateInput = useTsumikiStore((state) => state.updateInput);
    const setInputRef = useTsumikiStore((state) => state.setInputRef);
    const removeReference = useTsumikiStore((state) => state.removeReference);
    const updateCardUnit = useTsumikiStore((state) => state.updateCardUnit);

    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Bundle actions for props
    const actions = useMemo(() => ({
        updateInput,
        setReference: setInputRef,
        removeReference,
        updateCardUnit
    }), [updateInput, setInputRef, removeReference, updateCardUnit]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            moveCard(active.id as string, over.id as string);
        }
        setActiveId(null);
    };

    const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;
    const activeCardIndex = activeId ? cards.findIndex((c) => c.id === activeId) : -1;

    const renderCard = (card: Card, index: number) => {
        const upstreamCards = cards.slice(0, index);
        const def = registry.get(card.type);

        const props = {
            card,
            actions,
            upstreamCards
        };

        if (def) {
            const Component = def.component || GenericCard;
            return <Component {...props} />;
        }

        return (
            <div className="w-full p-4 border border-red-300 bg-red-50 text-red-500 rounded text-sm font-mono">
                Unknown Type: {card.type}
            </div>
        );
    };

    return (
        <div className="w-full">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="max-w-2xl mx-auto space-y-4 pb-20">
                    <SortableContext
                        items={cards.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {cards.map((card, index) => (
                            <SortableItem key={card.id} id={card.id}>
                                {renderCard(card, index)}
                            </SortableItem>
                        ))}
                    </SortableContext>

                    {cards.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
                            <Ghost size={64} strokeWidth={1} className="mb-4 text-slate-300" />
                            <p className="text-lg font-medium text-slate-500">Stack is empty</p>
                            <p className="text-sm">Add a card from the sidebar to start.</p>
                        </div>
                    )}
                </div>

                <DragOverlay dropAnimation={{
                    duration: 250,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}>
                    {activeCard ? (
                        <div className="opacity-90 shadow-2xl rotate-2 scale-[1.02] cursor-grabbing">
                            {renderCard(activeCard, activeCardIndex)}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};
