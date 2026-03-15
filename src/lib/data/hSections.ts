
export type HFlangeCategory = 'narrow' | 'medium' | 'wide';

export interface HSection {
    name: string;
    H: number;
    B: number;
    tw: number;
    tf: number;
    category: HFlangeCategory;
}

export const H_SECTIONS: HSection[] = [
    // 細幅: B ≤ 150mm
    { name: 'H-100×50×5×7',    H: 100, B:  50, tw:  5.0, tf:  7.0, category: 'narrow' },
    { name: 'H-125×60×6×8',    H: 125, B:  60, tw:  6.0, tf:  8.0, category: 'narrow' },
    { name: 'H-150×75×5×7',    H: 150, B:  75, tw:  5.0, tf:  7.0, category: 'narrow' },
    { name: 'H-175×90×5×8',    H: 175, B:  90, tw:  5.0, tf:  8.0, category: 'narrow' },
    { name: 'H-200×100×5.5×8', H: 200, B: 100, tw:  5.5, tf:  8.0, category: 'narrow' },
    { name: 'H-248×124×5×8',   H: 248, B: 124, tw:  5.0, tf:  8.0, category: 'narrow' },
    { name: 'H-250×125×6×9',   H: 250, B: 125, tw:  6.0, tf:  9.0, category: 'narrow' },
    { name: 'H-298×149×5.5×8', H: 298, B: 149, tw:  5.5, tf:  8.0, category: 'narrow' },
    { name: 'H-300×150×6.5×9', H: 300, B: 150, tw:  6.5, tf:  9.0, category: 'narrow' },
    { name: 'H-400×150×8×13',  H: 400, B: 150, tw:  8.0, tf: 13.0, category: 'narrow' },
    { name: 'H-450×150×9×14',  H: 450, B: 150, tw:  9.0, tf: 14.0, category: 'narrow' },
    // 中幅: B 172–201mm
    { name: 'H-244×175×7×11',  H: 244, B: 175, tw:  7.0, tf: 11.0, category: 'medium' },
    { name: 'H-294×200×8×12',  H: 294, B: 200, tw:  8.0, tf: 12.0, category: 'medium' },
    { name: 'H-344×172×6×9.5', H: 344, B: 172, tw:  6.0, tf:  9.5, category: 'medium' },
    { name: 'H-350×175×7×11',  H: 350, B: 175, tw:  7.0, tf: 11.0, category: 'medium' },
    { name: 'H-400×200×8×13',  H: 400, B: 200, tw:  8.0, tf: 13.0, category: 'medium' },
    { name: 'H-450×200×9×14',  H: 450, B: 200, tw:  9.0, tf: 14.0, category: 'medium' },
    { name: 'H-500×200×10×16', H: 500, B: 200, tw: 10.0, tf: 16.0, category: 'medium' },
    { name: 'H-600×200×11×17', H: 600, B: 200, tw: 11.0, tf: 17.0, category: 'medium' },
    { name: 'H-606×201×12×20', H: 606, B: 201, tw: 12.0, tf: 20.0, category: 'medium' },
    // 広幅: B ≥ 250mm
    { name: 'H-340×250×9×14',  H: 340, B: 250, tw:  9.0, tf: 14.0, category: 'wide' },
    { name: 'H-390×300×10×16', H: 390, B: 300, tw: 10.0, tf: 16.0, category: 'wide' },
    { name: 'H-440×300×11×18', H: 440, B: 300, tw: 11.0, tf: 18.0, category: 'wide' },
    { name: 'H-482×300×11×15', H: 482, B: 300, tw: 11.0, tf: 15.0, category: 'wide' },
    { name: 'H-488×300×11×18', H: 488, B: 300, tw: 11.0, tf: 18.0, category: 'wide' },
    { name: 'H-582×300×12×17', H: 582, B: 300, tw: 12.0, tf: 17.0, category: 'wide' },
    { name: 'H-588×300×12×20', H: 588, B: 300, tw: 12.0, tf: 20.0, category: 'wide' },
    { name: 'H-700×300×13×24', H: 700, B: 300, tw: 13.0, tf: 24.0, category: 'wide' },
    { name: 'H-800×300×14×26', H: 800, B: 300, tw: 14.0, tf: 26.0, category: 'wide' },
    { name: 'H-900×300×16×28', H: 900, B: 300, tw: 16.0, tf: 28.0, category: 'wide' },
];

export const byCategory = (cat: HFlangeCategory): HSection[] =>
    H_SECTIONS.filter(s => s.category === cat);

export const CATEGORY_DEFAULTS: Record<HFlangeCategory, string> = {
    narrow: 'H-200×100×5.5×8',
    medium: 'H-400×200×8×13',
    wide:   'H-390×300×10×16',
};

export function findHSection(name: string): HSection | undefined {
    return H_SECTIONS.find(s => s.name === name);
}
