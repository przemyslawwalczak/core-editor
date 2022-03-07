import { Editor } from './index'
import { addEventListener, isChildrenOf } from './utils'

export interface CurrentSelection {
    anchor: Node | null
    focus: Node | null
}

export class Selection<T> {
    editor: Editor<T>
    onSelectionChangeHandler: EventListener

    constructor(editor: Editor<T>) {
        this.editor = editor;

        this.onSelectionChangeHandler = addEventListener(
            document,
            'selectionchange',
            (event) => this.onSelectionChange(event)
        )
    }

    getSelection(): CurrentSelection | null {
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

        // TODO: Return normalized selection

        return {
            anchor: selection.anchorNode || null,
            focus: selection.focusNode || null
        }
    }

    isCurrentlySelected(selection: CurrentSelection | null = this.getSelection()) {
        if (selection == null) {
            return false
        }

        return true
    }

    onSelectionChange(event: Event) {
        if (!this.isCurrentlySelected()) {
            return
        }


    }

    detach() {
        document.removeEventListener(
            'selectionchange',
            this.onSelectionChangeHandler
        )
    }
}
