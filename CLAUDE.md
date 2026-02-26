# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # TypeScript compile + production build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

No test framework is configured.

## Architecture

**Tsumiki** (積み木 = Building Blocks) is a stack-based structural engineering calculator. Users stack modular "cards" that reference each other's outputs, forming a DAG of calculations.

### Core Data Flow

```
User Input → SmartInput → Zustand Store Action → Topological Sort →
Card-by-card Calculation (resolve refs) → Update State → Re-render
```

All internal values are stored in SI base units (mm, N, Nmm). Display conversion happens at render time via `unitFormatter`.

### Card System

Each card type is defined as a `CardDefinition` in `src/lib/registry/index.ts`. A definition includes:
- Input/output field configuration (labels, unit types, defaults)
- A pure calculation function operating in SI units
- An optional SVG visualization strategy
- For multi-strategy cards (Section, Beam): a strategy selector that picks among sub-definitions

Card types: `SECTION` | `MATERIAL` | `BEAM` | `VERIFY` | `CUSTOM_MAP` | `CUSTOM_COMBINE` | `COUPLE` | `BEAM_MULTI` | `DIAGRAM` | `STRESS` | `DEFLECTION` | `COLUMN`

**Section** supports strategies: Rectangle, H-Beam, Circle
**Beam** uses a 2-axis strategy grid: Boundary (Simple | Cantilever) × Load (Uniform | Point)
**Couple** converts bending moment M into couple forces using k = M / (2·Σdi²), Ni = k·di
**Column** uses a single `endCondition` axis: pinned_pinned (k=1.0), fixed_free (k=2.0), fixed_pinned (k=0.7), fixed_fixed (k=0.5)

### Key Files

| Path | Role |
|------|------|
| `src/store/useTsumikiStore.ts` | Zustand global state; holds card array, triggers recalculation on every mutation |
| `src/lib/registry/index.ts` | Central registry of all `CardDefinition` objects |
| `src/lib/registry/types.ts` | `CardDefinition`, `CardActions`, `DynamicInputGroupConfig` interfaces |
| `src/lib/registry/strategyHelper.ts` | `createCardDefinition` / `createStrategyDefinition` helpers |
| `src/lib/engine/graph.ts` | Topological sort and dependency resolution |
| `src/lib/mechanics/beam.ts` | Beam mechanics: `calculateBeamAt`, `evalSuperposition`, `calculateMaxDeflection` |
| `src/lib/utils/unitFormatter.ts` | SI ↔ display unit conversion (mm/N mode vs m/kN mode) |
| `src/lib/utils/serialization.ts` | JSON export/import + URL compression via pako |
| `src/lib/utils/cardHelpers.ts` | `resolveInput` + `applyExpression` (mathjs, safe arithmetic only) |
| `src/components/cards/common/GenericCard.tsx` | Renders inputs, outputs, and optional visualization for most cards |
| `src/components/common/SmartInput.tsx` | Dual-mode input: manual value or card reference with optional expression transform |
| `src/components/stack/StackArea.tsx` | Drag-drop card container using @dnd-kit; computes `upstreamInputConfigs` |

### Adding a New Card Type

Minimum viable new card requires editing **2 files**:

1. **Create** `src/components/cards/MyCard.tsx` — define the card using `createCardDefinition`.
2. **Register** in `src/lib/registry/index.ts` — add `import` + `registry.register(MyCardDef)`.
   - The sidebar entry is declared in the definition itself (`sidebar: { category: ... }`).
   - `CardType` is now `string` — no `src/types/index.ts` edit needed.
   - Labels can be direct Japanese strings — no `src/lib/i18n/ja.ts` edit needed for card fields.

#### Minimal card template

```typescript
// src/components/cards/MyCard.tsx
import { Ruler } from 'lucide-react';
import { createCardDefinition } from '../../lib/registry/strategyHelper';

interface MyOutputs { result: number }

export const MyCardDef = createCardDefinition<MyOutputs>({
  type: 'MY_CARD',
  title: '私のカード',
  description: '簡単な計算',
  icon: Ruler,
  sidebar: { category: 'analysis' },

  defaultInputs: { x: { value: 0 } },
  inputConfig: {
    x: { label: '入力値', unitType: 'length' },
  },
  outputConfig: {
    result: { label: '結果', unitType: 'length' },
  },
  calculate: ({ x }) => ({ result: x * 2 }),
});
```

Then in `src/lib/registry/index.ts`:
```typescript
import { MyCardDef } from '../../components/cards/MyCard';
// ...
registry.register(MyCardDef);
```

**`dynamicInputGroup`** / **`dynamicInputGroups`**: declare in `CardDefinition` to get add/remove rows rendered between standard inputs and visualization — no custom component needed. Use `dynamicInputGroups` (array) when you need more than one variable-length group. See `src/components/cards/Couple.tsx` for a working example.

**`dynamicInputGroup` key points**:
- `outputKeyFn` maps input key → output key (e.g. `'d_1'` → `'n_1'`). Use **identical logic** in `calculate()` to avoid silent mismatch.
- `outputIndexFn` must be set to enable pin-to-panel for dynamic outputs. Omit it and pins silently don't work.
- Dynamic outputs must NOT be listed in `outputConfig` (they are generated at runtime by GenericCard).
- `minCount` sets the minimum rows; the remove button is disabled at that count.
- Initial rows come from `defaultInputs` (not from `minCount`). Seed them explicitly: `defaultInputs: { d_1: { value: 500 } }`.

**Custom component**: set `component` in `CardDefinition` to replace `GenericCard` entirely. The component must wrap content in `BaseCard`. Use this only when layout cannot be expressed via `GenericCard` + `visualization` + `dynamicInputGroup`.

**`calculate(inputs, rawInputs)`**: `inputs` contains resolved numbers (refs resolved, defaults applied). `rawInputs` is `card.inputs` as-is — use it when you need raw string values (e.g. CustomCard formula strings), since `parseFloat` converts strings to `0`.

**Error display**: if `calculate()` throws, `card.error` is set. GenericCard shows an inline error block; BaseCard shows a red badge in the header (visible even when collapsed).

### Unit System

Each card tracks its own `unitMode` ('mm' or 'm'). `unitFormatter` converts between these display modes and the SI base values stored in state. Unit-type keys are declared in card field configs and drive the formatter.

Valid `inputType` / `unitType` values for `SmartInput` and field configs (`SmartInputUnitType`):
`'length'` | `'area'` | `'inertia'` | `'force'` | `'moment'` | `'load'` | `'stress'` | `'modulus'` | `'none'`

`'area'` and `'inertia'` are fully supported for SmartInput display conversion (mm²↔m², mm⁴↔m⁴).
`'ratio'` is output-only (`OutputUnitType`) and cannot be used as SmartInput `inputType`.

Output-only types (`OutputUnitType` but not `SmartInputUnitType`): `'ratio'`.

### i18n

All shared UI strings are in `src/lib/i18n/ja.ts` as `export const ja = { ... } as const`. Components import `ja` directly and access keys as `ja['key.name']`. `export type JaKey = keyof typeof ja` provides the key union type.

**Card labels do NOT require editing `ja.ts`**: `inputConfig.label`, `outputConfig.label`, and `dynamicInputGroup` labels can be direct Japanese strings. GenericCard's `t()` function falls back to the raw string if the value is not a `JaKey`. Existing cards use `ja['key']` references for historical reasons, but new cards can write labels inline:

```typescript
inputConfig: {
  L: { label: 'スパン長', unitType: 'length' },   // ← direct string, no ja.ts edit needed
}
```

Only add to `ja.ts` for strings shared across multiple components (button labels, tooltips, toasts).

### Reference System

`SmartInput` supports three modes:
1. **Manual** — user types a number directly
2. **Output reference** (`setInputRef`) — links to another card's output value
3. **Input reference** (`setInputInputRef`) — links to another card's resolved input value

After selecting a reference, the user can type an **expression** (e.g. `v/2`, `v*1.2`) in the field. The expression is stored in `CardInput.ref.expression` and evaluated via `applyExpression` (mathjs, restricted to `[0-9+\-*/().\sv]`, max 100 chars). On error, the raw referenced value is used as fallback.

`Card.resolvedInputs` stores all resolved input values after each recalculation (excluded from serialization).

### Strategy ID Composition

For `createStrategyDefinition`, strategy IDs are formed by joining axis values with `_`. Example: `boundary='fixed_fixed'` + `load='uniform'` → strategy ID `'fixed_fixed_uniform'`. When parsing in custom components (e.g. BeamMulti), split on the **last** `_` to recover the final axis.

**Warning**: Only the **last** axis's option values may contain `_`. All earlier axis option values must be `_`-free. A DEV-mode warning is logged when this rule is violated. Violating it creates ambiguous strategy IDs.

### State Mutations

All card mutations go through the Zustand store (`useTsumikiStore`). After every mutation the store runs topological sort and recalculates all cards in dependency order.

Key store actions: `updateInput`, `setInputRef`, `setInputInputRef`, `setRefExpression`, `removeReference`, `removeInput`.
