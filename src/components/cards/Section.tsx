
import React from 'react';
import { Square } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';
import { ja } from '../../lib/i18n/ja';

// --- Types ---

export interface SectionOutputs {
    A: number;
    Ix: number;
    Iy: number;
    Z: number;
    Zy: number;
    Zpx: number;
    Zpy: number;
    ix: number;
    iy: number;
    Mx: number;
    My: number;
    Mpx: number;
    Mpy: number;
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
    strategyAxes: [{ key: 'shape', default: 'rect' }],
    strategies: [RectSectionVisual, HSectionVisual, CircleSectionVisual],
    height: 240,
    padding: 40
});

// --- Calculation Strategies ---

const RectSectionStrategy: CardStrategy<SectionOutputs> = {
    id: 'rect',
    label: ja['card.section.strategies.rect'],
    inputConfig: {
        B: { label: ja['card.section.inputs.widthB'], unitType: 'length', default: 300 },
        H: { label: ja['card.section.inputs.heightH'], unitType: 'length', default: 600 },
    },
    calculate: (inputs) => {
        const B = inputs['B'] || 0;
        const H = inputs['H'] || 0;
        const fy = inputs['fy'] || 0;
        const A = B * H;
        const Ix = (B * Math.pow(H, 3)) / 12;
        const Iy = (H * Math.pow(B, 3)) / 12;
        const Z = (B * Math.pow(H, 2)) / 6;
        const Zy = (H * Math.pow(B, 2)) / 6;
        const Zpx = (B * Math.pow(H, 2)) / 4;
        const Zpy = (H * Math.pow(B, 2)) / 4;
        const ix = Math.sqrt(Ix / A);
        const iy = Math.sqrt(Iy / A);
        const Mx = Z * fy;
        const My = Zy * fy;
        const Mpx = Zpx * fy;
        const Mpy = Zpy * fy;
        return { A, Ix, Iy, Z, Zy, Zpx, Zpy, ix, iy, Mx, My, Mpx, Mpy };
    }
};

const HSectionStrategy: CardStrategy<SectionOutputs> = {
    id: 'h_beam',
    label: ja['card.section.strategies.hBeam'],
    inputConfig: {
        H: { label: ja['card.section.inputs.heightH'], unitType: 'length', default: 200 },
        B: { label: ja['card.section.inputs.widthB'], unitType: 'length', default: 100 },
        tw: { label: ja['card.section.inputs.webTk'], unitType: 'length', default: 6 },
        tf: { label: ja['card.section.inputs.flgTk'], unitType: 'length', default: 9 },
    },
    calculate: (inputs) => {
        const H = inputs['H'] || 0;
        const B = inputs['B'] || 0;
        const tw = inputs['tw'] || 0;
        const tf = inputs['tf'] || 0;
        const fy = inputs['fy'] || 0;

        // Simplified calculation for rolled H-Beam (ignoring radius)
        const A = 2 * B * tf + (H - 2 * tf) * tw;
        const Ix = (B * Math.pow(H, 3)) / 12 - ((B - tw) * Math.pow(H - 2 * tf, 3)) / 12;
        const Iy = (2 * tf * Math.pow(B, 3)) / 12 + ((H - 2 * tf) * Math.pow(tw, 3)) / 12;
        const Z = Ix / (H / 2);
        const Zy = B > 0 ? Iy / (B / 2) : 0;
        const Zpx = B * tf * (H - tf) + tw * Math.pow(H / 2 - tf, 2);
        const Zpy = (tf * Math.pow(B, 2)) / 2 + ((H - 2 * tf) * Math.pow(tw, 2)) / 4;
        const ix = A > 0 ? Math.sqrt(Ix / A) : 0;
        const iy = A > 0 ? Math.sqrt(Iy / A) : 0;
        const Mx = Z * fy;
        const My = Zy * fy;
        const Mpx = Zpx * fy;
        const Mpy = Zpy * fy;

        return { A, Ix, Iy, Z, Zy, Zpx, Zpy, ix, iy, Mx, My, Mpx, Mpy };
    }
};

const CircleSectionStrategy: CardStrategy<SectionOutputs> = {
    id: 'circle',
    label: ja['card.section.strategies.circle'],
    inputConfig: {
        D: { label: ja['card.section.inputs.diameter'], unitType: 'length', default: 100 },
    },
    calculate: (inputs) => {
        const D = inputs['D'] || 0;
        const fy = inputs['fy'] || 0;
        const A = (Math.PI * Math.pow(D, 2)) / 4;
        const Ix = (Math.PI * Math.pow(D, 4)) / 64;
        const Iy = Ix;
        const Z = (Math.PI * Math.pow(D, 3)) / 32;
        const Zy = Z;
        const Zpx = Math.pow(D, 3) / 6;
        const Zpy = Math.pow(D, 3) / 6;
        const ix = D / 4;
        const iy = D / 4;
        const Mx = Z * fy;
        const My = Zy * fy;
        const Mpx = Zpx * fy;
        const Mpy = Zpy * fy;

        return { A, Ix, Iy, Z, Zy, Zpx, Zpy, ix, iy, Mx, My, Mpx, Mpy };
    }
};

// --- Definition ---

export const SectionCardDef = createStrategyDefinition<SectionOutputs>({
    type: 'SECTION',
    title: ja['card.section.title'],
    icon: Square,
    description: ja['card.section.description'],
    strategyAxes: [{
        key: 'shape',
        label: ja['card.section.axis.shape'],
        options: [
            { label: ja['card.section.strategies.rect'], value: 'rect' },
            { label: ja['card.section.strategies.hBeam'], value: 'h_beam' },
            { label: ja['card.section.strategies.circle'], value: 'circle' },
        ],
        default: 'rect',
    }],
    strategies: [RectSectionStrategy, HSectionStrategy, CircleSectionStrategy],
    commonInputConfig: {
        fy: { label: '降伏応力度 fy', unitType: 'stress', default: 235 },
    },
    sidebar: { category: 'section', order: 10 },
    outputConfig: {
        A: { label: ja['card.section.outputs.area'], unitType: 'area' },
        Ix: { label: 'I_x', unitType: 'inertia' },
        Iy: { label: 'I_y', unitType: 'inertia' },
        Z: { label: 'Z_x', unitType: 'modulus' },
        Zy: { label: 'Z_y', unitType: 'modulus' },
        Zpx: { label: 'Z_px', unitType: 'modulus' },
        Zpy: { label: 'Z_py', unitType: 'modulus' },
        ix: { label: 'i_x', unitType: 'length' },
        iy: { label: 'i_y', unitType: 'length' },
        Mx: { label: 'M_x (弾性)', unitType: 'moment' },
        My: { label: 'M_y (弾性)', unitType: 'moment' },
        Mpx: { label: 'M_px (全塑性)', unitType: 'moment' },
        Mpy: { label: 'M_py (全塑性)', unitType: 'moment' },
    },
    visualization: SectionVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(SectionCardDef);
