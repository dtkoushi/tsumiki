
import React, { createContext, useContext } from 'react';
import type { Card } from '../../../types';
import type { CardActions } from '../../../lib/registry/types';
import type { OutputUnitType, UnitMode } from '../../../lib/utils/unitFormatter';

interface CardContextValue {
    cardId: string;
    card: Card;
    actions: CardActions;
    upstreamCards: Card[];
    upstreamInputConfigs?: Map<string, Record<string, { label: string; unitType?: OutputUnitType }>>;
    unitMode: UnitMode;
}

const CardCtx = createContext<CardContextValue | null>(null);

export const CardProvider = CardCtx.Provider;

export function useCardContext(): CardContextValue {
    const ctx = useContext(CardCtx);
    if (!ctx) throw new Error('useCardContext must be used within a <CardProvider>');
    return ctx;
}
