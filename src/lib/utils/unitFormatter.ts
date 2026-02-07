
export type UnitMode = 'mm' | 'm';

// Defines the physical quantity type for proper conversion
// Defines the physical quantity type for proper conversion
export type OutputUnitType = 'length' | 'area' | 'inertia' | 'force' | 'moment' | 'stress' | 'ratio' | 'modulus' | 'load' | 'none';

/**
 * Formats a numerical value based on the physical quantity type and display mode.
 * 
 * @param value The value in standard SI units (mm, N, Nmm, etc.)
 * @param type The physical quantity type (e.g., 'moment', 'force')
 * @param mode The display mode ('mm' or 'm')
 */
export const formatOutput = (value: number | undefined | null, type: OutputUnitType, mode: UnitMode): string => {
    if (value === undefined || value === null || isNaN(value)) return '-';

    // Ratios and dimensionless values are never converted
    if (type === 'ratio' || type === 'none') {
        return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
    }

    // Default 'mm' mode (Raw SI values)
    if (mode === 'mm') {
        switch (type) {
            case 'moment': // Nmm
            case 'stress': // N/mm2
            case 'load': // N/mm
                return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
            case 'modulus': // mm3
                return value.toExponential(2);
            case 'inertia': // mm4
                return value.toExponential(2);
            case 'area': // mm2
            case 'length': // mm
            case 'force': // N
            default:
                return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
        }
    }

    // 'm' mode (Architectural units: m, kN, kNm, m2, m4)
    switch (type) {
        case 'length': // mm -> m
            return (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 });
        case 'area': // mm2 -> m2 (10^6)
            return (value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 4 });
        case 'inertia': // mm4 -> m4 (10^12)
            // Values will be very small, so use scientific notation or high precision
            return (value / 1000000000000).toExponential(2);
        case 'force': // N -> kN (10^3)
            return (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 });
        case 'moment': // Nmm -> kNm (10^6)
            return (value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 });
        case 'modulus': // mm3 -> m3 (10^9)
            return (value / 1000000000).toExponential(2);
        case 'stress': // N/mm2 -> N/mm2 (MPa) is standard. 
            return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
        case 'load': // N/mm -> kN/m (1000N/m / 1000 = 1kN/m? No. 1 N/mm = 1000 kN/m? Wait. 1 N/mm = 1000 N/m = 1 kN/m.)
            // 1 N/mm = 1000 N / 1 m = 1 kN / m. So value is same?
            // value is N/mm.
            // if value = 10 N/mm. = 10 * 1000 N/m = 10000 N/m = 10 kN/m.
            // So numeric value is same.
            return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
        default:
            return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
};

/**
 * Returns the unit suffix string based on type and mode.
 */
export const getUnitLabel = (type: OutputUnitType, mode: UnitMode): string => {
    if (type === 'ratio' || type === 'none') return '';

    if (mode === 'mm') {
        switch (type) {
            case 'length': return 'mm';
            case 'area': return 'mm²';
            case 'inertia': return 'mm⁴';
            case 'force': return 'N';
            case 'moment': return 'Nmm';
            case 'stress': return 'N/mm²';
            case 'modulus': return 'mm³';
            case 'load': return 'N/mm';
            default: return '';
        }
    } else {
        switch (type) {
            case 'length': return 'm';
            case 'area': return 'm²';
            case 'inertia': return 'm⁴';
            case 'force': return 'kN';
            case 'moment': return 'kNm';
            case 'stress': return 'N/mm²';
            case 'modulus': return 'm³';
            case 'load': return 'kN/m';
            default: return '';
        }
    }
};
