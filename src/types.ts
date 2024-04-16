export type TouchListenerOptions = {
    minTimeToHold?: number;
    onTap?: (event: TouchEvent) => void;
    onHold?: (event: TouchEvent) => void;
    onDragStart?: (event: TouchEvent) => void;
    onDrag?: (event: TouchEvent) => void;
    onDragEnd?: (event: TouchEvent) => void;
    onScroll?: (event: TouchEvent) => void;
    onHoldRelease?: (event: TouchEvent) => void;
};

export type SortableOptions<T> = TouchListenerOptions & {
    render: (data: T, index?: number) => HTMLElement;
    animationDuration?: number;
    onSwap?: (selection: DataEntry<T>[], target: DataEntry<T>) => void;
    onSwapStart?: () => void,
    onSwapEnd?: () => void,
    onChange?: (oldData: T[], newData: T[]) => void;
};

export type SortableListState = 'idle' | 'selecting' | 'dragging' | 'swapstart' | 'swap' | 'swapend';
export type TouchListenerState = 'idle' | 'touch' | 'hold' | 'drag' | 'scroll';

export type DataEntry<T> = {
    id: number;
    data: T;
    position: number;
    wrapper: HTMLElement;
    element: HTMLElement;
    ghost?: HTMLElement;
};