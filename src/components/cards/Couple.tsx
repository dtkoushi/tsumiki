
import React from 'react';
import { Layers, Plus, X } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import type { Card } from '../../types';
import { BaseCard } from './common/BaseCard';
import { SmartInput } from '../common/SmartInput';
import { formatOutput, type UnitMode } from '../../lib/utils/unitFormatter';

// Resolve a SmartInput value (value or ref)
function resolveInput(card: Card, key: string, upstreamCards: Card[]): number {
    const inp = card.inputs[key];
    if (!inp) return 0;
    if (inp.ref) {
        const src = upstreamCards.find(c => c.id === inp.ref!.cardId);
        return src?.outputs[inp.ref!.outputKey] ?? 0;
    }
    return Number(inp.value ?? 0);
}

// Sorted d_* input keys by index
function getDistKeys(card: Card): string[] {
    return Object.keys(card.inputs)
        .filter(k => /^d_\d+$/.test(k))
        .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));
}

// ─── SVG Visualization ────────────────────────────────────────────────────────

const CoupleSvg: React.FC<CardComponentProps> = ({ card, upstreamCards }) => {
    const unitMode = (card.unitMode ?? 'mm') as UnitMode;
    const distKeys = getDistKeys(card);

    const points = distKeys.map(key => {
        const idx = key.split('_')[1];
        const d = resolveInput(card, key, upstreamCards);
        const N = card.outputs[`n_${idx}`] ?? 0;
        return { key, d, N };
    }).filter(p => p.d !== 0);

    if (points.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">
                距離を入力してください
            </div>
        );
    }

    // ── Layout constants ──────────────────────────────────────────────────────
    const W = 230, H = 160;
    const beamCX    = 58;          // beam center x
    const beamW     = 16;
    const beamX1    = beamCX - beamW / 2;
    const beamX2    = beamCX + beamW / 2;
    const cy        = H / 2;       // neutral axis y
    const dExtent   = cy - 18;     // max pixel extent for |d|
    const arrowOX   = beamX2;      // arrow origin x (right edge of beam)
    const arrowMaxL = W - arrowOX - 46; // max pixel length for arrows

    const maxAbsD = Math.max(...points.map(p => Math.abs(p.d)));
    const maxAbsN = Math.max(...points.map(p => Math.abs(p.N)), 1e-12);

    const toY   = (d: number) => cy - (d / maxAbsD) * dExtent;
    const toLen = (N: number) => (N / maxAbsN) * arrowMaxL;

    const dUnit = unitMode === 'm' ? 'm'  : 'mm';
    const nUnit = unitMode === 'm' ? 'kN' : 'N';

    // Stress distribution envelope polygon (valid only when all N same sign)
    const allSameSign =
        points.every(p => p.N >= 0) || points.every(p => p.N <= 0);
    const showEnvelope = allSameSign && points.length >= 2;
    const sortedByD = [...points].sort((a, b) => b.d - a.d);
    const envelopeStr = showEnvelope
        ? [
            ...sortedByD.map(p => `${arrowOX},${toY(p.d)}`),
            ...sortedByD.slice().reverse().map(p => `${arrowOX + toLen(p.N)},${toY(p.d)}`),
          ].join(' ')
        : '';

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">

            {/* Neutral axis */}
            <line
                x1={8} y1={cy} x2={W - 4} y2={cy}
                stroke="#cbd5e1" strokeWidth="1" strokeDasharray="5,3"
            />
            <text x={W - 6} y={cy - 3} textAnchor="end" fontSize="7" fill="#94a3b8">
                N.A.
            </text>

            {/* Beam cross-section */}
            <rect
                x={beamX1} y={cy - dExtent - 2}
                width={beamW} height={dExtent * 2 + 4}
                fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5"
            />

            {/* Stress envelope */}
            {showEnvelope && (
                <polygon
                    points={envelopeStr}
                    fill="rgba(59,130,246,0.09)"
                    stroke="rgba(59,130,246,0.3)"
                    strokeWidth="1"
                    strokeDasharray="3,2"
                />
            )}

            {/* Per-point: dimension marker + force arrow */}
            {points.map(p => {
                const y   = toY(p.d);
                const len = toLen(p.N);
                const endX = arrowOX + len;
                const dir  = len >= 0 ? 1 : -1;
                const dDisplay = formatOutput(Math.abs(p.d), 'length', unitMode);
                const nDisplay = formatOutput(Math.abs(p.N), 'force',  unitMode);

                return (
                    <g key={p.key}>
                        {/* Dimension line (left of beam) */}
                        <line
                            x1={beamX1 - 12} y1={cy}
                            x2={beamX1 - 12} y2={y}
                            stroke="#94a3b8" strokeWidth="0.8"
                        />
                        {/* Tick at neutral axis */}
                        <line
                            x1={beamX1 - 16} y1={cy} x2={beamX1 - 8} y2={cy}
                            stroke="#94a3b8" strokeWidth="0.8"
                        />
                        {/* Tick at point */}
                        <line
                            x1={beamX1 - 16} y1={y} x2={beamX1 - 8} y2={y}
                            stroke="#94a3b8" strokeWidth="0.8"
                        />
                        {/* d label */}
                        <text
                            x={beamX1 - 18}
                            y={(cy + y) / 2}
                            textAnchor="end"
                            fontSize="7.5"
                            fill="#64748b"
                            dominantBaseline="middle"
                        >
                            {dDisplay}{dUnit}
                        </text>

                        {/* Dot at beam right edge */}
                        <circle cx={arrowOX} cy={y} r={2.5} fill="#3b82f6" />

                        {/* Force arrow */}
                        {Math.abs(len) > 3 && (
                            <>
                                <line
                                    x1={arrowOX} y1={y} x2={endX} y2={y}
                                    stroke="#3b82f6" strokeWidth="1.5"
                                />
                                {/* Arrowhead */}
                                <polygon
                                    points={`${endX},${y} ${endX - 6 * dir},${y - 3} ${endX - 6 * dir},${y + 3}`}
                                    fill="#3b82f6"
                                />
                            </>
                        )}

                        {/* N label */}
                        <text
                            x={endX + 4 * dir}
                            y={y}
                            textAnchor={dir > 0 ? 'start' : 'end'}
                            fontSize="7.5"
                            fill="#059669"
                            dominantBaseline="middle"
                        >
                            {nDisplay}{nUnit}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// ─── Full Card Component (replaces GenericCard) ───────────────────────────────

const CoupleCard: React.FC<CardComponentProps> = ({ card, actions, upstreamCards }) => {
    const unitMode = (card.unitMode ?? 'mm') as UnitMode;
    const distKeys = getDistKeys(card);
    const k = card.outputs['k'] ?? 0;

    const handleAddRow = () => {
        const nums = distKeys.map(k => parseInt(k.split('_')[1]));
        const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        actions.updateInput(card.id, `d_${next}`, 500); // 500mm SI default
    };

    const mUnit = unitMode === 'm' ? 'kN·m' : 'N·mm';
    const dUnit = unitMode === 'm' ? 'm'    : 'mm';
    const nUnit = unitMode === 'm' ? 'kN'   : 'N';
    const kUnit = unitMode === 'm' ? 'kN/m' : 'N/mm';

    return (
        <BaseCard card={card} icon={<Layers size={18} />} color="border-purple-400">
            <div className="flex flex-col gap-4">

                {/* ── M Input ── */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                        <span className="text-sm text-slate-600 font-medium truncate mr-2">
                            曲げモーメント M{' '}
                            <span className="text-xs text-slate-400 font-normal">({mUnit})</span>
                        </span>
                        <div className="w-36 shrink-0">
                            <SmartInput
                                cardId={card.id}
                                inputKey="M"
                                card={card}
                                actions={actions}
                                upstreamCards={upstreamCards}
                                inputType="moment"
                                unitMode={unitMode}
                                placeholder={mUnit}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Dynamic d_i → N_i rows ── */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            偶力間距離 → 偶力
                        </label>
                        <button
                            onClick={handleAddRow}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                            <Plus size={12} /> 追加
                        </button>
                    </div>

                    {distKeys.length > 0 && (
                        <div className="grid grid-cols-[1fr_12px_1fr_20px] gap-x-2 items-center px-1">
                            <span className="text-[10px] text-slate-400">d [{dUnit}]</span>
                            <span />
                            <span className="text-[10px] text-slate-400 text-right">N [{nUnit}]</span>
                            <span />
                        </div>
                    )}

                    {distKeys.map(key => {
                        const idx = key.split('_')[1];
                        const N = card.outputs[`n_${idx}`] ?? 0;
                        return (
                            <div key={key} className="grid grid-cols-[1fr_12px_1fr_20px] gap-x-2 items-center">
                                <SmartInput
                                    cardId={card.id}
                                    inputKey={key}
                                    card={card}
                                    actions={actions}
                                    upstreamCards={upstreamCards}
                                    inputType="length"
                                    unitMode={unitMode}
                                    placeholder="0"
                                />
                                <span className="text-slate-300 text-xs text-center">→</span>
                                <div className="text-right font-mono text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-1 truncate">
                                    {formatOutput(N, 'force', unitMode)}
                                </div>
                                <button
                                    onClick={() => actions.removeInput(card.id, key)}
                                    className="text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center"
                                    disabled={distKeys.length <= 1}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}

                    {distKeys.length === 0 && (
                        <div className="text-xs text-slate-400 italic text-center py-2">
                            距離を追加してください
                        </div>
                    )}
                </div>

                {/* ── SVG Visualization ── */}
                <div className="w-full min-h-[140px] bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 relative overflow-hidden">
                    <CoupleSvg card={card} actions={actions} upstreamCards={upstreamCards} />
                </div>

                {/* ── Error ── */}
                {card.error && (
                    <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 font-mono break-all">
                        ⚠ {card.error}
                    </div>
                )}

                {/* ── Results ── */}
                {!card.error && k !== 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Results
                        </label>
                        <div className="bg-slate-800 shadow-inner text-white rounded-lg p-3 font-mono text-sm">
                            <div className="flex justify-between items-end gap-2">
                                <span className="text-slate-400 shrink-0 text-xs mb-0.5">
                                    k = M / Σ(d²):
                                </span>
                                <span className="font-mono text-emerald-400">
                                    {k.toExponential(3)}
                                    <span className="text-slate-500 ml-1 text-[10px]">{kUnit}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BaseCard>
    );
};

// ─── Card Definition ──────────────────────────────────────────────────────────

export const CoupleCardDef = createCardDefinition({
    type: 'COUPLE',
    title: '偶力変換',
    icon: Layers,
    description: '曲げモーメントを線形分布の偶力に変換する（Ni ∝ di）。',

    defaultInputs: {
        M:   { value: 0 },
        d_1: { value: 500 },
        d_2: { value: 300 },
    },

    inputConfig:  {},
    outputConfig: {},

    // All SI: M [Nmm], d_i [mm] → n_i [N], k [N/mm]
    calculate: (inputs) => {
        const M = inputs['M'] ?? 0;

        const distEntries = Object.entries(inputs)
            .filter(([k]) => /^d_\d+$/.test(k))
            .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

        const outputs: Record<string, number> = { k: 0 };

        if (distEntries.length === 0) return outputs;

        const sumD2 = distEntries.reduce((sum, [, d]) => sum + d * d, 0);

        if (sumD2 === 0) {
            distEntries.forEach(([key]) => {
                outputs[`n_${key.split('_')[1]}`] = 0;
            });
            return outputs;
        }

        const k = M / sumD2;
        outputs['k'] = k;

        distEntries.forEach(([key, d]) => {
            outputs[`n_${key.split('_')[1]}`] = k * d;
        });

        return outputs;
    },

    component: CoupleCard,
});
