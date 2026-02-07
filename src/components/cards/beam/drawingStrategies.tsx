
import React from 'react';

export interface BeamDrawingStrategy {
    id: string; // 'uniform', 'point'
    // Returns elements to render in World Coordinates
    drawLoads: (inputs: Record<string, number>, scale: number, L: number) => React.ReactNode;
}

export const UniformLoadStrategy: BeamDrawingStrategy = {
    id: 'uniform',
    drawLoads: (inputs, scale, L) => {
        // Fixed size for markers (px) converted to World Units
        const markerSizePx = 15;
        const ms = markerSizePx / scale;

        // P and w are just for label/display in this context usually, 
        // but if we wanted to scale height by load magnitude we could.
        // For now, fixed visual height for the diagram.

        return (
            <g className="text-blue-500">
                {/* Distributed Load: Rect + Arrows */}
                <rect
                    x={0} y={-ms * 2}
                    width={L} height={ms * 2}
                    fill="currentColor" fillOpacity={0.1}
                    stroke="none"
                />
                <line
                    x1={0} y1={-ms * 2} x2={L} y2={-ms * 2}
                    stroke="currentColor" strokeWidth={1.5 / scale}
                />
                {/* Arrows at intervals */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                    <path
                        key={t}
                        d={`M ${L * t} ${-ms * 2} L ${L * t} 0`}
                        stroke="currentColor"
                        strokeWidth={1 / scale}
                    />
                ))}
                {/* Manual Arrowheads */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
                    <path
                        key={`head-${t}`}
                        d={`M ${L * t - ms / 4} ${-ms / 2} L ${L * t} 0 L ${L * t + ms / 4} ${-ms / 2}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1 / scale}
                    />
                ))}
            </g>
        );
    }
};

export const PointLoadStrategy: BeamDrawingStrategy = {
    id: 'point',
    drawLoads: (inputs, scale, L) => {
        const x_loc = inputs['x_loc'] || 0;

        // Fixed size for markers (px) converted to World Units
        const markerSizePx = 15;
        const ms = markerSizePx / scale;

        return (
            <g className="text-red-500">
                {/* Point Load at x_loc */}
                <line
                    x1={x_loc} y1={-ms * 3} x2={x_loc} y2={0}
                    stroke="currentColor"
                    strokeWidth={2 / scale}
                />
                {/* Arrowhead */}
                <path
                    d={`M ${x_loc - ms / 2} ${-ms} L ${x_loc} 0 L ${x_loc + ms / 2} ${-ms}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2 / scale}
                />
            </g>
        );
    }
};

export const BeamStrategies: BeamDrawingStrategy[] = [
    UniformLoadStrategy,
    PointLoadStrategy
];
