
// Basic geometry types
export interface Point { x: number; y: number; }

export interface DimensionDef {
    type: 'vertical' | 'horizontal';
    start: Point;
    end: Point;
    label: string;
    offset?: number; // Distance from the line connecting start/end to place the dimension line
}

export interface DrawingStrategy {
    id: string; // e.g., 'rect', 'h_beam'

    // Returns bounding box in World Coordinates
    getBounds: (inputs: Record<string, number>) => { minX: number; minY: number; maxX: number; maxY: number };

    // Returns SVG Path command in World Coordinates
    getPath: (inputs: Record<string, number>) => string;

    // Returns list of dimensions to draw in World Coordinates
    getDimensions: (inputs: Record<string, number>) => DimensionDef[];
}

// --- Strategies ---

export const RectDrawingStrategy: DrawingStrategy = {
    id: 'rect',
    getBounds: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return { minX: 0, minY: 0, maxX: B, maxY: H };
    },
    getPath: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return `M 0 0 H ${B} V ${H} H 0 Z`;
    },
    getDimensions: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return [
            {
                type: 'horizontal',
                start: { x: 0, y: H },
                end: { x: B, y: H },
                label: `B=${B}`,
                offset: 20
            },
            {
                type: 'vertical',
                start: { x: 0, y: 0 },
                end: { x: 0, y: H },
                label: `H=${H}`,
                offset: 20
            }
        ];
    }
};

export const HBeamDrawingStrategy: DrawingStrategy = {
    id: 'h_beam',
    getBounds: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return { minX: 0, minY: 0, maxX: B, maxY: H };
    },
    getPath: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        const tw = inputs['tw'] || 6;
        const tf = inputs['tf'] || 9;

        // H-Shape Path (Top-Left start, going clockwise)
        // 1. Top Flange Top Edge
        // 2. Top Flange Right Edge
        // 3. Top Flange Bottom Right
        // 4. Web Right
        // 5. Bot Flange Top Right
        // ...

        const x_web_left = (B - tw) / 2;
        const x_web_right = x_web_left + tw;
        const y_tf_bot = tf;
        const y_bf_top = H - tf;

        return `
            M 0 0 
            H ${B} 
            v ${tf} 
            h ${-(B - tw) / 2} 
            V ${y_bf_top} 
            h ${(B - tw) / 2} 
            v ${tf} 
            H 0 
            v ${-tf} 
            h ${(B - tw) / 2} 
            V ${y_tf_bot} 
            h ${-(B - tw) / 2} 
            Z
        `;
    },
    getDimensions: (inputs) => {
        const B = inputs['B'] || 100;
        const H = inputs['H'] || 200;
        return [
            {
                type: 'horizontal',
                start: { x: 0, y: H },
                end: { x: B, y: H },
                label: `B=${B}`,
                offset: 20
            },
            {
                type: 'vertical',
                start: { x: 0, y: 0 },
                end: { x: 0, y: H },
                label: `H=${H}`,
                offset: 20
            }
        ];
    }
};

export const CircleDrawingStrategy: DrawingStrategy = {
    id: 'circle',
    getBounds: (inputs) => {
        const D = inputs['D'] || 100;
        return { minX: 0, minY: 0, maxX: D, maxY: D };
    },
    getPath: (inputs) => {
        const D = inputs['D'] || 100;
        const r = D / 2;
        // SVG Arc command for circle:
        // M cx, cy-r 
        // A r r 0 1 0 cx, cy+r
        // A r r 0 1 0 cx, cy-r
        return `
            M ${r} 0 
            A ${r} ${r} 0 1 0 ${r} ${D}
            A ${r} ${r} 0 1 0 ${r} 0
        `;
    },
    getDimensions: (inputs) => {
        const D = inputs['D'] || 100;
        // For circle, maybe just horizontal dimension for Diameter?
        return [
            {
                type: 'horizontal',
                start: { x: 0, y: D },
                end: { x: D, y: D },
                label: `D=${D}`,
                offset: 20
            }
        ];
    }
};

export const DrawingStrategies: DrawingStrategy[] = [
    RectDrawingStrategy,
    HBeamDrawingStrategy,
    CircleDrawingStrategy
];
