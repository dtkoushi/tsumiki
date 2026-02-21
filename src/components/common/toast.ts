type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    duration: number;
}

type Subscriber = (items: ToastItem[]) => void;

let nextId = 0;
let items: ToastItem[] = [];
export const subscribers: Set<Subscriber> = new Set();

const notify = () => subscribers.forEach(fn => fn([...items]));

export function toast(message: string, type: ToastType = 'info', duration = 3000) {
    const id = ++nextId;
    items = [...items, { id, message, type, duration }];
    notify();
    setTimeout(() => {
        items = items.filter(t => t.id !== id);
        notify();
    }, duration);
}
