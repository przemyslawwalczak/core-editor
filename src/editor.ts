import { SelectionCollection, Selection } from './selection'
import { Content } from './content'
import { Extension } from './extension'
import { EDITOR_HOOK } from './constants/hook'
import { Entity, Serialized } from './dom'
import { isRemoving } from './keyboard'
import { Search, SearchMatchBuffer } from './search'

export interface EditorOptions<T> {
    attach: Element | null
    context?: T
    value?: Serialized<T>[]
    extensions?: typeof Extension[]
}

export interface SearchOptions {
    selection?: SelectionCollection | null
    // shallow?: boolean
    // toCursor?: boolean
}

export interface SearchBuffer {
    offset: number
    length: number
    string: string
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

    search(value: RegExp, option?: SearchOptions): Search[] | null {
        // TODO: If to cursor, offset ONLY to cursor index in this paragraph.

        option = Object.assign(option || {}, {
            selection:  option?.selection || this.getSelection(),
            // shallow:    option?.shallow || true,
            // toCursor:   option?.toCursor || true
        })

        if (option.selection == null || !option.selection.isCollapsed()) {
            return null
        }

        const currentLine = this.selection.findSelectedLine(option.selection)

        if (currentLine == null) {
            return null
        }

        const result = [] as Search[]

        const buffer: SearchBuffer = {
            offset: 0,
            length: 0,
            string: ''
        };

        let current: SearchMatchBuffer | null = null

        for (const node of currentLine.node.childNodes) {
            if (!(node instanceof Text)) {
                // TODO: And if not shallow search, we recursivelly search child nodes of this node too.

                if (current) {                  
                    result.push(
                        new Search(current)
                    ) 

                    current = null
                    buffer.offset = buffer.length
                }

                continue
            }

            if (!node.data.trim().length) {
                continue
            }

            buffer.string += node.data
            buffer.length += node.length

            while (true) {
                const slice = buffer.string.substring(buffer.offset)
                const match = value.exec(slice)

                if (match == null) {
                    buffer.offset = buffer.length
                    // NOTE: Breaking to fill the buffer with the next node.
                    break
                }

                // NOTE: Position in the current slice
                const position = match.index
                // NOTE: Length of the current WHOLE match
                const length = match[0].length
                // NOTE: Offset is the position in the current slice + match length
                const offset = position + length

                if (current == null) {
                    const intersected = []
                    const mapped = new WeakMap()

                    mapped.set(node, intersected.length)

                    intersected.push({
                        node,
                        offset: position,
                        length: length
                    })

                    current = {
                        match,
                        position,
                        length,
                        intersected,
                        mapped
                    }
                }

                if (!current.mapped.has(node)) {
                    current.mapped.set(node, current.intersected.length)
                    current.intersected.push({
                        node,
                        offset: position - current.position,
                        length: length - current.length
                    })

                    current.position = position
                    current.length = length
                }

                if (offset === slice.length) {
                    current.match = match
                    // NOTE: We've reached end of the slice, but currently searching
                    break
                }
                
                // NOTE: We've successfuly found a match and has not reached end of the buffer.
                // NOTE: Therefore we got a match in middle of the buffer.

                result.push(
                    new Search(current)
                )

                buffer.offset += offset
                current = null
            }
        }

        if (current) {                  
            result.push(
                new Search(current)
            ) 

            current = null
        }

        return result
    }

    getSelection() {
        return this.selection.getSelection()
    }
    
    onSelectionChange(event: Event) {
        if (!this.selection.isCurrentlySelected()) {
            return
        }

        this.callExtensionEvent(EDITOR_HOOK.BEFORE_SELECTION_CHANGE, event)
        this.callExtensionEvent(EDITOR_HOOK.ON_SELECTION_CHANGE, event)
        this.callExtensionEvent(EDITOR_HOOK.AFTER_SELECTION_CHANGE, event)
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
        if (this.content.dom.isEmpty()) {
            this.content.dom.clear()
        }

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
