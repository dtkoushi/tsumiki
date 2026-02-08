
import React from 'react';
import { Columns } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';

// --- Types ---

interface BeamOutputs {
    M_max: number;
    V_max: number;
    Mx: number;
    Qx: number;
}

// --- Visualization Logic ---

// Helper to draw the common beam and supports
const drawBeamAndSupports = (L: number, scale: number) => {
    // Visual Unit for markers
    const markerSizePx = 15;
    const ms = markerSizePx / scale;

    return (
        <g className="text-slate-700 dark:text-slate-300 transition-all duration-300 ease-out">
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
        </g>
    );
};

// Standard Bounds Calculation
const getBeamBounds = (L: number) => {
    const VU = L / 20;
    return {
        minX: -VU * 2,
        maxX: L + VU * 2,
        minY: -VU * 5,
        maxY: VU * 4
    };
};

const BeamUniformVisual: VisualizationStrategy = {
    id: 'uniform',
    getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
    draw: (inputs, scale) => {
        const L = inputs['L'] || 4000;
        const markerSizePx = 15;
        const ms = markerSizePx / scale;

        return (
            <>
                {drawBeamAndSupports(L, scale)}
                <g className="text-blue-500 transition-all duration-300 ease-out">
                    {/* Distributed Load: Rect + Arrows */}
                    <rect
                        x={0} y={-ms * 2}
                        width={L} height={ms * 2}
                        fill="currentColor" fillOpacity={0.1}
                        stroke="none"
                    />
                    <line
                        x1={0} y1={-ms * 2} x2={L} y2={-ms * 2}
                        stroke="currentColor" strokeWidth={1.5 / scale}
                    />
                    {/* Arrows at intervals */}
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                        <path
                            key={t}
                            d={`M ${L * t} ${-ms * 2} L ${L * t} 0`}
                            stroke="currentColor"
                            strokeWidth={1 / scale}
                        />
                    ))}
                    {/* Manual Arrowheads */}
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                        <path
                            key={`head-${t}`}
                            d={`M ${L * t - ms / 4} ${-ms / 2} L ${L * t} 0 L ${L * t + ms / 4} ${-ms / 2}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1 / scale}
                        />
                    ))}
                </g>
            </>
        );
    }
};

const BeamPointVisual: VisualizationStrategy = {
    id: 'point',
    getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
    draw: (inputs, scale) => {
        const L = inputs['L'] || 4000;
        const x_loc = inputs['x_loc'] || 0;
        const markerSizePx = 15;
        const ms = markerSizePx / scale;

        return (
            <>
                {drawBeamAndSupports(L, scale)}
                <g className="text-red-500 transition-all duration-300 ease-out">
                    {/* Point Load at x_loc */}
                    <line
                        x1={x_loc} y1={-ms * 3} x2={x_loc} y2={0}
                        stroke="currentColor"
                        strokeWidth={2 / scale}
                    />
                    {/* Arrowhead */}
                    <path
                        d={`M ${x_loc - ms / 2} ${-ms} L ${x_loc} 0 L ${x_loc + ms / 2} ${-ms}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2 / scale}
                    />
                </g>
            </>
        );
    }
};

const BeamVisualization = createVisualizationComponent({
    strategyKey: 'loadType',
    strategies: [BeamUniformVisual, BeamPointVisual],
    height: 200,
    padding: 20
});

// --- Calculation Strategies ---

const UniformLoadCalc: CardStrategy<BeamOutputs> = {
    id: 'uniform',
    label: 'Distributed Load',
    inputConfig: {
        L: { label: 'Span', unitType: 'length', default: 4000 },
        w: { label: 'Load (w)', unitType: 'load', default: 10 },
        x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
    },
    calculate: (inputs) => {
        const L = inputs['L'] || 0;
        const w = inputs['w'] || 0;
        const x_loc = inputs['x_loc'];

        const M_max = (w * Math.pow(L, 2)) / 8;
        const V_max = (w * L) / 2;
        let Mx = 0;
        let Qx = 0;

        if (x_loc !== undefined && x_loc >= 0 && x_loc <= L) {
            Mx = ((w * L) / 2) * x_loc - (w * Math.pow(x_loc, 2)) / 2;
            Qx = ((w * L) / 2) - (w * x_loc);
        }

        return { M_max, V_max, Mx, Qx };
    }
};

const PointLoadCalc: CardStrategy<BeamOutputs> = {
    id: 'point',
    label: 'Point Load',
    inputConfig: {
        L: { label: 'Span', unitType: 'length', default: 4000 },
        P: { label: 'Load (P)', unitType: 'force', default: 1000 },
        x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
    },
    calculate: (inputs) => {
        const L = inputs['L'] || 0;
        const P = inputs['P'] || 0;
        const x_loc = inputs['x_loc'];

        const M_max = (P * L) / 4;
        const V_max = P / 2;
        let Mx = 0;
        let Qx = 0;

        if (x_loc !== undefined && x_loc >= 0 && x_loc <= L) {
            if (x_loc <= L / 2) {
                Mx = (P / 2) * x_loc;
                Qx = P / 2;
            } else {
                Mx = (P / 2) * (L - x_loc);
                Qx = -P / 2;
            }
        }
        return { M_max, V_max, Mx, Qx };
    }
};

// --- Definition ---

export const BeamCardDef = createStrategyDefinition<BeamOutputs>({
    type: 'BEAM',
    title: 'Simple Beam',
    icon: Columns,
    description: 'Calculate shear and moment for a simple beam.',
    strategyKey: 'loadType',
    strategies: [UniformLoadCalc, PointLoadCalc],
    outputConfig: {
        M_max: { label: 'M_max', unitType: 'moment' },
        V_max: { label: 'V_max', unitType: 'force' },
        Mx: { label: 'Mx', unitType: 'moment' },
        Qx: { label: 'Qx', unitType: 'force' },
    },
    visualization: BeamVisualization,
});
