import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableItemContext } from './SortableItemContext';

interface SortableItemProps {
    id: string;
    children: React.ReactNode;
}

export const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <SortableItemContext.Provider value={{ attributes, listeners, setNodeRef, style, isDragging }}>
            {children}
        </SortableItemContext.Provider>
    );
};
