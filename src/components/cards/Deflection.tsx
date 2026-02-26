
import React from 'react';
import { ArrowDown, Pin } from 'lucide-react';
import { clsx } from 'clsx';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { BaseCard } from './common/BaseCard';
import { SmartInput } from '../common/SmartInput';
import { formatOutput, getUnitLabel, type UnitMode } from '../../lib/utils/unitFormatter';
import {
    calculateMaxDeflection,
    calculateDeflectionProfile,
    type DiagramModel,
    type BoundaryType,
} from '../../lib/mechanics/beam';
import { DrawFixedSupport, DrawPinSupport, DrawRollerSupport } from './common/beamSvgHelpers';
import { resolveInput } from '../../lib/utils/cardHelpers';
import { useTsumikiStore } from '../../store/useTsumikiStore';
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
    const color = isOk ? '#3b82f6' : '#ef4444';

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
                    stroke="#475569" strokeWidth="3" strokeLinecap="round" />

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
                <text x={beamX0} y={beamY + 24} textAnchor="middle" fontSize="9" fill="#94a3b8">x=0</text>

                {/* Max deflection marker — dashed vertical + dot, labels between dot and beam line */}
                {absMax > 1e-10 && (
                    <g>
                        <line x1={maxXpx} y1={beamY} x2={maxXpx} y2={maxYpx}
                            stroke={color} strokeWidth="1" strokeDasharray="3,2" />
                        <circle cx={maxXpx} cy={maxYpx} r={3} fill={color} />
                        <text x={labelX} y={maxYpx + labelDir * 14}
                            textAnchor={labelAnchor} fontSize="9"
                            fill={color} fontWeight="600">
                            δ={deltaLabel}
                        </text>
                        {delta_allow > 0 && (
                            <text x={labelX} y={maxYpx + labelDir * 3}
                                textAnchor={labelAnchor} fontSize="9" fill="#94a3b8">
                                allow={allowLabel}
                            </text>
                        )}
                    </g>
                )}

                {/* Placeholder when EI>0 but deflection is zero */}
                {absMax <= 1e-10 && EI > 0 && (
                    <text x={W / 2} y={beamY + 50} textAnchor="middle" fontSize="10" fill="#94a3b8">
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
    const { pinnedOutputs, pinOutput, unpinOutput } = useTsumikiStore();

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
    const ratio       = card.outputs['ratio']        ?? 0;

    return (
        <BaseCard card={card} icon={<ArrowDown size={18} />} color="border-violet-400">
            <div className="flex flex-col gap-4">

                {/* diagramModel input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {t('card.deflection.inputs.diagramModel')}
                    </span>
                    <div className="w-24">
                        <SmartInput
                            cardId={card.id}
                            inputKey="diagramModel"
                            card={card}
                            actions={actions}
                            upstreamCards={upstreamCards}
                            upstreamInputConfigs={upstreamInputConfigs}
                            placeholder="ref"
                            unitMode={unitMode}
                            inputType="none"
                        />
                    </div>
                </div>

                {/* E input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {t('card.deflection.inputs.E')}
                        <span className="text-xs text-slate-400 font-normal ml-1">[{getUnitLabel('modulus', unitMode)}]</span>
                    </span>
                    <div className="w-24">
                        <SmartInput
                            cardId={card.id}
                            inputKey="E"
                            card={card}
                            actions={actions}
                            upstreamCards={upstreamCards}
                            upstreamInputConfigs={upstreamInputConfigs}
                            placeholder="205"
                            unitMode={unitMode}
                            inputType="modulus"
                        />
                    </div>
                </div>

                {/* I input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {t('card.deflection.inputs.I')}
                        <span className="text-xs text-slate-400 font-normal ml-1">[{getUnitLabel('inertia', unitMode)}]</span>
                    </span>
                    <div className="w-24">
                        <SmartInput
                            cardId={card.id}
                            inputKey="I"
                            card={card}
                            actions={actions}
                            upstreamCards={upstreamCards}
                            upstreamInputConfigs={upstreamInputConfigs}
                            placeholder="0"
                            unitMode={unitMode}
                            inputType="inertia"
                        />
                    </div>
                </div>

                {/* n_allow input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {t('card.deflection.inputs.n_allow')}
                    </span>
                    <div className="w-24">
                        <SmartInput
                            cardId={card.id}
                            inputKey="n_allow"
                            card={card}
                            actions={actions}
                            upstreamCards={upstreamCards}
                            upstreamInputConfigs={upstreamInputConfigs}
                            placeholder="300"
                            unitMode={unitMode}
                            inputType="none"
                        />
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
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('ui.results')}</label>
                        <div className="bg-slate-800 shadow-inner text-white rounded-lg p-3 space-y-2 font-mono text-sm overflow-hidden">
                            {resultFields.map(({ key, label, unitType }) => {
                                const isPinned = pinnedOutputs.some(p => p.cardId === card.id && p.outputKey === key);
                                const value = card.outputs[key];
                                const isRatio = unitType === 'ratio';
                                const ratioOk = isRatio && (value ?? 0) <= 1.0;
                                return (
                                    <div key={key} className="flex justify-between items-center gap-2 border-b border-slate-700/50 last:border-0 pb-1 last:pb-0">
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => isPinned ? unpinOutput(card.id, key) : pinOutput(card.id, key)}
                                                className={clsx(
                                                    'p-0.5 rounded transition-colors',
                                                    isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-300'
                                                )}
                                                title={isPinned ? t('ui.unpin') : t('ui.pinToPanel')}
                                            >
                                                <Pin size={10} />
                                            </button>
                                            <span className="text-slate-400 text-xs">{label}:</span>
                                        </div>
                                        <span
                                            className={clsx(
                                                'truncate text-right w-full font-mono text-sm',
                                                isRatio
                                                    ? ratioOk ? 'text-emerald-400' : 'text-rose-400'
                                                    : 'text-emerald-400'
                                            )}
                                            title={value?.toString()}
                                        >
                                            {formatOutput(value, unitType, unitMode)}
                                            {unitType !== 'ratio' && unitType !== 'none' && (
                                                <span className="text-slate-500 ml-1 text-[10px]">{getUnitLabel(unitType, unitMode)}</span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
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
    sidebar: { category: 'analysis', order: 3 },
});
