import type { CardDefinition, CardStrategy } from './types';


// ─── DEV-mode validation ─────────────────────────────────────────────────────

function validateCardDefinition(def: CardDefinition, context: string): void {
    if (!import.meta.env.DEV) return;

    const warn = (msg: string) => console.warn(`[CardDef:${def.type}] ${msg} (${context})`);

    // outputConfig must not be empty (except custom-component cards that manage outputs themselves)
    if (def.outputConfig && Object.keys(def.outputConfig).length === 0 && !def.component) {
        warn('outputConfig is empty — card will have no visible outputs');
    }

    // defaultInputs keys should exist in inputConfig (or getInputConfig)
    if (def.defaultInputs && def.inputConfig) {
        const configKeys = new Set(Object.keys(def.inputConfig));
        for (const key of Object.keys(def.defaultInputs)) {
            // Skip dynamic group keys (e.g. d_1, d_2) and strategy axis keys
            if (/^.+_\d+$/.test(key)) continue;
            if (def.inputConfig[key]?.type === 'select') continue;
            if (!configKeys.has(key) && !def.getInputConfig) {
                warn(`defaultInputs key "${key}" not found in inputConfig — possible typo`);
            }
        }
    }

    // inputConfig keys should have defaultInputs (warning only for non-select fields)
    if (def.inputConfig && def.defaultInputs) {
        const defaultKeys = new Set(Object.keys(def.defaultInputs));
        for (const [key, config] of Object.entries(def.inputConfig)) {
            if (config.type === 'select') continue;
            if (!defaultKeys.has(key)) {
                warn(`inputConfig key "${key}" has no defaultInputs entry — new cards will have no initial value`);
            }
        }
    }

    // calculate() dry-run: check that returned keys match outputConfig
    if (def.calculate && def.outputConfig && Object.keys(def.outputConfig).length > 0 && !def.component) {
        try {
            // Build dummy inputs from defaultInputs
            const dummyInputs: Record<string, number> = {};
            if (def.defaultInputs) {
                for (const [k, v] of Object.entries(def.defaultInputs)) {
                    dummyInputs[k] = typeof v === 'object' && v !== null ? (parseFloat(v.value) || 0) : (parseFloat(v) || 0);
                }
            }
            const result = def.calculate(dummyInputs, def.defaultInputs);
            const outputKeys = new Set(Object.keys(def.outputConfig));
            const resultKeys = Object.keys(result);
            for (const rk of resultKeys) {
                // Skip dynamic output keys (e.g. n_1, n_2)
                if (/^.+_\d+$/.test(rk)) continue;
                if (!outputKeys.has(rk)) {
                    warn(`calculate() returned key "${rk}" not in outputConfig — it will be ignored`);
                }
            }
            for (const ok of outputKeys) {
                if (!resultKeys.includes(ok)) {
                    warn(`outputConfig key "${ok}" not returned by calculate() — will show as undefined`);
                }
            }
        } catch {
            // Dry-run failed — skip (valid inputs may be required)
        }
    }

    // dynamicInputGroups: check outputIndexFn presence
    if (def.dynamicInputGroups) {
        for (const group of def.dynamicInputGroups) {
            if (!group.outputIndexFn) {
                warn(`dynamicInputGroups["${group.keyPrefix}"] has no outputIndexFn — pin-to-panel will be silently disabled`);
            }
        }
    }
}


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

        // Multi-axis: compose by joining axis values with '::'
        const parts = axes.map(axis => String(inputs[axis.key]?.value || axis.default));
        return parts.join('::');
    };

    // DEV: validate strategy IDs are reachable
    if (import.meta.env.DEV) {
        const reachableIds = new Set<string>();
        const generateIds = (axisIdx: number, prefix: string) => {
            if (axisIdx >= axes.length) {
                reachableIds.add(prefix);
                return;
            }
            for (const opt of axes[axisIdx].options) {
                const next = prefix ? `${prefix}::${opt.value}` : opt.value;
                generateIds(axisIdx + 1, next);
            }
        };
        generateIds(0, '');
        for (const s of strategies) {
            if (!reachableIds.has(s.id)) {
                console.warn(`[CardDef:${type}] Strategy ID "${s.id}" is not reachable from axis combinations — possible typo (createStrategyDefinition)`);
            }
        }
    }

    const def: CardDefinition<TOutputs> = {
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

    validateCardDefinition(def, 'createStrategyDefinition');
    return def;
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
    /** Variable-length paired (input → output) row groups rendered by GenericCard. */
    dynamicInputGroups?: CardDefinition<TOutputs>['dynamicInputGroups'];
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
        dynamicInputGroups,
        sidebar
    } = options;

    const def: CardDefinition<TOutputs> = {
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
        dynamicInputGroups,
        sidebar
    };

    validateCardDefinition(def, 'createCardDefinition');
    return def;
}
