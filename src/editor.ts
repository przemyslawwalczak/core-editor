import { Selection } from './selection'
import { Content } from './content'
import { Extension } from './extension'
import { EDITOR_HOOK } from './constants/hook'
import { Entity, Serialized } from './dom'
import { isRemoving } from './keyboard'

export interface EditorOptions<T> {
    attach: Element | null
    context?: T
    value?: Serialized<T>[]
    extensions?: typeof Extension[]
}

export class Editor<T> {
    container: Element
    context?: T

    content: Content<T>
    selection: Selection<T>

    extension: typeof Extension[]
    vExtensions: Extension<T>[]

    constructor(option: EditorOptions<T>) {
        if (option.attach == null || !(option.attach instanceof Element)) {
            throw new Error('Editor.option.attach requires valid ')
        }

        this.container = option.attach
        this.context = option.context

        this.extension = option.extensions || []
        this.vExtensions = []

        this.content = new Content(this, option.value)
        this.selection = new Selection(this)
    }
    
    replaceWithText(text: string): boolean {
        return this.selection.replace(
            document.createTextNode(text)
        )
    }

    replaceWithEntity(entity: Entity): boolean {
        const node = this.content.dom.createEntity(entity);

        if (Array.isArray(node)) {
            const marker = document.createTextNode('\uFEFF')

            if (!this.selection.replace(marker) || !marker.parentNode) {
                return false
            }

            for (const child of node) {
                marker.parentNode.insertBefore(child, marker)
            }

            this.selection.setCursor(marker)

            marker.remove()

            return true
        }

        return this.selection.replace(node)
    }

    getSelection() {
        return this.selection.getSelection()
    }

    getVirtualAttributes(target: any): any | null {
        return this.content.dom.vAttributes.get(target) || null
    }

    getVirtualEntity(target: any): any | null {
        return this.content.dom.vEntities.get(target) || null
    }

    findExtensionByType(type: string) {
        for (const extension of this.extension) {
            if (extension.type === type) {
                return extension
            }
        }

        return null
    }

    callExtensionEvent(type: EDITOR_HOOK, event: Event | MutationRecord): boolean {
        // TODO: Pre-caching extension handlers per EVENT type.

        for (const extension of this.vExtensions) {
            const handler = extension[type] as any

            if (handler == null) {
                continue
            }

            if (handler.call(extension, event as any)) {
                return true
            }
        }

        return false
    }

    
    onMutation(mutation: MutationRecord) {
        this.callExtensionEvent(EDITOR_HOOK.BEFORE_MUTATION_CHANGE, mutation)
        this.callExtensionEvent(EDITOR_HOOK.ON_MUTATION_CHANGE, mutation)
        this.callExtensionEvent(EDITOR_HOOK.AFTER_MUTATION_CHANGE, mutation)
    }

    onMutations(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            this.onMutation(mutation)
        }
    }

    onKeyUp(event: KeyboardEvent) {
        this.callExtensionEvent(EDITOR_HOOK.BEFORE_KEY_UP, event)

        if (this.content.dom.isEmpty() && isRemoving(event) && !event.defaultPrevented) {
            event.preventDefault()
        }

        this.callExtensionEvent(EDITOR_HOOK.ON_KEY_UP, event)
        this.callExtensionEvent(EDITOR_HOOK.AFTER_KEY_UP, event)
    }

    onKeyDown(event: KeyboardEvent) {
        this.callExtensionEvent(EDITOR_HOOK.BEFORE_KEY_DOWN, event)

        if (this.content.dom.isEmpty() && isRemoving(event) && !event.defaultPrevented) {
            event.preventDefault()
        }

        this.callExtensionEvent(EDITOR_HOOK.ON_KEY_DOWN, event)
        this.callExtensionEvent(EDITOR_HOOK.AFTER_KEY_DOWN, event)
    }

    onCompositionEnd(event: CompositionEvent) {
        if (event.data.lastIndexOf("\n") === event.data.length - 1 && event.target) {
			this.selection.toNextLine();
		}
    }

    onPaste(event: Event) {
        event.preventDefault()

        this.callExtensionEvent(EDITOR_HOOK.BEFORE_PASTE, event)
        this.callExtensionEvent(EDITOR_HOOK.ON_PASTE, event)
        this.callExtensionEvent(EDITOR_HOOK.AFTER_PASTE, event)
    }

    onCut(event: Event) {
        event.preventDefault()

        this.callExtensionEvent(EDITOR_HOOK.BEFORE_CUT, event)
        this.callExtensionEvent(EDITOR_HOOK.ON_CUT, event)
        this.callExtensionEvent(EDITOR_HOOK.AFTER_CUT, event)
    }

    onCopy(event: Event) {
        event.preventDefault()

        this.callExtensionEvent(EDITOR_HOOK.BEFORE_COPY, event)
        this.callExtensionEvent(EDITOR_HOOK.ON_COPY, event)
        this.callExtensionEvent(EDITOR_HOOK.AFTER_COPY, event)
    }

    clear() {
        this.content.dom.clear()
    }

    detach() {
        this.selection.detach()
        this.content.detach()
    }
}
