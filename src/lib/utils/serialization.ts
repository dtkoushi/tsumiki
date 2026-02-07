import pako from 'pako';
import type { Card } from '../../types';

interface ProjectData {
    meta: { title: string; author: string };
    cards: Card[];
    version: string;
}

/**
 * Serialize project state to JSON string
 */
export const serializeProject = (meta: ProjectData['meta'], cards: Card[]): string => {
    const data: ProjectData = {
        meta,
        cards,
        version: '1.0.0',
    };
    return JSON.stringify(data, null, 2);
};

/**
 * Deserialize JSON string to project state
 */
export const deserializeProject = (jsonStr: string): ProjectData | null => {
    try {
        const data = JSON.parse(jsonStr) as ProjectData;
        // Basic validation could go here
        if (!data.cards || !Array.isArray(data.cards)) {
            throw new Error('Invalid project format');
        }
        return data;
    } catch (e) {
        console.error('Failed to parse project data', e);
        return null;
    }
};

/**
 * Compress state to Base64 string for URL sharing
 */
export const compressToUrl = (meta: ProjectData['meta'], cards: Card[]): string => {
    const jsonStr = JSON.stringify({ meta, cards, v: '1' });
    // Compress using pako (Deflate)
    const compressed = pako.deflate(jsonStr);
    // Convert to Base64 (URL safe)
    // We use a custom buffer to base64 conversion that handles large arrays if needed,
    // but for simple usage:
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(compressed)));
    return encodeURIComponent(base64);
};

/**
 * Decompress state from Base64 string
 */
export const decompressFromUrl = (urlParam: string): Partial<ProjectData> | null => {
    try {
        const base64 = decodeURIComponent(urlParam);
        const charData = atob(base64).split('').map(x => x.charCodeAt(0));
        const binData = new Uint8Array(charData);
        const resultStr = pako.inflate(binData, { to: 'string' });
        const data = JSON.parse(resultStr);

        // Remap short keys if used, or just return
        return {
            meta: data.meta,
            cards: data.cards,
            version: data.v
        };
    } catch (e) {
        console.error('Failed to decompression URL data', e);
        return null;
    }
};
