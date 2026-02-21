# Tsumiki (積み木) — Structural Calculation Stack

積み木（Building Blocks）のように、専用の「カード」を積み上げて構造計算を組み立てるブラウザアプリです。
カード同士の出力を参照で連鎖させることで、断面→材料→梁→照査という計算フローを視覚的に構築できます。

## 目次

- [機能概要](#機能概要)
- [技術スタック](#技術スタック)
- [セットアップ](#セットアップ)
- [カードタイプ](#カードタイプ)
- [開発者ガイド：カード・計算ロジックの追加](#開発者ガイドカード計算ロジックの追加)
  - [シンプルカードの追加](#1-シンプルカードの追加-createcarddefinition)
  - [ストラテジーカードの追加](#2-ストラテジーカードの追加-createstrategydefinition)
  - [マルチ軸ストラテジーカード](#3-マルチ軸ストラテジーカード)
  - [ビジュアライゼーションの追加](#4-ビジュアライゼーションの追加)
  - [カードの登録](#5-カードの登録)
- [ユニットシステム](#ユニットシステム)
- [データモデル](#データモデル)
- [ファイル構成](#ファイル構成)

---

## 機能概要

- **スタック型計算**: カードを縦に積み、上位カードの出力を下位カードの入力に参照リンクで接続
- **トポロジカルソート**: 依存関係を自動解決し、正しい順序で全カードを再計算
- **カード別ユニット切替**: `MM, N` / `M, kN` モードをカード単位で独立制御
- **URL 共有**: プロジェクト全体を pako で圧縮し、URL パラメータとして共有
- **インポート / エクスポート**: JSON ファイルで保存・復元

---

## 技術スタック

| レイヤー | ライブラリ |
|---------|-----------|
| UI | React 18 + TypeScript |
| ビルド | Vite 7 |
| スタイル | Tailwind CSS + clsx |
| 状態管理 | Zustand |
| ドラッグ&ドロップ | @dnd-kit |
| 数式評価 (Custom) | mathjs |
| 圧縮 (URL共有) | pako |

---

## セットアップ

```bash
# Node.js 20.19+ または 22.12+ が必要
node --version

npm install

# 開発サーバー起動（ローカルのみ）
npm run dev

# 外部からもアクセス可能な形で起動
npm run dev -- --host

# 型チェック
node_modules/.bin/tsc --noEmit

# Lint
npm run lint

# 本番ビルド
npm run build
```

---

## カードタイプ

### SECTION — 断面定義

断面形状を選択して断面性能（面積・断面二次モーメント・断面係数）を計算します。

| ストラテジー | 説明 |
|------------|------|
| `rect` | 矩形断面 (幅 b × 高さ h) |
| `h_beam` | H形鋼断面 |
| `circle` | 円形断面 (直径 d) |

主な出力: `A` (面積), `Ix` / `Iy` (断面二次モーメント), `Zx` / `Zy` (断面係数)

### MATERIAL — 材料

JIS 鋼材グレードを選択して設計基準強度と弾性係数を返します。

| ストラテジー | F (N/mm²) | E (N/mm²) |
|------------|-----------|-----------|
| `ss400` | 235 | 205,000 |
| `sn400b` | 235 | 205,000 |
| `sn490b` | 325 | 205,000 |
| `sm490` | 325 | 205,000 |

### BEAM — 梁計算

境界条件 × 荷重種別の 2 軸ストラテジーグリッドで計算式を切替。

| | 等分布荷重 (uniform) | 集中荷重 (point) |
|---|---|---|
| **単純梁** (simple) | `simple_uniform` | `simple_point` |
| **片持ち梁** (cantilever) | `cantilever_uniform` | `cantilever_point` |

出力: `Mmax`, `Qmax`, `delta_max`, `structuralModel`（Verify カードへの参照用モデル）

### VERIFY — 断面照査

梁モデル・断面係数・許容応力度を受け取り、任意位置の応力度比を照査します。

出力: `sigma`（実応力度）, `ratio`（応力度比）, `isOk`（1=OK / 0=NG）

### CUSTOM — カスタム数式

変数を自由に定義し、mathjs の数式で計算します。変数は他カードの出力に参照リンクできます。

---

## 開発者ガイド：カード・計算ロジックの追加

カードは `CardDefinition` オブジェクトとして定義します。
ヘルパー関数が 2 種類用意されており、カードの性質に合わせて使い分けます。

### 1. シンプルカードの追加 (`createCardDefinition`)

戦略切替が不要な固定入力のカードに使います。

**例：基礎反力カード**

```typescript
// src/components/cards/Foundation.tsx
import { createCardDefinition } from '../../lib/registry/strategyHelper';
import { Layers } from 'lucide-react';

interface FoundationOutputs {
    bearingPressure: number; // 地盤反力度 (N/mm²)
}

export const FoundationCardDef = createCardDefinition<FoundationOutputs>({
    type: 'FOUNDATION',
    title: 'Foundation Check',
    icon: Layers,
    description: 'Calculate bearing pressure on soil.',

    // カード作成時の初期値（SI単位: mm, N, Nmm）
    defaultInputs: {
        P:     { value: 100000 }, // 100 kN = 100,000 N
        width: { value: 1000 },   // 1,000 mm
        depth: { value: 1000 },   // 1,000 mm
    },

    // 入力フィールド設定（GenericCard が自動レンダリング）
    inputConfig: {
        P:     { label: 'Axial Load (P)',  unitType: 'force' },
        width: { label: 'Footing Width',   unitType: 'length' },
        depth: { label: 'Footing Depth',   unitType: 'length' },
    },

    // 出力フィールド設定
    outputConfig: {
        bearingPressure: { label: 'Bearing Pressure', unitType: 'stress' },
    },

    // 純粋関数：入力はすべて SI 単位（mm, N, Nmm）で渡される
    calculate: (inputs) => {
        const area = inputs.width * inputs.depth; // mm²
        const bearingPressure = area > 0 ? inputs.P / area : 0; // N/mm²
        return { bearingPressure };
    },
});
```

**`inputConfig` の `unitType` 一覧:**

| unitType | 説明 | mm モード | m モード |
|----------|------|-----------|---------|
| `length` | 長さ | mm | m |
| `area` | 面積 | mm² | m² |
| `inertia` | 断面二次モーメント | mm⁴ | m⁴ |
| `force` | 力 | N | kN |
| `moment` | モーメント | Nmm | kNm |
| `stress` | 応力度 | N/mm² | N/mm² |
| `modulus` | 断面係数 | mm³ | m³ |
| `load` | 分布荷重 | N/mm | kN/m |
| `none` | 無次元 / その他 | — | — |

---

### 2. ストラテジーカードの追加 (`createStrategyDefinition`)

**戦略パターン（Strategy Pattern）**を使い、セレクタで計算式・入力フィールドをまるごと切り替えるカードに使います。

**例：風圧力カード（地域 A / 地域 B を切替）**

```typescript
// src/components/cards/Wind.tsx
import { createStrategyDefinition } from '../../lib/registry/strategyHelper';
import type { CardStrategy } from '../../lib/registry/types';
import { Wind } from 'lucide-react';

interface WindOutputs {
    Cpe: number;   // 外圧係数
    qd:  number;   // 設計風圧 (N/mm²)
}

// ---- ストラテジーを定義 ----

const ZoneAStrategy: CardStrategy<WindOutputs> = {
    id: 'zone_a',
    label: 'Zone A (V0=32)',
    inputConfig: {
        height: { label: 'Building Height', unitType: 'length' },
    },
    calculate: (inputs) => {
        const Cpe = 0.8;
        const qd = 0.6 * 32 ** 2 * Cpe * 1e-6; // kN/m² -> N/mm²
        return { Cpe, qd: qd * inputs.height / inputs.height }; // simplified
    },
};

const ZoneBStrategy: CardStrategy<WindOutputs> = {
    id: 'zone_b',
    label: 'Zone B (V0=36)',
    inputConfig: {
        height:   { label: 'Building Height', unitType: 'length' },
        exposure: { label: 'Exposure (Ke)',   unitType: 'none' },
    },
    calculate: (inputs) => {
        const Cpe = 0.8 * (inputs.exposure || 1.0);
        const qd = 0.6 * 36 ** 2 * Cpe * 1e-6;
        return { Cpe, qd };
    },
};

// ---- 定義をまとめる ----

export const WindCardDef = createStrategyDefinition<WindOutputs>({
    type: 'WIND',
    title: 'Wind Load',
    icon: Wind,
    description: 'Calculate design wind pressure by zone.',

    // セレクタのキー名と選択肢
    strategyKey: 'zone',
    strategies: [ZoneAStrategy, ZoneBStrategy],

    outputConfig: {
        Cpe: { label: 'External Coeff (Cpe)', unitType: 'none' },
        qd:  { label: 'Design Wind Press',    unitType: 'stress' },
    },
});
```

`strategyKey` に指定したキー（ここでは `'zone'`）が自動的にセレクト入力として UI に表示されます。
選択中のストラテジーの `inputConfig` と `calculate` に動的に切り替わります。

---

### 3. マルチ軸ストラテジーカード

2 つ以上のセレクタを組み合わせて戦略を合成するパターン（BEAM カードで使用）。

```typescript
createStrategyDefinition({
    type: 'BEAM',
    // ...
    // strategyKey の代わりに strategyAxes を使う
    strategyAxes: [
        {
            key: 'boundary',
            label: 'Boundary',
            options: [
                { label: 'Simple',      value: 'simple' },
                { label: 'Cantilever',  value: 'cantilever' },
            ],
            default: 'simple',
        },
        {
            key: 'load',
            label: 'Load Type',
            options: [
                { label: 'Uniform', value: 'uniform' },
                { label: 'Point',   value: 'point' },
            ],
            default: 'uniform',
        },
    ],
    strategies: [
        // id は各軸の value を '_' で結合したもの
        { id: 'simple_uniform',     label: 'Simple / Uniform',     inputConfig: {...}, calculate: (...) => {...} },
        { id: 'simple_point',       label: 'Simple / Point',       inputConfig: {...}, calculate: (...) => {...} },
        { id: 'cantilever_uniform', label: 'Cantilever / Uniform', inputConfig: {...}, calculate: (...) => {...} },
        { id: 'cantilever_point',   label: 'Cantilever / Point',   inputConfig: {...}, calculate: (...) => {...} },
    ],
    // ...
});
```

ストラテジーの `id` は各軸の選択値を `_` で結合した文字列になります（例: `'simple_uniform'`）。
全組み合わせ分のストラテジーを定義する必要があります。

---

### 4. ビジュアライゼーションの追加

`CardDefinition` の `visualization` に React コンポーネントを指定すると、
`GenericCard` が入力・出力パネルの間に自動挿入します。

```typescript
import type { CardComponentProps } from '../../lib/registry/types';

const MyViz: React.FC<CardComponentProps> = ({ card }) => {
    // card.inputs, card.outputs, card.unitMode にアクセス可能
    const value = card.outputs['myOutput'] ?? 0;

    return (
        <svg viewBox="0 0 200 100" className="w-full">
            <rect width={value / 10} height={50} fill="steelblue" />
        </svg>
    );
};

export const MyCardDef = createCardDefinition({
    // ...
    visualization: MyViz,  // ← ここに渡す
});
```

> **ヒント**: SVG をビューポートに自動フィットさせる `AutoFitSvg` ユーティリティ
> (`src/components/cards/common/AutoFitSvg.tsx`) が既存カードで使用されています。

---

### 5. カードの登録

新しいカードを作成したら、レジストリに登録して `CardType` を追加します。

**`src/lib/registry/index.ts`**

```typescript
import { MyCardDef } from '../../components/cards/MyCard'; // 追加

registry.register(MyCardDef); // 追加
```

**`src/types/index.ts`**

```typescript
export type CardType = 'SECTION' | 'MATERIAL' | 'BEAM' | 'VERIFY' | 'CUSTOM' | 'MY_TYPE'; // 追加
```

**`src/components/layout/AppLayout.tsx`** — サイドバーのボタン一覧に追加

```typescript
const cardTypes = [
    // ...既存エントリ...
    { type: 'MY_TYPE' as CardType, label: 'My Card', desc: 'One-line description' },
];
```

これだけで、サイドバーへの追加・ドラッグ並べ替え・参照リンク・URL共有が自動的に機能します。

---

## ユニットシステム

全ての内部値は **SI ベース単位** で保持します。

| 物理量 | 内部単位 | mm モード表示 | m モード表示 |
|--------|---------|------------|------------|
| 長さ | mm | mm | m |
| 面積 | mm² | mm² | m² |
| 断面二次モーメント | mm⁴ | mm⁴ | m⁴ |
| 力 | N | N | kN |
| モーメント | Nmm | Nmm | kNm |
| 応力度 | N/mm² | N/mm² | N/mm²（不変） |
| 断面係数 | mm³ | mm³ | m³ |

変換係数は `src/lib/utils/unitFormatter.ts` の `INPUT_FACTORS` / `DISPLAY_DIVISORS` にまとめられています。
`SmartInput` は `INPUT_FACTORS` を使って表示値→SI値に変換し、
`formatOutput` は `DISPLAY_DIVISORS` を使って SI値→表示値に変換します。

---

## データモデル

```typescript
// src/types/index.ts
export type CardType = 'SECTION' | 'MATERIAL' | 'BEAM' | 'VERIFY' | 'CUSTOM';

export interface CardInput {
    value: string | number;
    ref?: { cardId: string; outputKey: string }; // 参照リンク
}

export interface Card {
    id: string;          // UUID
    type: CardType;
    alias: string;       // ユーザーが編集できる表示名
    inputs: Record<string, CardInput>;
    outputs: Record<string, number>; // 常に SI 単位
    unitMode?: 'mm' | 'm';
    error?: string;      // 計算失敗時にセット
}
```

状態変化のたびにストアがトポロジカルソートを行い、全カードを依存順に再計算します。
参照リンクは計算時に解決され、ソースカードの `outputs` から値を取得します。

---

## ファイル構成

```
src/
├── components/
│   ├── cards/
│   │   ├── common/
│   │   │   ├── BaseCard.tsx          # ドラッグ・折りたたみ・削除を持つカードシェル
│   │   │   ├── GenericCard.tsx       # 入力/出力UIを自動生成するデフォルトレンダラー
│   │   │   ├── AutoFitSvg.tsx        # SVGの自動フィットユーティリティ
│   │   │   └── visualizationHelper.tsx
│   │   ├── Beam.tsx                  # 梁計算カード定義
│   │   ├── Custom.tsx                # カスタム数式カード定義
│   │   ├── Material.tsx              # 材料カード定義
│   │   ├── Section.tsx               # 断面カード定義
│   │   └── Verify.tsx                # 照査カード定義
│   ├── common/
│   │   ├── Button.tsx                # 共通ボタン (variant / size)
│   │   ├── SmartInput.tsx            # 手入力 / 参照リンク 切替入力
│   │   ├── Toast.tsx                 # Toaster コンポーネント
│   │   └── toast.ts                  # toast() 関数（subscribers パターン）
│   ├── layout/
│   │   └── AppLayout.tsx             # サイドバー・ヘッダー・Import/Export/Share
│   └── stack/
│       ├── StackArea.tsx             # DndKit ソータブルコンテナ
│       ├── SortableItem.tsx
│       └── useSortableItem.ts
├── lib/
│   ├── engine/
│   │   └── graph.ts                  # トポロジカルソート・依存解決
│   ├── mechanics/
│   │   └── beam.ts                   # 純粋関数の梁力学計算式
│   ├── registry/
│   │   ├── index.ts                  # CardRegistry・登録処理
│   │   ├── strategyHelper.ts         # createCardDefinition / createStrategyDefinition
│   │   └── types.ts                  # CardDefinition・CardActions インターフェース
│   └── utils/
│       ├── serialization.ts          # JSON エクスポート・URL 圧縮 (pako)
│       └── unitFormatter.ts          # SI ↔ 表示値 変換・単位ラベル
├── store/
│   └── useTsumikiStore.ts            # Zustand ストア・全アクション・再計算トリガー
└── types/
    └── index.ts                      # Card / CardInput / CardType
```
