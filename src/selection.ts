import { Editor } from './editor'
import { EDITOR_HOOK } from './constants/hook'
import { addEventListener, isChildrenOf } from './utils'

type DocumentSelection = globalThis.Selection

export enum DIRECTION {
    LEFT,
    RIGHT,
}

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

        // TODO: Get index and length of the container.
        this.index = selection.anchorOffset || 0
        this.length = selection.anchorOffset || 0
    }

    setRange(range: Range) {
        this._selection.removeAllRanges()
        this._selection.addRange(range)
    }

    addRange(range: Range) {
        this._selection.addRange(range)
    }

    toBefore(target: Node | null, offset?: number): boolean {
        if (target == null) {
            return false
        }

        const range = document.createRange()

        if (offset == null) {
            range.setStartBefore(target)
            range.setEndBefore(target)

            this.setRange(range)

            return true
        }

        return true
    }

    toAfter(target: Node | null, offset?: number): boolean {
        if (target == null) {
            return false
        }

        const range = document.createRange()

        if (offset == null) {
            range.setStartBefore(target)
            range.setEndBefore(target)

            this.setRange(range)

            return true
        }

        return true
    }

    anchorCreateTextNode(text: string, direction: DIRECTION = DIRECTION.RIGHT) {
        const node = document.createTextNode(text)

        switch (direction) {
            case DIRECTION.LEFT: {
                // this.anchor
            }

            case DIRECTION.RIGHT: {

            }
        }
    }

    hasRange() {
        return this._selection.rangeCount > 0
    }

    getRange(index: number = 0) {
        return this._selection.getRangeAt(index)
    }

    isCollapsed() {
        return this._selection.isCollapsed
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

    setCursor(node: Node) {
        const selection = this.getSelection()

        if (!this.isCurrentlySelected(selection)) {
            return false
        }

        const range = document.createRange()

        range.setEndAfter(node)
        range.setStartAfter(node)

        selection.setRange(range)

        return true
    }

    replace(node: Node): boolean {
        const selection = this.getSelection()

        if (!this.isCurrentlySelected(selection)) {
            return false
        }

        if (!selection.hasRange()) {
            return false
        }

        const range = selection.getRange();

        range.deleteContents()
        range.insertNode(node)

        this.setCursor(node)

        return true
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

    findSelectedLineByElement(target: Element, selection = this.getSelection()) {
        if (!this.isCurrentlySelected(selection)) {
            return null
        }

        let result = target

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

        return -1
    }

    toNextLine(target?: Element) {
        const selection = this.getSelection()

        if (selection == null) {
            return false
        }

        const currentLine = target ? this.findSelectedLineByElement(target, selection) : this.findSelectedLine(selection)

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

        this.editor.callExtensionEvent(EDITOR_HOOK.BEFORE_SELECTION_CHANGE, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.ON_SELECTION_CHANGE, event)
        this.editor.callExtensionEvent(EDITOR_HOOK.AFTER_SELECTION_CHANGE, event)
    }

    detach() {
        document.removeEventListener(
            'selectionchange',
            this.onSelectionChangeHandler
        )
    }
}
