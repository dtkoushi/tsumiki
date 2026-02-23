import type { CardDefinition } from './types';
import { MaterialCardDef } from '../../components/cards/Material';
import { SectionCardDef } from '../../components/cards/Section';
import { BeamCardDef } from '../../components/cards/Beam';
import { VerifyCardDef } from '../../components/cards/Verify';
import { CustomMapDef, CustomCombineDef } from '../../components/cards/Custom';
import { CoupleCardDef } from '../../components/cards/Couple';
import { BeamMultiCardDef } from '../../components/cards/BeamMulti';
import { DiagramCardDef } from '../../components/cards/Diagram';
import { StressCardDef } from '../../components/cards/Stress';
import { DeflectionCardDef } from '../../components/cards/Deflection';
import { ColumnCardDef } from '../../components/cards/Column';


class CardRegistry {
    private definitions: Map<string, CardDefinition> = new Map();

    register(def: CardDefinition) {
        if (this.definitions.has(def.type)) {
            console.warn(`Card type ${def.type} is already registered. Overwriting.`);
        }
        this.definitions.set(def.type, def);
    }

    get(type: string): CardDefinition | undefined {
        return this.definitions.get(type);
    }

    getAll(): CardDefinition[] {
        return Array.from(this.definitions.values());
    }
}

export const registry = new CardRegistry();

// Register Core Cards
registry.register(MaterialCardDef);
registry.register(SectionCardDef);
registry.register(BeamCardDef);
registry.register(VerifyCardDef);
registry.register(CustomMapDef);
registry.register(CustomCombineDef);
registry.register(CoupleCardDef);
registry.register(BeamMultiCardDef);
registry.register(DiagramCardDef);
registry.register(StressCardDef);
registry.register(DeflectionCardDef);
registry.register(ColumnCardDef);

// Make types available
export type { CardDefinition } from './types';
