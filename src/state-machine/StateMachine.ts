import { AbstractStateEvent, NameFromEvent, PayloadFromEventName } from "./StateEvent";

export type StateSettings<States extends string | number | symbol, Events extends AbstractStateEvent<any>> = {
    [E in NameFromEvent<Events>]?: (payload: PayloadFromEventName<E, Events>) => States | void;
};

export type StateMachineSettings<States extends string | number | symbol, Events extends AbstractStateEvent<any>> = {
    entryState: States,
    states: {
        [K in States]: StateSettings<States, Events>
    },
}

export class StateMachine<States extends string | number | symbol, Events extends AbstractStateEvent<any>> {

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