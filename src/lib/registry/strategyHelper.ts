import type { CardDefinition, CardStrategy } from './types';

interface StrategyDefinitionOptions<TOutputs extends Record<string, any> = Record<string, number>> {
    type: string;
    title: string;
    icon: React.FC<any>;
    description?: string;
    strategyKey: string; // The input key used to select the strategy (e.g. 'grade', 'shape')
    strategies: CardStrategy<TOutputs>[];
    commonInputs?: Record<string, any>; // Default values for inputs common to all strategies or the card itself
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
        strategies,
        commonInputs = {},
        outputConfig,
        visualization
    } = options;

    // 1. Prepare Default Inputs
    // We need a default strategy. Let's pick the first one.
    const defaultStrategy = strategies[0];
    if (!defaultStrategy) {
        throw new Error(`Card ${type} must have at least one strategy.`);
    }

    const defaultInputs: Record<string, any> = {
        [strategyKey]: { value: defaultStrategy.id },
        ...commonInputs
    };

    // 2. Create the Definition
    return {
        type,
        title,
        icon,
        description,
        defaultInputs,

        // Static Input Config: Just the selector
        inputConfig: {
            [strategyKey]: {
                label: strategyKey.charAt(0).toUpperCase() + strategyKey.slice(1), // Capitalize label roughly
                type: 'select',
                options: strategies.map(s => ({ label: s.label, value: s.id })),
                default: defaultStrategy.id,
            }
        },

        // Dynamic Input Config: Delegate to the selected strategy
        getInputConfig: (card) => {
            const currentId = String(card.inputs[strategyKey]?.value || defaultStrategy.id);
            const strategy = strategies.find(s => s.id === currentId) || defaultStrategy;
            return strategy.inputConfig;
        },

        // Calculation: Delegate to the selected strategy
        calculate: (inputs, rawInputs) => {
            const currentId = String(rawInputs?.[strategyKey]?.value || defaultStrategy.id);
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
    visualization?: React.FC<any>;
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
        visualization
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
        visualization
    };
}
