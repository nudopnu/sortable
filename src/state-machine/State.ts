export abstract class AbstractState<T> {
    constructor(public payload: T) { }
}

export class Idle extends AbstractState<void> {
    readonly state = "Idle";
}

export class Done extends AbstractState<string> {
    readonly state = "Done";
}
