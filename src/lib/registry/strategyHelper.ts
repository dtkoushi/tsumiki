import type { CardDefinition, CardStrategy } from './types';


interface StrategyAxis {
    key: string;
    label: string;
    options: { label: string; value: string }[];
    default: string;
}

interface StrategyDefinitionOptions<TOutputs extends Record<string, any> = Record<string, number>> {
    type: string;
    title: string;
    icon: React.FC<any>;
    description?: string;

    // Legacy single key mode
    strategyKey?: string;
    // New multi-axis mode
    strategyAxes?: StrategyAxis[];

    strategies: CardStrategy<TOutputs>[];
    commonInputs?: Record<string, any>;
    outputConfig: CardDefinition<TOutputs>['outputConfig'];
    visualization?: React.FC<any>;
}

export function createStrategyDefinition<TOutputs extends Record<string, any> = Record<string, number>>(options: StrategyDefinitionOptions<TOutputs>): CardDefinition<TOutputs> {
    const {
        type,
        title,
        icon,
        description,
        strategyKey,
        strategyAxes,
        strategies,
        commonInputs = {},
        outputConfig,
        visualization
    } = options;

    // Validate Options
    if (!strategyKey && !strategyAxes) {
        throw new Error(`Card ${type} must provide either strategyKey or strategyAxes.`);
    }

    // Prepare Axes
    let axes: StrategyAxis[] = [];
    if (strategyAxes) {
        axes = strategyAxes;
    } else if (strategyKey) {
        // Legacy mode: Convert to single axis
        // We need to infer options from strategies if not provided
        // In legacy mode, strategyKey was just a string, options were inferred from strategies.
        axes = [{
            key: strategyKey,
            label: strategyKey.charAt(0).toUpperCase() + strategyKey.slice(1),
            options: strategies.map(s => ({ label: s.label, value: s.id })),
            default: strategies[0]?.id
        }];
    }

    // 1. Prepare Default Inputs
    const defaultStrategy = strategies[0];
    if (!defaultStrategy) {
        throw new Error(`Card ${type} must have at least one strategy.`);
    }

    // Construct default inputs for all axes
    const axisDefaults: Record<string, any> = {};
    axes.forEach(axis => {
        axisDefaults[axis.key] = { value: axis.default };
    });

    const defaultInputs: Record<string, any> = {
        ...axisDefaults,
        ...commonInputs
    };

    // Helper to resolve Strategy ID from inputs
    const resolveStrategyId = (inputs: Record<string, any> | undefined): string => {
        if (!inputs) return defaultStrategy.id;

        // If single axis (legacy or simple), and the ID matches directly (no composition needed if value matches strategy ID)
        if (axes.length === 1) {
            const val = inputs[axes[0].key]?.value;
            return String(val || axes[0].default);
        }

        // Composite Mode: Join values with '_'
        // e.g. boundary="simple", load="uniform" -> "simple_uniform"
        const parts = axes.map(axis => String(inputs[axis.key]?.value || axis.default));
        return parts.join('_');
    };

    return {
        type,
        title,
        icon,
        description,
        defaultInputs,

        // Static Input Config: Generate selectors for all axes
        inputConfig: axes.reduce((acc, axis) => {
            acc[axis.key] = {
                label: axis.label,
                type: 'select',
                options: axis.options,
                default: axis.default
            };
            return acc;
        }, {} as Record<string, any>),

        // Dynamic Input Config: Delegate to the selected strategy
        getInputConfig: (card) => {
            const currentId = resolveStrategyId(card.inputs);
            const strategy = strategies.find(s => s.id === currentId) || defaultStrategy;
            return strategy.inputConfig;
        },

        // Calculation: Delegate to the selected strategy
        calculate: (inputs, rawInputs) => {
            const currentId = resolveStrategyId(rawInputs);
            const strategy = strategies.find(s => s.id === currentId) || defaultStrategy;
            return strategy.calculate(inputs);
        },

        outputConfig,
        visualization
    };
}


interface SimpleCardDefinitionOptions<TOutputs extends Record<string, any> = Record<string, number>> {
    type: string;
    title: string;
    icon: React.FC<any>;
    description?: string;
    defaultInputs?: Record<string, any>;
    inputConfig?: CardDefinition<TOutputs>['inputConfig'];
    outputConfig: CardDefinition<TOutputs>['outputConfig'];
    calculate: CardDefinition<TOutputs>['calculate'];
    /** Render inside GenericCard's visualization area (SVG box). */
    visualization?: React.FC<any>;
    /** Replace GenericCard entirely. Use when inputs/outputs are dynamic or layout needs full control. */
    component?: CardDefinition<TOutputs>['component'];
}

export function createCardDefinition<TOutputs extends Record<string, any> = Record<string, number>>(options: SimpleCardDefinitionOptions<TOutputs>): CardDefinition<TOutputs> {
    const {
        type,
        title,
        icon,
        description,
        defaultInputs = {},
        inputConfig = {},
        outputConfig,
        calculate,
        visualization,
        component
    } = options;

    return {
        type,
        title,
        icon,
        description,
        defaultInputs,
        inputConfig,
        outputConfig,
        calculate,
        visualization,
        component
    };
}
