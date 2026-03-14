
import { evaluate } from 'mathjs';

const MAX_EXPRESSION_LENGTH = 100;

// 四則演算・数値・括弧・変数 v のみ許可
function isSafeExpression(expression: string): boolean {
    if (expression.length > MAX_EXPRESSION_LENGTH) return false;
    return /^[0-9+\-*/(). v]+$/.test(expression);
}

// 式が無効なら null を返す（呼び出し側でフォールバック処理）
export function applyExpression(value: number, expression?: string): number | null {
    if (!expression || expression.trim() === '') return value;
    if (!isSafeExpression(expression.trim())) return null;
    try {
        const result = evaluate(expression, { v: value });
        return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
        return null;
    }
}
