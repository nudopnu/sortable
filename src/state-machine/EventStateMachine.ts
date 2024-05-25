import { AbstractState } from "./State";
import { StateMachine, StateMachineSettings } from "./StateMachine";

export type StateNameFromState<T extends { state: string }> = T extends { state: infer U extends string } ? U : never;
export type PayloadFromTransitionEvent<T> = T extends AbstractState<infer U> ? U : never;
export type EventFromState<StateName, T extends { state: string }> = T extends { state: StateName } ? T : never;
export type PayloadFromState<StateName, T extends { state: string }> = PayloadFromTransitionEvent<EventFromState<StateName, T>>;

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