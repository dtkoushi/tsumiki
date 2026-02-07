import { Square } from 'lucide-react';
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';

import { SectionVisualization } from './section/SectionVisualization';

// --- Local Types ---

export interface SectionOutputs {
    A: number;
    Ix: number;
    Iy: number;
    Z: number;
}

// --- Strategies ---

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

const SectionStrategies: CardStrategy<SectionOutputs>[] = [
    RectSectionStrategy,
    HSectionStrategy,
    CircleSectionStrategy
];

// --- Definition ---

export const SectionCardDef = createStrategyDefinition<SectionOutputs>({
    type: 'SECTION',
    title: 'Section',
    icon: Square,
    description: 'Define section geometry (Rectangle, H-Beam, etc).',
    strategyKey: 'shape',
    strategies: SectionStrategies,
    outputConfig: {
        A: { label: 'Area', unitType: 'area' },
        Ix: { label: 'I_x', unitType: 'inertia' },
        Iy: { label: 'I_y', unitType: 'inertia' },
        Z: { label: 'Z', unitType: 'modulus' },
    },
    visualization: SectionVisualization,
});
