// Re-export the singleton first — must precede glob imports to ensure the
// registry is initialized before any card file tries to call register().
import { registry } from './registry';
export { registry };

// Eagerly load all card files — each self-registers via registry.register().
// The glob pattern excludes the 'common/' subdirectory because '*' does not
// cross path separators.
const cardModules = import.meta.glob('../../components/cards/*.tsx', { eager: true });

// DEV: warn if some card files didn't call registry.register()
if (import.meta.env.DEV) {
    const fileCount = Object.keys(cardModules).length;
    const registeredCount = registry.getAll().length;
    if (fileCount > registeredCount) {
        console.warn(
            `[Registry] ${fileCount} card files found but only ${registeredCount} registered. ` +
            `${fileCount - registeredCount} file(s) may be missing registry.register() calls.`
        );
    }
}

// Make types available
export type { CardDefinition } from './types';
