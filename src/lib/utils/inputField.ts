import { formatOutput, getUnitLabel, type OutputUnitType, type SmartInputUnitType } from './unitFormatter';

export type { SmartInputUnitType };
export type UnitMode = 'mm' | 'm';

// ── discriminated union base ──────────────────────────────────────────────────

interface InputFieldBase {
    label: string;
    symbol?: string;
    default?: string | number;
    /** Resolve display string (report + UI). No consumer-side branching needed. */
    display(rawVal: string, resolved: number | undefined, unitMode: UnitMode): string;
    /** Numeric value for report row (select → always 0) */
    reportValue(rawVal: string, resolved: number | undefined): number;
    /** Unit type for report row (select → always 'none') */
    readonly reportUnitType: OutputUnitType;
}

export interface NumericInputField extends InputFieldBase {
    readonly kind: 'numeric';
    unitType?: SmartInputUnitType;
    type?: 'number' | 'text';
}

export interface SelectInputField extends InputFieldBase {
    readonly kind: 'select';
    type: 'select';
    options: Array<{ value: string; label: string }>;
}

export type InputFieldConfig = NumericInputField | SelectInputField;

// ── factory functions ─────────────────────────────────────────────────────────

export function num(cfg: {
    label: string;
    unitType?: SmartInputUnitType;
    symbol?: string;
    default?: number;
    type?: 'number' | 'text';
}): NumericInputField {
    const ut: OutputUnitType = (cfg.unitType ?? 'none') as OutputUnitType;
    return {
        kind: 'numeric',
        label: cfg.label,
        symbol: cfg.symbol,
        default: cfg.default,
        type: cfg.type,
        unitType: cfg.unitType,
        reportUnitType: ut,
        display: (_rawVal, resolved, unitMode) => {
            const v = resolved ?? 0;
            const s = formatOutput(v, ut, unitMode);
            const u = getUnitLabel(ut, unitMode);
            return u ? `${s} ${u}` : s;
        },
        reportValue: (rawVal, resolved) => (resolved ?? parseFloat(rawVal)) || 0,
    };
}

export function sel(cfg: {
    label: string;
    options: Array<{ value: string; label: string }>;
    symbol?: string;
    default?: string;
}): SelectInputField {
    return {
        kind: 'select',
        type: 'select',
        label: cfg.label,
        options: cfg.options,
        symbol: cfg.symbol,
        default: cfg.default,
        reportUnitType: 'none',
        display: (rawVal) => cfg.options.find(o => o.value === rawVal)?.label ?? rawVal,
        reportValue: () => 0,
    };
}
