import { Selection } from './selection'
import { Content } from './content'
import { Extension } from './extension'
import { EDITOR_HOOK } from './constants/hook'
import { Entity, Serialized } from './dom'

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
            return this.selection.replace(
                document.createTextNode('replacing:with:array')
            )
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

    detach() {
        this.selection.detach()
        this.content.detach()
    }
}
