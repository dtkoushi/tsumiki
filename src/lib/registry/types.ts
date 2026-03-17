import React from 'react';
import type { Card } from '../../types';

/**
 * Unit types that SmartInput can convert between mm-mode and m-mode.
 * All OutputUnitType values are supported except 'ratio' (always dimensionless).
 */
export type SmartInputUnitType = 'length' | 'area' | 'inertia' | 'force' | 'moment' | 'load' | 'stress' | 'modulus' | 'none';

// Actions passed to components (Decoupled from Store)
export interface CardActions {
    updateInput: (cardId: string, key: string, value: any) => void;
    setReference: (cardId: string, inputKey: string, sourceCardId: string, outputKey: string) => void;
    setInputReference: (cardId: string, inputKey: string, sourceCardId: string, sourceInputKey: string) => void;
    setRefExpression: (cardId: string, inputKey: string, expression: string) => void;
    removeReference: (cardId: string, inputKey: string) => void;
    removeInput: (cardId: string, inputKey: string) => void;
    updateCardUnit: (cardId: string, mode: 'mm' | 'm') => void;
}

export interface CardComponentProps {
    card: Card;
    actions: CardActions;
    upstreamCards: Card[]; // For reference picker
    upstreamInputConfigs?: Map<string, Record<string, { label: string; unitType?: import('../../lib/utils/unitFormatter').OutputUnitType }>>;
}

// TOutputs is the interface for the card's calculation results.
// Defaults to Record<string, number> for backward compatibility.
export interface CardStrategy<TOutputs extends Record<string, any> = Record<string, number>> {
    id: string; // The value stored in the selector (e.g., 'rect', 'h_beam')
    label: string;

    // Inputs specific to this strategy
    inputConfig: Record<string, {
        label: string;
        unitType?: SmartInputUnitType;
        default?: any;
        symbol?: string;
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
    /** Add-row button label (default: '追加') */
    addLabel?: string;
    /** Short per-row label (e.g. '距離'). Renders as "{rowLabel} ({keyPrefix}_{idx}) [{unit}]" */
    rowLabel?: string;
    /**
     * Derives a display index string from an output key (e.g. 'n_3' → '3').
     * Used by PinnedPanel to build chip labels for dynamic outputs.
     * Returns null if the key does not match a dynamic output.
     */
    outputIndexFn?: (outputKey: string) => string | null;
    /** 出力行を表示するか動的に判定。省略時は常に表示。false で y_i 行を非表示にする。 */
    showOutputFn?: (card: import('../../types').Card) => boolean;
    /** Math symbol for the input field per row index (e.g. (i) => `d_${i}`). Used in UI and report. */
    inputSymbolFn?:  (idx: string) => string;
    /** Math symbol for the output field per row index (e.g. (i) => `N_${i}`). Used in UI and report. */
    outputSymbolFn?: (idx: string) => string;
}

/**
 * Declares a single field within a DynamicMultiGroupConfig row.
 */
export interface DynamicMultiGroupFieldConfig {
    /** Key prefix: 'type' → 'type_1', 'type_2', ... */
    keyPrefix: string;
    /** Field label */
    label: string;
    /** Unit type for numeric fields (ignored when options is set) */
    unitType?: SmartInputUnitType;
    /** Default value for new rows */
    defaultValue?: number | string;
    /** If set, renders a <select> instead of SmartInput */
    options?: Array<{ value: string; label: string }>;
    /**
     * Conditionally hide this field.
     * rowRaw = raw values (card.inputs[key].value) for all fields in this row.
     * Return true to hide the field.
     */
    hidden?: (rowRaw: Record<string, string>) => boolean;
    /** Column width hint (default: 'sm') */
    width?: 'xs' | 'sm' | 'md';
    /** 動的な単位型（rowRaw から算出）。静的 unitType より優先 */
    getUnitType?: (rowRaw: Record<string, string>) => SmartInputUnitType;
    /** 動的なラベル（rowRaw から算出）。静的 label より優先 */
    getLabel?: (rowRaw: Record<string, string>) => string;
    /** Math symbol for the field. Static string or function of row index. Used in UI and report. */
    symbol?: string | ((idx: string) => string);
}

/**
 * Declares a variable-length group of multi-field rows rendered by GenericCard.
 * Supports mixing select fields and SmartInput (numeric/reference) fields per row.
 */
export interface DynamicMultiGroupConfig {
    /** Group label shown in the header */
    groupLabel: string;
    /** Add-row button label (default: '追加') */
    addLabel?: string;
    /** Minimum row count (default: 1) */
    minCount?: number;
    /** Row label prefix (e.g. '荷重' → '荷重 1', '荷重 2', ...) */
    rowLabel?: string;
    /** Field definitions rendered in order, side-by-side, within each row */
    fields: DynamicMultiGroupFieldConfig[];
}

/**
 * Output field configuration.
 * Visible outputs (hidden !== true) require a math symbol.
 * Hidden outputs (hidden: true) carry the symbol as optional metadata.
 */
type VisibleOutputField = {
    label: string;
    unitType: import('../../lib/utils/unitFormatter').OutputUnitType;
    hidden?: false;
    symbol: string;
    formula?: string;
    formulaInputKeys?: string[];
};

type HiddenOutputField = {
    label: string;
    unitType: import('../../lib/utils/unitFormatter').OutputUnitType;
    hidden: true;
    symbol?: string;
    formula?: string;
    formulaInputKeys?: string[];
};

export type OutputFieldConfig = VisibleOutputField | HiddenOutputField;

export interface CardDefinition<TOutputs extends Record<string, any> = Record<string, number>> {
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
        unitType?: SmartInputUnitType;
        default?: any;
        type?: 'number' | 'text' | 'select';
        options?: { label: string; value: string | number }[];
        symbol?: string;
    }>;

    // Dynamic input config based on card state (Strategy Pattern)
    getInputConfig?: (card: import('../../types').Card) => Record<string, {
        label: string;
        unitType?: SmartInputUnitType;
        default?: any;
        type?: 'number' | 'text' | 'select';
        options?: { label: string; value: string | number }[];
        symbol?: string;
    }>;

    // Output Config: Enforce keys match TOutputs
    // hidden: true means the output is available for references but not shown in the Results panel
    // formula: symbolic expression string shown in the calculation report (e.g. 'B × H', 'π/4 × D²')
    // symbol: math symbol for the field (e.g. 'Z_x', 'σ_b'); required for visible outputs, optional for hidden
    // formulaInputKeys: input keys whose display values are substituted into formula for value-substituted form
    outputConfig: Record<keyof TOutputs, OutputFieldConfig>;

    /**
     * Dynamic output config based on card state (e.g. solid vs hollow).
     * When present, overrides outputConfig for report generation.
     * Returns a partial or full override of outputConfig fields.
     */
    getOutputConfig?: (card: import('../../types').Card) => Record<string, OutputFieldConfig>;

    // Optional: Determine if an input should be rendered based on card state
    shouldRenderInput?: (card: import('../../types').Card, key: string) => boolean;

    // Pure calculation logic
    // Returns a Record of numbers (outputs) based on inputs.
    // dynamicGroups: pre-computed rows for each dynamic group (keyed by keyPrefix),
    //   so calculate() doesn't need to filter inputs manually.
    calculate: (
        inputs: Record<string, number>,
        rawInputs?: Record<string, any>,
        dynamicGroups?: Record<string, Array<{ inputKey: string; outputKey: string; value: number }>>
    ) => TOutputs;

    /** Variable-length paired (input → output) row groups rendered by GenericCard. */
    dynamicInputGroups?: DynamicInputGroupConfig[];

    /** Variable-length multi-field row groups (select + SmartInput mix) rendered by GenericCard. */
    dynamicRowGroups?: DynamicMultiGroupConfig[];

    // React Component for UI (Legacy override or GenericCard default)
    component?: React.FC<CardComponentProps>;

    // Optional visualization component (renders in the visual area of GenericCard)
    visualization?: React.FC<CardComponentProps>;

    /**
     * Sidebar registration. When present, this card appears in the sidebar under
     * the specified category. Cards without this field are hidden from the sidebar.
     */
    sidebar?: {
        category: 'material' | 'section' | 'beam' | 'cross_section' | 'balance' | 'verify' | 'utility';
        /** Display order within the category (lower = earlier). Defaults to registration order. */
        order?: number;
    };
}
