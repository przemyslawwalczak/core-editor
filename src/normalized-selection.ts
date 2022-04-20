type DocumentSelection = globalThis.Selection

export interface SelectableText {
    offset: number
    node: Text | Element | SelectableText[]
}

export interface SelectableTextLine {
    index: number
    container: Node
    content: SelectableText[]
}

export interface SelectableContext {
    offset: number
    onSelectable: null | ((node: Text, offset: number) => void)
}

export function createSelectableContext(): SelectableContext {
    return {
        offset: 0,
        onSelectable: null
    }
}

export function normalizeSelectableText(node: Node, context: SelectableContext): SelectableText {
    const isElement = node instanceof Element

    if (isElement && node.getAttribute('contenteditable') === 'false') {
        return {
            offset: context.offset,
            node: getSelectableText(node),
        }
    }

    if (isElement && node.outerHTML === '<br>') {
        return {
            offset: context.offset,
            node
        }
    }

    if (isElement) {
        return {
            offset: context.offset,
            node: getSelectableText(node, context),
        }
    }

    const isText = node instanceof Text

    if (!isText) {
        throw new Error(`Unhandled SelectableText: ${node}`)
    }

    const result: SelectableText = {
        offset: context.offset++,
        node
    }

    if (context.onSelectable) {
        context.onSelectable(node, result.offset)
    }

    return result
}

export function getSelectableText(container: Node, context: SelectableContext = createSelectableContext()): SelectableText[] {
    const result = [] as SelectableText[]

    for (const node of Array.from(container.childNodes)) {
        result.push(
            normalizeSelectableText(node, context)
        )
    }

    return result
}

export function containsOrEqual(target: Node | null, node: Node | null) {
    if (target == null || node == null) {
        return false
    }

    return (target === node || node.contains(target))
}

export interface TextSelection {
    index: number
    offset: number
    length: number
    node: Text | Element | SelectableText[]
}

export class NormalizedSelection {
    private _selection: DocumentSelection

    container: Element
    selectable: SelectableTextLine[]
    selection: TextSelection[]

    front: null | TextSelection
    back: null | TextSelection

    collapsed: boolean
    multiline: boolean

    constructor(container: Element, selection: DocumentSelection) {
        this._selection = selection

        const { anchorNode, focusNode } = selection

        if (!container.contains(anchorNode) || !container.contains(focusNode)) {
            throw new Error(`
                NormalizedSelection constructed out of boundary.
                (Either anchor or focus node of selection is outside of selection container)
            `)
        }

        if (anchorNode == null || focusNode == null) {
            throw new Error('Anchor or Focus Node is not found in container')
        }

        this.container = container
        this.selectable = []
        this.selection = []

        let hasBeginning = false
        let hasAnchorNode = false
        let hasFocusNode = false

        this.front = null
        this.back = null

        const onSelectable = this.onSelectable.bind(this)

        for (const index in container.childNodes) {
            const line = container.childNodes[index]

            if (!(line instanceof Element)) {
                continue
            }

            if (!hasBeginning && containsOrEqual(anchorNode, line)) {
                hasBeginning = true
                hasAnchorNode = true
            }

            if (!hasBeginning && containsOrEqual(focusNode, line)) {
                hasBeginning = true
                hasFocusNode = true
            }

            if (!hasBeginning) {
                continue
            }

            /**
             * Begin normalization of line
             */

            const selectable = getSelectableText(line, {
                offset: 0,
                onSelectable,
            })

            this.selectable.push({
                index: Number(index),
                container: line,
                content: selectable
            })

            if (anchorNode === focusNode) {
                break
            }

            if (!hasAnchorNode && containsOrEqual(anchorNode, line)) {
                break
            }

            if (!hasFocusNode && containsOrEqual(focusNode, line)) {
                break
            }
        }

        this.collapsed = selection.isCollapsed
        this.multiline = this.selectable.length > 1
    }

    onSelectable(node: Text, index: number) {
        if (this.front && this.back) {
            return
        }

        const { anchorNode, anchorOffset, focusNode, focusOffset } = this._selection

        if (anchorNode === focusNode) {
            if (node === anchorNode) {
                const offset = Math.min(focusOffset, anchorOffset)
                const length = Math.max(focusOffset, anchorOffset) - offset

                const selection = {
                    index,
                    offset,
                    length,
                    node,
                }

                this.front = selection
                this.back = selection

                return this.selection.push(selection)
            }

            return
        }

        if (!this.front && node === anchorNode) {
            const length = node.length - anchorOffset

            return this.selection.push(this.front = {
                index,
                offset: anchorOffset,
                length,
                node
            })
        }

        if (!this.front && node === focusNode) {
            const length = node.length - focusOffset

            return this.selection.push(this.front = {
                index,
                offset: focusOffset,
                length,
                node
            })
        }

        if (this.front == null) {
            return
        }

        if (node !== anchorNode && node !== focusNode) {
            const length = node.length

            return this.selection.push({
                index,
                offset: 0,
                length,
                node
            })
        }

        if (!this.back && node === anchorNode) {
            const length = anchorOffset

            return this.selection.push(this.back = {
                index,
                offset: 0,
                length,
                node
            })
        }

        if (!this.back && node === focusNode) {
            const length = focusOffset

            return this.selection.push(this.back = {
                index,
                offset: 0,
                length,
                node
            })
        }
    }

    first() {
        return this.selectable[0] || null
    }

    single(index: number = 0) {
        return this.selectable[index] || null
    }

    last() {
        return this.selectable[this.selectable.length - 1] || null
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

    hasRange() {
        return this._selection.rangeCount > 0
    }

    getRange(index: number = 0) {
        return this._selection.getRangeAt(index)
    }

    getText() {
        const selection = window.getSelection() || document.getSelection();
        return selection ? selection.toString() : null
    }

    isMultiline() {
        return this.multiline
    }

    isCollapsed() {
        return this.collapsed
    }
}
