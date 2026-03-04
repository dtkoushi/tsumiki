
import React from 'react';
import { Square } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';

// --- Types ---

interface SectionRectOutputs {
    A: number;
    Ix: number;
    Iy: number;
    Zx: number;
    Zy: number;
    Zpx: number;
}

// --- Visualization ---

const RectSectionVisual: VisualizationStrategy = {
    id: 'rect',
    getBounds: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return { minX: 0, minY: 0, maxX: B, maxY: H };
    },
    getDimensions: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return [
            {
                type: 'horizontal',
                start: { x: 0, y: H },
                end: { x: B, y: H },
                label: `B=${B}`,
                offset: 20
            },
            {
                type: 'vertical',
                start: { x: 0, y: 0 },
                end: { x: 0, y: H },
                label: `H=${H}`,
                offset: 20
            }
        ];
    },
    draw: (inputs, scale) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        const path = `M 0 0 H ${B} V ${H} H 0 Z`;
        return (
            <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth={2 / scale}
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-300 ease-out"
            />
        );
    }
};

const SectionRectVisualization = createVisualizationComponent({
    strategyAxes: [{ key: '__fixed__', default: 'rect' }],
    strategies: [RectSectionVisual],
    height: 240,
    padding: 40
});

// --- Definition ---

export const SectionRectDef = createCardDefinition<SectionRectOutputs>({
    type: 'SECTION_RECT',
    title: '矩形断面',
    description: '矩形（長方形）断面の断面特性を計算します',
    icon: Square,
    sidebar: { category: 'geometry', order: 1 },

    defaultInputs: {
        B: { value: 300 },
        H: { value: 600 },
    },
    inputConfig: {
        B: { label: '幅 B', unitType: 'length' },
        H: { label: '高さ H', unitType: 'length' },
    },
    outputConfig: {
        A: { label: '断面積 A', unitType: 'area' },
        Ix: { label: 'I_x', unitType: 'inertia' },
        Iy: { label: 'I_y', unitType: 'inertia' },
        Zx: { label: 'Z_x（弾性）', unitType: 'modulus' },
        Zy: { label: 'Z_y（弾性）', unitType: 'modulus' },
        Zpx: { label: 'Z_px（塑性）', unitType: 'modulus' },
    },
    calculate: ({ B, H }) => {
        const b = B || 0;
        const h = H || 0;
        const A = b * h;
        const Ix = (b * Math.pow(h, 3)) / 12;
        const Iy = (h * Math.pow(b, 3)) / 12;
        const Zx = (b * Math.pow(h, 2)) / 6;
        const Zy = (h * Math.pow(b, 2)) / 6;
        const Zpx = (b * Math.pow(h, 2)) / 4;
        return { A, Ix, Iy, Zx, Zy, Zpx };
    },
    visualization: SectionRectVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(SectionRectDef);
