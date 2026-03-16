import type { Card } from '../../types';
import type { ReportData, ReportCardData, ReportFieldRow } from '../../types/report';
import { registry } from '../registry';
import { formatOutput, getUnitLabel, type OutputUnitType } from './unitFormatter';

interface ProjectMeta {
    title: string;
    author: string;
    memo?: string;
}

/**
 * Builds a ReportData intermediate object from the current card stack.
 * HTML rendering is handled separately in the next step.
 */
export function buildReportData(
    cards: Card[],
    meta: ProjectMeta,
): ReportData {
    const appVersion = (import.meta.env as Record<string, string>).VITE_APP_VERSION ?? 'dev';
    const generatedAt = new Date().toISOString();

    return {
        meta: { ...meta, generatedAt, appVersion },
        cards: cards.map(card => buildCardData(card, cards)),
    };
}

function buildCardData(card: Card, allCards: Card[]): ReportCardData {
    const unitMode = card.unitMode ?? 'mm';

    // NOTE card: no inputs/outputs, just raw text
    if (card.type === 'NOTE') {
        return {
            id: card.id,
            type: card.type,
            alias: card.alias,
            unitMode,
            memo: card.memo,
            error: card.error,
            inputs: [],
            narrative: [],
            outputs: [],
            noteContent: String(card.inputs['content']?.value ?? ''),
        };
    }

    const def = registry.get(card.type);
    if (!def) {
        return {
            id: card.id,
            type: card.type,
            alias: card.alias,
            unitMode,
            memo: card.memo,
            error: card.error,
            inputs: [],
            narrative: [],
            outputs: [],
        };
    }

    const effectiveInputConfig = def.getInputConfig?.(card) ?? def.inputConfig ?? {};

    // --- Standard inputs ---
    const inputRows: ReportFieldRow[] = Object.entries(effectiveInputConfig).map(([key, cfg]) => {
        const unitType = cfg.unitType ?? 'none';
        const value = card.resolvedInputs?.[key] ?? parseFloat(String(card.inputs[key]?.value ?? '0')) ?? 0;
        const refInfo = buildRefInfo(card, key, allCards);
        return {
            key,
            label: cfg.label,
            unitType,
            value,
            displayValue: formatDisplayValue(value, unitType as OutputUnitType, unitMode),
            ...(cfg.symbol ? { symbol: cfg.symbol } : {}),
            ...(refInfo ? { refInfo } : {}),
        };
    });

    // --- dynamicInputGroups ---
    const dynamicInputRows: ReportFieldRow[] = [];
    const dynamicOutputRows: ReportFieldRow[] = [];

    for (const group of def.dynamicInputGroups ?? []) {
        const { keyPrefix, inputLabel, inputUnitType, outputKeyFn, outputLabel, outputUnitType } = group;
        const inputKeys = Object.keys(card.inputs)
            .filter(k => new RegExp(`^${keyPrefix}_\\d+$`).test(k))
            .sort((a, b) => {
                const ai = parseInt(a.split('_').pop()!);
                const bi = parseInt(b.split('_').pop()!);
                return ai - bi;
            });

        for (const inputKey of inputKeys) {
            const iValue = card.resolvedInputs?.[inputKey] ?? parseFloat(String(card.inputs[inputKey]?.value ?? '0')) ?? 0;
            const refInfo = buildRefInfo(card, inputKey, allCards);
            dynamicInputRows.push({
                key: inputKey,
                label: `${inputLabel} (${inputKey})`,
                unitType: inputUnitType,
                value: iValue,
                displayValue: formatDisplayValue(iValue, inputUnitType as OutputUnitType, unitMode),
                ...(refInfo ? { refInfo } : {}),
            });

            const outputKey = outputKeyFn(inputKey);
            const oValue = card.outputs[outputKey] ?? 0;
            dynamicOutputRows.push({
                key: outputKey,
                label: `${outputLabel} (${outputKey})`,
                unitType: outputUnitType,
                value: oValue,
                displayValue: formatDisplayValue(oValue, outputUnitType as OutputUnitType, unitMode),
            });
        }
    }

    // --- dynamicRowGroups ---
    for (const group of def.dynamicRowGroups ?? []) {
        const firstKeyPrefix = group.fields[0]?.keyPrefix;
        if (!firstKeyPrefix) continue;

        const rowIndices = Object.keys(card.inputs)
            .filter(k => new RegExp(`^${firstKeyPrefix}_\\d+$`).test(k))
            .map(k => parseInt(k.split('_').pop()!))
            .sort((a, b) => a - b);

        for (const idx of rowIndices) {
            // Build rowRaw for hidden() evaluation
            const rowRaw: Record<string, string> = {};
            for (const field of group.fields) {
                rowRaw[field.keyPrefix] = String(card.inputs[`${field.keyPrefix}_${idx}`]?.value ?? '');
            }

            for (const field of group.fields) {
                if (field.hidden?.(rowRaw)) continue;

                const key = `${field.keyPrefix}_${idx}`;
                const rawVal = String(card.inputs[key]?.value ?? '');
                const refInfo = buildRefInfo(card, key, allCards);

                const resolvedUnitType = field.getUnitType?.(rowRaw) ?? field.unitType ?? 'none';
                const resolvedLabel = field.getLabel?.(rowRaw) ?? field.label;

                if (field.options) {
                    const optLabel = field.options.find(o => o.value === rawVal)?.label ?? rawVal;
                    dynamicInputRows.push({
                        key,
                        label: `${resolvedLabel} (行${idx})`,
                        unitType: 'none',
                        value: 0,
                        displayValue: optLabel,
                        ...(refInfo ? { refInfo } : {}),
                    });
                } else {
                    const numVal = card.resolvedInputs?.[key] ?? parseFloat(rawVal) ?? 0;
                    dynamicInputRows.push({
                        key,
                        label: `${resolvedLabel} (行${idx})`,
                        unitType: resolvedUnitType,
                        value: numVal,
                        displayValue: formatDisplayValue(numVal, resolvedUnitType as OutputUnitType, unitMode),
                        ...(refInfo ? { refInfo } : {}),
                    });
                }
            }
        }
    }

    // --- Standard outputs (exclude hidden fields — they are object-valued or redundant) ---
    const outputRows: ReportFieldRow[] = Object.entries(def.outputConfig)
        .filter(([, cfg]) => !cfg.hidden)
        .map(([key, cfg]) => {
        const unitType = cfg.unitType ?? 'none';
        const value = card.outputs[key] ?? 0;
        return {
            key,
            label: cfg.label,
            unitType,
            value,
            displayValue: formatDisplayValue(value, unitType as OutputUnitType, unitMode),
            ...(cfg.formula ? { formula: cfg.formula } : {}),
            ...(cfg.symbol ? { symbol: cfg.symbol } : {}),
        };
    });

    const allInputRows = [...inputRows, ...dynamicInputRows];
    const allOutputRows = [...outputRows, ...dynamicOutputRows];
    const narrative = def.reportNarrative
        ? def.reportNarrative(allInputRows, allOutputRows, card.inputs)
        : [];

    return {
        id: card.id,
        type: card.type,
        alias: card.alias,
        unitMode,
        memo: card.memo,
        error: card.error,
        inputs: allInputRows,
        narrative,
        outputs: allOutputRows,
    };
}

function formatDisplayValue(value: number, unitType: OutputUnitType, unitMode: 'mm' | 'm'): string {
    const num = formatOutput(value, unitType, unitMode);
    const unit = getUnitLabel(unitType, unitMode);
    return unit ? `${num} ${unit}` : num;
}

// ─────────────────────────────────────────────────────────────
// Step 2: HTML rendering
// ─────────────────────────────────────────────────────────────

export function renderReportHtml(data: ReportData): string {
    const { meta, cards } = data;
    const dateStr = new Date(meta.generatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(meta.title)} — 計算書</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif; font-size: 12px; color: #1e293b; background: #fff; padding: 24px; }
  .report-header { border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 24px; }
  .report-header h1 { font-size: 20px; font-weight: 700; color: #1e293b; }
  .report-header .meta { margin-top: 6px; color: #64748b; font-size: 11px; display: flex; gap: 16px; flex-wrap: wrap; }
  .report-header .memo { color: #475569; font-size: 11px; margin-top: 4px; white-space: pre-wrap; }
  .card-section { border: none; border-bottom: 1px solid #94a3b8; margin-bottom: 24px; padding-bottom: 8px; }
  .card-header { background: none; padding: 6px 0 6px; border-bottom: 1px solid #cbd5e1; display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .card-header .alias { font-weight: 700; font-size: 13px; color: #0f172a; }
  .card-header .type-badge { font-size: 10px; color: #94a3b8; background: #e2e8f0; padding: 1px 6px; border-radius: 9999px; }
  .card-memo { padding: 6px 0; font-size: 11px; color: #64748b; border-bottom: 1px solid #f1f5f9; background: #fffbeb; white-space: pre-wrap; }
  .card-error { padding: 8px 0; font-size: 11px; color: #b91c1c; background: #fef2f2; border-bottom: 1px solid #fecaca; }
  .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; padding: 8px 0 4px; }
  .vars-section { padding: 4px 0 12px; }
  .var-block { margin-bottom: 12px; }
  .var-block:last-child { margin-bottom: 0; }
  .var-block h3 { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px; }
  .var-block p { font-family: 'Courier New', monospace; font-size: 13px; color: #0f172a; white-space: pre-wrap; }
  .var-ref { font-size: 10px; color: #94a3b8; margin-left: 8px; }
  .var-block.ratio-ok p { color: #059669; }
  .var-block.ratio-ng p { color: #dc2626; font-weight: 700; }
  .note-content { padding: 10px 0; font-size: 12px; white-space: pre-wrap; color: #334155; line-height: 1.6; }
  .report-footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: right; font-size: 10px; color: #94a3b8; }
  @media print {
    body { background: #fff; padding: 10mm 12mm; font-size: 11px; }
    .card-section { break-inside: avoid; }
    .report-header { break-after: avoid; }
  }
</style>
</head>
<body>
<div class="report-header">
  <h1>${escHtml(meta.title)}</h1>
  <div class="meta">
    <span>作成者: ${escHtml(meta.author)}</span>
    <span>作成日時: ${escHtml(dateStr)}</span>
    <span>Tsumiki v${escHtml(meta.appVersion)}</span>
  </div>
  ${meta.memo ? `<div class="memo">${escHtml(meta.memo)}</div>` : ''}
</div>

${cards.map(renderCardSection).join('\n')}

<div class="report-footer">Tsumiki v${escHtml(meta.appVersion)} — 計算書</div>
</body>
</html>`;
}

function renderCardSection(card: import('../../types/report').ReportCardData): string {
    const header = `<div class="card-header">
    <span class="alias">${escHtml(card.alias)}</span>
    <span class="type-badge">${escHtml(card.type)}</span>
  </div>`;

    const memoHtml = card.memo
        ? `<div class="card-memo">${escHtml(card.memo)}</div>`
        : '';

    const errorHtml = card.error
        ? `<div class="card-error">⚠ エラー: ${escHtml(card.error)}</div>`
        : '';

    if (card.type === 'NOTE') {
        return `<div class="card-section">
  ${header}${memoHtml}${errorHtml}
  <div class="note-content">${escHtml(card.noteContent ?? '')}</div>
</div>`;
    }

    // 使用値 section (inputs as var-blocks)
    const inputsHtml = card.inputs.length > 0 ? `
  <div class="section-label">使用値</div>
  <div class="vars-section">
    ${card.inputs.map(row => {
        const refSpan = row.refInfo ? ` <span class="var-ref">${escHtml(row.refInfo)}</span>` : '';
        const inputDisplayKey = row.symbol ?? row.key;
        return `<div class="var-block">
      <h3>${escHtml(row.label)}</h3>
      <p>${escHtml(inputDisplayKey)} = ${escHtml(row.displayValue)}${refSpan}</p>
    </div>`;
    }).join('')}
  </div>` : '';

    const hasNarrative = card.narrative.length > 0;

    if (hasNarrative) {
        // 計算 section: each narrative line as a var-block
        const calcHtml = `
  <div class="section-label">計算</div>
  <div class="vars-section">
    ${card.narrative.map(line => {
        const labelHtml = line.label ? `\n      <h3>${escHtml(line.label)}</h3>` : '';
        return `<div class="var-block">${labelHtml}
      <p>${escHtml(line.content)}</p>
    </div>`;
    }).join('')}
  </div>`;

        return `<div class="card-section">
  ${header}${memoHtml}${errorHtml}${inputsHtml}${calcHtml}
</div>`;
    }

    // No-narrative: outputs as var-blocks with formula (key = formula = value)
    const outputsHtml = card.outputs.length > 0 ? `
  <div class="section-label">計算 / 結果</div>
  <div class="vars-section">
    ${card.outputs.map(row => {
        const isRatio = row.unitType === 'ratio';
        const ratioClass = isRatio
            ? (row.value <= 1.0 ? ' ratio-ok' : ' ratio-ng')
            : '';
        const displayKey = row.symbol ?? row.key;
        const content = row.formula
            ? `${escHtml(displayKey)} = ${escHtml(row.formula)} = ${escHtml(row.displayValue)}`
            : `${escHtml(displayKey)} = ${escHtml(row.displayValue)}`;
        return `<div class="var-block${ratioClass}">
      <h3>${escHtml(row.label)}</h3>
      <p>${content}</p>
    </div>`;
    }).join('')}
  </div>` : '';

    return `<div class="card-section">
  ${header}${memoHtml}${errorHtml}${inputsHtml}${outputsHtml}
</div>`;
}

function escHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────

function buildRefInfo(card: Card, inputKey: string, allCards: Card[]): string | undefined {
    const ref = card.inputs[inputKey]?.ref;
    if (!ref) return undefined;

    const upstream = allCards.find(c => c.id === ref.cardId);
    if (!upstream) return undefined;

    const upstreamDef = registry.get(upstream.type);
    const refType = ref.refType ?? 'output';

    if (refType === 'input') {
        const sourceKey = ref.inputKey ?? '';
        const srcCfg = upstreamDef?.getInputConfig?.(upstream) ?? upstreamDef?.inputConfig ?? {};
        const srcLabel = srcCfg[sourceKey]?.label ?? sourceKey;
        return `← ${upstream.alias} / ${srcLabel}`;
    }

    const outputKey = ref.outputKey ?? '';
    const outputLabel = upstreamDef?.outputConfig[outputKey]?.label ?? outputKey;
    const exprStr = ref.expression ? ` × [${ref.expression}]` : '';
    return `← ${upstream.alias} / ${outputLabel}${exprStr}`;
}
