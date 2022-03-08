import { Selection } from './selection'
import { Content, Serialized } from './content'
import { Extension } from './extension'
import { EVENT_TYPE } from './constants/event'

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

        this.content = new Content(this, option.value)
        this.selection = new Selection(this)

        this.extension = option.extensions ? option.extensions(this) : []
    }

    findExtensionByType(type: string) {
        for (const extension of this.extension) {
            if (extension.type === type) {
                return extension
            }
        }

        return null
    }

    callExtensionEvent(type: EVENT_TYPE, event: Event): boolean {
        // TODO: Pre-caching extension handlers per EVENT type.

        for (const extension of this.extension) {
            const handler = extension[type]

            if (handler == null) {
                continue
            }

            if (handler(event as any)) {
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

// Debugging

// const editor = new Editor({
//     attach: document.getElementById('editor')
// })