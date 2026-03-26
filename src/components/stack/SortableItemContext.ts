import { createContext, useContext } from 'react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';

export interface SortableItemContextProps {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
    setNodeRef: (element: HTMLElement | null) => void;
    style: React.CSSProperties;
    isDragging: boolean;
    isDragOverlay?: boolean;
}

export const SortableItemContext = createContext<SortableItemContextProps>({
    attributes: {
        role: 'button',
        tabIndex: 0,
        'aria-disabled': false,
        'aria-pressed': undefined,
        'aria-roledescription': 'sortable',
        'aria-describedby': '',
    },
    listeners: undefined,
    setNodeRef: () => { },
    style: {},
    isDragging: false,
    isDragOverlay: false,
});

export const useSortableItemContext = () => useContext(SortableItemContext);
