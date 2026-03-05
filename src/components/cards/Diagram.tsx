
import React, { useState } from 'react';
import { BarChart2, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { BaseCard } from './common/BaseCard';
import { CardProvider } from './common/CardContext';
import { CardSmartInput } from './common/CardSmartInput';
import { getUnitLabel, type OutputUnitType, type UnitMode } from '../../lib/utils/unitFormatter';
import { evalDiagramAt, type DiagramModel, type BoundaryType } from '../../lib/mechanics/beam';
import { resolveInput } from '../../lib/utils/cardHelpers';
import { DrawFixedSupport, DrawPinSupport, DrawRollerSupport } from './common/beamSvgHelpers';
import { ResultsPanel } from './common/ResultsPanel';
import { ja } from '../../lib/i18n/ja';

// --- Types ---

interface DiagramOutputs {
    [key: string]: number;
}

// --- Diagram SVG ---

interface DiagramSvgProps {
    model: DiagramModel;
    tab: 'M' | 'Q';
    xPositions: Array<{ n: number; x: number }>;
    unitMode: UnitMode;
    cardId: string;
}

const DiagramSvg: React.FC<DiagramSvgProps> = ({ model, tab, xPositions, unitMode, cardId }) => {
    const W = 380, H = 210;
    const beamX0 = 44, beamX1 = 340;
    const beamY = 110;
    const halfH = 72;

    const L = model.L || 4000;
    const boundary: BoundaryType = 'type' in model && model.type === 'multi'
        ? model.boundary
        : (model as import('../../lib/mechanics/beam').BeamModel).boundary;

    const toXpx = (x: number) => beamX0 + (x / L) * (beamX1 - beamX0);
    const toYpx = (val: number, maxAbs: number) =>
        maxAbs > 0 ? beamY + (val / maxAbs) * halfH : beamY;

    // Compute curve
    const N = 300;
    const pts: { x: number; M: number; Q: number }[] = [];
    for (let i = 0; i <= N; i++) {
        const x = (L / N) * i;
        const { M, Q } = evalDiagramAt(model, x);
        pts.push({ x, M, Q });
    }

    const vals = tab === 'M' ? pts.map(p => p.M) : pts.map(p => p.Q);
    const maxAbs = Math.max(...vals.map(v => Math.abs(v)), 1e-10);

    // Build the full curve polygon:
    // beamX0,beamY → curve points → beamX1,beamY → close
    const curvePointStr = pts
        .map((p, i) => `${toXpx(p.x).toFixed(1)},${toYpx(vals[i], maxAbs).toFixed(1)}`)
        .join(' ');
    const polyPoints = `${beamX0},${beamY} ${curvePointStr} ${beamX1},${beamY}`;

    const clipPosId = `clip-pos-${cardId}`;
    const clipNegId = `clip-neg-${cardId}`;

    // Max value location for label
    const maxIdx = vals.reduce((best, v, i) => Math.abs(v) > Math.abs(vals[best]) ? i : best, 0);
    const maxX = pts[maxIdx]?.x ?? 0;
    const maxVal = vals[maxIdx] ?? 0;
    const maxXpx = toXpx(maxX);
    const maxYpx = toYpx(maxVal, maxAbs);
    const maxLabel = unitMode === 'm'
        ? `${(maxVal / (tab === 'M' ? 1e6 : 1e3)).toFixed(2)} ${tab === 'M' ? 'kNm' : 'kN'}`
        : `${maxVal.toFixed(0)} ${tab === 'M' ? 'Nmm' : 'N'}`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
            <defs>
                <clipPath id={clipPosId}>
                    <rect x={beamX0 - 2} y={beamY} width={beamX1 - beamX0 + 4} height={halfH + 10} />
                </clipPath>
                <clipPath id={clipNegId}>
                    <rect x={beamX0 - 2} y={beamY - halfH - 10} width={beamX1 - beamX0 + 4} height={halfH + 10} />
                </clipPath>
            </defs>

            {/* Filled areas: positive (below beam) = blue, negative (above beam) = red */}
            <polygon points={polyPoints} fill="#3b82f6" fillOpacity={0.18} stroke="none"
                clipPath={`url(#${clipPosId})`} />
            <polygon points={polyPoints} fill="#ef4444" fillOpacity={0.18} stroke="none"
                clipPath={`url(#${clipNegId})`} />

            {/* Zero line (beam) */}
            <line x1={beamX0} y1={beamY} x2={beamX1} y2={beamY}
                stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />

            {/* Curve outline */}
            <polyline
                points={curvePointStr}
                fill="none"
                stroke={tab === 'M' ? '#3b82f6' : '#10b981'}
                strokeWidth="1.5"
            />

            {/* Beam line */}
            <line x1={beamX0} y1={beamY} x2={beamX1} y2={beamY}
                stroke="#475569" strokeWidth="3" strokeLinecap="round" />

            {/* Support symbols */}
            {boundary === 'simple' && <><DrawPinSupport x={beamX0} beamY={beamY} /><DrawRollerSupport x={beamX1} beamY={beamY} /></>}
            {boundary === 'fixed_fixed' && <><DrawFixedSupport x={beamX0} beamY={beamY} side="left" /><DrawFixedSupport x={beamX1} beamY={beamY} side="right" /></>}
            {boundary === 'fixed_pinned' && <><DrawFixedSupport x={beamX0} beamY={beamY} side="left" /><DrawPinSupport x={beamX1} beamY={beamY} /></>}
            {boundary === 'cantilever' && <DrawFixedSupport x={beamX0} beamY={beamY} side="left" />}

            {/* x=0 label */}
            <text x={beamX0} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">x=0</text>

            {/* Max value marker */}
            {Math.abs(maxVal) > 1e-10 && (
                <g>
                    <circle cx={maxXpx} cy={maxYpx} r={3} fill={tab === 'M' ? '#3b82f6' : '#10b981'} />
                    <line x1={maxXpx} y1={beamY} x2={maxXpx} y2={maxYpx}
                        stroke={tab === 'M' ? '#3b82f6' : '#10b981'}
                        strokeWidth="1" strokeDasharray="2,2" />
                    <text
                        x={maxXpx + (maxXpx > (beamX0 + beamX1) / 2 ? -4 : 4)}
                        y={maxYpx - 4}
                        textAnchor={maxXpx > (beamX0 + beamX1) / 2 ? 'end' : 'start'}
                        fontSize="9" fill={tab === 'M' ? '#3b82f6' : '#10b981'} fontWeight="600"
                    >
                        {maxLabel}
                    </text>
                </g>
            )}

            {/* x_n markers */}
            {xPositions.map(({ n, x }) => {
                if (x <= 0 || x >= L) return null;
                const xpx = toXpx(x);
                const result = evalDiagramAt(model, x);
                const val = tab === 'M' ? result.M : result.Q;
                const ypx = toYpx(val, maxAbs);
                const label = unitMode === 'm'
                    ? `${(val / (tab === 'M' ? 1e6 : 1e3)).toFixed(2)} ${tab === 'M' ? 'kNm' : 'kN'}`
                    : `${val.toFixed(0)} ${tab === 'M' ? 'Nmm' : 'N'}`;
                return (
                    <g key={n}>
                        <line x1={xpx} y1={beamY - halfH - 8} x2={xpx} y2={beamY + halfH + 8}
                            stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" />
                        <circle cx={xpx} cy={ypx} r={3} fill="#f59e0b" />
                        <text
                            x={xpx + 4} y={ypx - 4}
                            fontSize="8" fill="#f59e0b" fontWeight="600"
                        >
                            x{n}: {label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// --- Custom Card Component ---

const DiagramComponent: React.FC<CardComponentProps> = ({ card, actions, upstreamCards, upstreamInputConfigs }) => {
    const [tab, setTab] = useState<'M' | 'Q'>('M');
    const unitMode = (card.unitMode || 'mm') as UnitMode;

    // Resolve diagramModel from upstream
    const diagramRef = card.inputs['diagramModel']?.ref;
    const model = diagramRef
        ? (upstreamCards.find(c => c.id === diagramRef.cardId)?.outputs[diagramRef.outputKey] as unknown as DiagramModel)
        : null;

    // Dynamic x positions
    const xIndices = Object.keys(card.inputs)
        .filter(k => /^x_\d+$/.test(k))
        .map(k => parseInt(k.split('_')[1]))
        .sort((a, b) => a - b);

    const handleAddPosition = () => {
        const next = xIndices.length > 0 ? Math.max(...xIndices) + 1 : 1;
        actions.updateInput(card.id, `x_${next}`, 1000);
    };

    const handleRemovePosition = (n: number) => {
        actions.removeInput(card.id, `x_${n}`);
    };

    // Build x positions for SVG
    const xPositions = xIndices.map(n => ({
        n,
        x: resolveInput(card, `x_${n}`, upstreamCards),
    }));

    // Build result fields for outputs panel
    const resultFields: { key: string; label: string; unitType: OutputUnitType }[] = xIndices.flatMap(n => [
        { key: `Mx_${n}`, label: `Mx_${n}`, unitType: 'moment' as OutputUnitType },
        { key: `Qx_${n}`, label: `Qx_${n}`, unitType: 'force' as OutputUnitType },
    ]);

    const ctxValue = { cardId: card.id, card, actions, upstreamCards, upstreamInputConfigs, unitMode };

    return (
        <BaseCard card={card} icon={<BarChart2 size={18} />} color="border-teal-400">
            <CardProvider value={ctxValue}>
            <div className="flex flex-col gap-4">

                {/* Diagram Model Input */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        {ja['card.diagram.inputs.diagramModel']}
                    </span>
                    <div className="w-24">
                        <CardSmartInput inputKey="diagramModel" inputType="none" placeholder="ref" />
                    </div>
                </div>

                {/* Check Positions */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between pb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {ja['card.diagram.checkLocations']}
                        </label>
                        <button
                            onClick={handleAddPosition}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                            <Plus size={12} /> {ja['card.diagram.addLocation']}
                        </button>
                    </div>

                    {xIndices.length === 0 && (
                        <div className="text-xs text-slate-400 italic text-center py-2">
                            検定位置を追加してください
                        </div>
                    )}

                    {xIndices.map(n => (
                        <div key={n} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                            <span className="text-sm text-slate-600 font-medium shrink-0 mr-2">
                                {ja['card.diagram.checkLocations.rowLabel']} (x_{n})
                                <span className="text-xs text-slate-400 font-normal ml-1">[{getUnitLabel('length', unitMode)}]</span>
                            </span>
                            <div className="flex items-center gap-1">
                                <div className="w-24">
                                    <CardSmartInput inputKey={`x_${n}`} inputType="length" placeholder="0" />
                                </div>
                                <button
                                    onClick={() => handleRemovePosition(n)}
                                    className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* SVG Visualization */}
                {model ? (
                    <div className="space-y-0">
                        {/* Tab switcher */}
                        <div className="flex gap-1 mb-1">
                            {(['M', 'Q'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={clsx(
                                        'text-[10px] font-bold px-3 py-1 rounded transition-colors',
                                        tab === t
                                            ? t === 'M'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-emerald-500 text-white'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    )}
                                >
                                    {t} 図
                                </button>
                            ))}
                        </div>
                        <div className="w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden" style={{ height: 210 }}>
                            <DiagramSvg
                                model={model}
                                tab={tab}
                                xPositions={xPositions}
                                unitMode={unitMode}
                                cardId={card.id}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-400 italic" style={{ height: 80 }}>
                        {ja['card.diagram.noModel']}
                    </div>
                )}

                {/* Error */}
                {card.error && (
                    <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 font-mono break-all">
                        ⚠ {card.error}
                    </div>
                )}

                {/* Results */}
                {!card.error && resultFields.length > 0 && (
                    <ResultsPanel cardId={card.id} outputs={card.outputs} fields={resultFields} unitMode={unitMode} />
                )}
            </div>
            </CardProvider>
        </BaseCard>
    );
};

// --- Card Definition ---

export const DiagramCardDef = createCardDefinition<DiagramOutputs>({
    type: 'DIAGRAM',
    title: ja['card.diagram.title'],
    icon: BarChart2,
    description: ja['card.diagram.description'],

    defaultInputs: {
        diagramModel: { value: '' },
        x_1: { value: 1000 },
    },

    inputConfig: {
        diagramModel: { label: ja['card.diagram.inputs.diagramModel'], unitType: 'none' },
    },

    outputConfig: {},

    calculate: (inputs, rawInputs) => {
        const model = inputs['diagramModel'] as unknown as DiagramModel;
        if (!model || typeof model !== 'object') return {};

        const xKeys = Object.keys(rawInputs || {})
            .filter(k => /^x_\d+$/.test(k))
            .map(k => parseInt(k.split('_')[1]))
            .sort((a, b) => a - b);

        const result: Record<string, number> = {};
        for (const n of xKeys) {
            const x = (inputs[`x_${n}`] as number) || 0;
            const { M, Q } = evalDiagramAt(model, x);
            result[`Mx_${n}`] = M;
            result[`Qx_${n}`] = Q;
        }
        return result;
    },

    component: DiagramComponent,
    sidebar: { category: 'beam', order: 5 },
});

import { registry } from '../../lib/registry/registry';
registry.register(DiagramCardDef);
