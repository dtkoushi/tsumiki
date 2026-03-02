
import React from 'react';
import { GitBranch } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps, DynamicMultiGroupConfig } from '../../lib/registry/types';
import { BaseCard } from './common/BaseCard';
import { CardProvider } from './common/CardContext';
import { CardSmartInput } from './common/CardSmartInput';
import { getUnitLabel, type UnitMode } from '../../lib/utils/unitFormatter';
import { calculateBeamMultiMax, type BoundaryType, type LoadType } from '../../lib/mechanics/beam';
import { resolveInput } from '../../lib/utils/cardHelpers';
import {
    getBeamBounds, drawScaledBeamAndSupports, drawScaledDistLoad,
    drawScaledPointLoad, drawScaledMomentLoad, type BoundaryDraw,
} from './common/beamSvgHelpers';
import { AutoFitSvg } from './common/AutoFitSvg';
import { ResultsPanel, type ResultField } from './common/ResultsPanel';
import { DynamicMultiGroupSection } from './common/GenericCard';
import { ja } from '../../lib/i18n/ja';

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

const LOAD_ROW_GROUP: DynamicMultiGroupConfig = {
    groupLabel: ja['card.beamMulti.loads'],
    addLabel: ja['card.beamMulti.addLoad'],
    rowLabel: '荷重',
    minCount: 1,
    fields: [
        {
            keyPrefix: 'load_type',
            label: '種別',
            options: LOAD_TYPE_OPTIONS,
            defaultValue: 'point',
            width: 'md',
        },
        {
            keyPrefix: 'a',
            label: ja['card.beamMulti.loadRow.posA'],
            getLabel: (raw) => raw['load_type'] === 'dist'
                ? ja['card.beamMulti.loadRow.startA']
                : ja['card.beamMulti.loadRow.posA'],
            unitType: 'length',
            defaultValue: 0,
            width: 'sm',
        },
        {
            keyPrefix: 'b',
            label: ja['card.beamMulti.loadRow.endB'],
            unitType: 'length',
            defaultValue: 0,
            hidden: (raw) => raw['load_type'] !== 'dist',
            width: 'sm',
        },
        {
            keyPrefix: 'val',
            label: ja['card.beamMulti.loadRow.valP'],
            getLabel: (raw) => {
                if (raw['load_type'] === 'moment') return ja['card.beamMulti.loadRow.valM0'];
                if (raw['load_type'] === 'dist') return ja['card.beamMulti.loadRow.valW'];
                return ja['card.beamMulti.loadRow.valP'];
            },
            getUnitType: (raw) => {
                if (raw['load_type'] === 'moment') return 'moment';
                if (raw['load_type'] === 'dist') return 'load';
                return 'force';
            },
            defaultValue: 0,
            width: 'sm',
        },
    ],
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

    const boundary = ((card.inputs['boundary']?.value) as BoundaryType) || 'simple';

    const RESULT_FIELDS: ResultField[] = [
        { key: 'M_max', label: 'M_max', unitType: 'moment' },
        { key: 'V_max', label: 'V_max', unitType: 'force' },
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

    const ctxValue = { cardId: card.id, card, actions, upstreamCards, upstreamInputConfigs, unitMode };

    return (
        <BaseCard card={card} icon={<GitBranch size={18} />} color="border-purple-400">
            <CardProvider value={ctxValue}>
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
                        <CardSmartInput inputKey="L" inputType="length" placeholder="0" />
                    </div>
                </div>

                {/* ── Loads ── */}
                <DynamicMultiGroupSection
                    config={LOAD_ROW_GROUP}
                    card={card}
                    actions={actions}
                    upstreamCards={upstreamCards}
                    unitMode={unitMode}
                    upstreamInputConfigs={upstreamInputConfigs}
                />

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
                    <ResultsPanel cardId={card.id} outputs={card.outputs} fields={RESULT_FIELDS} unitMode={unitMode} />
                )}
            </div>
            </CardProvider>
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

import { registry } from '../../lib/registry/registry';
registry.register(BeamMultiCardDef);
