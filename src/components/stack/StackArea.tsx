import React, { useMemo } from 'react';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import { registry } from '../../lib/registry';
import { GenericCard } from '../cards/common/GenericCard';
import { PinnedPanel } from './PinnedPanel';
import type { OutputUnitType } from '../../lib/utils/unitFormatter';

import { Ghost } from 'lucide-react';
import { ja } from '../../lib/i18n/ja';

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
    const setInputInputRef = useTsumikiStore((state) => state.setInputInputRef);
    const setRefExpression = useTsumikiStore((state) => state.setRefExpression);
    const removeReference = useTsumikiStore((state) => state.removeReference);
    const removeInput = useTsumikiStore((state) => state.removeInput);
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
        setInputReference: setInputInputRef,
        setRefExpression,
        removeReference,
        removeInput,
        updateCardUnit
    }), [updateInput, setInputRef, setInputInputRef, setRefExpression, removeReference, removeInput, updateCardUnit]);

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

        const upstreamInputConfigs = new Map<string, Record<string, { label: string; unitType?: OutputUnitType }>>();
        upstreamCards.forEach(c => {
            const cDef = registry.get(c.type);
            if (!cDef) return;
            const dynCfg = cDef.getInputConfig ? cDef.getInputConfig(c) : {};
            const merged = { ...(cDef.inputConfig || {}), ...dynCfg };
            const filtered = Object.fromEntries(
                Object.entries(merged)
                    .filter(([key, cfg]) => {
                        if (cfg.type === 'select') return false;
                        for (const dg of (cDef.dynamicInputGroups ?? [])) {
                            if (new RegExp(`^${dg.keyPrefix}_\\d+$`).test(key)) return false;
                        }
                        return true;
                    })
                    .map(([key, cfg]) => [key, { label: cfg.label, unitType: cfg.unitType }])
            );
            upstreamInputConfigs.set(c.id, filtered);
        });

        const props = {
            card,
            actions,
            upstreamCards,
            upstreamInputConfigs,
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
            <PinnedPanel />
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
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Ghost size={64} strokeWidth={1} className="mb-6 text-slate-300" />
                            <p className="text-lg font-semibold text-slate-500 mb-4">{ja['ui.stackEmpty']}</p>
                            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside text-left max-w-xs">
                                <li><strong className="text-slate-600">{ja['card.section.title']}</strong> {ja['ui.onboarding.step1']}</li>
                                <li><strong className="text-slate-600">{ja['card.material.title']}</strong> {ja['ui.onboarding.step2']}</li>
                                <li><strong className="text-slate-600">{ja['card.beam.title']}</strong> {ja['ui.onboarding.step3']}</li>
                                <li><strong className="text-slate-600">{ja['card.verify.title']}</strong> {ja['ui.onboarding.step4']}</li>
                            </ol>
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
