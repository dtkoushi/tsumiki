import type { CardDefinition } from './types';
import { MaterialCardDef } from '../../components/cards/Material';
import { SectionCardDef } from '../../components/cards/Section';
import { BeamCardDef } from '../../components/cards/Beam';
import { VerifyCardDef } from '../../components/cards/Verify';
import { CustomCardDef } from '../../components/cards/Custom';


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
registry.register(CustomCardDef);

// Make types available
export type { CardDefinition } from './types';
