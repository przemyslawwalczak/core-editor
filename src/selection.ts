import { Editor } from './editor'
import { addEventListener, isChildrenOf } from './utils'
import { NormalizedSelection } from './normalized-selection'

export enum DIRECTION {
    LEFT,
    RIGHT,
}
export class Selection<T> {
    editor: Editor<T>
    onSelectionChangeHandler: EventListener

    constructor(editor: Editor<T>) {
        this.editor = editor;

        this.onSelectionChangeHandler = addEventListener(
            document,
            'selectionchange',
            (event) => this.editor.onSelectionChange(event)
        )
    }

    getSelection(): NormalizedSelection | null {
        const selection = document.getSelection()

        if (selection == null) {
            return null
        }

        if (
            !isChildrenOf(this.editor.container, selection.anchorNode) ||
            !isChildrenOf(this.editor.container, selection.focusNode)
        ) {
            return null
        }

        return new NormalizedSelection(this.editor.container, selection)
    }

    replace(node: Node): boolean {
        const selection = this.getSelection()

        if (!this.isCurrentlySelected(selection)) {
            return false
        }

        if (this.editor.content.dom.isEmpty()) {
            this.editor.container.replaceChild(
                this.editor.content.dom.create({
                    element: 'p',
                    children: node as Text
                }) as Node,

                this.editor.container.childNodes[0],
            )

            this.setCursor(node)

            return true
        }

        if (!selection.hasRange()) {
            return false
        }

        const range = selection.getRange();

        range.deleteContents()
        range.insertNode(node)
        this.setCursor(node)

        if (node.parentNode === this.editor.container && node instanceof Text) {
            const warpper = this.editor.content.dom.create({
                element: 'p'
            }) as Node
            
            node.replaceWith(warpper)
            warpper.appendChild(node)
            this.setCursor(node)
            
            return true
        }


        return true
    }
    
    setCursor(node: Node) {
        const selection = this.getSelection()

        if (!this.isCurrentlySelected(selection)) {
            return false
        }

        const range = document.createRange()

        range.setEndAfter(node)
        range.setStartAfter(node)
        range.collapse()

        selection.setRange(range)

        return true
    }

    isCurrentlySelected(selection: NormalizedSelection | null = this.getSelection()): selection is NormalizedSelection {
        if (selection == null) {
            return false
        }

        return true
    }

    detach() {
        document.removeEventListener(
            'selectionchange',
            this.onSelectionChangeHandler
        )
    }
}
