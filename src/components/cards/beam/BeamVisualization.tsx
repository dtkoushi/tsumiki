
import React from 'react';
import type { CardComponentProps } from '../../../lib/registry/types';
import { AutoFitSvg } from '../common/AutoFitSvg';
import { BeamStrategies } from './drawingStrategies';

interface BeamVisualizationProps extends CardComponentProps { }

export const BeamVisualization: React.FC<BeamVisualizationProps> = ({ card }) => {
    // 1. Extract Inputs
    const loadType = card.inputs['loadType']?.value || 'uniform';
    const L = Number(card.inputs['L']?.value) || 4000;
    // P and w are just for label/display, geometry depends mostly on L/x_loc

    // Inputs to simple Record<string, number>
    const inputs: Record<string, number> = {};
    for (const [key, input] of Object.entries(card.inputs)) {
        inputs[key] = Number(input.value) || 0;
    }

    // Select Strategy
    const strategy = BeamStrategies.find(s => s.id === loadType) || BeamStrategies[0];

    // 2. Define Geometry (World Coords)
    // Beam from (0,0) to (L,0)

    // Bounds: Need to include space for loads (above) and supports (below)
    // Let's assume a "standard" height for diagram relative to span? 
    // Or just fixed padding. Since AutoFit scales, we need to define bounds in world units.
    // Let's say "Diagram Height" is roughly L/5 or similar? 
    // Actually, bounds should just enclose the visual elements.
    // Beam: (0,0) to (L,0)
    // Supports: Height ~ L/20?
    // Loads: Height ~ L/10?
    // Let's define a "Visual Unit" based on L to keep proportions nice?
    const VU = L / 20;

    // Dynamic bounds?
    // For Point load vs Uniform load, bounds might change slightly?
    // Let's keep a generous consistent bound for now or adjust based on strategy if needed.
    // Since strategies only draw loads, we can rely on standard bounds for the beam.
    const bounds = {
        minX: -VU * 2,
        maxX: L + VU * 2,
        minY: -VU * 5, // Space for loads above
        maxY: VU * 4   // Space for supports below
    };

    // 3. Render
    return (
        <AutoFitSvg
            bounds={bounds}
            padding={20}
            height={200}
            className="text-slate-700 dark:text-slate-300"
        >
            {(scale) => {
                // Fixed size for markers (px) converted to World Units
                const markerSizePx = 15;
                const ms = markerSizePx / scale; // Marker Size in World Units

                // Common Elements (Beam, Supports)
                const commonElements = (
                    <>
                        {/* Beam Line */}
                        <line
                            x1={0} y1={0} x2={L} y2={0}
                            stroke="currentColor"
                            strokeWidth={3 / scale}
                        />

                        {/* Supports */}
                        {/* Pin at 0 (Triangle) */}
                        <path
                            d={`M ${-ms / 2} ${ms} L ${ms / 2} ${ms} L 0 0 Z`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5 / scale}
                        />
                        {/* Roller at L (Circle) */}
                        <circle
                            cx={L} cy={ms / 2} r={ms / 2}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5 / scale}
                        />
                        {/* Ground lines under supports? Optional */}
                    </>
                );

                // Strategy Elements (Loads)
                const loadElements = strategy.drawLoads(inputs, scale, L);

                return (
                    <>
                        {commonElements}
                        {loadElements}
                    </>
                );
            }}
        </AutoFitSvg>
    );
};
