import { NormalizedSelection } from './normalized-selection'
import { Selection } from './selection'
import { Content } from './content'
import { Extension } from './extension'
import { EDITOR_HOOK } from './constants/hook'
import { Entity, Serialized } from './dom'
import { isRemoving } from './keyboard'
import { Search, SearchMatchBuffer } from './search'
import { getChildrenIndex, intersects } from './utils'

export interface EditorOptions<T> {
    attach: Element | null
    context?: T
    value?: Serialized<T>[]
    extensions?: typeof Extension[]
}

export interface SearchOptions {
    selection?: NormalizedSelection | null
    intersection?: boolean
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

        // TODO: Entities that are created from extensions.
        // TODO: vEntities fro storing the virtual mappings for extensions to a node.
    }

    replace(node: Node | Node[]) {
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

        if (!this.selection.replace(node)) {
            return false;
        }

        return this.selection.setCursor(node)
    }

    replaceWithText(content: string | string[]): boolean {
        if (Array.isArray(content)) {
            return this.replace(content.map(text => document.createTextNode(text)))
        }

        return this.replace(
            document.createTextNode(content)
        )
    }

    replaceWithEntity(entity: Entity): boolean {
        return this.replace(
            this.content.dom.createEntity(entity)
        )
    }

    search(value: RegExp, optional?: SearchOptions): Search[] | null {
        // TODO: If to cursor, offset ONLY to cursor index in this paragraph/selectable.

        const internal = Object.assign({}, {
            selection:  optional?.selection || this.getSelection(),
            intersection: optional?.intersection || true
        })

        if (internal.selection == null || !internal.selection.isCollapsed()) {
            return null
        }

        const result = [] as Search[]

        const buffer: SearchBuffer = {
            offset: 0,
            length: 0,
            string: ''
        };

        const currentLine = internal.selection.single()

        if (currentLine == null) {
            return null
        }

        let current: SearchMatchBuffer | null = null

        for (const { node, offset: index } of currentLine.content) {
            if (Array.isArray(node) || node instanceof Element) {
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

            const original = buffer.offset

            while (true) {
                const slice = buffer.string.substring(buffer.offset)
                const match = value.exec(slice)

                if (match == null) {
                    buffer.offset = buffer.length
                    // NOTE: Breaking to fill the buffer with the next node.
                    break
                }

                const position = buffer.offset - original

                // NOTE: Position in the current slice
                const offset = match.index
                // NOTE: Length of the current WHOLE match
                const length = match[0].length
                // NOTE: Offset is the position in the current slice + match length

                if (current == null) {
                    const intersected = []
                    const mapped = new WeakMap()

                    mapped.set(node, intersected.length)

                    intersected.push({
                        index,
                        offset: position + offset,
                        length,
                        node,
                    })

                    current = {
                        match,
                        length,
                        intersected,
                        mapped
                    }
                }

                if (!current.mapped.has(node)) {
                    current.mapped.set(node, current.intersected.length)

                    current.intersected.push({
                        index,
                        offset: position + offset,
                        length: length - current.length,
                        node,
                    })

                    current.length = length
                    current.match = match
                }

                if (offset + length === slice.length) {
                    // NOTE: We've reached end of the slice, but currently searching
                    break
                }

                // NOTE: We've successfuly found a match and has not reached end of the buffer.
                // NOTE: Therefore we got a match in middle of the buffer.

                result.push(
                    new Search(current)
                )

                buffer.offset += offset + length

                current = null
            }
        }

        if (current) {
            result.push(
                new Search(current)
            )

            current = null
        }

        if (internal.intersection) {
            return result.filter((search) => intersects(search, internal.selection as NormalizedSelection))
        }

        return result
    }

    getSelection() {
        return this.selection.getSelection()
    }

    selectionToNextLine() {
        const selection = this.getSelection()

        if (selection == null || !selection.isCollapsed()) {
            return false
        }

        const currentLine = selection.single()
        const currentLineIndex = getChildrenIndex(currentLine.container as Element, this.container)

        if (currentLineIndex === -1) {
            return false
        }

        const nextLine = this.container.children[currentLineIndex + 1]

        if (nextLine == null) {
            return false
        }

        const range = document.createRange()

        range.setStart(nextLine, 0)
        range.setEnd(nextLine, 0)

        selection.setRange(range)

        return true
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
        // TODO: Selection change event on remove.

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
        if (event.data.lastIndexOf("\n") === event.data.length - 1) {
			this.selectionToNextLine();
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
