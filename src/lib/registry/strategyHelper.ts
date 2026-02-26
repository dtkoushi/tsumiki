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

    strategyAxes: StrategyAxis[];

    strategies: CardStrategy<TOutputs>[];
    commonInputs?: Record<string, any>;
    /**
     * Input fields shared across all strategies. Merged with each strategy's own
     * inputConfig in getInputConfig (strategy-specific fields take precedence).
     */
    commonInputConfig?: CardDefinition<TOutputs>['inputConfig'];
    outputConfig: CardDefinition<TOutputs>['outputConfig'];
    visualization?: React.FC<any>;
    sidebar?: CardDefinition<TOutputs>['sidebar'];
}

export function createStrategyDefinition<TOutputs extends Record<string, any> = Record<string, number>>(options: StrategyDefinitionOptions<TOutputs>): CardDefinition<TOutputs> {
    const {
        type,
        title,
        icon,
        description,
        strategyAxes,
        strategies,
        commonInputs = {},
        commonInputConfig,
        outputConfig,
        visualization
    } = options;

    const axes: StrategyAxis[] = strategyAxes;

    if (axes.length === 0) {
        throw new Error(`Card ${type} must provide at least one strategyAxis.`);
    }

    // 1. Prepare Default Inputs
    const defaultStrategy = strategies[0];
    if (!defaultStrategy) {
        throw new Error(`Card ${type} must have at least one strategy.`);
    }

    // DEV: validate that each strategy ID matches the expected composed axis values
    if (process.env.NODE_ENV === 'development') {
        strategies.forEach(s => {
            const expectedId = axes.map(axis => {
                // Find the axis value that matches this strategy's id portion
                return axis.options.find(o => s.id.startsWith(o.value) || s.id.endsWith(o.value))?.value ?? '';
            }).join('_');
            if (axes.length > 1 && s.id !== expectedId) {
                // Only warn for multi-axis; single axis IDs don't need to match a composition
            }
            // Warn if any axis value (except the last axis) contains '_'
            axes.slice(0, -1).forEach((axis, i) => {
                axis.options.forEach(o => {
                    if (o.value.includes('_')) {
                        console.warn(
                            `Card ${type}: axis '${axis.key}' option value '${o.value}' contains '_'. ` +
                            `Only the last axis may have values containing '_' to avoid ambiguous ID composition.`
                        );
                    }
                });
            });
        });
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

        // Single axis: ID is the axis value directly
        if (axes.length === 1) {
            const val = inputs[axes[0].key]?.value;
            return String(val || axes[0].default);
        }

        // Multi-axis: compose by joining axis values with '_'
        // NOTE: axis values must not contain '_' except for the last axis
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

        // Dynamic Input Config: Merge commonInputConfig with strategy-specific config
        // Strategy-specific fields take precedence over commonInputConfig fields
        getInputConfig: (card) => {
            const currentId = resolveStrategyId(card.inputs);
            const strategy = strategies.find(s => s.id === currentId) || defaultStrategy;
            return { ...commonInputConfig, ...strategy.inputConfig };
        },

        // Calculation: Delegate to the selected strategy
        calculate: (inputs, rawInputs) => {
            const currentId = resolveStrategyId(rawInputs);
            const strategy = strategies.find(s => s.id === currentId) || defaultStrategy;
            return strategy.calculate(inputs);
        },

        outputConfig,
        visualization,
        sidebar: options.sidebar
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
    /** Variable-length paired (input → output) rows rendered by GenericCard. */
    dynamicInputGroup?: CardDefinition<TOutputs>['dynamicInputGroup'];
    sidebar?: CardDefinition<TOutputs>['sidebar'];
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
        component,
        dynamicInputGroup,
        sidebar
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
        component,
        dynamicInputGroup,
        sidebar
    };
}
