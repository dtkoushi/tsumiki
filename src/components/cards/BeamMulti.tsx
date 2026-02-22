
import React from 'react';
import { GitBranch, Plus, X, Pin } from 'lucide-react';
import { clsx } from 'clsx';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import type { Card } from '../../types';
import { BaseCard } from './common/BaseCard';
import { SmartInput } from '../common/SmartInput';
import { formatOutput, getUnitLabel, type OutputUnitType, type UnitMode } from '../../lib/utils/unitFormatter';
import { BeamFormulas, BeamSuperposition, type BeamResult } from '../../lib/mechanics/beam';
import { useTsumikiStore } from '../../store/useTsumikiStore';

// Subset of OutputUnitType that SmartInput accepts
type SmartInputType = 'length' | 'force' | 'moment' | 'load' | 'stress' | 'modulus' | 'none';

// --- Types ---

type LoadType = 'point' | 'moment' | 'dist';

interface LoadRow {
    n: number;
    type: LoadType;
    a: number;
    b: number;
    val: number;
}

interface BeamMultiOutputs {
    M_max: number;
    V_max: number;
    Mx: number;
    Qx: number;
}

// --- Helpers ---

function resolveInput(card: Card, key: string, upstreamCards: Card[]): number {
    const inp = card.inputs[key];
    if (!inp) return 0;
    if (inp.ref) {
        const src = upstreamCards.find(c => c.id === inp.ref!.cardId);
        return src?.outputs[inp.ref!.outputKey] ?? 0;
    }
    return Number(inp.value ?? 0);
}

function evalSuperposition(L: number, loads: LoadRow[], x: number): BeamResult {
    let M = 0;
    let Q = 0;
    for (const load of loads) {
        if (L <= 0) continue;
        let contrib: BeamResult = { M: 0, Q: 0 };
        if (load.type === 'point') {
            contrib = BeamFormulas.simple_point(L, load.val, load.a, x);
        } else if (load.type === 'moment') {
            contrib = BeamSuperposition.simple_moment(L, load.val, load.a, x);
        } else if (load.type === 'dist') {
            contrib = BeamSuperposition.simple_partial_uniform(L, load.val, load.a, load.b, x);
        }
        M += contrib.M;
        Q += contrib.Q;
    }
    return { M, Q };
}

// --- Load type options ---

const LOAD_TYPE_OPTIONS: { value: LoadType; label: string }[] = [
    { value: 'point', label: 'Point Load (P)' },
    { value: 'moment', label: 'Moment (M0)' },
    { value: 'dist', label: 'Dist. Load (w)' },
];

const getValUnitType = (type: LoadType): SmartInputType => {
    if (type === 'moment') return 'moment';
    if (type === 'dist') return 'load';
    return 'force';
};

const getValLabel = (type: LoadType): string => {
    if (type === 'moment') return 'M0';
    if (type === 'dist') return 'w';
    return 'P';
};

// ─── SVG Visualization ────────────────────────────────────────────────────────

const BeamMultiSvg: React.FC<CardComponentProps> = ({ card, upstreamCards }) => {
    const W = 380, H = 160;
    const beamX0 = 40, beamX1 = 340;
    const beamY = 110;
    const loadTop = 22;        // top of load arrow area
    const loadH = beamY - loadTop - 6; // usable height for loads
    const unitMode = (card.unitMode || 'mm') as UnitMode;

    const L = resolveInput(card, 'L', upstreamCards) || 4000;
    const x_loc = resolveInput(card, 'x_loc', upstreamCards);

    const toX = (mm: number): number => {
        if (L <= 0) return beamX0;
        return beamX0 + Math.min(Math.max(mm / L, 0), 1) * (beamX1 - beamX0);
    };

    const loadIndices = Object.keys(card.inputs)
        .filter(k => /^load_type_\d+$/.test(k))
        .map(k => parseInt(k.split('_')[2]))
        .sort((a, b) => a - b);

    const ms = 8; // marker size

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">

            {/* x_loc dashed marker */}
            {x_loc > 0 && x_loc < L && (
                <line
                    x1={toX(x_loc)} y1={loadTop - 4}
                    x2={toX(x_loc)} y2={beamY}
                    stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3"
                />
            )}

            {/* Loads */}
            {loadIndices.map(n => {
                const loadType = (card.inputs[`load_type_${n}`]?.value as LoadType) || 'point';
                const a = resolveInput(card, `a_${n}`, upstreamCards);
                const rawB = resolveInput(card, `b_${n}`, upstreamCards);
                const b = rawB > a ? rawB : a + L * 0.25; // fallback for unset b

                if (loadType === 'point') {
                    const ax = toX(a);
                    return (
                        <g key={n}>
                            <line x1={ax} y1={loadTop} x2={ax} y2={beamY - 1}
                                stroke="#ef4444" strokeWidth="2" />
                            {/* Arrowhead */}
                            <polygon
                                points={`${ax - 5},${beamY - ms - 2} ${ax + 5},${beamY - ms - 2} ${ax},${beamY}`}
                                fill="#ef4444"
                            />
                            <text x={ax} y={loadTop - 4}
                                textAnchor="middle" fontSize="9" fill="#ef4444" fontWeight="600">
                                P{n}
                            </text>
                        </g>
                    );
                }

                if (loadType === 'moment') {
                    const ax = toX(a);
                    const r = 18;
                    const cy_m = beamY - 42;
                    // 270° CCW arc (visually): right→top→left→bottom
                    // In SVG coords: x = ax+r·cos(θ), y = cy_m - r·sin(θ), θ: 0 → 3π/2
                    const N = 20;
                    const pts = Array.from({ length: N + 1 }, (_, i) => {
                        const angle = (i / N) * (3 * Math.PI / 2);
                        return `${ax + r * Math.cos(angle)},${cy_m - r * Math.sin(angle)}`;
                    });
                    // endpoint at θ=3π/2: (ax, cy_m+r), tangent points rightward
                    const ex = ax;
                    const ey = cy_m + r;
                    return (
                        <g key={n}>
                            <polyline points={pts.join(' ')}
                                fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
                            {/* Arrowhead pointing right */}
                            <polygon
                                points={`${ex - 7},${ey - 4} ${ex + 5},${ey} ${ex - 7},${ey + 4}`}
                                fill="#8b5cf6"
                            />
                            <text x={ax + r + 4} y={cy_m + 4}
                                textAnchor="start" fontSize="9" fill="#8b5cf6" fontWeight="600">
                                M{n}
                            </text>
                        </g>
                    );
                }

                if (loadType === 'dist') {
                    const ax = toX(a);
                    const bx = toX(b);
                    const distW = Math.max(bx - ax, 6);
                    const rectTop = loadTop + 4;
                    const numArrows = Math.max(2, Math.round(distW / 28) + 1);
                    return (
                        <g key={n}>
                            {/* Fill */}
                            <rect x={ax} y={rectTop} width={distW} height={beamY - rectTop}
                                fill="rgba(59,130,246,0.08)" stroke="none" />
                            {/* Top line */}
                            <line x1={ax} y1={rectTop} x2={ax + distW} y2={rectTop}
                                stroke="#3b82f6" strokeWidth="1.5" />
                            {/* Side verticals */}
                            <line x1={ax} y1={rectTop} x2={ax} y2={beamY}
                                stroke="#3b82f6" strokeWidth="1" />
                            <line x1={ax + distW} y1={rectTop} x2={ax + distW} y2={beamY}
                                stroke="#3b82f6" strokeWidth="1" />
                            {/* Arrows */}
                            {Array.from({ length: numArrows }, (_, i) => {
                                const tx = ax + (numArrows > 1 ? (i / (numArrows - 1)) * distW : distW / 2);
                                return (
                                    <g key={i}>
                                        <line x1={tx} y1={rectTop + 2} x2={tx} y2={beamY - 1}
                                            stroke="#3b82f6" strokeWidth="1" />
                                        <polygon
                                            points={`${tx - 4},${beamY - ms} ${tx + 4},${beamY - ms} ${tx},${beamY}`}
                                            fill="#3b82f6"
                                        />
                                    </g>
                                );
                            })}
                            <text x={ax + distW / 2} y={rectTop - 4}
                                textAnchor="middle" fontSize="9" fill="#3b82f6" fontWeight="600">
                                w{n}
                            </text>
                        </g>
                    );
                }

                return null;
            })}

            {/* Beam line */}
            <line x1={beamX0} y1={beamY} x2={beamX1} y2={beamY}
                stroke="#475569" strokeWidth="3" strokeLinecap="round" />

            {/* Pin support (left) */}
            <polygon
                points={`${beamX0 - ms},${beamY + ms * 2} ${beamX0 + ms},${beamY + ms * 2} ${beamX0},${beamY}`}
                fill="none" stroke="#475569" strokeWidth="1.5"
            />
            <line x1={beamX0 - ms - 4} y1={beamY + ms * 2}
                x2={beamX0 + ms + 4} y2={beamY + ms * 2}
                stroke="#475569" strokeWidth="1.5" />

            {/* Roller support (right) */}
            <circle cx={beamX1} cy={beamY + ms} r={ms}
                fill="none" stroke="#475569" strokeWidth="1.5" />
            <line x1={beamX1 - ms - 4} y1={beamY + ms * 2}
                x2={beamX1 + ms + 4} y2={beamY + ms * 2}
                stroke="#475569" strokeWidth="1.5" />

            {/* x_loc label */}
            {x_loc > 0 && x_loc < L && (() => {
                const xpx = toX(x_loc);
                const label = unitMode === 'm'
                    ? `x=${(x_loc / 1000).toFixed(2)}m`
                    : `x=${x_loc.toFixed(0)}mm`;
                return (
                    <text x={xpx + 3} y={loadTop + 8}
                        fontSize="8" fill="#94a3b8" dominantBaseline="middle">
                        {label}
                    </text>
                );
            })()}
        </svg>
    );
};

// ─── Custom Card Component ─────────────────────────────────────────────────────

const BeamMultiComponent: React.FC<CardComponentProps> = ({ card, actions, upstreamCards }) => {
    const unitMode = (card.unitMode || 'mm') as UnitMode;
    const { pinnedOutputs, pinOutput, unpinOutput } = useTsumikiStore();

    const loadIndices = Object.keys(card.inputs)
        .filter(k => /^load_type_\d+$/.test(k))
        .map(k => parseInt(k.split('_')[2]))
        .sort((a, b) => a - b);

    const handleAddLoad = () => {
        const next = loadIndices.length > 0 ? Math.max(...loadIndices) + 1 : 1;
        actions.updateInput(card.id, `load_type_${next}`, 'point');
        actions.updateInput(card.id, `a_${next}`, 0);
        actions.updateInput(card.id, `val_${next}`, 0);
    };

    const handleRemoveLoad = (n: number) => {
        actions.removeInput(card.id, `load_type_${n}`);
        actions.removeInput(card.id, `a_${n}`);
        actions.removeInput(card.id, `b_${n}`);
        actions.removeInput(card.id, `val_${n}`);
    };

    const RESULT_FIELDS = [
        { key: 'M_max', label: 'M_max', unitType: 'moment' as OutputUnitType },
        { key: 'V_max', label: 'V_max', unitType: 'force' as OutputUnitType },
        { key: 'Mx', label: 'Mx', unitType: 'moment' as OutputUnitType },
        { key: 'Qx', label: 'Qx', unitType: 'force' as OutputUnitType },
    ];

    return (
        <BaseCard card={card} icon={<GitBranch size={18} />} color="border-purple-400">
            <div className="flex flex-col gap-4">

                {/* ── Span & Check Location ── */}
                <div className="space-y-2">
                    {([
                        { key: 'L', label: 'Span (L)', unitType: 'length' as SmartInputType },
                        { key: 'x_loc', label: 'Check Location (x)', unitType: 'length' as SmartInputType },
                    ]).map(({ key, label, unitType }) => (
                        <div key={key} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                            <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                                {label} <span className="text-xs text-slate-400 font-normal">({key})</span>
                            </span>
                            <div className="w-24">
                                <SmartInput
                                    cardId={card.id}
                                    inputKey={key}
                                    card={card}
                                    actions={actions}
                                    upstreamCards={upstreamCards}
                                    placeholder={getUnitLabel(unitType, unitMode)}
                                    unitMode={unitMode}
                                    inputType={unitType}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Loads ── */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between pb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Loads
                        </label>
                        <button
                            onClick={handleAddLoad}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                            <Plus size={12} /> Add Load
                        </button>
                    </div>

                    {loadIndices.length === 0 && (
                        <div className="text-xs text-slate-400 italic text-center py-2">
                            Add Load ボタンで荷重を追加してください
                        </div>
                    )}

                    {loadIndices.map(n => {
                        const loadTypeVal = (card.inputs[`load_type_${n}`]?.value as LoadType) || 'point';
                        const isDist = loadTypeVal === 'dist';
                        const valUnitType = getValUnitType(loadTypeVal);

                        return (
                            <div key={n} className="flex flex-col gap-2 px-2 py-2 border-b border-slate-100 last:border-0">
                                {/* Type + remove */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 w-8 shrink-0">#{n}</span>
                                    <div className="flex-1 relative">
                                        <select
                                            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded px-2 py-1.5 pr-6 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-100"
                                            value={loadTypeVal}
                                            onChange={(e) => {
                                                actions.updateInput(card.id, `load_type_${n}`, e.target.value);
                                                if (e.target.value !== 'dist') {
                                                    actions.removeInput(card.id, `b_${n}`);
                                                }
                                            }}
                                        >
                                            {LOAD_TYPE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                                            <svg className="fill-current h-3 w-3" viewBox="0 0 20 20">
                                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveLoad(n)}
                                        disabled={loadIndices.length <= 1}
                                        className="text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors shrink-0"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* Inputs */}
                                <div className={`grid ${isDist ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pl-8`}>
                                    <div>
                                        <div className="text-[10px] text-slate-400 mb-0.5">
                                            {isDist ? `a [${getUnitLabel('length', unitMode)}]` : `pos [${getUnitLabel('length', unitMode)}]`}
                                        </div>
                                        <SmartInput
                                            cardId={card.id}
                                            inputKey={`a_${n}`}
                                            card={card}
                                            actions={actions}
                                            upstreamCards={upstreamCards}
                                            placeholder="0"
                                            unitMode={unitMode}
                                            inputType="length"
                                        />
                                    </div>
                                    {isDist && (
                                        <div>
                                            <div className="text-[10px] text-slate-400 mb-0.5">
                                                b [{getUnitLabel('length', unitMode)}]
                                            </div>
                                            <SmartInput
                                                cardId={card.id}
                                                inputKey={`b_${n}`}
                                                card={card}
                                                actions={actions}
                                                upstreamCards={upstreamCards}
                                                placeholder="0"
                                                unitMode={unitMode}
                                                inputType="length"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-[10px] text-slate-400 mb-0.5">
                                            {getValLabel(loadTypeVal)} [{getUnitLabel(valUnitType, unitMode)}]
                                        </div>
                                        <SmartInput
                                            cardId={card.id}
                                            inputKey={`val_${n}`}
                                            card={card}
                                            actions={actions}
                                            upstreamCards={upstreamCards}
                                            placeholder="0"
                                            unitMode={unitMode}
                                            inputType={valUnitType}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Visualization ── */}
                <div className="w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden" style={{ height: 160 }}>
                    <BeamMultiSvg card={card} actions={actions} upstreamCards={upstreamCards} />
                </div>

                {/* ── Error ── */}
                {card.error && (
                    <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 font-mono break-all">
                        ⚠ {card.error}
                    </div>
                )}

                {/* ── Results ── */}
                {!card.error && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Results</label>
                        <div className="bg-slate-800 shadow-inner text-white rounded-lg p-3 space-y-2 font-mono text-sm overflow-hidden">
                            {RESULT_FIELDS.map(({ key, label, unitType }) => {
                                const isPinned = pinnedOutputs.some(p => p.cardId === card.id && p.outputKey === key);
                                const value = card.outputs[key];
                                return (
                                    <div key={key} className="flex justify-between items-center gap-2 border-b border-slate-700/50 last:border-0 pb-1 last:pb-0">
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => isPinned ? unpinOutput(card.id, key) : pinOutput(card.id, key)}
                                                className={clsx(
                                                    "p-0.5 rounded transition-colors",
                                                    isPinned ? "text-amber-400 hover:text-amber-300" : "text-slate-600 hover:text-slate-300"
                                                )}
                                                title={isPinned ? 'Unpin' : 'Pin to panel'}
                                            >
                                                <Pin size={10} />
                                            </button>
                                            <span className="text-slate-400 text-xs">{label}:</span>
                                        </div>
                                        <span className="truncate text-right w-full font-mono text-emerald-400" title={value?.toString()}>
                                            {formatOutput(value, unitType, unitMode)}
                                            <span className="text-slate-500 ml-1 text-[10px]">{getUnitLabel(unitType, unitMode)}</span>
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

// ─── Card Definition ───────────────────────────────────────────────────────────

export const BeamMultiCardDef = createCardDefinition<BeamMultiOutputs>({
    type: 'BEAM_MULTI',
    title: 'Beam (Multi-Load)',
    icon: GitBranch,
    description: 'Superposition of multiple loads on a simply supported beam.',

    defaultInputs: {
        L: { value: 4000 },
        x_loc: { value: 2000 },
        load_type_1: { value: 'point' },
        a_1: { value: 1333 },
        val_1: { value: 1000 },
    },

    inputConfig: {
        L: { label: 'Span', unitType: 'length', default: 4000 },
        x_loc: { label: 'Check Location', unitType: 'length', default: 2000 },
    },

    outputConfig: {
        M_max: { label: 'M_max', unitType: 'moment' },
        V_max: { label: 'V_max', unitType: 'force' },
        Mx: { label: 'Mx', unitType: 'moment' },
        Qx: { label: 'Qx', unitType: 'force' },
    },

    calculate: (inputs, rawInputs) => {
        const L = inputs['L'] || 4000;
        const x_loc = inputs['x_loc'] || 0;

        const loadIndices = Object.keys(rawInputs || {})
            .filter(k => /^load_type_\d+$/.test(k))
            .map(k => parseInt(k.split('_')[2]))
            .sort((a, b) => a - b);

        const loads: LoadRow[] = loadIndices.map(n => ({
            n,
            type: ((rawInputs?.[`load_type_${n}`]?.value) as LoadType) || 'point',
            a: inputs[`a_${n}`] || 0,
            b: inputs[`b_${n}`] || 0,
            val: inputs[`val_${n}`] || 0,
        }));

        const { M: Mx, Q: Qx } = evalSuperposition(L, loads, x_loc);

        let M_max = 0;
        let V_max = 0;
        const N = 500;
        for (let i = 0; i <= N; i++) {
            const x = (L / N) * i;
            const { M, Q } = evalSuperposition(L, loads, x);
            if (Math.abs(M) > Math.abs(M_max)) M_max = M;
            if (Math.abs(Q) > V_max) V_max = Math.abs(Q);
        }

        return { M_max, V_max, Mx, Qx };
    },

    component: BeamMultiComponent,
});
