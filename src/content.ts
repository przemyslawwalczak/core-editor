import { Editor, EDITOR_HOOK } from './index'
import { addEventListener } from './utils'
import { isRemoving } from './keyboard'
import { DocumentObjectModel, Serialized } from './dom'

export class Content<T> {
    editor: Editor<T>
    dom: DocumentObjectModel<T>

    observer: MutationObserver

    constructor(editor: Editor<T>, value: Serialized<T>[] = []) {
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
        console.log('on mutation:', this)
        console.log('on editor:', this.editor)

        this.editor.callExtensionEvent(EDITOR_HOOK.BEFORE_MUTATION_CHANGE, mutation)
        this.editor.callExtensionEvent(EDITOR_HOOK.ON_MUTATION_CHANGE, mutation)
        this.editor.callExtensionEvent(EDITOR_HOOK.AFTER_MUTATION_CHANGE, mutation)
    }

    onMutations(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            this.onMutation(mutation)
        }
    }

    onKeyUp(event: KeyboardEvent) {
        this.editor.callExtensionEvent(EDITOR_HOOK.BEFORE_KEY_UP, event)

        if (this.dom.isEmpty() && isRemoving(event) && !event.defaultPrevented) {
            event.preventDefault()
        }

        this.editor.callExtensionEvent(EDITOR_HOOK.ON_KEY_UP, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.AFTER_KEY_UP, event)
    }

    onKeyDown(event: KeyboardEvent) {
        this.editor.callExtensionEvent(EDITOR_HOOK.BEFORE_KEY_DOWN, event)

        if (this.dom.isEmpty() && isRemoving(event) && !event.defaultPrevented) {
            event.preventDefault()
        }

        this.editor.callExtensionEvent(EDITOR_HOOK.ON_KEY_DOWN, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.AFTER_KEY_DOWN, event)
    }

    onCompositionEnd(event: CompositionEvent) {
        console.log('[compositionend] event:', event)

        if (event.data.lastIndexOf("\n") === event.data.length - 1 && event.target) {
			this.editor.selection.toNextLine();
		}
    }

    onPaste(event: Event) {
        event.preventDefault()

        this.editor.callExtensionEvent(EDITOR_HOOK.BEFORE_PASTE, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.ON_PASTE, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.AFTER_PASTE, event)
    }

    onCut(event: Event) {
        event.preventDefault()

        this.editor.callExtensionEvent(EDITOR_HOOK.BEFORE_CUT, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.ON_CUT, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.AFTER_CUT, event)
    }

    onCopy(event: Event) {
        event.preventDefault()

        this.editor.callExtensionEvent(EDITOR_HOOK.BEFORE_COPY, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.ON_COPY, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.AFTER_COPY, event)
    }

    deserialize(value: Serialized<T>[]) {
        const { container } = this.editor

        container.setAttribute('contenteditable', 'false')

        if (!this.dom.format(container, value)) {
            console.warn(`Failed to deserialize value of:`, value)
            return false
        }

        container.setAttribute('contenteditable', 'true')

        return true
    }

    serialize(): Serialized<T>[] {
        // TODO: Serialize the content from HTML to Serialized array.

        const { container } = this.editor

        const result = [];

		// eslint-disable-next-line no-restricted-syntax
		for (const paragraph of container.children) {
			if (paragraph.innerHTML === "<br>") {
				result.push("\n");
				// eslint-disable-next-line no-continue
				continue;
			}

			const serialized = [];

			// eslint-disable-next-line no-restricted-syntax
			for (const node of paragraph.childNodes) {
                if (!(node instanceof Text) || !(node instanceof Element)) {
                    continue
                }

				if (node.data === "\uFEFF") {
					// eslint-disable-next-line no-continue
					continue;
				}

				if (node instanceof Text) {
					serialized.push(node.data);
					// eslint-disable-next-line no-continue
					continue;
				}

				const entity = this.editor.getVirtualEntity(node);

				if (entity.owner) {
					serialized.push(entity.owner);
					// eslint-disable-next-line no-continue
					continue;
				}

                // TODO: Warn about unhandled node.
			}

			result.push(serialized);
		}

		return result;
    }

    detach() {
        this.observer.disconnect();
    }
}
