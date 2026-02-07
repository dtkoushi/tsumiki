import { createContext, useContext } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';

export interface SortableItemContextProps {
    attributes: Record<string, any>;
    listeners: DraggableSyntheticListeners;
    setNodeRef: (element: HTMLElement | null) => void;
    style: React.CSSProperties;
    isDragging: boolean;
    isDragOverlay?: boolean;
}

export const SortableItemContext = createContext<SortableItemContextProps>({
    attributes: {},
    listeners: undefined,
    setNodeRef: () => { },
    style: {},
    isDragging: false,
    isDragOverlay: false,
});

export const useSortableItemContext = () => useContext(SortableItemContext);
