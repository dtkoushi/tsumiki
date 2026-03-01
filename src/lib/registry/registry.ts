import type { CardDefinition } from './types';

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

    /** Returns all registered type IDs. Useful for validation and autocomplete. */
    getTypes(): string[] {
        return Array.from(this.definitions.keys());
    }
}

export const registry = new CardRegistry();
