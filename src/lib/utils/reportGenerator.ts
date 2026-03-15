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
            formulas: [],
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
            formulas: [],
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

    // --- Standard outputs (include hidden ones for report) ---
    const outputRows: ReportFieldRow[] = Object.entries(def.outputConfig).map(([key, cfg]) => {
        const unitType = cfg.unitType ?? 'none';
        const value = card.outputs[key] ?? 0;
        return {
            key,
            label: cfg.label,
            unitType,
            value,
            displayValue: formatDisplayValue(value, unitType as OutputUnitType, unitMode),
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
        formulas: def.reportFormulas ?? [],
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
  body { font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif; font-size: 12px; color: #1e293b; background: #f8fafc; padding: 24px; }
  .report-header { border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 24px; }
  .report-header h1 { font-size: 20px; font-weight: 700; color: #1e293b; }
  .report-header .meta { margin-top: 6px; color: #64748b; font-size: 11px; display: flex; gap: 16px; flex-wrap: wrap; }
  .report-header .meta .memo { color: #475569; font-size: 11px; margin-top: 4px; white-space: pre-wrap; }
  .card-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 16px; overflow: hidden; }
  .card-header { background: #f1f5f9; padding: 8px 14px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: baseline; gap: 8px; }
  .card-header .alias { font-weight: 700; font-size: 13px; color: #0f172a; }
  .card-header .type-badge { font-size: 10px; color: #94a3b8; background: #e2e8f0; padding: 1px 6px; border-radius: 9999px; }
  .card-memo { padding: 6px 14px; font-size: 11px; color: #64748b; border-bottom: 1px solid #f1f5f9; background: #fffbeb; white-space: pre-wrap; }
  .card-error { padding: 8px 14px; font-size: 11px; color: #b91c1c; background: #fef2f2; border-bottom: 1px solid #fecaca; }
  .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; padding: 6px 14px 2px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 4px 14px; font-size: 11px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  thead th { background: #f8fafc; font-weight: 600; color: #475569; text-align: left; }
  tr:last-child td { border-bottom: none; }
  .label-col { color: #475569; width: 35%; }
  .value-col { font-family: 'Courier New', monospace; font-weight: 600; color: #0f172a; text-align: right; width: 25%; }
  .ref-col { color: #94a3b8; font-size: 10px; }
  .formulas-block { padding: 6px 14px 8px; }
  .formula-item { font-family: 'Courier New', monospace; font-size: 11px; color: #1e40af; background: #eff6ff; padding: 2px 8px; border-radius: 3px; margin-bottom: 3px; display: inline-block; margin-right: 6px; }
  .narrative-block { padding: 8px 14px 10px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  .narrative-line { font-family: 'Courier New', monospace; font-size: 12.5px; color: #1e293b; line-height: 1.8; white-space: pre-wrap; }
  .inputs-small td, .inputs-small th { padding: 3px 14px; font-size: 10px; }
  .inputs-small .label-col { color: #94a3b8; }
  .inputs-small .value-col { color: #64748b; font-size: 10px; }
  .inputs-small .ref-col { font-size: 9px; color: #cbd5e1; }
  tr.ratio-ok td { color: #059669; }
  tr.ratio-ng td { color: #dc2626; font-weight: 700; }
  .note-content { padding: 10px 14px; font-size: 12px; white-space: pre-wrap; color: #334155; line-height: 1.6; }
  .report-footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: right; font-size: 10px; color: #94a3b8; }
  @media print {
    body { background: #fff; padding: 10mm 12mm; font-size: 11px; }
    .card-section { break-inside: avoid; box-shadow: none; border: 1px solid #cbd5e1; }
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

    const hasNarrative = card.narrative.length > 0;

    if (hasNarrative) {
        // New layout: 使用値（小さく灰色）→ 計算（主役）→ 結果
        const usedValuesHtml = card.inputs.length > 0 ? `
  <div class="section-label">使用値</div>
  <table class="inputs-small">
    <tbody>
      ${card.inputs.map(row => `<tr>
        <td class="label-col">${escHtml(row.label)}</td>
        <td class="value-col">${escHtml(row.displayValue)}</td>
        <td class="ref-col">${row.refInfo ? escHtml(row.refInfo) : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : '';

        const narrativeHtml = `
  <div class="section-label">計算</div>
  <div class="narrative-block">
    ${card.narrative.map(line => `<div class="narrative-line">${escHtml(line)}</div>`).join('')}
  </div>`;

        const outputsHtml = card.outputs.length > 0 ? `
  <div class="section-label">結果</div>
  <table>
    <tbody>
      ${card.outputs.map(row => {
            const isRatio = row.unitType === 'ratio';
            const rowClass = isRatio
                ? (row.value <= 1.0 ? ' class="ratio-ok"' : ' class="ratio-ng"')
                : '';
            return `<tr${rowClass}>
        <td class="label-col">${escHtml(row.label)}</td>
        <td class="value-col">${escHtml(row.displayValue)}</td>
        <td class="ref-col"></td>
      </tr>`;
        }).join('')}
    </tbody>
  </table>` : '';

        return `<div class="card-section">
  ${header}${memoHtml}${errorHtml}${usedValuesHtml}${narrativeHtml}${outputsHtml}
</div>`;
    }

    // Fallback layout (no narrative): 入力テーブル + formula badges + 結果テーブル
    const inputsHtml = card.inputs.length > 0 ? `
  <div class="section-label">入力</div>
  <table>
    <tbody>
      ${card.inputs.map(row => `<tr>
        <td class="label-col">${escHtml(row.label)}</td>
        <td class="value-col">${escHtml(row.displayValue)}</td>
        <td class="ref-col">${row.refInfo ? escHtml(row.refInfo) : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : '';

    const formulasHtml = card.formulas.length > 0 ? `
  <div class="section-label">計算式</div>
  <div class="formulas-block">
    ${card.formulas.map(f => `<span class="formula-item">${escHtml(f)}</span>`).join('')}
  </div>` : '';

    const outputsHtml = card.outputs.length > 0 ? `
  <div class="section-label">結果</div>
  <table>
    <tbody>
      ${card.outputs.map(row => {
            const isRatio = row.unitType === 'ratio';
            const rowClass = isRatio
                ? (row.value <= 1.0 ? ' class="ratio-ok"' : ' class="ratio-ng"')
                : '';
            return `<tr${rowClass}>
        <td class="label-col">${escHtml(row.label)}</td>
        <td class="value-col">${escHtml(row.displayValue)}</td>
        <td class="ref-col"></td>
      </tr>`;
        }).join('')}
    </tbody>
  </table>` : '';

    return `<div class="card-section">
  ${header}${memoHtml}${errorHtml}${inputsHtml}${formulasHtml}${outputsHtml}
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
    return `← ${upstream.alias} / ${outputLabel}`;
}
