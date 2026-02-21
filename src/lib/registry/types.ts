import React from 'react';
import type { Card } from '../../types';

// Actions passed to components (Decoupled from Store)
export interface CardActions {
    updateInput: (cardId: string, key: string, value: any) => void;
    setReference: (cardId: string, inputKey: string, sourceCardId: string, outputKey: string) => void;
    removeReference: (cardId: string, inputKey: string) => void;
    removeInput: (cardId: string, inputKey: string) => void;
    updateCardUnit: (cardId: string, mode: 'mm' | 'm') => void;
}

export interface CardComponentProps {
    card: Card;
    actions: CardActions;
    upstreamCards: Card[]; // For reference picker
}

// TOutputs is the interface for the card's calculation results.
// Defaults to Record<string, number> for backward compatibility.
export interface CardStrategy<TOutputs extends Record<string, number> = Record<string, number>> {
    id: string; // The value stored in the selector (e.g., 'rect', 'h_beam')
    label: string;

    // Inputs specific to this strategy
    inputConfig: Record<string, {
        label: string;
        unitType?: import('../../lib/utils/unitFormatter').OutputUnitType;
        default?: any;
    }>;

    // Calculation logic for this strategy
    calculate: (inputs: Record<string, number>) => TOutputs;
}

/**
 * Declares a variable-length group of paired (input → output) rows rendered
 * between the standard inputs and the visualization in GenericCard.
 *
 * Input keys follow the pattern `{keyPrefix}_1`, `{keyPrefix}_2`, etc.
 * The corresponding output key is derived by `outputKeyFn`.
 */
export interface DynamicInputGroupConfig {
    /** Prefix for dynamic input keys: 'd' → d_1, d_2, … */
    keyPrefix: string;
    /** Column header label for the input field */
    inputLabel: string;
    inputUnitType: import('../../lib/utils/unitFormatter').OutputUnitType;
    /** Derives the output key from a given input key (e.g. 'd_1' → 'n_1') */
    outputKeyFn: (inputKey: string) => string;
    /** Column header label for the computed output field */
    outputLabel: string;
    outputUnitType: import('../../lib/utils/unitFormatter').OutputUnitType;
    /** SI value assigned to newly added rows (default: 0) */
    defaultValue?: number;
    /** Minimum row count; remove button is disabled at this count (default: 1) */
    minCount?: number;
    /** Add-row button label (default: 'Add') */
    addLabel?: string;
}

export interface CardDefinition<TOutputs extends Record<string, number> = Record<string, number>> {
    type: string;             // Unique ID (e.g., 'SECTION', 'BEAM')
    title: string;            // Display Name
    icon: React.FC<any>;      // Lucide Icon definition (renders as component)
    description?: string;

    // Default values for new cards
    defaultInputs: Record<string, any>;

    // Configuration for UI generation

    // Legacy static input config (will be merged with dynamic if present)
    inputConfig?: Record<string, {
        label: string;
        unitType?: import('../../lib/utils/unitFormatter').OutputUnitType;
        default?: any;
        type?: 'number' | 'text' | 'select';
        options?: { label: string; value: string | number }[];
    }>;

    // Dynamic input config based on card state (Strategy Pattern)
    getInputConfig?: (card: import('../../types').Card) => Record<string, {
        label: string;
        unitType?: import('../../lib/utils/unitFormatter').OutputUnitType;
        default?: any;
        type?: 'number' | 'text' | 'select';
        options?: { label: string; value: string | number }[];
    }>;

    // Output Config: Enforce keys match TOutputs
    // hidden: true means the output is available for references but not shown in the Results panel
    outputConfig: Record<keyof TOutputs, {
        label: string;
        unitType: import('../../lib/utils/unitFormatter').OutputUnitType;
        hidden?: boolean;
    }>;

    // Optional: Determine if an input should be rendered based on card state
    shouldRenderInput?: (card: import('../../types').Card, key: string) => boolean;

    // Pure calculation logic
    // Returns a Record of numbers (outputs) based on inputs
    calculate: (inputs: Record<string, number>, rawInputs?: Record<string, any>) => TOutputs;

    // Variable-length paired (input → output) rows rendered by GenericCard
    dynamicInputGroup?: DynamicInputGroupConfig;

    // React Component for UI (Legacy override or GenericCard default)
    component?: React.FC<CardComponentProps>;

    // Optional visualization component (renders in the visual area of GenericCard)
    visualization?: React.FC<CardComponentProps>;
}
