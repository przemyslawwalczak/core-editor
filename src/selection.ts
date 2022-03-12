import { Editor, EVENT_TYPE } from './index'
import { addEventListener, isChildrenOf } from './utils'

type DocumentSelection = globalThis.Selection

export class CurrentSelection {
    private _selection: DocumentSelection
    anchor: Node | null
    focus: Node | null
    index: number
    length: number

    constructor(container: Element, selection: DocumentSelection) {
        this._selection = selection

        this.anchor = selection.anchorNode || null
        this.focus = selection.focusNode || null

        this.index = selection.anchorOffset || 0
        this.length = selection.anchorOffset || 0
    }

    setRange(range: Range) {
        this._selection.removeAllRanges()
        this._selection.addRange(range)
    }
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

        return new CurrentSelection(this.editor.container, selection)
    }

    findSelectedLine(selection = this.getSelection()) {
        if (!this.isCurrentlySelected(selection)) {
            return null
        }

        const { anchor } = selection

        if (anchor == null) {
            return null
        }

        let result = anchor

        while (result && result.parentElement !== this.editor.container) {
            if (result.parentElement == null) {
                return null
            }

            result = result.parentElement
        }

        return result
    }

    getChildrenIndex(target: Element) {
        for (let index=0; index<this.editor.container.children.length; index++) {
            const children = this.editor.container.children[index]
            if (children === target) {
                return index
            }
        }

        console.log('children not found')

        return -1
    }

    toNextLine(target: EventTarget) {
        const selection = this.getSelection()

        if (selection == null) {
            return false
        }

        const currentLine = this.findSelectedLine(selection)

        if (currentLine == null) {
            return false
        }

        const currentLineIndex = this.getChildrenIndex(currentLine as Element)

        if (currentLineIndex === -1) {
            return false
        }

        const nextLine = this.editor.container.children[currentLineIndex + 1]

        if (nextLine == null) {
            return false
        }

        const range = document.createRange()

        range.setStart(nextLine, 0)
        range.setEnd(nextLine, 0)

        selection.setRange(range)

        return true
    }

    isCurrentlySelected(selection: CurrentSelection | null = this.getSelection()): selection is CurrentSelection {
        if (selection == null) {
            return false
        }

        return true
    }

    onSelectionChange(event: Event) {
        if (!this.isCurrentlySelected()) {
            return
        }

        this.editor.callExtensionEvent(EVENT_TYPE.BEFORE_SELECTION_CHANGE, event)
        this.editor.callExtensionEvent(EVENT_TYPE.ON_SELECTION_CHANGE, event)
        this.editor.callExtensionEvent(EVENT_TYPE.AFTER_SELECTION_CHANGE, event)
    }

    detach() {
        document.removeEventListener(
            'selectionchange',
            this.onSelectionChangeHandler
        )
    }
}
