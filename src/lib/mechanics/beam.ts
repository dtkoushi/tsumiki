
/**
 * Beam Mechanics Library
 * Pure functions for calculating beam forces and deflections.
 */

// --- Types ---

export interface BeamModel {
    boundary: 'simple' | 'cantilever';
    load: 'uniform' | 'point';
    L: number; // Span in mm
    w?: number; // Distributed load in N/mm
    P?: number; // Point load in N
    x_loc?: number; // Location of load/point in mm
}

export interface BeamResult {
    M: number; // Moment in Nmm
    Q: number; // Shear in N
}

// --- Formulas ---

export const BeamFormulas = {
    // Simple Beam - Uniform Load
    simple_uniform: (L: number, w: number, x: number): BeamResult => {
        // M(x) = wLx/2 - wx^2/2
        // Q(x) = wL/2 - wx
        const M = (w * L * x) / 2 - (w * Math.pow(x, 2)) / 2;
        const Q = (w * L) / 2 - (w * x);
        return { M, Q };
    },

    // Simple Beam - Point Load
    simple_point: (L: number, P: number, a: number, x: number): BeamResult => {
        // a = location of point load
        // if x <= a: M(x) = Pb(x)/L = P(L-a)x/L
        // if x > a:  M(x) = Pa(L-x)/L
        const b = L - a;
        let M = 0;
        let Q = 0;

        if (x <= a) {
            M = (P * b * x) / L;
            Q = (P * b) / L;
        } else {
            M = (P * a * (L - x)) / L;
            Q = -(P * a) / L;
        }
        return { M, Q };
    },

    // Cantilever - Uniform Load
    // Fixed at Left (x=0)
    cantilever_uniform: (L: number, w: number, x: number): BeamResult => {
        // M(x) = -w(L-x)^2 / 2
        // Q(x) = w(L-x)
        const M = -(w * Math.pow(L - x, 2)) / 2;
        const Q = w * (L - x);
        return { M, Q };
    },

    // Cantilever - Point Load
    // Fixed at Left (x=0), Load at 'a'
    cantilever_point: (L: number, P: number, a: number, x: number): BeamResult => {
        // If x <= a: M(x) = -P(a-x)
        // If x > a:  M(x) = 0
        let M = 0;
        let Q = 0;
        if (x <= a) {
            M = -P * (a - x);
            Q = P;
        } else {
            M = 0;
            Q = 0;
        }
        return { M, Q };
    }
};

// --- Helper to dispatch calculation based on Model ---

export function calculateBeamAt(model: BeamModel, x: number): BeamResult {
    const { boundary, load, L } = model;

    // Safety check
    if (x < 0 || x > L) return { M: 0, Q: 0 };

    if (boundary === 'simple' && load === 'uniform') {
        return BeamFormulas.simple_uniform(L, model.w || 0, x);
    }
    if (boundary === 'simple' && load === 'point') {
        return BeamFormulas.simple_point(L, model.P || 0, model.x_loc || L / 2, x);
    }
    if (boundary === 'cantilever' && load === 'uniform') {
        return BeamFormulas.cantilever_uniform(L, model.w || 0, x);
    }
    if (boundary === 'cantilever' && load === 'point') {
        // Default to tip load if x_loc not specified for consistency with previous behavior, 
        // though UI sets x_loc default.
        return BeamFormulas.cantilever_point(L, model.P || 0, model.x_loc ?? L, x);
    }

    return { M: 0, Q: 0 };
}

// --- Max Value Helpers ---

export function calculateBeamMax(model: BeamModel): { M_max: number, V_max: number } {
    const { boundary, load, L } = model;

    if (boundary === 'simple' && load === 'uniform') {
        const w = model.w || 0;
        return {
            M_max: (w * L * L) / 8,
            V_max: (w * L) / 2
        };
    }
    if (boundary === 'simple' && load === 'point') {
        const P = model.P || 0;
        const a = model.x_loc ?? L / 2;
        const b = L - a;
        // M_max occurs at load point
        return {
            M_max: (P * a * b) / L,
            V_max: Math.max((P * b) / L, (P * a) / L)
        };
    }
    if (boundary === 'cantilever' && load === 'uniform') {
        const w = model.w || 0;
        return {
            M_max: -(w * L * L) / 2, // At support
            V_max: w * L
        };
    }
    if (boundary === 'cantilever' && load === 'point') {
        const P = model.P || 0;
        const a = model.x_loc ?? L;
        return {
            M_max: -P * a, // At support
            V_max: P
        };
    }

    return { M_max: 0, V_max: 0 };
}
