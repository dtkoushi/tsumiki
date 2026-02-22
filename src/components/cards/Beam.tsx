
import { Columns } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';
import { calculateBeamMax, calculateBeamMultiMax, type BeamModel, type BeamMultiModel, type BoundaryType, type BeamMultiLoad } from '../../lib/mechanics/beam';
import { C_BEAM, C_POINT, C_DIST, C_MOMENT } from './common/beamSvgHelpers';

// --- Types ---

interface BeamOutputs {
    M_max: number;
    V_max: number;
}

// --- Support drawing helpers (world coordinates, scale = px per world unit) ---

type BoundaryDraw = 'simple' | 'cantilever' | 'fixed_fixed' | 'fixed_pinned';

const drawFixedSupport = (x: number, scale: number, side: 'left' | 'right') => {
    const h = 14 / scale;
    const dir = side === 'left' ? -1 : 1;
    return (
        <g>
            <line x1={x} y1={-h} x2={x} y2={h} stroke={C_BEAM} strokeWidth={2 / scale} />
            {[-h, -h / 2, 0, h / 2, h].map((dy, i) => (
                <line
                    key={i}
                    x1={x} y1={dy}
                    x2={x + dir * 8 / scale} y2={dy + 6 / scale}
                    stroke={C_BEAM}
                    strokeWidth={1 / scale}
                />
            ))}
        </g>
    );
};

const drawPinSupport = (x: number, scale: number) => {
    const ms = 8 / scale;
    return (
        <g>
            <polygon
                points={`${x - ms},${ms * 2} ${x + ms},${ms * 2} ${x},0`}
                fill="none" stroke={C_BEAM} strokeWidth={1.5 / scale}
            />
            <line
                x1={x - ms - 4 / scale} y1={ms * 2}
                x2={x + ms + 4 / scale} y2={ms * 2}
                stroke={C_BEAM} strokeWidth={1.5 / scale}
            />
        </g>
    );
};

const drawRollerSupport = (x: number, scale: number) => {
    const ms = 8 / scale;
    return (
        <g>
            <circle cx={x} cy={ms} r={ms} fill="none" stroke={C_BEAM} strokeWidth={1.5 / scale} />
            <line
                x1={x - ms - 4 / scale} y1={ms * 2}
                x2={x + ms + 4 / scale} y2={ms * 2}
                stroke={C_BEAM} strokeWidth={1.5 / scale}
            />
        </g>
    );
};

const drawBeamAndSupports = (L: number, scale: number, boundary: BoundaryDraw) => {
    return (
        <g>
            <line x1={0} y1={0} x2={L} y2={0}
                stroke={C_BEAM} strokeWidth={3 / scale} strokeLinecap="round" />
            {(boundary === 'cantilever' || boundary === 'fixed_fixed' || boundary === 'fixed_pinned')
                ? drawFixedSupport(0, scale, 'left')
                : drawPinSupport(0, scale)
            }
            {boundary === 'simple' && drawRollerSupport(L, scale)}
            {boundary === 'fixed_fixed' && drawFixedSupport(L, scale, 'right')}
            {boundary === 'fixed_pinned' && drawPinSupport(L, scale)}
            <text x={0} y={24 / scale}
                textAnchor="middle" fontSize={9 / scale} fill="#94a3b8">
                x=0
            </text>
        </g>
    );
};

// --- Standard Bounds ---

const getBeamBounds = (L: number) => {
    const VU = L / 20;
    return {
        minX: -VU * 4,
        maxX: L + VU * 2,
        minY: -VU * 6,
        maxY: VU * 4,
    };
};

// --- Load drawing helpers ---

const drawUniformLoad = (L: number, scale: number) => {
    const ms = 8 / scale;
    const loadH = ms * 5;
    const numArrows = 7;
    return (
        <g>
            <rect x={0} y={-loadH} width={L} height={loadH}
                fill={C_DIST} fillOpacity={0.08} stroke="none" />
            <line x1={0} y1={-loadH} x2={L} y2={-loadH}
                stroke={C_DIST} strokeWidth={1.5 / scale} />
            <line x1={0} y1={-loadH} x2={0} y2={0}
                stroke={C_DIST} strokeWidth={1 / scale} />
            <line x1={L} y1={-loadH} x2={L} y2={0}
                stroke={C_DIST} strokeWidth={1 / scale} />
            {Array.from({ length: numArrows }, (_, i) => {
                const tx = (i / (numArrows - 1)) * L;
                return (
                    <g key={i}>
                        <line x1={tx} y1={-loadH + 2 / scale} x2={tx} y2={-1 / scale}
                            stroke={C_DIST} strokeWidth={1 / scale} />
                        <polygon
                            points={`${tx - 4 / scale},${-ms} ${tx + 4 / scale},${-ms} ${tx},0`}
                            fill={C_DIST}
                        />
                    </g>
                );
            })}
            <text x={L / 2} y={-loadH - 4 / scale}
                textAnchor="middle" fontSize={10 / scale} fill={C_DIST} fontWeight="600">
                w
            </text>
        </g>
    );
};

const drawPointLoad = (a: number, scale: number) => {
    const ms = 8 / scale;
    const loadH = ms * 5;
    return (
        <g>
            <line x1={a} y1={-loadH} x2={a} y2={-1 / scale}
                stroke={C_POINT} strokeWidth={2 / scale} />
            <polygon
                points={`${a - 5 / scale},${-ms - 2 / scale} ${a + 5 / scale},${-ms - 2 / scale} ${a},0`}
                fill={C_POINT}
            />
            <text x={a} y={-loadH - 4 / scale}
                textAnchor="middle" fontSize={10 / scale} fill={C_POINT} fontWeight="600">
                P
            </text>
        </g>
    );
};

const drawMomentLoad = (a: number, scale: number, val: number = 1) => {
    const r = 16 / scale;
    const clockwise = val >= 0;
    const N_pts = 20;
    const pts = Array.from({ length: N_pts + 1 }, (_, i) => {
        const angle = (i / N_pts) * (3 * Math.PI / 2);
        // clockwise (positive): arc goes below beam first (y = +r·sin)
        // counter-clockwise (negative): arc goes above beam first (y = -r·sin)
        const y = clockwise ? r * Math.sin(angle) : -r * Math.sin(angle);
        return `${a + r * Math.cos(angle)},${y}`;
    });
    // Arrowhead at angle=3π/2: tangent always points right, end y flips
    const ey = clockwise ? -r : r;
    const aw = 4 / scale;
    const al = 7 / scale;
    return (
        <g>
            <polyline points={pts.join(' ')} fill="none" stroke={C_MOMENT} strokeWidth={1.5 / scale} />
            <polygon
                points={`${a - al},${ey - aw} ${a + aw * 1.2},${ey} ${a - al},${ey + aw}`}
                fill={C_MOMENT}
            />
            <text x={a + r + 4 / scale} y={4 / scale}
                textAnchor="start" fontSize={10 / scale} fill={C_MOMENT} fontWeight="600">
                M0
            </text>
        </g>
    );
};

// --- Visualization Strategies ---

const BeamVisuals: Record<string, VisualizationStrategy> = {
    'simple_uniform': {
        id: 'simple_uniform',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            return <>{drawBeamAndSupports(L, scale, 'simple')}{drawUniformLoad(L, scale)}</>;
        }
    },
    'simple_point': {
        id: 'simple_point',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const a = inputs['a'] ?? L / 2;
            return <>{drawBeamAndSupports(L, scale, 'simple')}{drawPointLoad(a, scale)}</>;
        }
    },
    'simple_moment': {
        id: 'simple_moment',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const a = inputs['a'] ?? L / 2;
            return <>{drawBeamAndSupports(L, scale, 'simple')}{drawMomentLoad(a, scale, inputs['M0'])}</>;
        }
    },
    'cantilever_uniform': {
        id: 'cantilever_uniform',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 2000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 2000;
            return <>{drawBeamAndSupports(L, scale, 'cantilever')}{drawUniformLoad(L, scale)}</>;
        }
    },
    'cantilever_point': {
        id: 'cantilever_point',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 2000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 2000;
            const a = inputs['a'] ?? L;
            return <>{drawBeamAndSupports(L, scale, 'cantilever')}{drawPointLoad(a, scale)}</>;
        }
    },
    'cantilever_moment': {
        id: 'cantilever_moment',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 2000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 2000;
            const a = inputs['a'] ?? L;
            return <>{drawBeamAndSupports(L, scale, 'cantilever')}{drawMomentLoad(a, scale, inputs['M0'])}</>;
        }
    },
    'fixed_fixed_uniform': {
        id: 'fixed_fixed_uniform',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            return <>{drawBeamAndSupports(L, scale, 'fixed_fixed')}{drawUniformLoad(L, scale)}</>;
        }
    },
    'fixed_fixed_point': {
        id: 'fixed_fixed_point',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const a = inputs['a'] ?? L / 2;
            return <>{drawBeamAndSupports(L, scale, 'fixed_fixed')}{drawPointLoad(a, scale)}</>;
        }
    },
    'fixed_fixed_moment': {
        id: 'fixed_fixed_moment',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const a = inputs['a'] ?? L / 2;
            return <>{drawBeamAndSupports(L, scale, 'fixed_fixed')}{drawMomentLoad(a, scale, inputs['M0'])}</>;
        }
    },
    'fixed_pinned_uniform': {
        id: 'fixed_pinned_uniform',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            return <>{drawBeamAndSupports(L, scale, 'fixed_pinned')}{drawUniformLoad(L, scale)}</>;
        }
    },
    'fixed_pinned_point': {
        id: 'fixed_pinned_point',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const a = inputs['a'] ?? L / 2;
            return <>{drawBeamAndSupports(L, scale, 'fixed_pinned')}{drawPointLoad(a, scale)}</>;
        }
    },
    'fixed_pinned_moment': {
        id: 'fixed_pinned_moment',
        getBounds: (inputs) => getBeamBounds(inputs['L'] || 4000),
        draw: (inputs, scale) => {
            const L = inputs['L'] || 4000;
            const a = inputs['a'] ?? L / 2;
            return <>{drawBeamAndSupports(L, scale, 'fixed_pinned')}{drawMomentLoad(a, scale, inputs['M0'])}</>;
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
    };
};

// Moment load strategies use a separate path via calculateBeamMultiMax rather than
// createModel()/calculateBeamMax() because BeamModel.load is typed as 'uniform' | 'point'
// and does not include 'moment'. The diagramModel is emitted as a BeamMultiModel
// (type: 'multi') so that Diagram can render it via evalSuperposition as well.
const calcMomentStrategy = (inputs: Record<string, number>, boundary: BoundaryType) => {
    const L = inputs['L'] || 0;
    const M0 = inputs['M0'] || 0;
    const a = inputs['a'] || L / 2;
    const loads: BeamMultiLoad[] = [{ type: 'moment', a, b: 0, val: M0 }];
    const model: BeamMultiModel = { type: 'multi', boundary, L, loads };
    const { M_max, V_max } = calculateBeamMultiMax(model);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { M_max, V_max, diagramModel: model as any };
};

const Strategies: CardStrategy<BeamOutputs>[] = [
    {
        id: 'simple_uniform',
        label: 'Simple - Uniform',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            w: { label: 'Load (w)', unitType: 'load', default: 10 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'simple_uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'simple_point',
        label: 'Simple - Point',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            P: { label: 'Load (P)', unitType: 'force', default: 1000 },
            a: { label: 'Load Pos (a)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'simple_point');
            model.x_loc = inputs['a'] || model.L / 2;
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'simple_moment',
        label: 'Simple - Moment',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            M0: { label: 'Moment (M0)', unitType: 'moment', default: 1000000 },
            a: { label: 'Load Pos (a)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => calcMomentStrategy(inputs, 'simple'),
    },
    {
        id: 'cantilever_uniform',
        label: 'Cantilever - Uniform',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 2000 },
            w: { label: 'Load (w)', unitType: 'load', default: 10 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'cantilever_uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'cantilever_point',
        label: 'Cantilever - Point',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 2000 },
            P: { label: 'Load (P)', unitType: 'force', default: 1000 },
            a: { label: 'Load Pos (a)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'cantilever_point');
            model.x_loc = inputs['a'] || model.L;
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'cantilever_moment',
        label: 'Cantilever - Moment',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 2000 },
            M0: { label: 'Moment (M0)', unitType: 'moment', default: 1000000 },
            a: { label: 'Load Pos (a)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => calcMomentStrategy(inputs, 'cantilever'),
    },
    {
        id: 'fixed_fixed_uniform',
        label: '両端固定 - 均等分布',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            w: { label: 'Load (w)', unitType: 'load', default: 10 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_fixed_uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'fixed_fixed_point',
        label: '両端固定 - 集中荷重',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            P: { label: 'Load (P)', unitType: 'force', default: 1000 },
            a: { label: 'Load Pos (a)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_fixed_point');
            model.x_loc = inputs['a'] || model.L / 2;
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'fixed_fixed_moment',
        label: '両端固定 - 集中モーメント',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            M0: { label: 'Moment (M0)', unitType: 'moment', default: 1000000 },
            a: { label: 'Load Pos (a)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => calcMomentStrategy(inputs, 'fixed_fixed'),
    },
    {
        id: 'fixed_pinned_uniform',
        label: '片端固定・片端ピン - 均等分布',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            w: { label: 'Load (w)', unitType: 'load', default: 10 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_pinned_uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'fixed_pinned_point',
        label: '片端固定・片端ピン - 集中荷重',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            P: { label: 'Load (P)', unitType: 'force', default: 1000 },
            a: { label: 'Load Pos (a)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_pinned_point');
            model.x_loc = inputs['a'] || model.L / 2;
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'fixed_pinned_moment',
        label: '片端固定・片端ピン - 集中モーメント',
        inputConfig: {
            L: { label: 'Span', unitType: 'length', default: 4000 },
            M0: { label: 'Moment (M0)', unitType: 'moment', default: 1000000 },
            a: { label: 'Load Pos (a)', unitType: 'length', default: 2000 },
        },
        calculate: (inputs) => calcMomentStrategy(inputs, 'fixed_pinned'),
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
                { label: 'Point Load', value: 'point' },
                { label: 'Moment Load', value: 'moment' },
            ],
            default: 'uniform'
        }
    ],
    strategies: Strategies,
    outputConfig: {
        M_max: { label: 'M_max', unitType: 'moment' },
        V_max: { label: 'V_max', unitType: 'force' },
    },
    visualization: BeamVisualization,
});
