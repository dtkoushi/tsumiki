
import React from 'react';
import { GitBranch, Plus, X, Pin } from 'lucide-react';
import { clsx } from 'clsx';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import type { Card } from '../../types';
import { BaseCard } from './common/BaseCard';
import { SmartInput } from '../common/SmartInput';
import { formatOutput, getUnitLabel, type OutputUnitType, type UnitMode } from '../../lib/utils/unitFormatter';
import { evalSuperposition, type BoundaryType, type LoadType } from '../../lib/mechanics/beam';
import { useTsumikiStore } from '../../store/useTsumikiStore';

// Subset of OutputUnitType that SmartInput accepts
type SmartInputType = 'length' | 'force' | 'moment' | 'load' | 'stress' | 'modulus' | 'none';

// --- Types ---

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


// --- Constants ---

const LOAD_TYPE_OPTIONS: { value: LoadType; label: string }[] = [
    { value: 'point', label: 'Point Load (P)' },
    { value: 'moment', label: 'Moment (M0)' },
    { value: 'dist', label: 'Dist. Load (w)' },
];

const BOUNDARY_OPTIONS: { value: BoundaryType; label: string }[] = [
    { value: 'simple', label: '単純支持' },
    { value: 'fixed_fixed', label: '両端固定' },
    { value: 'fixed_pinned', label: '片端固定・片端ピン' },
    { value: 'cantilever', label: '片持ち梁' },
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

// ─── SVG Visualization (荷重図) ───────────────────────────────────────────────

const BeamMultiSvg: React.FC<CardComponentProps> = ({ card, upstreamCards }) => {
    const W = 380, H = 145;
    const beamX0 = 50, beamX1 = 340;
    const beamY = 105;
    const loadTop = 18;
    const loadH = beamY - loadTop - 4;
    const ms = 8;

    const L = resolveInput(card, 'L', upstreamCards) || 4000;
    const boundary = ((card.inputs['boundary']?.value) as BoundaryType) || 'simple';

    const toX = (mm: number): number => {
        if (L <= 0) return beamX0;
        return beamX0 + Math.min(Math.max(mm / L, 0), 1) * (beamX1 - beamX0);
    };

    const loadIndices = Object.keys(card.inputs)
        .filter(k => /^load_type_\d+$/.test(k))
        .map(k => parseInt(k.split('_')[2]))
        .sort((a, b) => a - b);

    const resolvedLoads = loadIndices.map(n => ({
        n,
        type: (card.inputs[`load_type_${n}`]?.value as LoadType) || 'point',
        a: resolveInput(card, `a_${n}`, upstreamCards),
        b: resolveInput(card, `b_${n}`, upstreamCards),
        val: resolveInput(card, `val_${n}`, upstreamCards),
    }));

    // Force-type and moment scale independently
    const maxForceMag = resolvedLoads
        .filter(l => l.type !== 'moment')
        .reduce((acc, l) => Math.max(acc, Math.abs(l.val)), 0);
    const maxMomentMag = resolvedLoads
        .filter(l => l.type === 'moment')
        .reduce((acc, l) => Math.max(acc, Math.abs(l.val)), 0);

    const scaleForce = (val: number) =>
        maxForceMag <= 0 || Math.abs(val) < 1e-10 ? 0 : 0.15 + 0.85 * (Math.abs(val) / maxForceMag);
    const scaleMoment = (val: number) =>
        maxMomentMag <= 0 || Math.abs(val) < 1e-10 ? 0 : 0.15 + 0.85 * (Math.abs(val) / maxMomentMag);

    const drawFixed = (x: number, side: 'left' | 'right') => {
        const dir = side === 'left' ? -1 : 1;
        const h = 14;
        return (
            <g>
                <line x1={x} y1={beamY - h} x2={x} y2={beamY + h} stroke="#475569" strokeWidth="2" />
                {[-h, -h / 2, 0, h / 2, h].map((dy, i) => (
                    <line key={i} x1={x} y1={beamY + dy}
                        x2={x + dir * 8} y2={beamY + dy + 6}
                        stroke="#475569" strokeWidth="1" />
                ))}
            </g>
        );
    };

    const drawPin = (x: number) => (
        <g>
            <polygon
                points={`${x - ms},${beamY + ms * 2} ${x + ms},${beamY + ms * 2} ${x},${beamY}`}
                fill="none" stroke="#475569" strokeWidth="1.5"
            />
            <line x1={x - ms - 4} y1={beamY + ms * 2}
                x2={x + ms + 4} y2={beamY + ms * 2}
                stroke="#475569" strokeWidth="1.5" />
        </g>
    );

    const drawRoller = (x: number) => (
        <g>
            <circle cx={x} cy={beamY + ms} r={ms}
                fill="none" stroke="#475569" strokeWidth="1.5" />
            <line x1={x - ms - 4} y1={beamY + ms * 2}
                x2={x + ms + 4} y2={beamY + ms * 2}
                stroke="#475569" strokeWidth="1.5" />
        </g>
    );

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
            {/* Loads */}
            {resolvedLoads.map(({ n, type: loadType, a, b: rawB, val }) => {
                const b = rawB > a ? rawB : a + L * 0.25;
                const scale = loadType === 'moment' ? scaleMoment(val) : scaleForce(val);
                if (scale === 0) return null;

                if (loadType === 'point') {
                    const ax = toX(a);
                    const arrowH = loadH * scale;
                    return (
                        <g key={n}>
                            <line x1={ax} y1={beamY - arrowH} x2={ax} y2={beamY - 1}
                                stroke="#ef4444" strokeWidth="2" />
                            <polygon
                                points={`${ax - 5},${beamY - ms - 2} ${ax + 5},${beamY - ms - 2} ${ax},${beamY}`}
                                fill="#ef4444"
                            />
                            <text x={ax} y={beamY - arrowH - 3}
                                textAnchor="middle" fontSize="9" fill="#ef4444" fontWeight="600">
                                P{n}
                            </text>
                        </g>
                    );
                }

                if (loadType === 'moment') {
                    const ax = toX(a);
                    const r = 10 + 12 * scale;
                    const clockwise = val >= 0;
                    const N_pts = 20;
                    const pts = Array.from({ length: N_pts + 1 }, (_, i) => {
                        const angle = (i / N_pts) * (3 * Math.PI / 2);
                        // clockwise (positive): arc goes below beam first
                        // counter-clockwise (negative): arc goes above beam first
                        const py = clockwise
                            ? beamY + r * Math.sin(angle)
                            : beamY - r * Math.sin(angle);
                        return `${ax + r * Math.cos(angle)},${py}`;
                    });
                    // Arrowhead at angle=3π/2: tangent points right, end y flips
                    const ey = clockwise ? beamY - r : beamY + r;
                    return (
                        <g key={n}>
                            <polyline points={pts.join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
                            <polygon
                                points={`${ax - 7},${ey - 4} ${ax + 5},${ey} ${ax - 7},${ey + 4}`}
                                fill="#8b5cf6"
                            />
                            <text x={ax + r + 4} y={beamY + 4}
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
                    const distH = loadH * scale;
                    const rectTop = beamY - distH;
                    const numArrows = Math.max(2, Math.round(distW / 28) + 1);
                    return (
                        <g key={n}>
                            <rect x={ax} y={rectTop} width={distW} height={distH}
                                fill="rgba(59,130,246,0.08)" stroke="none" />
                            <line x1={ax} y1={rectTop} x2={ax + distW} y2={rectTop}
                                stroke="#3b82f6" strokeWidth="1.5" />
                            <line x1={ax} y1={rectTop} x2={ax} y2={beamY}
                                stroke="#3b82f6" strokeWidth="1" />
                            <line x1={ax + distW} y1={rectTop} x2={ax + distW} y2={beamY}
                                stroke="#3b82f6" strokeWidth="1" />
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

            {/* Supports */}
            {boundary === 'simple' && <>{drawPin(beamX0)}{drawRoller(beamX1)}</>}
            {boundary === 'fixed_fixed' && <>{drawFixed(beamX0, 'left')}{drawFixed(beamX1, 'right')}</>}
            {boundary === 'fixed_pinned' && <>{drawFixed(beamX0, 'left')}{drawPin(beamX1)}</>}
            {boundary === 'cantilever' && drawFixed(beamX0, 'left')}

            {/* x=0 label */}
            <text x={beamX0} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">x=0</text>
        </svg>
    );
};

// ─── Custom Card Component ─────────────────────────────────────────────────────

const BeamMultiComponentInner: React.FC<CardComponentProps> = ({ card, actions, upstreamCards }) => {
    const unitMode = (card.unitMode || 'mm') as UnitMode;
    const pinnedOutputs = useTsumikiStore(state => state.pinnedOutputs);
    const pinOutput = useTsumikiStore(state => state.pinOutput);
    const unpinOutput = useTsumikiStore(state => state.unpinOutput);

    const boundary = ((card.inputs['boundary']?.value) as BoundaryType) || 'simple';

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
    ];

    const StyledSelect = ({ value, onChange, options }: {
        value: string;
        onChange: (v: string) => void;
        options: { value: string; label: string }[];
    }) => (
        <div className="relative">
            <select
                className="w-full appearance-none bg-white border border-slate-200 rounded px-2 py-1.5 pr-6 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-50"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                <svg className="fill-current h-3 w-3" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
            </div>
        </div>
    );

    return (
        <BaseCard card={card} icon={<GitBranch size={18} />} color="border-purple-400">
            <div className="flex flex-col gap-4">

                {/* ── Boundary Condition ── */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 font-medium shrink-0 mr-2">Boundary</span>
                    <div className="w-48">
                        <StyledSelect
                            value={boundary}
                            onChange={v => actions.updateInput(card.id, 'boundary', v)}
                            options={BOUNDARY_OPTIONS}
                        />
                    </div>
                </div>

                {/* ── Span ── */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100/50">
                    <span className="text-sm text-slate-600 truncate mr-2 font-medium">
                        Span (L) <span className="text-xs text-slate-400 font-normal">(L)</span>
                    </span>
                    <div className="w-24">
                        <SmartInput
                            cardId={card.id}
                            inputKey="L"
                            card={card}
                            actions={actions}
                            upstreamCards={upstreamCards}
                            placeholder={getUnitLabel('length', unitMode)}
                            unitMode={unitMode}
                            inputType="length"
                        />
                    </div>
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
                                    <div className="flex-1">
                                        <StyledSelect
                                            value={loadTypeVal}
                                            onChange={v => {
                                                actions.updateInput(card.id, `load_type_${n}`, v);
                                                if (v !== 'dist') {
                                                    actions.removeInput(card.id, `b_${n}`);
                                                }
                                            }}
                                            options={LOAD_TYPE_OPTIONS}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveLoad(n)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
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

                {/* ── 荷重図 ── */}
                <div className="w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden" style={{ height: 145 }}>
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
    description: 'Superposition of multiple loads on a beam.',

    defaultInputs: {
        boundary: { value: 'simple' },
        L: { value: 4000 },
        load_type_1: { value: 'point' },
        a_1: { value: 1333 },
        val_1: { value: 1000 },
    },

    inputConfig: {
        boundary: { label: 'Boundary', unitType: 'none', default: 'simple' },
        L: { label: 'Span', unitType: 'length', default: 4000 },
    },

    outputConfig: {
        M_max: { label: 'M_max', unitType: 'moment' },
        V_max: { label: 'V_max', unitType: 'force' },
    },

    calculate: (inputs, rawInputs) => {
        const L = inputs['L'] || 4000;
        const boundary = ((rawInputs?.['boundary']?.value) as BoundaryType) || 'simple';

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

        let M_max = 0;
        let V_max = 0;
        const N = 500;
        for (let i = 0; i <= N; i++) {
            const x = (L / N) * i;
            const { M, Q } = evalSuperposition(L, loads, x, boundary);
            if (Math.abs(M) > Math.abs(M_max)) M_max = M;
            if (Math.abs(Q) > V_max) V_max = Math.abs(Q);
        }

        return {
            M_max, V_max,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            diagramModel: { type: 'multi', boundary, L, loads } as any,
        };
    },

    component: React.memo(BeamMultiComponentInner),
});
