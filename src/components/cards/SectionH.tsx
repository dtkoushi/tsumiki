
import React from 'react';
import { RectangleHorizontal } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { createVisualizationComponent, type VisualizationStrategy } from './common/visualizationHelper';

// --- Types ---

interface SectionHOutputs {
    A: number;
    Ix: number;
    Iy: number;
    Zx: number;
    Zpx: number;
    lambda_f: number;
    lambda_w: number;
    Mp: number;
    Qy: number;
}

// --- Visualization ---

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

const SectionHVisualization = createVisualizationComponent({
    strategyAxes: [{ key: '__fixed__', default: 'h_beam' }],
    strategies: [HSectionVisual],
    height: 240,
    padding: 40
});

// --- Definition ---

export const SectionHDef = createCardDefinition<SectionHOutputs>({
    type: 'SECTION_H',
    title: 'H形断面',
    description: 'H形鋼断面の断面特性・幅厚比・塑性断面係数を計算します',
    icon: RectangleHorizontal,
    sidebar: { category: 'geometry', order: 2 },

    defaultInputs: {
        H: { value: 200 },
        B: { value: 100 },
        tw: { value: 5.5 },
        tf: { value: 8 },
        Fy: { value: 235 },
    },
    inputConfig: {
        H: { label: '断面高さ H', unitType: 'length' },
        B: { label: 'フランジ幅 B', unitType: 'length' },
        tw: { label: 'ウェブ厚 tw', unitType: 'length' },
        tf: { label: 'フランジ厚 tf', unitType: 'length' },
        Fy: { label: '降伏応力度 Fy', unitType: 'stress' },
    },
    outputConfig: {
        A: { label: '断面積 A', unitType: 'area' },
        Ix: { label: 'I_x', unitType: 'inertia' },
        Iy: { label: 'I_y', unitType: 'inertia' },
        Zx: { label: 'Z_x（弾性）', unitType: 'modulus' },
        Zpx: { label: 'Z_px（塑性）', unitType: 'modulus' },
        lambda_f: { label: 'λ_f フランジ幅厚比', unitType: 'none' },
        lambda_w: { label: 'λ_w ウェブ幅厚比', unitType: 'none' },
        Mp: { label: '全塑性モーメント Mp', unitType: 'moment' },
        Qy: { label: '降伏せん断耐力 Qy', unitType: 'force' },
    },
    calculate: ({ H, B, tw, tf, Fy }) => {
        const h = H || 0;
        const b = B || 0;
        const tw_ = tw || 0;
        const tf_ = tf || 0;
        const fy = Fy || 0;

        const hw = h - 2 * tf_; // ウェブ内法高さ

        const A = 2 * b * tf_ + hw * tw_;
        const Ix = (b * Math.pow(h, 3)) / 12 - ((b - tw_) * Math.pow(hw, 3)) / 12;
        const Iy = (2 * tf_ * Math.pow(b, 3)) / 12 + (hw * Math.pow(tw_, 3)) / 12;
        const Zx = h > 0 ? Ix / (h / 2) : 0;
        const Zpx = tf_ * b * hw + (tw_ * Math.pow(hw, 2)) / 4;
        const lambda_f = tf_ > 0 ? (b / 2) / tf_ : 0;
        const lambda_w = tw_ > 0 ? hw / tw_ : 0;
        const Mp = fy * Zpx;
        const Qy = (fy / Math.sqrt(3)) * hw * tw_;

        return { A, Ix, Iy, Zx, Zpx, lambda_f, lambda_w, Mp, Qy };
    },
    visualization: SectionHVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(SectionHDef);
