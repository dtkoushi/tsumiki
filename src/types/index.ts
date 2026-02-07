export type CardType = 'SECTION' | 'MATERIAL' | 'BEAM' | 'VERIFY' | 'CUSTOM';

export interface CardInput {
    value: string | number;
    ref?: {
        cardId: string;
        outputKey: string;
    };
}

export interface Card {
    id: string;
    type: CardType;
    alias: string;
    inputs: Record<string, CardInput>;
    outputs: Record<string, number>;
    unitMode?: 'mm' | 'm'; // Default 'mm'. Controls display units (mm/N vs m/kN)
}
