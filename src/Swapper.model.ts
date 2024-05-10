export class SwapperModel {

    private positions: Map<number, number> = new Map();
    private dirty = true;

    constructor(public ids: number[]) { }

    swap(sourceIds: number[], targetId: number, insertMode: 'before' | 'after' = 'after') {
        let result = [] as number[];
        let skipFlags = new Map<number, boolean>();

        // skip all sourceIds, they will get inserted when target index is reached
        for (let i = 0; i < sourceIds.length; i++) {
            const id = sourceIds[i];
            skipFlags.set(id, true);
        }

        // copy over every item except target, source ids, and everything in between
        for (let i = 0; i < this.ids.length; i++) {
            const id = this.ids[i];
            if (skipFlags.has(id)) continue;
            if (id === targetId) {
                if (insertMode === 'before') {
                    result = result.concat([...sourceIds, id]);
                } else {
                    result = result.concat([id, ...sourceIds]);
                }
                continue;
            }
            result.push(id);
        }
        this.ids = result;
        this.dirty = true;
    }

    swapWithPivot(sourceIds: number[], targetId: number, options: { pivotId: number }) {
        this.ensureCorrectPositions();
        const { pivotId } = options;
        if (!this.positions.has(targetId)) throw new Error(`ID ${targetId} not found`);
        if (!this.positions.has(pivotId)) throw new Error(`ID ${pivotId} not found`);
        const targetPosition = this.positions.get(targetId)!;
        const pivotPosition = this.positions.get(pivotId)!;
        if (targetPosition > pivotPosition) {
            this.swap(sourceIds, targetId, 'after');
        } else {
            this.swap(sourceIds, targetId, 'before');
        }
    }

    getPosition(id: number) {
        this.ensureCorrectPositions();
        if (!this.positions.has(id)) throw Error(`Id ${id} not found`);
        return this.positions.get(id)!;
    }

    getRange(startId: number, endId: number) {
        const result = [] as number[];
        let hasStarted = false;
        for (let i = 0; i < this.ids.length; i++) {
            const id = this.ids[i];
            if (id === startId) {
                hasStarted = true;
            }
            if (hasStarted) {
                result.push(id);
                if (id === endId) break;
            }
        }
        return result;
    }

    private ensureCorrectPositions() {
        if (!this.dirty) return
        this.updatePositions();
        this.dirty = false;
    }

    private updatePositions() {
        for (let i = 0; i < this.ids.length; i++) {
            const id = this.ids[i];
            this.positions.set(id, i);
        }
    }



}