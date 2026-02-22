
import React from 'react';

const C_SUPPORT = '#475569';

interface FixedSupportProps {
    x: number;
    beamY: number;
    side: 'left' | 'right';
}

export const DrawFixedSupport: React.FC<FixedSupportProps> = ({ x, beamY, side }) => {
    const dir = side === 'left' ? -1 : 1;
    const h = 14;
    return (
        <g>
            <line x1={x} y1={beamY - h} x2={x} y2={beamY + h} stroke={C_SUPPORT} strokeWidth="2" />
            {[-h, -h / 2, 0, h / 2, h].map((dy, i) => (
                <line key={i} x1={x} y1={beamY + dy}
                    x2={x + dir * 8} y2={beamY + dy + 6}
                    stroke={C_SUPPORT} strokeWidth="1" />
            ))}
        </g>
    );
};

interface SupportProps {
    x: number;
    beamY: number;
}

export const DrawPinSupport: React.FC<SupportProps> = ({ x, beamY }) => {
    const ms = 8;
    return (
        <g>
            <polygon
                points={`${x - ms},${beamY + ms * 2} ${x + ms},${beamY + ms * 2} ${x},${beamY}`}
                fill="none" stroke={C_SUPPORT} strokeWidth="1.5"
            />
            <line x1={x - ms - 4} y1={beamY + ms * 2}
                x2={x + ms + 4} y2={beamY + ms * 2}
                stroke={C_SUPPORT} strokeWidth="1.5" />
        </g>
    );
};

export const DrawRollerSupport: React.FC<SupportProps> = ({ x, beamY }) => {
    const ms = 8;
    return (
        <g>
            <circle cx={x} cy={beamY + ms} r={ms}
                fill="none" stroke={C_SUPPORT} strokeWidth="1.5" />
            <line x1={x - ms - 4} y1={beamY + ms * 2}
                x2={x + ms + 4} y2={beamY + ms * 2}
                stroke={C_SUPPORT} strokeWidth="1.5" />
        </g>
    );
};
