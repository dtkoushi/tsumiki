
import React from 'react';
import { Calculator, Link } from 'lucide-react';
import { all, create } from 'mathjs';
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import type { CardComponentProps } from '../../lib/registry/types';
import { ja } from '../../lib/i18n/ja';

const math = create(all, {});

// ─── 共有: Formula テキストエリア（visualization スロット）───────────────────

const FormulaView: React.FC<CardComponentProps> = ({ card, actions }) => (
    <div className="w-full p-3 flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Formula{' '}
            <span className="font-normal normal-case text-slate-400">
                （変数: x, x_1, x_2, …）
            </span>
        </label>
        <textarea
            className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                       resize-none h-16"
            value={card.inputs['formula']?.value || ''}
            onChange={e => actions.updateInput(card.id, 'formula', e.target.value)}
            placeholder="例: x^2 + 1  /  sqrt(x)  /  x_1 + x_2"
        />
    </div>
);

// ─── CUSTOM_MAP: 各行の x に formula を適用 → y_1, y_2, … ────────────────────

export const CustomMapDef = createCardDefinition({
    type: 'CUSTOM_MAP',
    title: ja['card.custom.title.map'],
    icon: Calculator,
    description: ja['card.custom.description.map'],

    defaultInputs: {
        formula: { value: 'x + 1' },
        x_1: { value: 0 },
        x_2: { value: 1 },
    },

    inputConfig: {},
    outputConfig: {},

    dynamicInputGroups: [{
        keyPrefix:      'x',
        inputLabel:     ja['card.custom.inputs.varX'],
        inputUnitType:  'none',
        outputKeyFn:    (key) => `y_${key.split('_')[1]}`,
        outputLabel:    ja['card.custom.outputs.resultY'],
        outputUnitType: 'none',
        defaultValue:   0,
        minCount:       1,
        addLabel:       ja['card.custom.addLabel'],
        outputIndexFn:  (key) => { const m = key.match(/^y_(\d+)$/); return m ? m[1] : null; },
        // showOutputFn 省略 → 常に y_i 行を表示（デフォルト挙動）
    }],

    calculate: (inputs, rawInputs) => {
        const formula = rawInputs?.['formula']?.value;
        if (typeof formula !== 'string' || !formula.trim()) return {};

        const allX: Record<string, number> = {};
        Object.entries(inputs)
            .filter(([k]) => /^x_\d+$/.test(k))
            .forEach(([k, v]) => { allX[k] = v as number; });

        const outputs: Record<string, number> = {};
        Object.entries(allX)
            .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
            .forEach(([key, xVal]) => {
                const idx = key.split('_')[1];
                try {
                    const r = math.evaluate(formula, { x: xVal, ...allX });
                    outputs[`y_${idx}`] = typeof r === 'number' && !isNaN(r) ? r : Number(r);
                } catch { outputs[`y_${idx}`] = 0; }
            });
        return outputs;
    },

    visualization: FormulaView,
    sidebar: { category: 'verify', order: 2 },
});

// ─── CUSTOM_COMBINE: 複数変数 x_1, x_2, … を formula で合成 → 単一 result ───

export const CustomCombineDef = createCardDefinition({
    type: 'CUSTOM_COMBINE',
    title: ja['card.custom.title.combine'],
    icon: Link,
    description: ja['card.custom.description.combine'],

    defaultInputs: {
        formula: { value: 'x_1 + x_2' },
        x_1: { value: 0 },
        x_2: { value: 1 },
    },

    inputConfig: {},

    outputConfig: {
        result: { label: ja['card.custom.outputs.result'], unitType: 'none' },
    },

    dynamicInputGroups: [{
        keyPrefix:      'x',
        inputLabel:     ja['card.custom.inputs.varX'],
        inputUnitType:  'none',
        outputKeyFn:    (key) => `y_${key.split('_')[1]}`,  // 使われないが型要件
        outputLabel:    ja['card.custom.outputs.resultY'],
        outputUnitType: 'none',
        defaultValue:   0,
        minCount:       1,
        addLabel:       ja['card.custom.addLabel'],
        showOutputFn:   () => false,   // y_i 出力行を Results に表示しない
    }],

    calculate: (inputs, rawInputs) => {
        const formula = rawInputs?.['formula']?.value;
        if (typeof formula !== 'string' || !formula.trim()) return { result: 0 };

        const allX: Record<string, number> = {};
        Object.entries(inputs)
            .filter(([k]) => /^x_\d+$/.test(k))
            .forEach(([k, v]) => { allX[k] = v as number; });

        try {
            const r = math.evaluate(formula, allX);
            return { result: typeof r === 'number' && !isNaN(r) ? r : Number(r) };
        } catch {
            return { result: 0 };
        }
    },

    visualization: FormulaView,
    sidebar: { category: 'verify', order: 3 },
});

import { registry } from '../../lib/registry/registry';
registry.register(CustomMapDef);
registry.register(CustomCombineDef);
