
import { Columns } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';
import { calculateBeamAt, calculateBeamMax, type BeamModel } from '../../lib/mechanics/beam';

// --- Types ---

interface BeamOutputs {
    M_max: number;
    V_max: number;
    Mx: number;
    Qx: number;
}

// --- Support drawing helpers ---

type BoundaryType = 'simple' | 'cantilever' | 'fixed_fixed' | 'fixed_pinned';

const drawFixedSupport = (x: number, scale: number, side: 'left' | 'right') => {
    const ms = 15 / scale;
    const hatchDir = side === 'left' ? -1 : 1;
    return (
        <g>
            <line x1={x} y1={-ms} x2={x} y2={ms} stroke="currentColor" strokeWidth={3 / scale} />
            {[-1, -0.5, 0, 0.5, 1].map(i => (
                <line
                    key={i}
                    x1={x} y1={ms * i}
                    x2={x + hatchDir * ms / 2} y2={ms * i + ms / 2}
                    stroke="currentColor"
                    strokeWidth={1 / scale}
                />
            ))}
        </g>
    );
};

const drawPinSupport = (x: number, scale: number) => {
    const ms = 15 / scale;
    return (
        <path
            d={`M ${x - ms / 2} ${ms} L ${x + ms / 2} ${ms} L ${x} 0 Z`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5 / scale}
        />
    );
};

const drawRollerSupport = (x: number, scale: number) => {
    const ms = 15 / scale;
    return (
        <circle
            cx={x} cy={ms / 2} r={ms / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5 / scale}
        />
    );
};

const drawBeamAndSupports = (L: number, scale: number, boundary: BoundaryType) => {
    return (
        <g className="text-slate-700 dark:text-slate-300 transition-all duration-300 ease-out">
            {/* Beam Line */}
            <line x1={0} y1={0} x2={L} y2={0} stroke="currentColor" strokeWidth={3 / scale} />

            {/* Left support */}
            {(boundary === 'cantilever' || boundary === 'fixed_fixed' || boundary === 'fixed_pinned')
                ? drawFixedSupport(0, scale, 'left')
                : drawPinSupport(0, scale)
            }

            {/* Right support */}
            {boundary === 'simple' && drawRollerSupport(L, scale)}
            {boundary === 'fixed_fixed' && drawFixedSupport(L, scale, 'right')}
            {boundary === 'fixed_pinned' && drawPinSupport(L, scale)}
        </g>
    );
};

// --- Standard Bounds ---

const getBeamBounds = (L: number) => {
    const VU = L / 20;
    return {
        minX: -VU * 4,
        maxX: L + VU * 2,
        minY: -VU * 5,
        maxY: VU * 4,
    };
};

// --- Visualization Strategies ---

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
    },
    'fixed_fixed_uniform': {
        id: 'fixed_fixed_uniform',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const ms = 15 / scale;
            return (
                <>
                    {drawBeamAndSupports(L, scale, 'fixed_fixed')}
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
    'fixed_fixed_point': {
        id: 'fixed_fixed_point',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const ms = 15 / scale;
            const x_loc = inputs['x_loc'] || L / 2;
            return (
                <>
                    {drawBeamAndSupports(L, scale, 'fixed_fixed')}
                    <g className="text-red-500 transition-all duration-300 ease-out">
                        <line x1={x_loc} y1={-ms * 3} x2={x_loc} y2={0} stroke="currentColor" strokeWidth={2 / scale} />
                        <path d={`M ${x_loc - ms / 2} ${-ms} L ${x_loc} 0 L ${x_loc + ms / 2} ${-ms}`} fill="none" stroke="currentColor" strokeWidth={2 / scale} />
                    </g>
                </>
            );
        }
    },
    'fixed_pinned_uniform': {
        id: 'fixed_pinned_uniform',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const ms = 15 / scale;
            return (
                <>
                    {drawBeamAndSupports(L, scale, 'fixed_pinned')}
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
    'fixed_pinned_point': {
        id: 'fixed_pinned_point',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const ms = 15 / scale;
            const x_loc = inputs['x_loc'] || L / 2;
            return (
                <>
                    {drawBeamAndSupports(L, scale, 'fixed_pinned')}
                    <g className="text-red-500 transition-all duration-300 ease-out">
                        <line x1={x_loc} y1={-ms * 3} x2={x_loc} y2={0} stroke="currentColor" strokeWidth={2 / scale} />
                        <path d={`M ${x_loc - ms / 2} ${-ms} L ${x_loc} 0 L ${x_loc + ms / 2} ${-ms}`} fill="none" stroke="currentColor" strokeWidth={2 / scale} />
                    </g>
                </>
            );
        }
    },
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


// --- Calculation Strategies ---

const createModel = (inputs: Record<string, number>, id: string): BeamModel => {
    const parts = id.split('_');
    const load = parts[parts.length - 1] as BeamModel['load'];
    const boundary = parts.slice(0, -1).join('_') as BeamModel['boundary'];
    return {
        boundary,
        load,
        L: inputs['L'] || 0,
        w: inputs['w'],
        P: inputs['P'],
        x_loc: inputs['x_loc'],
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
            model.x_loc = model.L / 2; // Load at center
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
            model.x_loc = model.L; // Load at tip
            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    },
    {
        id: 'fixed_fixed_uniform',
        label: '両端固定 - 均等分布',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            w: { label: 'Load (w)', unitType: 'load', default: 10 },
            x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_fixed_uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    },
    {
        id: 'fixed_fixed_point',
        label: '両端固定 - 集中荷重',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            P: { label: 'Load (P)', unitType: 'force', default: 1000 },
            x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_fixed_point');
            model.x_loc = model.L / 2; // Load at center
            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    },
    {
        id: 'fixed_pinned_uniform',
        label: '片端固定・片端ピン - 均等分布',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            w: { label: 'Load (w)', unitType: 'load', default: 10 },
            x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_pinned_uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    },
    {
        id: 'fixed_pinned_point',
        label: '片端固定・片端ピン - 集中荷重',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            P: { label: 'Load (P)', unitType: 'force', default: 1000 },
            x_loc: { label: 'Loc (x)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_pinned_point');
            model.x_loc = model.L / 2; // Load at center
            const { M_max, V_max } = calculateBeamMax(model);
            const { M: Mx, Q: Qx } = calculateBeamAt(model, inputs['x_loc'] || 0);
            return { M_max, V_max, Mx, Qx, structuralModel: model };
        }
    },
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
                { label: 'Cantilever', value: 'cantilever' },
                { label: '両端固定', value: 'fixed_fixed' },
                { label: '片端固定・片端ピン', value: 'fixed_pinned' },
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
