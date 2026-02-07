
import React from 'react';
import type { CardComponentProps } from '../../../lib/registry/types';
import { DrawingStrategies } from './drawingStrategies';
import { AutoFitSvg } from '../common/AutoFitSvg';

interface SectionVisualizationProps extends CardComponentProps { }

export const SectionVisualization: React.FC<SectionVisualizationProps> = ({ card }) => {
    const shapeId = String(card.inputs['shape']?.value || 'rect');
    const strategy = DrawingStrategies.find(s => s.id === shapeId) || DrawingStrategies[0];

    // Inputs to simple Record<string, number>
    const inputs: Record<string, number> = {};
    for (const [key, input] of Object.entries(card.inputs)) {
        inputs[key] = Number(input.value) || 0;
    }

    // Get Geometry from Strategy
    const bounds = strategy.getBounds(inputs);
    const path = strategy.getPath(inputs);
    const dimensions = strategy.getDimensions(inputs);

    return (
        <AutoFitSvg
            bounds={bounds}
            path={path}
            dimensions={dimensions}
            height={240}
        />
    );
};

