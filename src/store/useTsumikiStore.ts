import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Card, CardType } from '../types';
import { topologicalSort } from '../lib/engine/graph';
import { registry } from '../lib/registry';

interface ProjectMeta {
    title: string;
    author: string;
}

interface TsumikiState {
    cards: Card[];
    meta: ProjectMeta;

    // Actions
    addCard: (type: CardType) => void;
    removeCard: (id: string) => void;
    updateCardAlias: (id: string, alias: string) => void;
    updateInput: (cardId: string, inputKey: string, value: string | number) => void;
    setInputRef: (cardId: string, inputKey: string, refCardId: string, refOutputKey: string) => void;
    removeReference: (cardId: string, inputKey: string) => void;
    removeInput: (cardId: string, inputKey: string) => void;
    updateCardPosition: (id: string, x: number, y: number) => void;
    reorderCards: (newCards: Card[]) => void;
    moveCard: (activeId: string, overId: string) => void;
    updateCardUnit: (cardId: string, mode: 'mm' | 'm') => void;
    updateCardMemo: (id: string, memo: string) => void;

    // Project State
    loadProject: (cards: Card[], title: string, author: string) => void;
}

const recalculateAll = (cards: Card[]): Card[] => {
    const sortedIds = topologicalSort(cards);
    const updatedCardsMap = new Map<string, Card>();

    // Initial map
    cards.forEach(c => updatedCardsMap.set(c.id, c));

    sortedIds.forEach(id => {
        const card = updatedCardsMap.get(id);
        if (!card) return;

        const def = registry.get(card.type);
        let outputs: Record<string, number> = {};
        let error: string | undefined;

        if (def && def.calculate) {
            // Resolve inputs using config to support defaults
            const resolvedInputs: Record<string, number> = {};

            // Get dynamic config if available
            const dynamicConfig = def.getInputConfig ? def.getInputConfig(card) : {};
            const resolvedConfig = { ...(def.inputConfig || {}), ...dynamicConfig };

            // 1. Process all configured inputs (including defaults)
            Object.entries(resolvedConfig).forEach(([key, config]) => {
                const input = card.inputs[key];
                if (input && input.ref) {
                    const sourceCard = updatedCardsMap.get(input.ref.cardId);
                    resolvedInputs[key] = sourceCard?.outputs[input.ref.outputKey] ?? 0;
                } else if (input && input.value !== undefined && input.value !== '') {
                    const val = parseFloat(String(input.value));
                    resolvedInputs[key] = isNaN(val) ? 0 : val;
                } else if (config.default !== undefined) {
                    const val = parseFloat(String(config.default));
                    resolvedInputs[key] = isNaN(val) ? 0 : val;
                }
            });

            // 2. Also ensure any extra inputs in card.inputs are processed (if not in config)
            // This handles cases where config might not be exhaustive or for legacy support
            Object.entries(card.inputs).forEach(([key, input]) => {
                if (resolvedInputs[key] !== undefined) return; // Already processed

                if (input.ref) {
                    const sourceCard = updatedCardsMap.get(input.ref.cardId);
                    resolvedInputs[key] = sourceCard?.outputs[input.ref.outputKey] ?? 0;
                } else {
                    const val = parseFloat(String(input.value));
                    resolvedInputs[key] = isNaN(val) ? 0 : val;
                }
            });

            // Pass resolved inputs AND raw inputs (for CustomCard formula)
            try {
                outputs = def.calculate(resolvedInputs, card.inputs);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (import.meta.env.DEV) console.warn(`[Tsumiki] Card "${card.alias}" (${card.type}) calculation failed:`, message);
                error = message;
            }
        }

        updatedCardsMap.set(id, { ...card, outputs, error });
    });

    return cards.map(c => updatedCardsMap.get(c.id)!);
};

export const useTsumikiStore = create<TsumikiState>((set) => ({
    cards: [],
    meta: { title: 'New Project', author: 'User' },

    loadProject: (cards, title, author) => set((state) => ({
        cards: recalculateAll(cards),
        meta: {
            title: title || state.meta.title,
            author: author || state.meta.author
        }
    })),

    addCard: (type) => set((state) => {
        const def = registry.get(type);

        // Initial inputs from Registry
        let initialInputs: Record<string, any> = {};
        if (def) {
            initialInputs = JSON.parse(JSON.stringify(def.defaultInputs));
        }

        const newCard: Card = {
            id: uuidv4(),
            type,
            alias: `${type.toLowerCase()}_${state.cards.length + 1}`,
            inputs: initialInputs,
            outputs: {},
            unitMode: 'mm',
        };

        const newCards = [...state.cards, newCard];
        return { cards: recalculateAll(newCards) };
    }),

    removeCard: (id) => set((state) => ({
        cards: recalculateAll(state.cards.filter((c) => c.id !== id)),
    })),

    updateCardAlias: (id, alias) => set((state) => ({
        cards: state.cards.map((c) => (c.id === id ? { ...c, alias } : c)),
    })),

    updateCardUnit: (cardId, mode) => set((state) => ({
        cards: state.cards.map(c =>
            c.id === cardId ? { ...c, unitMode: mode } : c
        )
    })),

    updateCardMemo: (id, memo) => set(state => ({
        cards: state.cards.map(c => c.id === id ? { ...c, memo } : c)
    })),

    updateInput: (cardId, inputKey, value) => set((state) => {
        const newCards = state.cards.map((c) => {
            if (c.id !== cardId) return c;
            const currentInput = c.inputs[inputKey] || { value: '' }; // Fallback
            return {
                ...c,
                inputs: {
                    ...c.inputs,
                    [inputKey]: { ...currentInput, value, ref: undefined },
                },
            };
        });
        return { cards: recalculateAll(newCards) };
    }),

    setInputRef: (cardId, inputKey, targetCardId, targetOutputKey) => set((state) => {
        const newCards = state.cards.map((c) => {
            if (c.id !== cardId) return c;
            return {
                ...c,
                inputs: {
                    ...c.inputs,
                    [inputKey]: { value: '', ref: { cardId: targetCardId, outputKey: targetOutputKey } },
                },
            };
        });
        return { cards: recalculateAll(newCards) };
    }),

    removeInput: (cardId, inputKey) => set((state) => {
        const newCards = state.cards.map((c) => {
            if (c.id !== cardId) return c;
            const newInputs = { ...c.inputs };
            delete newInputs[inputKey];
            return { ...c, inputs: newInputs };
        });
        return { cards: recalculateAll(newCards) };
    }),

    removeReference: (cardId, inputKey) => set((state) => {
        const newCards = state.cards.map((c) => {
            if (c.id !== cardId) return c;
            const currentInput = c.inputs[inputKey];
            if (!currentInput) return c;
            return {
                ...c,
                inputs: {
                    ...c.inputs,
                    [inputKey]: { ...currentInput, ref: undefined },
                },
            };
        });
        return { cards: recalculateAll(newCards) };
    }),

    updateCardPosition: (_id, _x, _y) => set((state) => ({
        // Placeholder
        cards: state.cards
    })),

    reorderCards: (newCards) => set((_state) => {
        return { cards: recalculateAll(newCards) };
    }),

    moveCard: (activeId, overId) => set((state) => {
        const oldIndex = state.cards.findIndex((c) => c.id === activeId);
        const newIndex = state.cards.findIndex((c) => c.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newCards = [...state.cards];
            const [removed] = newCards.splice(oldIndex, 1);
            newCards.splice(newIndex, 0, removed);
            return { cards: recalculateAll(newCards) };
        }
        return {};
    }),
}));
