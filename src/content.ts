import { Editor, EVENT_TYPE } from './index'
import { addEventListener } from './utils'
import { isRemoving } from './keyboard'
import { DocumentObjectModel, Serialized } from './dom'

export class Content<T> {
    editor: Editor<T>
    dom: DocumentObjectModel<T>

    observer: MutationObserver

    constructor(editor: Editor<T>, value: Serialized[] = []) {
        this.editor = editor
        this.dom = new DocumentObjectModel(editor)

        this.deserialize(value)

        addEventListener(this.editor.container, 'keydown',   (event) => this.onKeyDown(event as KeyboardEvent))
        addEventListener(this.editor.container, 'compositionend', (event) => this.onCompositionEnd(event as CompositionEvent))
        addEventListener(this.editor.container, 'keyup',     (event) => this.onKeyUp(event as KeyboardEvent))
        addEventListener(this.editor.container, 'paste',     (event) => this.onPaste(event))
        addEventListener(this.editor.container, 'cut',       (event) => this.onCut(event))
        addEventListener(this.editor.container, 'copy',      (event) => this.onCopy(event))

        this.observer = new MutationObserver((mutations) => this.onMutations(mutations))

        this.observer.observe(this.editor.container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true,
        })
    }

    onMutation(mutation: MutationRecord) {
        const event = new CustomEvent('mutation', {
            detail: mutation
        })

        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_KEY_UP, event)
        this.editor.callExtensionEvent(EVENT_TYPE.ON_KEY_UP, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_KEY_UP, event)
    }

    onMutations(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            this.onMutation(mutation)
        }
    }

    onKeyUp(event: KeyboardEvent) {
        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_KEY_UP, event)

        if (this.dom.isEmpty() && isRemoving(event) && !event.defaultPrevented) {
            event.preventDefault()
        }

        this.editor.callExtensionEvent(EVENT_TYPE.ON_KEY_UP, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_KEY_UP, event)
    }

    onKeyDown(event: KeyboardEvent) {
        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_KEY_DOWN, event)

        if (this.dom.isEmpty() && isRemoving(event) && !event.defaultPrevented) {
            event.preventDefault()
        }

        this.editor.callExtensionEvent(EVENT_TYPE.ON_KEY_DOWN, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_KEY_DOWN, event)
    }

    onCompositionEnd(event: CompositionEvent) {
        if (event.data.lastIndexOf("\n") === event.data.length - 1 && event.target) {
			this.editor.selection.toNextLine(event.target);
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

        if (!this.dom.format(container, value)) {
            console.warn(`Failed to deserialize value of:`, value)
            return false
        }

        container.setAttribute('contenteditable', 'true')

        return true
    }

    serialize(): Serialized[] {
        // TODO: Serialize the content from HTML to Serialized array.

        return []
    }

    detach() {
        this.observer.disconnect();
    }
}
