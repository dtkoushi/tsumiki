
import React from 'react';
import { GitBranch, Plus, X, Pin } from 'lucide-react';
import { clsx } from 'clsx';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { BaseCard } from './common/BaseCard';
import { SmartInput } from '../common/SmartInput';
import { formatOutput, getUnitLabel, type OutputUnitType, type UnitMode } from '../../lib/utils/unitFormatter';
import { calculateBeamMultiMax, type BoundaryType, type LoadType } from '../../lib/mechanics/beam';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import { resolveInput } from '../../lib/utils/cardHelpers';
import {
    getBeamBounds, drawScaledBeamAndSupports, drawScaledDistLoad,
    drawScaledPointLoad, drawScaledMomentLoad, type BoundaryDraw,
} from './common/beamSvgHelpers';
import { AutoFitSvg } from './common/AutoFitSvg';
import { ja } from '../../lib/i18n/ja';

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

// --- Constants ---

const LOAD_TYPE_OPTIONS: { value: LoadType; label: string }[] = [
    { value: 'point', label: ja['card.beamMulti.loadType.point'] },
    { value: 'moment', label: ja['card.beamMulti.loadType.moment'] },
    { value: 'dist', label: ja['card.beamMulti.loadType.dist'] },
];

const BOUNDARY_OPTIONS: { value: BoundaryType; label: string }[] = [
    { value: 'simple', label: ja['card.beamMulti.boundary.simple'] },
    { value: 'fixed_fixed', label: ja['card.beamMulti.boundary.fixedFixed'] },
    { value: 'fixed_pinned', label: ja['card.beamMulti.boundary.fixedPinned'] },
    { value: 'cantilever', label: ja['card.beamMulti.boundary.cantilever'] },
];

const getValUnitType = (type: LoadType): SmartInputType => {
    if (type === 'moment') return 'moment';
    if (type === 'dist') return 'load';
    return 'force';
};

const getValLabelJa = (type: LoadType): string => {
    if (type === 'moment') return ja['card.beamMulti.loadRow.valM0'];
    if (type === 'dist') return ja['card.beamMulti.loadRow.valW'];
    return ja['card.beamMulti.loadRow.valP'];
};

// --- Utilities ---

function getLoadIndices(inputs: Record<string, { value: string | number; ref?: unknown }>): number[] {
    return Object.keys(inputs)
        .filter(k => /^load_type_\d+$/.test(k))
        .map(k => parseInt(k.split('_')[2]))
        .sort((a, b) => a - b);
}

// ─── SVG Visualization (荷重図) ───────────────────────────────────────────────

const BeamMultiSvg: React.FC<CardComponentProps> = ({ card, upstreamCards }) => {
    const L = resolveInput(card, 'L', upstreamCards) || 4000;
    const boundary = ((card.inputs['boundary']?.value) as BoundaryType) || 'simple';

    const loadIndices = getLoadIndices(card.inputs);

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

    return (
        <AutoFitSvg bounds={getBeamBounds(L)} height={145} padding={20}>
            {(scale) => (
                <>
                    {drawScaledBeamAndSupports(L, scale, boundary as BoundaryDraw)}
                    {resolvedLoads.map(({ n, type: loadType, a, b: rawB, val }) => {
                        const b = rawB > a ? rawB : a + L * 0.25;
                        const hs = loadType === 'moment' ? scaleMoment(val) : scaleForce(val);
                        if (hs === 0) return null;
                        return (
                            <React.Fragment key={n}>
                                {loadType === 'point'  && drawScaledPointLoad(a, scale, val, `P${n}`, hs)}
                                {loadType === 'moment' && drawScaledMomentLoad(a, scale, val, `M${n}`, hs)}
                                {loadType === 'dist'   && drawScaledDistLoad(a, b, scale, val, `w${n}`, hs)}
                            </React.Fragment>
                        );
                    })}
                </>
            )}
        </AutoFitSvg>
    );
};

// ─── Custom Card Component ─────────────────────────────────────────────────────

const BeamMultiComponentInner: React.FC<CardComponentProps> = ({ card, actions, upstreamCards, upstreamInputConfigs }) => {
    const unitMode = (card.unitMode || 'mm') as UnitMode;
    const pinnedOutputs = useTsumikiStore(state => state.pinnedOutputs);
    const pinOutput = useTsumikiStore(state => state.pinOutput);
    const unpinOutput = useTsumikiStore(state => state.unpinOutput);

    const boundary = ((card.inputs['boundary']?.value) as BoundaryType) || 'simple';

    const loadIndices = getLoadIndices(card.inputs);

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
                    <span className="text-sm text-slate-600 font-medium shrink-0 mr-2">{ja['card.beamMulti.boundary']}</span>
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
                        {ja['card.beamMulti.inputs.span']}
                        <span className="text-xs text-slate-400 font-normal ml-1">[{getUnitLabel('length', unitMode)}]</span>
                    </span>
                    <div className="w-24">
                        <SmartInput
                            cardId={card.id}
                            inputKey="L"
                            card={card}
                            actions={actions}
                            upstreamCards={upstreamCards}
                            upstreamInputConfigs={upstreamInputConfigs}
                            placeholder="0"
                            unitMode={unitMode}
                            inputType="length"
                        />
                    </div>
                </div>

                {/* ── Loads ── */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between pb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {ja['card.beamMulti.loads']}
                        </label>
                        <button
                            onClick={handleAddLoad}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                            <Plus size={12} /> {ja['card.beamMulti.addLoad']}
                        </button>
                    </div>

                    {loadIndices.length === 0 && (
                        <div className="text-xs text-slate-400 italic text-center py-2">
                            {ja['card.beamMulti.emptyLoads']}
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
                                            {isDist ? `${ja['card.beamMulti.loadRow.startA']} [${getUnitLabel('length', unitMode)}]` : `${ja['card.beamMulti.loadRow.posA']} [${getUnitLabel('length', unitMode)}]`}
                                        </div>
                                        <SmartInput
                                            cardId={card.id}
                                            inputKey={`a_${n}`}
                                            card={card}
                                            actions={actions}
                                            upstreamCards={upstreamCards}
                                            upstreamInputConfigs={upstreamInputConfigs}
                                            placeholder="0"
                                            unitMode={unitMode}
                                            inputType="length"
                                        />
                                    </div>
                                    {isDist && (
                                        <div>
                                            <div className="text-[10px] text-slate-400 mb-0.5">
                                                {`${ja['card.beamMulti.loadRow.endB']} [${getUnitLabel('length', unitMode)}]`}
                                            </div>
                                            <SmartInput
                                                cardId={card.id}
                                                inputKey={`b_${n}`}
                                                card={card}
                                                actions={actions}
                                                upstreamCards={upstreamCards}
                                                upstreamInputConfigs={upstreamInputConfigs}
                                                placeholder="0"
                                                unitMode={unitMode}
                                                inputType="length"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-[10px] text-slate-400 mb-0.5">
                                            {`${getValLabelJa(loadTypeVal)} [${getUnitLabel(valUnitType, unitMode)}]`}
                                        </div>
                                        <SmartInput
                                            cardId={card.id}
                                            inputKey={`val_${n}`}
                                            card={card}
                                            actions={actions}
                                            upstreamCards={upstreamCards}
                                            upstreamInputConfigs={upstreamInputConfigs}
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
                <div className="w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ja['ui.results']}</label>
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
                                                title={isPinned ? ja['ui.unpin'] : ja['ui.pinToPanel']}
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
    title: ja['card.beamMulti.title'],
    icon: GitBranch,
    description: ja['card.beamMulti.description'],

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

        const loadIndices = getLoadIndices(rawInputs || {});

        const loads: LoadRow[] = loadIndices.map(n => ({
            n,
            type: ((rawInputs?.[`load_type_${n}`]?.value) as LoadType) || 'point',
            a: inputs[`a_${n}`] || 0,
            b: inputs[`b_${n}`] || 0,
            val: inputs[`val_${n}`] || 0,
        }));

        const model = { type: 'multi' as const, boundary, L, loads };
        const { M_max, V_max } = calculateBeamMultiMax(model);

        return {
            M_max, V_max,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            diagramModel: model as any,
        };
    },

    component: React.memo(BeamMultiComponentInner),
    sidebar: { category: 'loads', order: 2 },
});

import { registry } from '../../lib/registry';
registry.register(BeamMultiCardDef);
