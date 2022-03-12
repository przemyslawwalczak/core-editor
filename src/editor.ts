import { Selection } from './selection'
import { Content } from './content'
import { Extension } from './extension'
import { EVENT_TYPE } from './constants/event'
import { Serialized } from './dom'

export interface EditorOptions<T> {
    attach: Element | null
    context?: T
    value?: Serialized[]
    extensions?: (editor: Editor<T>) => Extension<T>[]
}

export class Editor<T> {
    container: Element
    context?: T

    content: Content<T>
    selection: Selection<T>

    extension: Extension<T>[]

    constructor(option: EditorOptions<T>) {
        if (option.attach == null || !(option.attach instanceof Element)) {
            throw new Error('Editor.option.attach requires valid ')
        }

        this.container = option.attach
        this.context = option.context
        this.extension = option.extensions ? option.extensions(this) : []

        this.content = new Content(this, option.value)
        this.selection = new Selection(this)
    }

    getSelection() {
        return this.selection.getSelection()
    }

    getVirtualAttributes(target: any) {
        console.log('getting virtual attributes:', this.content)

        return this.content.dom.vAttributes.get(target) || null
    }

    findExtensionByType(type: string) {
        for (const extension of this.extension) {
            if (extension.type === type) {
                return extension
            }
        }

        return null
    }

    callExtensionEvent(type: EVENT_TYPE, event: Event | MutationRecord): boolean {
        // TODO: Pre-caching extension handlers per EVENT type.

        for (const extension of this.extension) {
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
