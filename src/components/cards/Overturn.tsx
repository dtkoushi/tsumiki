
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { AutoFitSvg } from './common/AutoFitSvg';
import { drawArrow, drawLabel, drawDashedLine } from './common/svgPrimitives';

// --- Types ---

interface OverturnOutputs {
    Mo: number;
    Ms: number;
    Fs: number;
    e: number;
    e_allow: number;
}

// --- Visualization ---

const OverturnVisualization: React.FC<CardComponentProps> = ({ card }) => {
    const ri = card.resolvedInputs ?? {};
    const N  = (ri['N']  as number) || 10000;
    const H  = (ri['H']  as number) || 1000;
    const h  = (ri['h']  as number) || 3000;
    const B  = (ri['B']  as number) || 2000;

    // Normalize to a display scale. Use B as base unit = 100 world units.
    const scale1 = 100 / B;
    const bW  = B   * scale1; // = 100
    const hW  = h   * scale1; // height of structure (display)
    const NW  = N   * scale1;
    const HW  = H   * scale1;

    // Cap body height so it doesn't dominate the view
    const bodyH = Math.min(hW, bW * 2);
    // h display coordinate (where H arrow acts)
    const hDisplay = Math.min(hW, bodyH);

    // World coords: x: 0..bW (body), y: 0 (top) .. bodyH (bottom)
    // Ground is at y = bodyH; arrows point in SVG Y-down orientation
    // N arrow: top of body, pointing down
    // H arrow: pointing right (from outside left), at y = bodyH - hDisplay
    const arrowLenN = Math.min(bW * 0.4, 30);
    const arrowLenH = Math.min(bW * 0.5, 35);

    const hY = bodyH - hDisplay; // y-coordinate where H acts

    // Bounds with generous margins
    const pad = bW * 0.7;
    const bounds = {
        minX: -pad - arrowLenH,
        minY: -arrowLenN - bW * 0.3,
        maxX: bW + bW * 0.3,
        maxY: bodyH + bW * 0.3,
    };

    return (
        <AutoFitSvg bounds={bounds} padding={16} height={200}>
            {(s) => (
                <g>
                    {/* Ground hatch lines */}
                    <line
                        x1={-pad} y1={bodyH} x2={bW + bW * 0.2} y2={bodyH}
                        stroke="#64748b" strokeWidth={1.5 / s}
                    />
                    {Array.from({ length: 7 }, (_, i) => {
                        const x0 = -pad + i * bW * 0.2;
                        return (
                            <line
                                key={i}
                                x1={x0} y1={bodyH}
                                x2={x0 - bW * 0.1} y2={bodyH + bW * 0.1}
                                stroke="#64748b" strokeWidth={1 / s} opacity={0.5}
                            />
                        );
                    })}

                    {/* Structure body */}
                    <rect
                        x={0} y={0} width={bW} height={bodyH}
                        fill="#e2e8f0" stroke="#64748b" strokeWidth={1.5 / s}
                        opacity={0.8}
                    />

                    {/* Pivot circle at bottom-right corner */}
                    <circle
                        cx={bW} cy={bodyH}
                        r={4 / s}
                        fill="#ef4444" stroke="#ef4444" strokeWidth={1 / s}
                    />

                    {/* N arrow: top-center, pointing down */}
                    {drawArrow(
                        bW / 2, -arrowLenN,
                        bW / 2, 0,
                        s,
                        { color: '#3b82f6', label: 'N', labelSide: 'start' },
                    )}

                    {/* H arrow: left side, pointing right at height h */}
                    {drawArrow(
                        -arrowLenH, hY,
                        0, hY,
                        s,
                        { color: '#f97316', label: 'H', labelSide: 'start' },
                    )}

                    {/* Dashed line showing h height */}
                    {drawDashedLine(
                        -arrowLenH * 0.5, 0,
                        -arrowLenH * 0.5, hY,
                        s,
                        { color: '#94a3b8' },
                    )}
                    {drawLabel(
                        -arrowLenH * 0.5 - 8 / s,
                        hY / 2,
                        'h',
                        s,
                        { color: '#94a3b8', anchor: 'end' },
                    )}

                    {/* B dimension at bottom */}
                    {drawDashedLine(
                        0, bodyH + bW * 0.1,
                        bW, bodyH + bW * 0.1,
                        s,
                        { color: '#94a3b8' },
                    )}
                    {drawLabel(
                        bW / 2,
                        bodyH + bW * 0.2,
                        'B',
                        s,
                        { color: '#94a3b8', anchor: 'middle', baseline: 'hanging' },
                    )}

                    {/* Invisible refs to use N/H/NW/HW and suppress lint */}
                    {(NW || HW || N || H) ? null : null}
                </g>
            )}
        </AutoFitSvg>
    );
};

// --- Definition ---

export const OverturnCardDef = createCardDefinition<OverturnOutputs>({
    type: 'OVERTURN',
    title: '転倒の検討',
    description: '鉛直力・水平力による転倒安全率と偏心距離を確認',
    icon: RotateCcw,

    sidebar: { category: 'verify', order: 3 },

    defaultInputs: {
        N: { value: 10000 },
        H: { value: 1000  },
        h: { value: 3000  },
        B: { value: 2000  },
    },

    inputConfig: {
        N: { label: '鉛直荷重 N',     unitType: 'force'  },
        H: { label: '水平力 H',       unitType: 'force'  },
        h: { label: '水平力作用高さ h', unitType: 'length' },
        B: { label: '底面幅 B',       unitType: 'length' },
    },

    outputConfig: {
        Mo:      { label: '転倒モーメント Mo', unitType: 'moment' },
        Ms:      { label: '安定モーメント Ms', unitType: 'moment' },
        Fs:      { label: '転倒安全率 Fs',    unitType: 'none'   },
        e:       { label: '偏心距離 e',        unitType: 'length' },
        e_allow: { label: '許容偏心 B/6',     unitType: 'length' },
    },

    calculate: ({ N, H, h, B }) => {
        const Mo      = H * h;
        const Ms      = N * B / 2;
        const Fs      = Mo > 0 ? Ms / Mo : Infinity;
        const e       = N > 0 && Mo > 0 ? Mo / N : 0;
        const e_allow = B / 6;
        return { Mo, Ms, Fs, e, e_allow };
    },

    visualization: OverturnVisualization,
});

import { registry } from '../../lib/registry/registry';
registry.register(OverturnCardDef);
