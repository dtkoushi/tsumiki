
import { ArrowLeftRight } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';
import { calculateBeamAt, type BeamModel } from '../../lib/mechanics/beam';
import {
    getBeamBounds, drawScaledBeamAndSupports, drawScaledDistLoad,
    drawScaledPointLoad, type BoundaryDraw,
} from './common/beamSvgHelpers';

// --- Types ---

interface BeamInverseOutputs {
    w_solved: number;
    P_solved: number;
    diagramModel: unknown;
}

// --- Visualization ---

const C_MARKER = '#f59e0b';

const makeInverseVisual = (id: string, boundary: BoundaryDraw, defaultL: number): VisualizationStrategy => {
    const [, load] = id.split('::');
    return {
        id,
        getBounds: (inputs) => {
            const L = inputs['L'] || defaultL;
            const b = getBeamBounds(L);
            return { ...b, minY: b.minY - L / 20 };
        },
        draw: (inputs, scale) => {
            const L = inputs['L'] || defaultL;
            const a = inputs['a'] ?? L / 2;
            const x0 = inputs['x_target'] ?? L / 2;
            const beam = drawScaledBeamAndSupports(L, scale, boundary);

            // x₀ marker: vertical dashed line
            const VU = L / 20;
            const markerTop = -VU * 5;
            const markerBottom = VU * 1.5;
            const xMarker = (
                <g>
                    <line
                        x1={x0} y1={markerTop} x2={x0} y2={markerBottom}
                        stroke={C_MARKER} strokeWidth={1.5 / scale} strokeDasharray={`${6 / scale},${4 / scale}`}
                    />
                    <text
                        x={x0} y={markerTop - 4 / scale}
                        textAnchor="middle" fontSize={9 / scale} fill={C_MARKER} fontWeight="600"
                    >
                        x₀
                    </text>
                </g>
            );

            if (load === 'uniform') {
                return <>{beam}{drawScaledDistLoad(0, L, scale, 1, 'w?')}{xMarker}</>;
            }
            return <>{beam}{drawScaledPointLoad(a, scale, 1, 'P?')}{xMarker}</>;
        }
    };
};

const InverseVisuals: Record<string, VisualizationStrategy> = Object.fromEntries(
    (['simple', 'cantilever'] as BoundaryDraw[]).flatMap(boundary => {
        const defaultL = boundary === 'simple' ? 6000 : 3000;
        return ['uniform', 'point'].map(load => {
            const id = `${boundary}::${load}`;
            return [id, makeInverseVisual(id, boundary, defaultL)];
        });
    })
);

const BeamInverseVisualization = createVisualizationComponent({
    strategyAxes: [
        { key: 'boundary', default: 'simple' },
        { key: 'load', default: 'uniform' }
    ],
    strategies: Object.values(InverseVisuals),
    height: 200,
    padding: 20,
});

// --- Calculation Strategies ---

const Strategies: CardStrategy<BeamInverseOutputs>[] = [
    {
        id: 'simple::uniform',
        label: '単純梁 / 等分布荷重',
        inputConfig: {
            L:        { label: 'スパン長', unitType: 'length', default: 6000 },
            x_target: { label: 'モーメント計測位置 x₀', unitType: 'length', default: 3000 },
            M_target: { label: '目標モーメント M', unitType: 'moment', default: 10e6 },
        },
        calculate: (inputs) => {
            const { L, x_target, M_target } = inputs;
            const M_unit = calculateBeamAt({ boundary: 'simple', load: 'uniform', L, w: 1.0 }, x_target).M;
            if (Math.abs(M_unit) < 1e-10) throw new Error('指定位置のモーメントはゼロです');
            const w_solved = M_target / M_unit;
            const diagramModel: BeamModel = { boundary: 'simple', load: 'uniform', L, w: w_solved };
            return { w_solved, P_solved: 0, diagramModel };
        },
    },
    {
        id: 'simple::point',
        label: '単純梁 / 集中荷重',
        inputConfig: {
            L:        { label: 'スパン長', unitType: 'length', default: 6000 },
            x_target: { label: 'モーメント計測位置 x₀', unitType: 'length', default: 3000 },
            M_target: { label: '目標モーメント M', unitType: 'moment', default: 10e6 },
            a:        { label: '荷重作用位置', unitType: 'length', default: 3000 },
        },
        calculate: (inputs) => {
            const { L, x_target, M_target, a } = inputs;
            const M_unit = calculateBeamAt({ boundary: 'simple', load: 'point', L, P: 1.0, x_loc: a }, x_target).M;
            if (Math.abs(M_unit) < 1e-10) throw new Error('指定位置のモーメントはゼロです');
            const P_solved = M_target / M_unit;
            const diagramModel: BeamModel = { boundary: 'simple', load: 'point', L, P: P_solved, x_loc: a };
            return { w_solved: 0, P_solved, diagramModel };
        },
    },
    {
        id: 'cantilever::uniform',
        label: '片持ち梁 / 等分布荷重',
        inputConfig: {
            L:        { label: 'スパン長', unitType: 'length', default: 3000 },
            x_target: { label: 'モーメント計測位置 x₀', unitType: 'length', default: 0 },
            M_target: { label: '目標モーメント M', unitType: 'moment', default: 10e6 },
        },
        calculate: (inputs) => {
            const { L, x_target, M_target } = inputs;
            const M_unit = calculateBeamAt({ boundary: 'cantilever', load: 'uniform', L, w: 1.0 }, x_target).M;
            if (Math.abs(M_unit) < 1e-10) throw new Error('指定位置のモーメントはゼロです');
            const w_solved = M_target / M_unit;
            const diagramModel: BeamModel = { boundary: 'cantilever', load: 'uniform', L, w: w_solved };
            return { w_solved, P_solved: 0, diagramModel };
        },
    },
    {
        id: 'cantilever::point',
        label: '片持ち梁 / 集中荷重',
        inputConfig: {
            L:        { label: 'スパン長', unitType: 'length', default: 3000 },
            x_target: { label: 'モーメント計測位置 x₀', unitType: 'length', default: 0 },
            M_target: { label: '目標モーメント M', unitType: 'moment', default: 10e6 },
            a:        { label: '荷重作用位置', unitType: 'length', default: 3000 },
        },
        calculate: (inputs) => {
            const { L, x_target, M_target, a } = inputs;
            const M_unit = calculateBeamAt({ boundary: 'cantilever', load: 'point', L, P: 1.0, x_loc: a }, x_target).M;
            if (Math.abs(M_unit) < 1e-10) throw new Error('指定位置のモーメントはゼロです');
            const P_solved = M_target / M_unit;
            const diagramModel: BeamModel = { boundary: 'cantilever', load: 'point', L, P: P_solved, x_loc: a };
            return { w_solved: 0, P_solved, diagramModel };
        },
    },
];

// --- Definition ---

export const BeamInverseCardDef = createStrategyDefinition<BeamInverseOutputs>({
    type: 'BEAM_INVERSE',
    title: 'ビーム逆算',
    icon: ArrowLeftRight,
    description: '目標モーメントから外力を逆算',
    strategyAxes: [
        {
            key: 'boundary',
            label: '境界条件',
            options: [
                { label: '単純梁', value: 'simple' },
                { label: '片持ち梁', value: 'cantilever' },
            ],
            default: 'simple',
        },
        {
            key: 'load',
            label: '荷重種別',
            options: [
                { label: '等分布荷重', value: 'uniform' },
                { label: '集中荷重', value: 'point' },
            ],
            default: 'uniform',
        },
    ],
    strategies: Strategies,
    sidebar: { category: 'loads', order: 10 },
    outputConfig: {
        w_solved: { label: '等分布荷重 w', unitType: 'load' },
        P_solved: { label: '集中荷重 P', unitType: 'force' },
        diagramModel: { label: 'ビームモデル', unitType: 'none', hidden: true },
    },
    shouldRenderInput: (card, key) => {
        if (key !== 'a') return true;
        return card.inputs['load']?.value === 'point';
    },
    visualization: BeamInverseVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(BeamInverseCardDef);
