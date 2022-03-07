import { Editor } from './index'
import { addEventListener } from './utils'

export enum EntityType {
    EDITABLE,
    BLOB,
}

export interface Entity {
    type: EntityType
    data?: any
}

export type Serialized = string | Entity

const EMPTY = '<p><br></p>'

export class Content<T> {
    editor: Editor<T>

    constructor(editor: Editor<T>, value: Serialized[] = []) {
        this.editor = editor

        this.deserialize(value)

        addEventListener(this.editor.container, 'keydown',   (event) => this.onKeyDown(event as KeyboardEvent))
        addEventListener(this.editor.container, 'keyup',     (event) => this.onKeyUp(event as KeyboardEvent))
        addEventListener(this.editor.container, 'compositionend', (event) => this.onCompositionEnd(event))
        addEventListener(this.editor.container, 'paste',     (event) => this.onPaste(event))
        addEventListener(this.editor.container, 'cut',       (event) => this.onCut(event))
        addEventListener(this.editor.container, 'copy',      (event) => this.onCopy(event))
    }

    deserialize(value: Serialized[]) {
        const { container } = this.editor

        container.setAttribute('contenteditable', 'false')

        // TODO: Deserialize the value into html.

        if (value.length === 0) {
            container.innerHTML = EMPTY
        }

        container.setAttribute('contenteditable', 'true')
    }

    serialize(): Serialized[] {
        // TODO: Serialize the content from HTML to Serialized array.
        return []
    }

    onKeyUp(event: KeyboardEvent) {
        console.log('on key up:', event)

        if (this.isEmpty()) {
            event.preventDefault()
        }
    }

    onKeyDown(event: KeyboardEvent) {
        console.log('on key down:', event)

        if (this.isEmpty()) {
            event.preventDefault()
        }
    }

    onCompositionEnd(event: Event) {
        console.log('on composition end:', event)
    }

    onPaste(event: Event) {

    }

    onCut(event: Event) {

    }

    onCopy(event: Event) {

    }

    isEmpty() {
        return this.editor.container.innerHTML === EMPTY
    }

    clear() {
        this.editor.container.innerHTML = EMPTY
    }
}
