import { Editor } from './index'
import { addEventListener } from './utils'
import { DocumentObjectModel, Serialized } from './dom'

export class Content<T> {
    editor: Editor<T>
    dom: DocumentObjectModel<T>

    observer: MutationObserver

    constructor(editor: Editor<T>, value: Serialized<T>[] = []) {
        this.editor = editor
        this.dom = new DocumentObjectModel(editor)

        this.deserialize(value)

        addEventListener(this.editor.container, 'keydown',   (event) => this.editor.onKeyDown(event as KeyboardEvent))
        addEventListener(this.editor.container, 'compositionend', (event) => this.editor.onCompositionEnd(event as CompositionEvent))
        addEventListener(this.editor.container, 'keyup',     (event) => this.editor.onKeyUp(event as KeyboardEvent))
        addEventListener(this.editor.container, 'paste',     (event) => this.editor.onPaste(event))
        addEventListener(this.editor.container, 'cut',       (event) => this.editor.onCut(event))
        addEventListener(this.editor.container, 'copy',      (event) => this.editor.onCopy(event))

        this.observer = new MutationObserver((mutations) => this.editor.onMutations(mutations))

        this.observer.observe(this.editor.container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true,
        })
    }


    deserialize(value: Serialized<T>[]) {
        const { container } = this.editor

        container.setAttribute('contenteditable', 'false')

        if (!this.dom.format(container, value)) {
            // TODO: Waran about un-deserialized value
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
		for (const paragraph of Array.from(container.children)) {
			if (paragraph.innerHTML === "<br>") {
				result.push("\n");
				// eslint-disable-next-line no-continue
				continue;
			}

			const serialized = [];

			// eslint-disable-next-line no-restricted-syntax
			for (const node of Array.from(paragraph.childNodes)) {
                if (!(node instanceof Text) && !(node instanceof Element)) {
                    continue
                }

				if (node instanceof Text && node.data === "\uFEFF") {
					// eslint-disable-next-line no-continue
					continue;
				}

				if (node instanceof Text) {
					serialized.push(node.data);
					// eslint-disable-next-line no-continue
					continue;
				}

				const entity = this.editor.getVirtualEntity(node);

				if (entity && entity.owner) {
					serialized.push(entity.owner);
					// eslint-disable-next-line no-continue
					continue;
				}

                // TODO: Warn about potentially unhandled node.
                serialized.push(node.innerHTML)
			}

			result.push(serialized);
		}

		return result;
    }

    detach() {
        this.observer.disconnect();
    }
}
