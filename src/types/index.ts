/**
 * CardType is a string alias for the unique type ID of a card.
 * It is intentionally widened to `string` so that new card types registered
 * via `registry.register()` do not require a manual union update here.
 * The registry is the single source of truth for valid card type IDs.
 */
export type CardType = string;

export interface CardInput {
    value: string | number;
    ref?: {
        cardId: string;
        outputKey?: string;           // 出力参照（既存。後方互換のためオプション化）
        refType?: 'output' | 'input'; // 新フィールド。省略時は 'output' として扱う
        inputKey?: string;            // 入力参照時のキー名
        expression?: string;          // 例: 'v/2', 'v*1.2', 'v+100'。v = 参照値
    };
}

export interface Card {
    id: string;
    type: CardType;
    alias: string;
    inputs: Record<string, CardInput>;
    outputs: Record<string, number>;
    unitMode?: 'mm' | 'm'; // Default 'mm'. Controls display units (mm/N vs m/kN)
    error?: string; // Set when card calculation throws an error
    memo?: string;
    resolvedInputs?: Record<string, number>; // 計算後に格納。他カードからの入力参照に使用
}
