export type StateEventName<T> = T extends { name: infer U extends string | number | symbol } ? U : never;
export type EventFromName<EventName, T extends { name: string }> = T extends { name: EventName } ? T : never;
export type PayloadFromEvent<T> = T extends AbstractStateEvent<infer U> ? U : never;
export type PayloadFromEventName<StateName, T extends { name: string }> = PayloadFromEvent<EventFromName<StateName, T>>;

export type StateSettings<States extends string | number | symbol, Events extends { name: string }> = {
    [E in StateEventName<Events>]?: (payload: PayloadFromEventName<E, Events>) => States | void;
};

export type StateMachineSettings<States extends string | number | symbol, Events extends { name: string }> = {
    entryState: States,
    states: {
        [K in States]: StateSettings<States, Events>
    },
}

export class AbstractStateEvent<T> {
    constructor(public payload: T) { }
}

export class StateMachine<States extends string | number | symbol, Events extends { name: string; payload: any }> {

    currentState: States;

    constructor(public states: StateMachineSettings<States, Events>) {
        this.currentState = states.entryState;
    }

    submit(event: Events) {
        const callbacks = this.states.states[this.currentState];
        const name = event.name as keyof typeof callbacks;
        if (!(name in callbacks)) return;
        const targetState = callbacks[name]!(event.payload);
        if (!targetState) return;
        this.currentState = targetState;
    }
}