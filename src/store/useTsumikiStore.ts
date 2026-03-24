import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Card, CardType } from '../types';
import { topologicalSort } from '../lib/engine/graph';
import { registry } from '../lib/registry';
import { applyExpression } from '../lib/utils/cardHelpers';

interface ProjectMeta {
    title: string;
    author: string;
    memo?: string;
}

export interface PinnedOutput {
    cardId: string;
    outputKey: string;
}

export interface PinnedInput {
    cardId: string;
    inputKey: string;
}

interface TsumikiState {
    cards: Card[];
    meta: ProjectMeta;
    pinnedOutputs: PinnedOutput[];
    pinnedInputs: PinnedInput[];

    // Actions
    addCard: (type: CardType) => void;
    removeCard: (id: string) => void;
    updateCardAlias: (id: string, alias: string) => void;
    updateInput: (cardId: string, inputKey: string, value: string | number) => void;
    setInputRef: (cardId: string, inputKey: string, refCardId: string, refOutputKey: string) => void;
    setInputInputRef: (cardId: string, inputKey: string, targetCardId: string, targetInputKey: string) => void;
    setRefExpression: (cardId: string, inputKey: string, expression: string) => void;
    removeReference: (cardId: string, inputKey: string) => void;
    removeInput: (cardId: string, inputKey: string) => void;
    updateCardPosition: (id: string, x: number, y: number) => void;
    reorderCards: (newCards: Card[]) => void;
    moveCard: (activeId: string, overId: string) => void;
    updateCardUnit: (cardId: string, mode: 'mm' | 'm') => void;
    updateCardMemo: (id: string, memo: string) => void;
    pinOutput: (cardId: string, outputKey: string) => void;
    unpinOutput: (cardId: string, outputKey: string) => void;
    pinInput: (cardId: string, inputKey: string) => void;
    unpinInput: (cardId: string, inputKey: string) => void;

    // Project State
    loadProject: (cards: Card[], title: string, author: string, pinnedOutputs?: PinnedOutput[], memo?: string, pinnedInputs?: PinnedInput[]) => void;
    updateMeta: (patch: Partial<ProjectMeta>) => void;
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
        const resolvedInputs: Record<string, number> = {};

        if (def && def.calculate) {
            // Resolve inputs using config to support defaults

            // Get dynamic config if available
            const dynamicConfig = def.getInputConfig ? def.getInputConfig(card) : {};
            const resolvedConfig = { ...(def.inputConfig || {}), ...dynamicConfig };

            // 1. Process all configured inputs (including defaults)
            Object.entries(resolvedConfig).forEach(([key, config]) => {
                const input = card.inputs[key];
                if (input && input.ref) {
                    const sourceCard = updatedCardsMap.get(input.ref.cardId);
                    const rawVal = (input.ref.refType === 'input' && input.ref.inputKey)
                        ? sourceCard?.resolvedInputs?.[input.ref.inputKey] ?? 0
                        : sourceCard?.outputs[input.ref.outputKey ?? ''] ?? 0;
                    resolvedInputs[key] = applyExpression(rawVal, input.ref.expression) ?? rawVal;
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
                    const rawVal = (input.ref.refType === 'input' && input.ref.inputKey)
                        ? sourceCard?.resolvedInputs?.[input.ref.inputKey] ?? 0
                        : sourceCard?.outputs[input.ref.outputKey ?? ''] ?? 0;
                    resolvedInputs[key] = applyExpression(rawVal, input.ref.expression) ?? rawVal;
                } else {
                    const val = parseFloat(String(input.value));
                    resolvedInputs[key] = isNaN(val) ? 0 : val;
                }
            });

            // 3. Resolve intra-card input references (same-card INPUT refs only)
            const sameCardRefs = Object.entries(card.inputs).filter(([, inp]) =>
                inp.ref?.cardId === card.id && inp.ref?.refType === 'input' && inp.ref?.inputKey
            );
            if (sameCardRefs.length > 0) {
                const intraOrder: string[] = [];
                const intraVisited = new Set<string>();
                const intraTempVisited = new Set<string>();
                let hasCycle = false;

                const intraVisit = (key: string) => {
                    if (intraTempVisited.has(key)) { hasCycle = true; return; }
                    if (intraVisited.has(key)) return;
                    intraTempVisited.add(key);
                    const inp = card.inputs[key];
                    if (inp?.ref?.cardId === card.id && inp?.ref?.refType === 'input' && inp?.ref?.inputKey) {
                        intraVisit(inp.ref.inputKey);
                    }
                    intraTempVisited.delete(key);
                    intraVisited.add(key);
                    intraOrder.push(key); // post-order: dependencies before dependents
                };

                for (const [key] of sameCardRefs) {
                    if (!intraVisited.has(key)) intraVisit(key);
                }

                if (hasCycle) {
                    error = 'カード内の入力間に循環参照があります';
                } else {
                    for (const key of intraOrder) {
                        const inp = card.inputs[key];
                        if (inp?.ref?.cardId === card.id && inp?.ref?.refType === 'input' && inp?.ref?.inputKey) {
                            const srcVal = resolvedInputs[inp.ref.inputKey] ?? 0;
                            resolvedInputs[key] = applyExpression(srcVal, inp.ref.expression) ?? srcVal;
                        }
                    }
                }
            }

            // Build dynamicGroups arg: pre-computed entries for each dynamic group
            const allGroups = def.dynamicInputGroups ?? [];
            const dynamicGroupsArg: Record<string, Array<{ inputKey: string; outputKey: string; value: number }>> = {};
            for (const group of allGroups) {
                const pattern = new RegExp(`^${group.keyPrefix}_\\d+$`);
                dynamicGroupsArg[group.keyPrefix] = Object.keys(card.inputs)
                    .filter(k => pattern.test(k))
                    .sort((a, b) => parseInt(a.split('_').pop()!) - parseInt(b.split('_').pop()!))
                    .map(inputKey => ({
                        inputKey,
                        outputKey: group.outputKeyFn(inputKey),
                        value: resolvedInputs[inputKey] ?? 0,
                    }));
            }

            // Pass resolved inputs, raw inputs (for CustomCard), and dynamicGroups
            // Skip calculate when a pre-calculation error (e.g. intra-card cycle) was detected
            if (!error) {
                try {
                    outputs = def.calculate(resolvedInputs, card.inputs, dynamicGroupsArg);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    if (import.meta.env.DEV) console.warn(`[Tsumiki] Card "${card.alias}" (${card.type}) calculation failed:`, message);
                    error = message;
                }
            }
        }

        updatedCardsMap.set(id, { ...card, outputs, error, resolvedInputs });
    });

    return cards.map(c => updatedCardsMap.get(c.id)!);
};

export const useTsumikiStore = create<TsumikiState>((set) => ({
    cards: [],
    meta: { title: 'New Project', author: 'User', memo: '' },
    pinnedOutputs: [],
    pinnedInputs: [],

    loadProject: (cards, title, author, pinnedOutputs = [], memo?, pinnedInputs = []) => set((state) => ({
        cards: recalculateAll(cards),
        pinnedOutputs,
        pinnedInputs,
        meta: {
            title: title || state.meta.title,
            author: author || state.meta.author,
            memo: memo ?? '',
        }
    })),

    updateMeta: (patch) => set((state) => ({ meta: { ...state.meta, ...patch } })),

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
        pinnedOutputs: state.pinnedOutputs.filter(p => p.cardId !== id),
        pinnedInputs: state.pinnedInputs.filter(p => p.cardId !== id),
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

    pinOutput: (cardId, outputKey) => set((state) => {
        if (state.pinnedOutputs.some(p => p.cardId === cardId && p.outputKey === outputKey)) return {};
        return { pinnedOutputs: [...state.pinnedOutputs, { cardId, outputKey }] };
    }),

    unpinOutput: (cardId, outputKey) => set((state) => ({
        pinnedOutputs: state.pinnedOutputs.filter(p => !(p.cardId === cardId && p.outputKey === outputKey))
    })),

    pinInput: (cardId, inputKey) => set((state) => {
        if (state.pinnedInputs.some(p => p.cardId === cardId && p.inputKey === inputKey)) return {};
        return { pinnedInputs: [...state.pinnedInputs, { cardId, inputKey }] };
    }),

    unpinInput: (cardId, inputKey) => set((state) => ({
        pinnedInputs: state.pinnedInputs.filter(p => !(p.cardId === cardId && p.inputKey === inputKey))
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

    setInputInputRef: (cardId, inputKey, targetCardId, targetInputKey) => set((state) => {
        const newCards = state.cards.map((c) => {
            if (c.id !== cardId) return c;
            return {
                ...c,
                inputs: {
                    ...c.inputs,
                    [inputKey]: {
                        value: '',
                        ref: { cardId: targetCardId, refType: 'input' as const, inputKey: targetInputKey },
                    },
                },
            };
        });
        return { cards: recalculateAll(newCards) };
    }),

    setRefExpression: (cardId, inputKey, expression) => set((state) => {
        const newCards = state.cards.map((c) => {
            if (c.id !== cardId) return c;
            const currentInput = c.inputs[inputKey];
            if (!currentInput?.ref) return c;
            return {
                ...c,
                inputs: {
                    ...c.inputs,
                    [inputKey]: {
                        ...currentInput,
                        ref: { ...currentInput.ref, expression: expression || undefined },
                    },
                },
            };
        });
        return { cards: recalculateAll(newCards) };
    }),

    removeInput: (cardId, inputKey) => set((state) => {
        const card = state.cards.find(c => c.id === cardId);
        const def = card ? registry.get(card.type) : undefined;

        // Find the output key from any matching dynamic group
        const allGroups = def?.dynamicInputGroups ?? [];
        let outputKey: string | undefined;
        for (const group of allGroups) {
            const pattern = new RegExp(`^${group.keyPrefix}_\\d+$`);
            if (pattern.test(inputKey)) {
                outputKey = group.outputKeyFn(inputKey);
                break;
            }
        }

        const newCards = state.cards.map((c) => {
            if (c.id !== cardId) return c;
            const newInputs = { ...c.inputs };
            delete newInputs[inputKey];
            return { ...c, inputs: newInputs };
        });

        const newPinnedOutputs = outputKey
            ? state.pinnedOutputs.filter(p => !(p.cardId === cardId && p.outputKey === outputKey))
            : state.pinnedOutputs;

        return { cards: recalculateAll(newCards), pinnedOutputs: newPinnedOutputs };
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
