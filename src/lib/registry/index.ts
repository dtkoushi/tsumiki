// Re-export the singleton first — must precede glob imports to ensure the
// registry is initialized before any card file tries to call register().
export { registry } from './registry';

// Eagerly load all card files — each self-registers via registry.register().
// The glob pattern excludes the 'common/' subdirectory because '*' does not
// cross path separators.
import.meta.glob('../../components/cards/*.tsx', { eager: true });

// Make types available
export type { CardDefinition } from './types';
