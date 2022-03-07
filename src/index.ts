import { Selection } from './selection'
import { Content, Serialized } from './content'

export interface EditorOptions<T> {
    attach: Element
    context?: T
    value?: Serialized[]
}

export class Editor<T> {
    container: Element
    context?: T

    content: Content<T>
    selection: Selection<T>

    constructor(option: EditorOptions<T>) {
        console.log('constructing editor')

        this.container = option.attach
        this.context = option.context

        this.content = new Content(this, option.value)
        this.selection = new Selection(this)
    }


}
