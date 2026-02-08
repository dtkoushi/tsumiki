
import React from 'react';
import { Square } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';

// --- Types ---

export interface SectionOutputs {
    A: number;
    Ix: number;
    Iy: number;
    Z: number;
}

// --- Visualization Logic ---

// Adapting former DrawingStrategy logic to component-based VisualizationStrategy

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

const HSectionVisual: VisualizationStrategy = {
    id: 'h_beam',
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
        const tw = inputs['tw'] || 6;
        const tf = inputs['tf'] || 9;
        const y_tf_bot = tf;
        const y_bf_top = H - tf;

        const path = `
            M 0 0 
            H ${B} 
            v ${tf} 
            h ${-(B - tw) / 2} 
            V ${y_bf_top} 
            h ${(B - tw) / 2} 
            v ${tf} 
            H 0 
            v ${-tf} 
            h ${(B - tw) / 2} 
            V ${y_tf_bot} 
            h ${-(B - tw) / 2} 
            Z
        `;
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

const CircleSectionVisual: VisualizationStrategy = {
    id: 'circle',
    getBounds: (inputs) => {
        const D = inputs['D'] || 100;
        return { minX: 0, minY: 0, maxX: D, maxY: D };
    },
    getDimensions: (inputs) => {
        const D = inputs['D'] || 100;
        return [
            {
                type: 'horizontal',
                start: { x: 0, y: D },
                end: { x: D, y: D },
                label: `D=${D}`,
                offset: 20
            }
        ];
    },
    draw: (inputs, scale) => {
        const D = inputs['D'] || 100;
        const r = D / 2;
        const path = `
            M ${r} 0 
            A ${r} ${r} 0 1 0 ${r} ${D}
            A ${r} ${r} 0 1 0 ${r} 0
        `;
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

const SectionVisualization = createVisualizationComponent({
    strategyKey: 'shape',
    strategies: [RectSectionVisual, HSectionVisual, CircleSectionVisual],
    height: 240,
    padding: 40
});

// --- Calculation Strategies ---

const RectSectionStrategy: CardStrategy<SectionOutputs> = {
    id: 'rect',
    label: 'Rectangle',
    inputConfig: {
        B: { label: 'Width (B)', unitType: 'length', default: 300 },
        H: { label: 'Height (H)', unitType: 'length', default: 600 },
    },
    calculate: (inputs) => {
        const B = inputs['B'] || 0;
        const H = inputs['H'] || 0;
        const A = B * H;
        const Ix = (B * Math.pow(H, 3)) / 12;
        const Iy = (H * Math.pow(B, 3)) / 12;
        const Z = (B * Math.pow(H, 2)) / 6;
        return { A, Ix, Iy, Z };
    }
};

const HSectionStrategy: CardStrategy<SectionOutputs> = {
    id: 'h_beam',
    label: 'H-Beam',
    inputConfig: {
        H: { label: 'Height (H)', unitType: 'length', default: 200 },
        B: { label: 'Width (B)', unitType: 'length', default: 100 },
        tw: { label: 'Web Tk (tw)', unitType: 'length', default: 6 },
        tf: { label: 'Flg Tk (tf)', unitType: 'length', default: 9 },
    },
    calculate: (inputs) => {
        const H = inputs['H'] || 0;
        const B = inputs['B'] || 0;
        const tw = inputs['tw'] || 0;
        const tf = inputs['tf'] || 0;

        // Simplified calculation for rolled H-Beam (ignoring radius)
        const A = 2 * B * tf + (H - 2 * tf) * tw;
        const Ix = (B * Math.pow(H, 3)) / 12 - ((B - tw) * Math.pow(H - 2 * tf, 3)) / 12;
        const Iy = (2 * tf * Math.pow(B, 3)) / 12 + ((H - 2 * tf) * Math.pow(tw, 3)) / 12;
        const Z = Ix / (H / 2);

        return { A, Ix, Iy, Z };
    }
};

const CircleSectionStrategy: CardStrategy<SectionOutputs> = {
    id: 'circle',
    label: 'Circle',
    inputConfig: {
        D: { label: 'Diameter (D)', unitType: 'length', default: 100 },
    },
    calculate: (inputs) => {
        const D = inputs['D'] || 0;
        const A = (Math.PI * Math.pow(D, 2)) / 4;
        const Ix = (Math.PI * Math.pow(D, 4)) / 64;
        const Iy = Ix;
        const Z = (Math.PI * Math.pow(D, 3)) / 32;

        return { A, Ix, Iy, Z };
    }
};

// --- Definition ---

export const SectionCardDef = createStrategyDefinition<SectionOutputs>({
    type: 'SECTION',
    title: 'Section',
    icon: Square,
    description: 'Define section geometry (Rectangle, H-Beam, etc).',
    strategyKey: 'shape',
    strategies: [RectSectionStrategy, HSectionStrategy, CircleSectionStrategy],
    outputConfig: {
        A: { label: 'Area', unitType: 'area' },
        Ix: { label: 'I_x', unitType: 'inertia' },
        Iy: { label: 'I_y', unitType: 'inertia' },
        Z: { label: 'Z', unitType: 'modulus' },
    },
    visualization: SectionVisualization,
});
