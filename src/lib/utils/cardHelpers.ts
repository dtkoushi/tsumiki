
import { evaluate } from 'mathjs';
import type { Card } from '../../types';

// 式が無効なら null を返す（呼び出し側でフォールバック処理）
export function applyExpression(value: number, expression?: string): number | null {
    if (!expression || expression.trim() === '') return value;
    try {
        const result = evaluate(expression, { v: value });
        return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
        return null;
    }
}

export function resolveInput(card: Card, key: string, upstreamCards: Card[]): number {
    const inp = card.inputs[key];
    if (!inp) return 0;
    if (inp.ref) {
        const src = upstreamCards.find(c => c.id === inp.ref!.cardId);
        const rawVal = (inp.ref.refType === 'input' && inp.ref.inputKey)
            ? src?.resolvedInputs?.[inp.ref.inputKey] ?? 0
            : src?.outputs[inp.ref.outputKey ?? ''] ?? 0;
        return applyExpression(rawVal, inp.ref.expression) ?? rawVal;
    }
    return Number(inp.value ?? 0);
}
