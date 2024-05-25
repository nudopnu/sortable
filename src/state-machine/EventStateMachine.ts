import { AbstractState, Done, Idle } from "./State";
import { StateMachine, StateMachineSettings } from "./StateMachine";

export type StateNameFromState<T extends { state: string }> = T extends { state: infer U extends string } ? U : never;
export type PayloadFromTransitionEvent<T> = T extends AbstractState<infer U> ? U : never;
export type EventFromState<StateName, T extends { state: string }> = T extends { state: StateName } ? T : never;
export type PayloadFromState<StateName, T extends { state: string }> = PayloadFromTransitionEvent<EventFromState<StateName, T>>;

// Type inference tests:
type T0 = StateNameFromState<Idle | Done>;
type T1 = PayloadFromTransitionEvent<Done>;
type T2 = EventFromState<"Idle", Idle | Done>;
type T3 = PayloadFromState<"Done", Idle | Done>;
type T4 = EventStateMachineSettings<Idle | Done, StateNameFromState<Idle | Done>>;

export type EventStateMachineSettings<T extends { state: U }, U extends string> = {
    [SpecificState in U]?: (payload: PayloadFromState<SpecificState, T>) => void;
} & StateMachineSettings<U>;

export class EventStateMachine<T extends { state: U, payload: any }, U extends string = StateNameFromState<T>> extends StateMachine<U> {

    constructor(settings: EventStateMachineSettings<T, U>) {
        super(settings);
    }

    submit(transition: T) {
        const stateName = transition.state;
        if (this.canTransitionTo(stateName)) {
            this.transitionTo(stateName);
            const onStateTransition = (this.settings as EventStateMachineSettings<T, U>)[stateName];
            if (onStateTransition) onStateTransition(transition.payload);
        }
    }
}

const stateMachine = new EventStateMachine<Idle | Done>({
    graph: { vertices: { Done: 1, Idle: 2 }, adjacencies: {} },
    startState: 1,
});

stateMachine.submit(new Done("TEST"));