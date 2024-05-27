export abstract class AbstractStateEvent<T> {
    abstract readonly name: string | number | symbol;
    constructor(public payload: T) { }
}

export type NameFromEvent<T> = T extends { name: infer U extends string | number | symbol } ? U : never;
export type EventFromName<U, T extends AbstractStateEvent<any>> = T extends { name: U } ? T : never;
export type PayloadFromEvent<T> = T extends AbstractStateEvent<infer U> ? U : never;
export type PayloadFromEventName<StateName, T extends AbstractStateEvent<any>> = PayloadFromEvent<EventFromName<StateName, T>>;