
import React from 'react';
import { ArrowDown } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { BaseCard } from './common/BaseCard';
import { CardProvider } from './common/CardContext';
import { CardSmartInput } from './common/CardSmartInput';
import { getUnitLabel, type UnitMode } from '../../lib/utils/unitFormatter';
import {
    calculateMaxDeflection,
    calculateDeflectionProfile,
    type DiagramModel,
    type BoundaryType,
} from '../../lib/mechanics/beam';
import { DrawFixedSupport, DrawPinSupport, DrawRollerSupport } from './common/beamSvgHelpers';
import { SVG_COLOR, SVG_FONT_FAMILY, SVG_FONT_SIZE } from './common/svgTheme';
import { resolveInput } from '../../lib/utils/cardHelpers';
import { ResultsPanel } from './common/ResultsPanel';
import { ja } from '../../lib/i18n/ja';
import type { JaKey } from '../../lib/i18n/ja';

// --- Visualization ---

interface DeflectionSvgProps {
    model: DiagramModel;
    E: number;
    I: number;
    delta_max: number;
    delta_allow: number;
    unitMode: UnitMode;
}

const DeflectionSvg: React.FC<DeflectionSvgProps> = ({ model, E, I, delta_max, delta_allow, unitMode }) => {
    const W = 380, H = 200;
    // Layout constants (all in viewBox units)
    const pad = 16;          // right padding — pin/roller baseline extends 12px past beam end
    const beamX0 = 44, beamX1 = W - pad;
    const beamY = 100;       // beam at vertical center so deflection fits in both directions
    const maxDeflPx = 72;    // ±72px from beamY → curve stays within [28, 172] inside H=200

    const boundary: BoundaryType =
        'type' in model && model.type === 'multi'
            ? model.boundary
            : (model as import('../../lib/mechanics/beam').BeamModel).boundary;

    const EI = E * I;
    const L = model.L;

    // Deflection profile (N=80 for SVG render performance)
    const profile = EI > 0 ? calculateDeflectionProfile(model, EI, 80) : [];
    const absMax = profile.length > 0 ? Math.max(...profile.map(p => Math.abs(p.y))) : 0;

    // y from integration: negative = downward (math convention: up=+y).
    // SVG y increases downward → negate so downward deflection plots below beamY.
    const toXpx = (x: number) => beamX0 + (x / L) * (beamX1 - beamX0);
    const toYpx = (y: number) =>
        absMax > 1e-10
            ? beamY - (y / absMax) * maxDeflPx
            : beamY;

    const curvePoints = profile.map(p =>
        `${toXpx(p.x).toFixed(1)},${toYpx(p.y).toFixed(1)}`
    ).join(' ');

    const polyPoints = profile.length > 0
        ? `${beamX0},${beamY} ${curvePoints} ${beamX1},${beamY}`
        : '';

    const isOk = delta_allow > 0 ? delta_max <= delta_allow : true;
    const color = isOk ? SVG_COLOR.blue : SVG_COLOR.red;

    // Marker at point of max |deflection|
    const maxPt = profile.reduce(
        (best, p) => Math.abs(p.y) > Math.abs(best.y) ? p : best,
        { x: L / 2, y: 0 },
    );
    const maxXpx = toXpx(maxPt.x);
    const maxYpx = toYpx(maxPt.y); // SVG y coordinate of the max deflection point

    // Labels placed between the marker dot and the beam line (always toward center)
    const labelDir = maxYpx < beamY ? 1 : -1; // +1 for upward deflection, -1 for downward
    const labelAnchor = maxXpx > (beamX0 + beamX1) / 2 ? 'end' : 'start';
    const labelX = maxXpx + (labelAnchor === 'end' ? -6 : 6);

    const deltaLabel = unitMode === 'm'
        ? `${(delta_max / 1000).toFixed(4)} m`
        : `${delta_max.toFixed(3)} mm`;
    const allowLabel = unitMode === 'm'
        ? `${(delta_allow / 1000).toFixed(4)} m`
        : `${delta_allow.toFixed(3)} mm`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
            style={{ display: 'block' }}>
            <defs>
                {/* Hard clip: nothing can ever render outside the viewBox */}
                <clipPath id={`defl-clip-${beamX0}`}>
                    <rect x={0} y={0} width={W} height={H} />
                </clipPath>
            </defs>

            <g clipPath={`url(#defl-clip-${beamX0})`}>
                {/* Filled deflection area */}
                {polyPoints && (
                    <polygon
                        points={polyPoints}
                        fill={color}
                        fillOpacity={0.12}
                        stroke="none"
                    />
                )}

                {/* Deflection curve */}
                {curvePoints && (
                    <polyline
                        points={curvePoints}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                    />
                )}

                {/* Beam baseline (drawn on top of curve fill) */}
                <line x1={beamX0} y1={beamY} x2={beamX1} y2={beamY}
                    stroke={SVG_COLOR.beam} strokeWidth="3" strokeLinecap="round" />

                {/* Support symbols based on boundary */}
                {boundary === 'simple' && (
                    <>
                        <DrawPinSupport x={beamX0} beamY={beamY} />
                        <DrawRollerSupport x={beamX1} beamY={beamY} />
                    </>
                )}
                {boundary === 'cantilever' && (
                    <DrawFixedSupport x={beamX0} beamY={beamY} side="left" />
                )}
                {boundary === 'fixed_fixed' && (
                    <>
                        <DrawFixedSupport x={beamX0} beamY={beamY} side="left" />
                        <DrawFixedSupport x={beamX1} beamY={beamY} side="right" />
                    </>
                )}
                {boundary === 'fixed_pinned' && (
                    <>
                        <DrawFixedSupport x={beamX0} beamY={beamY} side="left" />
                        <DrawPinSupport x={beamX1} beamY={beamY} />
                    </>
                )}

                {/* x=0 label */}
                <text x={beamX0} y={beamY + 24} textAnchor="middle" dominantBaseline="middle"
                    fontSize={SVG_FONT_SIZE.sm} fill={SVG_COLOR.muted}
                    fontFamily={SVG_FONT_FAMILY}>x=0</text>

                {/* Max deflection marker — dashed vertical + dot, labels between dot and beam line */}
                {absMax > 1e-10 && (
                    <g>
                        <line x1={maxXpx} y1={beamY} x2={maxXpx} y2={maxYpx}
                            stroke={color} strokeWidth="1" strokeDasharray="3,2" />
                        <circle cx={maxXpx} cy={maxYpx} r={3} fill={color} />
                        <text x={labelX} y={maxYpx + labelDir * 14}
                            textAnchor={labelAnchor} dominantBaseline="middle"
                            fontSize={SVG_FONT_SIZE.sm} fill={color}
                            fontWeight="600" fontFamily={SVG_FONT_FAMILY}>
                            δ={deltaLabel}
                        </text>
                        {delta_allow > 0 && (
                            <text x={labelX} y={maxYpx + labelDir * 3}
                                textAnchor={labelAnchor} dominantBaseline="middle"
                                fontSize={SVG_FONT_SIZE.sm} fill={SVG_COLOR.muted}
                                fontFamily={SVG_FONT_FAMILY}>
                                allow={allowLabel}
                            </text>
                        )}
                    </g>
                )}

                {/* Placeholder when EI>0 but deflection is zero */}
                {absMax <= 1e-10 && EI > 0 && (
                    <text x={W / 2} y={beamY + 50} textAnchor="middle" dominantBaseline="middle"
                        fontSize={SVG_FONT_SIZE.md} fill={SVG_COLOR.muted}
                        fontFamily={SVG_FONT_FAMILY}>
                        たわみなし
                    </text>
                )}
            </g>
        </svg>
    );
};

// --- Custom Card Component ---

const DeflectionComponent: React.FC<CardComponentProps> = ({ card, actions, upstreamCards, upstreamInputConfigs }) => {
    const unitMode = (card.unitMode || 'mm') as UnitMode;

    const t = (key: string) => ja[key as JaKey] ?? key;

    // Resolve diagramModel from upstream
    const diagramRef = card.inputs['diagramModel']?.ref;
    const model = diagramRef
        ? (upstreamCards.find(c => c.id === diagramRef.cardId)?.outputs[diagramRef.outputKey] as unknown as DiagramModel)
        : null;

    const hasModel = model != null && typeof model === 'object';

    // Resolve E and I for the visualization
    const E = resolveInput(card, 'E', upstreamCards);
    const I = resolveInput(card, 'I', upstreamCards);

    const resultFields = [
        { key: 'delta_max',   label: t('card.deflection.outputs.delta_max'),   unitType: 'length' as const },
        { key: 'delta_allow', label: t('card.deflection.outputs.delta_allow'),  unitType: 'length' as const },
        { key: 'ratio',       label: t('card.deflection.outputs.ratio'),         unitType: 'ratio'  as const },
    ];

    const delta_max   = card.outputs['delta_max']   ?? 0;
    const delta_allow = card.outputs['delta_allow']  ?? 0;

    const ctxValue = { cardId: card.id, card, actions, upstreamCards, upstreamInputConfigs, unitMode };

    return (
        <BaseCard card={card} icon={<ArrowDown size={18} />} color="border-violet-400">
            <CardProvider value={ctxValue}>
            <div className="flex flex-col gap-4">

                {/* diagramModel input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {t('card.deflection.inputs.diagramModel')}
                    </span>
                    <div className="w-24">
                        <CardSmartInput inputKey="diagramModel" inputType="none" placeholder="ref" />
                    </div>
                </div>

                {/* E input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {t('card.deflection.inputs.E')}
                        <span className="text-xs text-slate-400 font-normal ml-1">[{getUnitLabel('modulus', unitMode)}]</span>
                    </span>
                    <div className="w-24">
                        <CardSmartInput inputKey="E" inputType="modulus" placeholder="205" />
                    </div>
                </div>

                {/* I input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {t('card.deflection.inputs.I')}
                        <span className="text-xs text-slate-400 font-normal ml-1">[{getUnitLabel('inertia', unitMode)}]</span>
                    </span>
                    <div className="w-24">
                        <CardSmartInput inputKey="I" inputType="inertia" placeholder="0" />
                    </div>
                </div>

                {/* n_allow input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {t('card.deflection.inputs.n_allow')}
                    </span>
                    <div className="w-24">
                        <CardSmartInput inputKey="n_allow" inputType="none" placeholder="300" />
                    </div>
                </div>

                {/* Visualization */}
                {hasModel ? (
                    <div className="w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden" style={{ height: 200 }}>
                        <DeflectionSvg
                            model={model}
                            E={E}
                            I={I}
                            delta_max={delta_max}
                            delta_allow={delta_allow}
                            unitMode={unitMode}
                        />
                    </div>
                ) : (
                    <div className="w-full bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-400 italic" style={{ height: 80 }}>
                        {t('card.deflection.noModel')}
                    </div>
                )}

                {/* Error */}
                {card.error && (
                    <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 font-mono break-all">
                        ⚠ {card.error}
                    </div>
                )}

                {/* Results */}
                {!card.error && (
                    <ResultsPanel cardId={card.id} outputs={card.outputs} fields={resultFields} unitMode={unitMode} />
                )}
            </div>
            </CardProvider>
        </BaseCard>
    );
};

// --- Definition ---

export const DeflectionCardDef = createCardDefinition({
    type: 'DEFLECTION',
    title: ja['card.deflection.title'],
    icon: ArrowDown,
    description: ja['card.deflection.description'],

    defaultInputs: {
        diagramModel: { value: '' },
        E: { value: 205000 },   // N/mm² (steel)
        I: { value: 0 },
        n_allow: { value: 300 },
    },

    inputConfig: {
        diagramModel: { label: ja['card.deflection.inputs.diagramModel'], unitType: 'none' },
        E: { label: ja['card.deflection.inputs.E'], unitType: 'modulus' },
        I: { label: ja['card.deflection.inputs.I'], unitType: 'inertia' },
        n_allow: { label: ja['card.deflection.inputs.n_allow'], unitType: 'none' },
    },

    outputConfig: {
        delta_max:   { label: ja['card.deflection.outputs.delta_max'],   unitType: 'length' },
        delta_allow: { label: ja['card.deflection.outputs.delta_allow'],  unitType: 'length' },
        ratio:       { label: ja['card.deflection.outputs.ratio'],         unitType: 'ratio' },
    },

    calculate: (inputs) => {
        const model = inputs['diagramModel'] as unknown as DiagramModel;
        if (!model || typeof model !== 'object') {
            return { delta_max: 0, delta_allow: 0, ratio: 0 };
        }

        const E = inputs['E'] || 0;
        const I = inputs['I'] || 0;
        const n_allow = inputs['n_allow'] || 300;
        const EI = E * I;

        const delta_max   = EI > 0 ? calculateMaxDeflection(model, EI) : 0;
        const L           = model.L || 0;
        const delta_allow = n_allow > 0 ? L / n_allow : 0;
        const ratio       = delta_allow > 0 ? delta_max / delta_allow : 0;

        return { delta_max, delta_allow, ratio };
    },

    component: DeflectionComponent,
    sidebar: { category: 'beam', order: 6 },
});

import { registry } from '../../lib/registry/registry';
registry.register(DeflectionCardDef);
