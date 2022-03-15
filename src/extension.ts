import { Editor } from './index'
import { EDITOR_HOOK } from './constants/hook'
import { DocumentObjectModel } from './dom'

export class Extension<T> {
    type: string
    editor: Editor<T>

    constructor(type: string, editor: Editor<T>) {
        this.type = type
        this.editor = editor

        console.log('created extension with type of:', type, editor)
    }

    createEntity?(dom: DocumentObjectModel<T>, data?: any): Element | Text | (Element | Text)[]

    serialize?(): void
    deserialize?(): void

    [EDITOR_HOOK.BEFORE_SELECTION_CHANGE]?(event: Event): boolean | void
    [EDITOR_HOOK.ON_SELECTION_CHANGE]?(event: Event): boolean | void
    [EDITOR_HOOK.AFTER_SELECTION_CHANGE]?(event: Event): boolean | void

    [EDITOR_HOOK.BEFORE_MUTATION_CHANGE]?(event: MutationRecord): boolean | void
    [EDITOR_HOOK.ON_MUTATION_CHANGE]?(event: MutationRecord): boolean | void
    [EDITOR_HOOK.AFTER_MUTATION_CHANGE]?(event: MutationRecord): boolean | void

    [EDITOR_HOOK.BEFORE_KEY_DOWN]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.ON_KEY_DOWN]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.AFTER_KEY_DOWN]?(event: KeyboardEvent): boolean | void

    [EDITOR_HOOK.BEFORE_KEY_UP]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.ON_KEY_UP]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.AFTER_KEY_UP]?(event: KeyboardEvent): boolean | void

    [EDITOR_HOOK.BEFORE_PASTE]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.ON_PASTE]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.AFTER_PASTE]?(event: KeyboardEvent): boolean | void

    [EDITOR_HOOK.BEFORE_CUT]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.ON_CUT]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.AFTER_CUT]?(event: KeyboardEvent): boolean | void

    [EDITOR_HOOK.BEFORE_COPY]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.ON_COPY]?(event: KeyboardEvent): boolean | void
    [EDITOR_HOOK.AFTER_COPY]?(event: KeyboardEvent): boolean | void
}
