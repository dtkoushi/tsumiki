
import React from 'react';
import type { CardComponentProps } from '../../../lib/registry/types';
import { AutoFitSvg } from './AutoFitSvg';
import type { DimensionDef } from './AutoFitSvg';
export { AutoFitSvg };

/**
 * Standard interface for visualization strategies.
 * Returns a ReactNode (SVG elements) to render within AutoFitSvg.
 */
export interface VisualizationStrategy<TInputs = Record<string, number>> {
    id: string;

    // Calculate bounds based on inputs (World Coordinates)
    getBounds: (inputs: TInputs) => { minX: number; minY: number; maxX: number; maxY: number };

    // Optional: Return dimension annotations to overlay on the drawing
    getDimensions?: (inputs: TInputs) => DimensionDef[];

    // Render the content
    // inputs: Validated inputs
    // scale: Current scale factor from AutoFitSvg (useful for fixed-size markers)
    // rawInputs: Full inputs if needed (optional)
    draw: (inputs: TInputs, scale: number) => React.ReactNode;
}


interface StrategyAxis {
    key: string;
    default: string;
}

interface CreateVisualizationOptions {
    strategyAxes: StrategyAxis[];
    strategies: VisualizationStrategy<any>[];

    // Optional: Transform raw card inputs to typed inputs
    // Default: Converts all values to numbers
    transformInputs?: (inputs: Record<string, any>) => any;

    // Optional: Default/Initial bounds if strategy undefined (unlikely)
    defaultBounds?: { minX: number; minY: number; maxX: number; maxY: number };

    height?: number | string; // Container height (default 200)
    padding?: number;        // Padding (default 20/40 depending on usage)
    className?: string;       // Additional classes
}

export function createVisualizationComponent(options: CreateVisualizationOptions): React.FC<CardComponentProps> {
    const {
        strategyAxes,
        strategies,
        transformInputs,
        height = 200,
        padding = 40,
        className = "text-slate-700 dark:text-slate-300"
    } = options;

    return ({ card }) => {
        // 1. Extract & Transform Inputs
        const rawInputs = card.inputs;
        let inputs: any;

        if (transformInputs) {
            inputs = transformInputs(rawInputs);
        } else {
            // Default: Record<string, number>
            const numInputs: Record<string, number> = {};
            for (const [key, input] of Object.entries(rawInputs)) {
                numInputs[key] = Number(input.value) || 0;
            }
            inputs = numInputs;
        }

        // 2. Select Strategy
        const parts = strategyAxes.map(axis => String(rawInputs[axis.key]?.value || axis.default));
        const selection = parts.join('::');

        const strategy = strategies.find(s => s.id === selection) || strategies[0];

        // 3. Get Bounds & Dimensions
        const bounds = strategy.getBounds(inputs);
        const dimensions = strategy.getDimensions ? strategy.getDimensions(inputs) : [];

        // 4. Render
        return (
            <AutoFitSvg
                bounds={bounds}
                dimensions={dimensions}
                padding={padding}
                height={height}
                className={className}
            >
                {(scale) => strategy.draw(inputs, scale)}
            </AutoFitSvg>
        );
    };
}
