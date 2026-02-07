# Tsumiki (積み木) - Structural Calculation Stack

Tsumiki is a modern, block-based structural calculation tool that allows engineers to build calculations by stacking specialized components ("cards"). It emphasizes flexibility, clarity, and ease of use through a dynamic referencing system and intuitive unit controls.

## Core Features

### 1. Stack-Based Calculation
*   **Sequential Logic**: Calculations are built by stacking cards.
*   **Dynamic References**: Cards can reference output values from any card positioned above them in the stack.
*   **Topological Sorting**: Dependencies are automatically tracked to ensure valid calculation order.

### 2. Card Components
The system currently supports the following specialized cards:

*   **Section Card**: Defines a rectangular cross-section.
    *   **Inputs**: Width ($b$), Height ($h$).
    *   **Outputs**: Area ($A$), Moment of Inertia ($I_x$, $I_y$).
*   **Beam Card**: Analyzes a simply supported beam with uniform load.
    *   **Inputs**: Span ($L$), Load ($w$).
    *   **Outputs**: Maximum Moment ($M_{max}$), Maximum Shear ($V_{max}$).
*   **Verify Card**: Performs a capacity vs. demand check.
    *   **Inputs**: Demand ($S$), Capacity ($R$).
    *   **Outputs**: Ratio ($S/R$), Verification Status (OK/NG).
*   **Custom Card** (Experimental): Allows arbitrary mathematical formulas. (Currently hidden).

### 3. Unit System (Per-Card Control)
Tsumiki recognizes that engineering workflows often mix scales (e.g., beam span in meters, section size in millimeters). To address this, each card has independent unit controls.

*   **Modes**:
    *   **`MM, N`**: Millimeters & Newtons. (Standard SI for mechanics).
    *   **`M, kN`**: Meters & Kilonewtons. (Architectural/Civil scale).
*   **Strict Consistency**:
    *   In `'M, kN'` mode, geometric properties are correctly output in **m²** and **m⁴**. Implicit `cm` conversions are strictly separating from this mode to prevent confusion.
*   **Smart Input**:
    *   Input values are automatically converted for display based on the selected mode.
    *   *Example*: Entering "5" in 'm' mode is stored as 5000mm.

## Technical Architecture

### Frontend Stack
*   **Framework**: React 18 + TypeScript + Vite.
*   **Styling**: Tailwind CSS (with `clsx` for dynamic classes).
*   **State Management**: Zustand (Global store with immutable updates).
*   **Drag & Drop**: `@dnd-kit` (Sortable functionality).

### Data Model (`Card` Interface)
```typescript
interface Card {
    id: string;
    type: 'SECTION' | 'BEAM' | 'VERIFY' | 'CUSTOM';
    alias: string;
    unitMode: 'mm' | 'm'; // Controls display/input units
    inputs: Record<string, {
        value: string | number;
        ref?: { cardId: string, outputKey: string }; // Reference
    }>;
    outputs: Record<string, number>; // Always stored in base SI units
}
```

## Setup & Running

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
