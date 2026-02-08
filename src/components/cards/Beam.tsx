
import React from 'react';
import { Columns } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { createVisualizationComponent, type VisualizationStrategy, AutoFitSvg } from './common/visualizationHelper';
import { calculateBeamAt, calculateBeamMax, type BeamModel } from '../../lib/mechanics/beam';

// --- Types ---

interface BeamOutputs {
    M_max: number;
    V_max: number;
    Mx: number;
    Qx: number;
}

// --- Visualization Strategies ---

// Helper to draw the common beam and supports
const drawBeamAndSupports = (L: number, scale: number, boundary: 'simple' | 'cantilever') => {
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

            {boundary === 'simple' ? (
                <>
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
                </>
            ) : (
                <>
                    {/* Fixed Support at 0 (Vertical Line + Diagonal Hatch) */}
                    <line
                        x1={0} y1={-ms} x2={0} y2={ms}
                        stroke="currentColor"
                        strokeWidth={3 / scale}
                    />
                    {/* Hatching */}
                    {[-1, -0.5, 0, 0.5, 1].map(i => (
                        <line
                            key={i}
                            x1={0} y1={ms * i} x2={-ms / 2} y2={ms * i + ms / 2}
                            stroke="currentColor"
                            strokeWidth={1 / scale}
                        />
                    ))}
                </>
            )}
        </g>
    );
};

// Standard Bounds Calculation
const getBeamBounds = (L: number) => {
    const VU = L / 20;
    return {
        minX: -VU * 4, // More space for fixed support
        maxX: L + VU * 2,
        minY: -VU * 5,
        maxY: VU * 4
    };
};

// ... Visualization Implementations (Identical to PoC) ...

const BeamVisuals: Record<string, VisualizationStrategy> = {
    'simple_uniform': {
        id: 'simple_uniform',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const ms = 15 / scale;
            return (
                <>
                    {drawBeamAndSupports(L, scale, 'simple')}
                    <g className="text-blue-500 transition-all duration-300 ease-out">
                        <rect x={0} y={-ms * 2} width={L} height={ms * 2} fill="currentColor" fillOpacity={0.1} stroke="none" />
                        <line x1={0} y1={-ms * 2} x2={L} y2={-ms * 2} stroke="currentColor" strokeWidth={1.5 / scale} />
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                            <path key={t} d={`M ${L * t} ${-ms * 2} L ${L * t} 0`} stroke="currentColor" strokeWidth={1 / scale} />
                        ))}
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                            <path key={`h${t}`} d={`M ${L * t - ms / 4} ${-ms / 2} L ${L * t} 0 L ${L * t + ms / 4} ${-ms / 2}`} fill="none" stroke="currentColor" strokeWidth={1 / scale} />
                        ))}
                    </g>
                </>
            );
        }
    },
    'simple_point': {
        id: 'simple_point',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const x_loc = inputs['x_loc'] || 0;
            const ms = 15 / scale;
            return (
                <>
                    {drawBeamAndSupports(L, scale, 'simple')}
                    <g className="text-red-500 transition-all duration-300 ease-out">
                        <line x1={x_loc} y1={-ms * 3} x2={x_loc} y2={0} stroke="currentColor" strokeWidth={2 / scale} />
                        <path d={`M ${x_loc - ms / 2} ${-ms} L ${x_loc} 0 L ${x_loc + ms / 2} ${-ms}`} fill="none" stroke="currentColor" strokeWidth={2 / scale} />
                    </g>
                </>
            );
        }
    },
    'cantilever_uniform': {
        id: 'cantilever_uniform',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const ms = 15 / scale;
            return (
                <>
                    {drawBeamAndSupports(L, scale, 'cantilever')}
                    <g className="text-blue-500 transition-all duration-300 ease-out">
                        <rect x={0} y={-ms * 2} width={L} height={ms * 2} fill="currentColor" fillOpacity={0.1} stroke="none" />
                        <line x1={0} y1={-ms * 2} x2={L} y2={-ms * 2} stroke="currentColor" strokeWidth={1.5 / scale} />
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                            <path key={t} d={`M ${L * t} ${-ms * 2} L ${L * t} 0`} stroke="currentColor" strokeWidth={1 / scale} />
                        ))}
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                            <path key={`h${t}`} d={`M ${L * t - ms / 4} ${-ms / 2} L ${L * t} 0 L ${L * t + ms / 4} ${-ms / 2}`} fill="none" stroke="currentColor" strokeWidth={1 / scale} />
                        ))}
                    </g>
                </>
            );
        }
    },
    'cantilever_point': {
        id: 'cantilever_point',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const ms = 15 / scale;
            // Draw point load at Tip (L)
            return (
                <>
                    {drawBeamAndSupports(L, scale, 'cantilever')}
                    <g className="text-red-500 transition-all duration-300 ease-out">
                        <line x1={L} y1={-ms * 3} x2={L} y2={0} stroke="currentColor" strokeWidth={2 / scale} />
                        <path d={`M ${L - ms / 2} ${-ms} L ${L} 0 L ${L + ms / 2} ${-ms}`} fill="none" stroke="currentColor" strokeWidth={2 / scale} />
                    </g>
                </>
            );
        }
    }
};


// --- Beam Visualization Component ---

const BeamVisualization = createVisualizationComponent({
    strategyAxes: [
        { key: 'boundary', default: 'simple' },
        { key: 'load', default: 'uniform' }
    ],
    strategies: Object.values(BeamVisuals),
    height: 200,
    padding: 20
});


// --- Calculation Strategies (Identical to PoC) ---

const createModel = (inputs: Record<string, number>, id: string): BeamModel => {
    const [boundary, load] = id.split('_') as [BeamModel['boundary'], BeamModel['load']];
    return {
        boundary,
        load,
        L: inputs['L'] || 0,
        w: inputs['w'],
        P: inputs['P'],
        x_loc: inputs['x_loc'] // Note: this is check loc, but we might pass it as context? No, see below.
    };
};

const Strategies: CardStrategy<BeamOutputs>[] = [
    {
        id: 'simple_uniform',
        label: 'Simple - Uniform',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            w: { label: 'Load (w)', unitType: 'load', default: 10 },
            x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'simple_uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    },
    {
        id: 'simple_point',
        label: 'Simple - Point',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            P: { label: 'Load (P)', unitType: 'force', default: 1000 },
            x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'simple_point');
            model.x_loc = model.L / 2; // Default load at center for simple point

            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    },
    {
        id: 'cantilever_uniform',
        label: 'Cantilever - Uniform',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 2000 },
            w: { label: 'Load (w)', unitType: 'load', default: 10 },
            x_loc: { label: 'Loc (x)', unitType: 'length', default: 1000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'cantilever_uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    },
    {
        id: 'cantilever_point',
        label: 'Cantilever - Point',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 2000 },
            P: { label: 'Load (P)', unitType: 'force', default: 1000 },
            x_loc: { label: 'Loc (x)', unitType: 'length', default: 1000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'cantilever_point');
            model.x_loc = model.L; // Default load at tip for cantilever point

            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    }
];


// --- Definition ---

export const BeamCardDef = createStrategyDefinition<BeamOutputs>({
    type: 'BEAM',
    title: 'Beam',
    icon: Columns,
    description: 'Calculate shear and moment for various beams.',
    strategyAxes: [
        {
            key: 'boundary',
            label: 'Boundary',
            options: [
                { label: 'Simple Support', value: 'simple' },
                { label: 'Cantilever', value: 'cantilever' }
            ],
            default: 'simple'
        },
        {
            key: 'load',
            label: 'Load Condition',
            options: [
                { label: 'Uniform Load', value: 'uniform' },
                { label: 'Point Load', value: 'point' }
            ],
            default: 'uniform'
        }
    ],
    strategies: Strategies,
    outputConfig: {
        M_max: { label: 'M_max', unitType: 'moment' },
        V_max: { label: 'V_max', unitType: 'force' },
        Mx: { label: 'Mx', unitType: 'moment' },
        Qx: { label: 'Qx', unitType: 'force' },
    },
    visualization: BeamVisualization,
});
