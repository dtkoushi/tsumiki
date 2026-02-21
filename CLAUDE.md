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

Card types: `SECTION` | `MATERIAL` | `BEAM` | `VERIFY` | `CUSTOM` | `COUPLE`

**Section** supports strategies: Rectangle, H-Beam, Circle
**Beam** uses a 2-axis strategy grid: Boundary (Simple | Cantilever) × Load (Uniform | Point)
**Couple** converts bending moment M into couple forces using k = M / (2·Σdi²), Ni = k·di

### Key Files

| Path | Role |
|------|------|
| `src/store/useTsumikiStore.ts` | Zustand global state; holds card array, triggers recalculation on every mutation |
| `src/lib/registry/index.ts` | Central registry of all `CardDefinition` objects |
| `src/lib/registry/types.ts` | `CardDefinition`, `CardActions`, `DynamicInputGroupConfig` interfaces |
| `src/lib/registry/strategyHelper.ts` | `createCardDefinition` / `createStrategyDefinition` helpers |
| `src/lib/engine/graph.ts` | Topological sort and dependency resolution |
| `src/lib/mechanics/beam.ts` | Pure beam mechanics formulas (`calculateBeamAt`, `calculateBeamMax`) |
| `src/lib/utils/unitFormatter.ts` | SI ↔ display unit conversion (mm/N mode vs m/kN mode) |
| `src/lib/utils/serialization.ts` | JSON export/import + URL compression via pako |
| `src/components/cards/common/GenericCard.tsx` | Renders inputs, outputs, and optional visualization for most cards |
| `src/components/common/SmartInput.tsx` | Dual-mode input: manual numeric value or reference to another card's output |
| `src/components/stack/StackArea.tsx` | Drag-drop card container using @dnd-kit |

### Adding a New Card Type

1. Define a `CardDefinition` using `createCardDefinition` (fixed inputs) or `createStrategyDefinition` (strategy-switched inputs) from `strategyHelper.ts`.
2. Register it in `src/lib/registry/index.ts`.
3. Add the new type literal to `src/types/index.ts`.
4. Add a sidebar entry to the `cardTypes` array in `src/components/layout/AppLayout.tsx`.
5. `GenericCard` handles rendering automatically. Use `visualization` for an SVG diagram, `dynamicInputGroup` for variable-count paired input→output rows.

**`dynamicInputGroup`**: declare in `CardDefinition` to get add/remove rows rendered between standard inputs and visualization — no custom component needed. See `src/components/cards/Couple.tsx` for a working example.

### Unit System

Each card tracks its own `unitMode` ('mm' or 'm'). `unitFormatter` converts between these display modes and the SI base values stored in state. Unit-type keys (e.g., `'length'`, `'inertia'`, `'stress'`) are declared in card field configs and drive the formatter.

### State Mutations

All card mutations go through the Zustand store (`useTsumikiStore`). After every mutation the store runs topological sort and recalculates all cards in dependency order. Reference inputs (`setInputRef`) link a card's input slot to a specific output of another card.
