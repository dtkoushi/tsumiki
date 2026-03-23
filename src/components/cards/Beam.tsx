
import { Columns } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { num, sel } from '../../lib/utils/inputField';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';
import { calculateBeamMax, calculateBeamMultiMax, type BeamModel, type BeamMultiModel, type BoundaryType, type BeamMultiLoad } from '../../lib/mechanics/beam';
import {
    getBeamBounds, drawScaledBeamAndSupports, drawScaledDistLoad,
    drawScaledPointLoad, drawScaledMomentLoad, type BoundaryDraw,
} from './common/beamSvgHelpers';
import { ja } from '../../lib/i18n/ja';

// --- Types ---

interface BeamOutputs {
    M_max: number;
    V_max: number;
}

// --- Visualization Strategies ---

const makeBeamVisual = (id: string, boundary: BoundaryDraw, defaultL: number): VisualizationStrategy => {
    const [, load] = id.split('::');
    return {
        id,
        getBounds: (inputs) => getBeamBounds(inputs['L'] || defaultL),
        draw: (inputs, scale) => {
            const L = inputs['L'] || defaultL;
            const a = inputs['a'] ?? (load === 'point' && boundary === 'cantilever' ? L : L / 2);
            const beam = drawScaledBeamAndSupports(L, scale, boundary);
            if (load === 'uniform') return <>{beam}{drawScaledDistLoad(0, L, scale, inputs['w'] ?? 1, 'w')}</>;
            if (load === 'point')   return <>{beam}{drawScaledPointLoad(a, scale, inputs['P'] ?? 1, 'P')}</>;
            return <>{beam}{drawScaledMomentLoad(a, scale, inputs['M0'] ?? 1, 'M0')}</>;
        }
    };
};

const BeamVisuals: Record<string, VisualizationStrategy> = Object.fromEntries(
    (['simple', 'cantilever', 'fixed_fixed', 'fixed_pinned'] as BoundaryDraw[]).flatMap(boundary => {
        const defaultL = (boundary === 'simple' || boundary === 'fixed_fixed' || boundary === 'fixed_pinned') ? 4000 : 2000;
        return ['uniform', 'point', 'moment'].map(load => {
            const id = `${boundary}::${load}`;
            return [id, makeBeamVisual(id, boundary, defaultL)];
        });
    })
);


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
    const [boundary, load] = id.split('::') as [BeamModel['boundary'], BeamModel['load']];
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
        id: 'simple::uniform',
        label: ja['card.beam.strategies.simpleUniform'],
        inputConfig: {
            L: num({ label: ja['card.beam.inputs.span'], unitType: 'length', default: 4000, symbol: 'L' }),
            w: num({ label: ja['card.beam.inputs.loadW'], unitType: 'load', default: 10, symbol: 'w' }),
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'simple::uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'simple::point',
        label: ja['card.beam.strategies.simplePoint'],
        inputConfig: {
            L: num({ label: ja['card.beam.inputs.span'], unitType: 'length', default: 4000, symbol: 'L' }),
            P: num({ label: ja['card.beam.inputs.loadP'], unitType: 'force', default: 1000, symbol: 'P' }),
            a: num({ label: ja['card.beam.inputs.loadPos'], unitType: 'length', default: 2000, symbol: 'a' }),
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'simple::point');
            model.x_loc = inputs['a'] || model.L / 2;
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'simple::moment',
        label: ja['card.beam.strategies.simpleMoment'],
        inputConfig: {
            L:  num({ label: ja['card.beam.inputs.span'],   unitType: 'length', default: 4000,    symbol: 'L' }),
            M0: num({ label: ja['card.beam.inputs.loadM'],  unitType: 'moment', default: 1000000, symbol: 'M₀' }),
            a:  num({ label: ja['card.beam.inputs.loadPos'], unitType: 'length', default: 2000,   symbol: 'a' }),
        },
        calculate: (inputs) => calcMomentStrategy(inputs, 'simple'),
    },
    {
        id: 'cantilever::uniform',
        label: ja['card.beam.strategies.cantileverUniform'],
        inputConfig: {
            L: num({ label: ja['card.beam.inputs.span'], unitType: 'length', default: 2000, symbol: 'L' }),
            w: num({ label: ja['card.beam.inputs.loadW'], unitType: 'load', default: 10, symbol: 'w' }),
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'cantilever::uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'cantilever::point',
        label: ja['card.beam.strategies.cantileverPoint'],
        inputConfig: {
            L: num({ label: ja['card.beam.inputs.span'],    unitType: 'length', default: 2000, symbol: 'L' }),
            P: num({ label: ja['card.beam.inputs.loadP'],   unitType: 'force',  default: 1000, symbol: 'P' }),
            a: num({ label: ja['card.beam.inputs.loadPos'], unitType: 'length', default: 2000, symbol: 'a' }),
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'cantilever::point');
            model.x_loc = inputs['a'] || model.L;
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'cantilever::moment',
        label: ja['card.beam.strategies.cantileverMoment'],
        inputConfig: {
            L:  num({ label: ja['card.beam.inputs.span'],    unitType: 'length', default: 2000,    symbol: 'L' }),
            M0: num({ label: ja['card.beam.inputs.loadM'],   unitType: 'moment', default: 1000000, symbol: 'M₀' }),
            a:  num({ label: ja['card.beam.inputs.loadPos'], unitType: 'length', default: 2000,    symbol: 'a' }),
        },
        calculate: (inputs) => calcMomentStrategy(inputs, 'cantilever'),
    },
    {
        id: 'fixed_fixed::uniform',
        label: ja['card.beam.strategies.fixedFixedUniform'],
        inputConfig: {
            L: num({ label: ja['card.beam.inputs.span'], unitType: 'length', default: 4000, symbol: 'L' }),
            w: num({ label: ja['card.beam.inputs.loadW'], unitType: 'load', default: 10, symbol: 'w' }),
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_fixed::uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'fixed_fixed::point',
        label: ja['card.beam.strategies.fixedFixedPoint'],
        inputConfig: {
            L: num({ label: ja['card.beam.inputs.span'],    unitType: 'length', default: 4000, symbol: 'L' }),
            P: num({ label: ja['card.beam.inputs.loadP'],   unitType: 'force',  default: 1000, symbol: 'P' }),
            a: num({ label: ja['card.beam.inputs.loadPos'], unitType: 'length', default: 2000, symbol: 'a' }),
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_fixed::point');
            model.x_loc = inputs['a'] || model.L / 2;
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'fixed_fixed::moment',
        label: ja['card.beam.strategies.fixedFixedMoment'],
        inputConfig: {
            L:  num({ label: ja['card.beam.inputs.span'],    unitType: 'length', default: 4000,    symbol: 'L' }),
            M0: num({ label: ja['card.beam.inputs.loadM'],   unitType: 'moment', default: 1000000, symbol: 'M₀' }),
            a:  num({ label: ja['card.beam.inputs.loadPos'], unitType: 'length', default: 2000,    symbol: 'a' }),
        },
        calculate: (inputs) => calcMomentStrategy(inputs, 'fixed_fixed'),
    },
    {
        id: 'fixed_pinned::uniform',
        label: ja['card.beam.strategies.fixedPinnedUniform'],
        inputConfig: {
            L: num({ label: ja['card.beam.inputs.span'], unitType: 'length', default: 4000, symbol: 'L' }),
            w: num({ label: ja['card.beam.inputs.loadW'], unitType: 'load', default: 10, symbol: 'w' }),
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_pinned::uniform');
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'fixed_pinned::point',
        label: ja['card.beam.strategies.fixedPinnedPoint'],
        inputConfig: {
            L: num({ label: ja['card.beam.inputs.span'],    unitType: 'length', default: 4000, symbol: 'L' }),
            P: num({ label: ja['card.beam.inputs.loadP'],   unitType: 'force',  default: 1000, symbol: 'P' }),
            a: num({ label: ja['card.beam.inputs.loadPos'], unitType: 'length', default: 2000, symbol: 'a' }),
        },
        calculate: (inputs) => {
            const model = createModel(inputs, 'fixed_pinned::point');
            model.x_loc = inputs['a'] || model.L / 2;
            const { M_max, V_max } = calculateBeamMax(model);
            return { M_max, V_max, diagramModel: model };
        }
    },
    {
        id: 'fixed_pinned::moment',
        label: ja['card.beam.strategies.fixedPinnedMoment'],
        inputConfig: {
            L:  num({ label: ja['card.beam.inputs.span'],    unitType: 'length', default: 4000,    symbol: 'L' }),
            M0: num({ label: ja['card.beam.inputs.loadM'],   unitType: 'moment', default: 1000000, symbol: 'M₀' }),
            a:  num({ label: ja['card.beam.inputs.loadPos'], unitType: 'length', default: 2000,    symbol: 'a' }),
        },
        calculate: (inputs) => calcMomentStrategy(inputs, 'fixed_pinned'),
    },
];


// --- Definition ---

export const BeamCardDef = createStrategyDefinition<BeamOutputs>({
    type: 'BEAM',
    title: ja['card.beam.title'],
    icon: Columns,
    description: ja['card.beam.description'],
    strategyAxes: {
        boundary: sel({
            label: ja['card.beam.axis.boundary'],
            options: [
                { label: ja['card.beam.boundary.simple'],      value: 'simple'       },
                { label: ja['card.beam.boundary.cantilever'],  value: 'cantilever'   },
                { label: ja['card.beam.boundary.fixedFixed'],  value: 'fixed_fixed'  },
                { label: ja['card.beam.boundary.fixedPinned'], value: 'fixed_pinned' },
            ],
            default: 'simple',
        }),
        load: sel({
            label: ja['card.beam.axis.loadCondition'],
            options: [
                { label: ja['card.beam.load.uniform'], value: 'uniform' },
                { label: ja['card.beam.load.point'],   value: 'point'   },
                { label: ja['card.beam.load.moment'],  value: 'moment'  },
            ],
            default: 'uniform',
        }),
    },
    strategies: Strategies,
    sidebar: { category: 'beam', order: 1 },
    outputConfig: {
        M_max: { label: '最大曲げモーメント', unitType: 'moment', symbol: 'M_max' },
        V_max: { label: '最大せん断力',       unitType: 'force',  symbol: 'V_max' },
    },
    getOutputConfig: (card) => {
        const boundary = String(card.inputs['boundary']?.value ?? 'simple');
        const load     = String(card.inputs['load']?.value     ?? 'uniform');
        switch (`${boundary}::${load}`) {
            case 'simple::uniform':
                return {
                    M_max: { label: '最大曲げモーメント', unitType: 'moment', formula: 'w × L² / 8',  symbol: 'M_max', formulaInputKeys: ['w', 'L'] },
                    V_max: { label: '最大せん断力',       unitType: 'force',  formula: 'w × L / 2',   symbol: 'V_max', formulaInputKeys: ['w', 'L'] },
                };
            case 'simple::point':
                return {
                    M_max: { label: '最大曲げモーメント', unitType: 'moment', formula: 'P × a × (L−a) / L', symbol: 'M_max', formulaInputKeys: ['P', 'a', 'L'] },
                    V_max: { label: '最大せん断力',       unitType: 'force',  formula: 'max(P×(L−a)/L, P×a/L)', symbol: 'V_max', formulaInputKeys: ['P', 'a', 'L'] },
                };
            case 'cantilever::uniform':
                return {
                    M_max: { label: '最大曲げモーメント', unitType: 'moment', formula: 'w × L² / 2', symbol: 'M_max', formulaInputKeys: ['w', 'L'] },
                    V_max: { label: '最大せん断力',       unitType: 'force',  formula: 'w × L',      symbol: 'V_max', formulaInputKeys: ['w', 'L'] },
                };
            case 'cantilever::point':
                return {
                    M_max: { label: '最大曲げモーメント', unitType: 'moment', formula: 'P × a', symbol: 'M_max', formulaInputKeys: ['P', 'a'] },
                    V_max: { label: '最大せん断力',       unitType: 'force',  formula: 'P',     symbol: 'V_max', formulaInputKeys: ['P'] },
                };
            case 'fixed_fixed::uniform':
                return {
                    M_max: { label: '最大曲げモーメント', unitType: 'moment', formula: 'w × L² / 12', symbol: 'M_max', formulaInputKeys: ['w', 'L'] },
                    V_max: { label: '最大せん断力',       unitType: 'force',  formula: 'w × L / 2',   symbol: 'V_max', formulaInputKeys: ['w', 'L'] },
                };
            case 'fixed_fixed::point':
                return {
                    M_max: { label: '最大曲げモーメント', unitType: 'moment', formula: 'max(P×a×b²/L², P×a²×b/L²)', symbol: 'M_max', formulaInputKeys: ['P', 'a', 'L'] },
                    V_max: { label: '最大せん断力',       unitType: 'force',  formula: 'max(P×b²(L+2a)/L³, P×a²(L+2b)/L³)', symbol: 'V_max', formulaInputKeys: ['P', 'a', 'L'] },
                };
            case 'simple::moment':
                return {
                    M_max: { label: '最大曲げモーメント', unitType: 'moment', formula: 'M₀ × max(a, L−a) / L', symbol: 'M_max' },
                    V_max: { label: '最大せん断力',       unitType: 'force',  formula: '|M₀| / L',             symbol: 'V_max', formulaInputKeys: ['M0', 'L'] },
                };
            case 'cantilever::moment':
                return {
                    M_max: { label: '最大曲げモーメント（固定端）', unitType: 'moment', formula: 'M₀', symbol: 'M_max', formulaInputKeys: ['M0'] },
                    V_max: { label: '最大せん断力',                 unitType: 'force',  formula: '0',  symbol: 'V_max' },
                };
            case 'fixed_pinned::uniform':
                return {
                    M_max: { label: '最大曲げモーメント（固定端）', unitType: 'moment', formula: 'w × L² / 8',  symbol: 'M_max', formulaInputKeys: ['w', 'L'] },
                    V_max: { label: '最大せん断力（固定端）',       unitType: 'force',  formula: '5 × w × L / 8', symbol: 'V_max', formulaInputKeys: ['w', 'L'] },
                };
            default:
                return {};
        }
    },
    visualization: BeamVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(BeamCardDef);
