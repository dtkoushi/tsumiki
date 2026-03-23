/** 計算書全体 */
export interface ReportData {
    meta: {
        title: string;
        author: string;
        memo?: string;
        generatedAt: string;   // ISO 8601
        appVersion: string;
    };
    cards: ReportCardData[];
}

/** カード1枚分の計算書データ */
export interface ReportCardData {
    id: string;
    type: string;
    alias: string;
    unitMode: 'mm' | 'm';
    memo?: string;
    error?: string;

    inputs: ReportFieldRow[];
    outputs: ReportFieldRow[];

    /** NOTE カードのみ: Markdown 生テキスト */
    noteContent?: string;

    /** SVG visualization string (present for cards with def.visualization) */
    svg?: string;
}

import type { OutputUnitType } from '../lib/utils/unitFormatter';

/** 入力・出力 1行分 */
export interface ReportFieldRow {
    key: string;
    label: string;
    unitType: OutputUnitType;
    /**
     * Numeric SI value of this field.
     * - Numeric fields: the resolved or parsed number (in SI base units)
     * - Select fields: always 0 (use displayValue for the human-readable string)
     */
    value: number;
    displayValue: string;
    formula?: string;
    /** formula に入力値を代入した展開形 (例: "100.0 mm / 500.0 mm") */
    formulaWithValues?: string;
    symbol?: string;
    refInfo?: string;
}
