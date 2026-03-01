
import React from 'react';
import { SmartInput } from '../../common/SmartInput';
import type { SmartInputUnitType } from '../../../lib/registry/types';
import { useCardContext } from './CardContext';

interface CardSmartInputProps {
    inputKey: string;
    inputType: SmartInputUnitType;
    placeholder?: string;
    className?: string;
}

export const CardSmartInput: React.FC<CardSmartInputProps> = ({ inputKey, inputType, placeholder, className }) => {
    const { cardId, card, actions, upstreamCards, upstreamInputConfigs, unitMode } = useCardContext();
    return (
        <SmartInput
            cardId={cardId}
            inputKey={inputKey}
            card={card}
            actions={actions}
            upstreamCards={upstreamCards}
            upstreamInputConfigs={upstreamInputConfigs}
            placeholder={placeholder}
            className={className}
            unitMode={unitMode}
            inputType={inputType}
        />
    );
};
