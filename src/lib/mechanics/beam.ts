
/**
 * Beam Mechanics Library
 * Pure functions for calculating beam forces and deflections.
 */

// --- Types ---

export interface BeamModel {
    boundary: 'simple' | 'cantilever' | 'fixed_fixed' | 'fixed_pinned';
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
        const M = (w * L * x) / 2 - (w * x * x) / 2;
        const Q = (w * L) / 2 - w * x;
        return { M, Q };
    },

    // Simple Beam - Point Load (P at a)
    simple_point: (L: number, P: number, a: number, x: number): BeamResult => {
        const b = L - a;
        if (x <= a) {
            return { M: (P * b * x) / L, Q: (P * b) / L };
        } else {
            return { M: (P * a * (L - x)) / L, Q: -(P * a) / L };
        }
    },

    // Cantilever - Uniform Load (Fixed at Left x=0)
    cantilever_uniform: (L: number, w: number, x: number): BeamResult => {
        return {
            M: -(w * (L - x) * (L - x)) / 2,
            Q: w * (L - x),
        };
    },

    // Cantilever - Point Load (Fixed at Left x=0, Load at 'a')
    cantilever_point: (L: number, P: number, a: number, x: number): BeamResult => {
        if (x <= a) {
            return { M: -P * (a - x), Q: P };
        } else {
            return { M: 0, Q: 0 };
        }
    },

    // Fixed-Fixed - Uniform Load
    // M(x) = wLx/2 - wx^2/2 - wL^2/12,  Q(x) = wL/2 - wx
    fixed_fixed_uniform: (L: number, w: number, x: number): BeamResult => {
        const M = (w * L * x) / 2 - (w * x * x) / 2 - (w * L * L) / 12;
        const Q = (w * L) / 2 - w * x;
        return { M, Q };
    },

    // Fixed-Fixed - Point Load (P at a, b = L-a)
    // VA = Pb^2(3a+b)/L^3,  MA = Pab^2/L^2
    fixed_fixed_point: (L: number, P: number, a: number, x: number): BeamResult => {
        const b = L - a;
        const VA = (P * b * b * (3 * a + b)) / (L * L * L);
        const MA = (P * a * b * b) / (L * L);
        if (x <= a) {
            return { M: VA * x - MA, Q: VA };
        } else {
            return { M: VA * x - MA - P * (x - a), Q: VA - P };
        }
    },

    // Fixed-Pinned - Uniform Load (Fixed at A=0, Pin at B=L)
    // RA = 5wL/8,  MA = wL^2/8
    // M(x) = -wL^2/8 + 5wLx/8 - wx^2/2,  Q(x) = 5wL/8 - wx
    fixed_pinned_uniform: (L: number, w: number, x: number): BeamResult => {
        const M = -(w * L * L) / 8 + (5 * w * L * x) / 8 - (w * x * x) / 2;
        const Q = (5 * w * L) / 8 - w * x;
        return { M, Q };
    },

    // Fixed-Pinned - Point Load (Fixed at A=0, Pin at B=L, P at a)
    // RB = Pa^2(3L-a)/(2L^3),  MA = Pa(L-a)(2L-a)/(2L^2)
    fixed_pinned_point: (L: number, P: number, a: number, x: number): BeamResult => {
        const b = L - a;
        const RB = (P * a * a * (3 * L - a)) / (2 * L * L * L);
        const RA = P - RB;
        const MA = (P * a * b * (2 * L - a)) / (2 * L * L);
        if (x <= a) {
            return { M: RA * x - MA, Q: RA };
        } else {
            return { M: RA * x - MA - P * (x - a), Q: RA - P };
        }
    },
};

// --- Superposition functions for BEAM_MULTI ---

export const BeamSuperposition = {
    // Simple beam, concentrated moment M0 at position a
    // M0 > 0 = counterclockwise applied moment
    // Reactions: RA = -M0/L, RB = M0/L
    simple_moment: (L: number, M0: number, a: number, x: number): BeamResult => {
        const RA = -M0 / L;
        if (x < a) {
            return { M: RA * x, Q: RA };
        } else {
            return { M: RA * x + M0, Q: RA };
        }
    },

    // Simple beam, uniform distributed load w over [a, b]
    simple_partial_uniform: (L: number, w: number, a: number, b: number, x: number): BeamResult => {
        const c = b - a;
        if (c <= 0) return { M: 0, Q: 0 };
        const RA = (w * c * (2 * L - a - b)) / (2 * L);
        const RB = w * c - RA;
        if (x < a) {
            return { M: RA * x, Q: RA };
        } else if (x <= b) {
            return {
                M: RA * x - (w * (x - a) * (x - a)) / 2,
                Q: RA - w * (x - a),
            };
        } else {
            return { M: RB * (L - x), Q: -RB };
        }
    },
};

// --- Helper to dispatch calculation based on Model ---

export function calculateBeamAt(model: BeamModel, x: number): BeamResult {
    const { boundary, load, L } = model;

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
        return BeamFormulas.cantilever_point(L, model.P || 0, model.x_loc ?? L, x);
    }
    if (boundary === 'fixed_fixed' && load === 'uniform') {
        return BeamFormulas.fixed_fixed_uniform(L, model.w || 0, x);
    }
    if (boundary === 'fixed_fixed' && load === 'point') {
        return BeamFormulas.fixed_fixed_point(L, model.P || 0, model.x_loc || L / 2, x);
    }
    if (boundary === 'fixed_pinned' && load === 'uniform') {
        return BeamFormulas.fixed_pinned_uniform(L, model.w || 0, x);
    }
    if (boundary === 'fixed_pinned' && load === 'point') {
        return BeamFormulas.fixed_pinned_point(L, model.P || 0, model.x_loc || L / 2, x);
    }

    return { M: 0, Q: 0 };
}

// --- Max Value Helpers ---

function scanBeamMax(model: BeamModel, N = 500): { M_max: number; V_max: number } {
    let M_max = 0;
    let V_max = 0;
    const { L } = model;
    for (let i = 0; i <= N; i++) {
        const x = (L / N) * i;
        const { M, Q } = calculateBeamAt(model, x);
        if (Math.abs(M) > Math.abs(M_max)) M_max = M;
        if (Math.abs(Q) > V_max) V_max = Math.abs(Q);
    }
    return { M_max, V_max };
}

export function calculateBeamMax(model: BeamModel): { M_max: number; V_max: number } {
    const { boundary, load, L } = model;

    if (boundary === 'simple' && load === 'uniform') {
        const w = model.w || 0;
        return { M_max: (w * L * L) / 8, V_max: (w * L) / 2 };
    }
    if (boundary === 'simple' && load === 'point') {
        const P = model.P || 0;
        const a = model.x_loc ?? L / 2;
        const b = L - a;
        return {
            M_max: (P * a * b) / L,
            V_max: Math.max((P * b) / L, (P * a) / L),
        };
    }
    if (boundary === 'cantilever' && load === 'uniform') {
        const w = model.w || 0;
        return { M_max: -(w * L * L) / 2, V_max: w * L };
    }
    if (boundary === 'cantilever' && load === 'point') {
        const P = model.P || 0;
        const a = model.x_loc ?? L;
        return { M_max: -P * a, V_max: P };
    }

    // For fixed_fixed and fixed_pinned: use numerical scan
    return scanBeamMax(model);
}
