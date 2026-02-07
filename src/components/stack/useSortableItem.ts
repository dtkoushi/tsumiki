import { useContext } from 'react';
import { SortableItemContext } from './SortableItemContext';

export const useSortableItem = () => useContext(SortableItemContext);
