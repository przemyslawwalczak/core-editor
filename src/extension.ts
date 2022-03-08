import { Editor } from './index'
import { EVENT_TYPE } from './constants/event'

export class Extension<T> {
    type: string
    editor: Editor<T>

    constructor(type: string, editor: Editor<T>) {
        this.type = type
        this.editor = editor
    }

    createEntity?(): void

    serialize?(): void
    deserialize?(): void

    [EVENT_TYPE.BEFORE_SELECTION_CHANGE]?(event: Event): boolean | void
    [EVENT_TYPE.ON_SELECTION_CHANGE]?(event: Event): boolean | void
    [EVENT_TYPE.AFTER_SELECTION_CHANGE]?(event: Event): boolean | void
    
    [EVENT_TYPE.BEFORE_KEY_DOWN]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.ON_KEY_DOWN]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.AFTER_KEY_DOWN]?(event: KeyboardEvent): boolean | void

    [EVENT_TYPE.BEFORE_KEY_UP]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.ON_KEY_UP]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.AFTER_KEY_UP]?(event: KeyboardEvent): boolean | void

    [EVENT_TYPE.BEFORE_PASTE]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.ON_PASTE]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.AFTER_PASTE]?(event: KeyboardEvent): boolean | void

    [EVENT_TYPE.BEFORE_CUT]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.ON_CUT]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.AFTER_CUT]?(event: KeyboardEvent): boolean | void

    [EVENT_TYPE.BEFORE_COPY]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.ON_COPY]?(event: KeyboardEvent): boolean | void
    [EVENT_TYPE.AFTER_COPY]?(event: KeyboardEvent): boolean | void
}
