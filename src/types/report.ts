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
    narrative: string[];
    outputs: ReportFieldRow[];

    /** NOTE カードのみ: Markdown 生テキスト */
    noteContent?: string;
}

/** 入力・出力 1行分 */
export interface ReportFieldRow {
    key: string;
    label: string;
    unitType: string;
    value: number;
    displayValue: string;
    formula?: string;
    refInfo?: string;
}
