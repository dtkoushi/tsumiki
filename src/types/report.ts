/** 計算セクションの 1 行 */
export interface ReportNarrativeLine {
    label?: string;   // 日本語説明（例: "断面係数（強軸・弾性）"）
    content: string;  // 数式行（例: "Z_x = I_x / (H/2) = 250.0 cm³"）
}

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
    narrative: ReportNarrativeLine[];
    outputs: ReportFieldRow[];

    /** NOTE カードのみ: Markdown 生テキスト */
    noteContent?: string;
}

import type { OutputUnitType } from '../lib/utils/unitFormatter';

/** 入力・出力 1行分 */
export interface ReportFieldRow {
    key: string;
    label: string;
    unitType: OutputUnitType;
    value: number;
    displayValue: string;
    formula?: string;
    symbol?: string;
    refInfo?: string;
}
