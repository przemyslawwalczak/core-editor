import { Editor, EVENT_TYPE } from './index'
import { addEventListener } from './utils'
import { isRemoving } from './keyboard'

export interface Entity {
    type: string
    data?: any
}

export type Serialized = string | Entity | Serialized[]

const EMPTY = '<p><br></p>'

export class Content<T> {
    editor: Editor<T>
    observer: MutationObserver

    constructor(editor: Editor<T>, value: Serialized[] = []) {
        this.editor = editor

        this.deserialize(value)

        addEventListener(this.editor.container, 'keydown',   (event) => this.onKeyDown(event as KeyboardEvent))
        addEventListener(this.editor.container, 'compositionend', (event) => this.onCompositionEnd(event as CompositionEvent))
        addEventListener(this.editor.container, 'keyup',     (event) => this.onKeyUp(event as KeyboardEvent))
        addEventListener(this.editor.container, 'paste',     (event) => this.onPaste(event))
        addEventListener(this.editor.container, 'cut',       (event) => this.onCut(event))
        addEventListener(this.editor.container, 'copy',      (event) => this.onCopy(event))

        this.observer = new MutationObserver((mutations) => this.onMutation(mutations))

        this.observer.observe(this.editor.container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true,
        })
    }

    onMutation(mutations: MutationRecord[]) {
        console.log("on mutation:", mutations);
    }

    onKeyUp(event: KeyboardEvent) {
        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_KEY_UP, event)

        if (this.isEmpty() && isRemoving(event) && !event.defaultPrevented) {
            event.preventDefault()
        }

        this.editor.callExtensionEvent(EVENT_TYPE.ON_KEY_UP, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_KEY_UP, event)
    }

    onKeyDown(event: KeyboardEvent) {
        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_KEY_DOWN, event)

        if (this.isEmpty() && isRemoving(event) && !event.defaultPrevented) {
            event.preventDefault()
        }

        this.editor.callExtensionEvent(EVENT_TYPE.ON_KEY_DOWN, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_KEY_DOWN, event)
    }

    onCompositionEnd(event: CompositionEvent) {
        if (event.data.lastIndexOf("\n") === event.data.length - 1) {
			this.editor.selection.toNextLine();
		}
    }

    onPaste(event: Event) {
        event.preventDefault()

        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_PASTE, event)
        this.editor.callExtensionEvent(EVENT_TYPE.ON_PASTE, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_PASTE, event)
    }

    onCut(event: Event) {
        event.preventDefault()

        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_CUT, event)
        this.editor.callExtensionEvent(EVENT_TYPE.ON_CUT, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_CUT, event)
    }

    onCopy(event: Event) {
        event.preventDefault()

        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_COPY, event)
        this.editor.callExtensionEvent(EVENT_TYPE.ON_COPY, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_COPY, event)
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

    isEmpty() {
        return this.editor.container.innerHTML === EMPTY
    }

    clear() {
        this.editor.container.innerHTML = EMPTY
    }

    detach() {
        this.observer.disconnect();
    }
}
