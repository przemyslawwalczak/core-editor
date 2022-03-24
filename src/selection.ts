import { Editor } from './editor'
import { EDITOR_HOOK } from './constants/hook'
import { addEventListener, isChildrenOf } from './utils'

type DocumentSelection = globalThis.Selection

export enum DIRECTION {
    LEFT,
    RIGHT,
}

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

export function createSelectableContext() {
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

    const result = {
        offset: context.offset++,
        node
    }
    
    if (context.onSelectable) {
        context.onSelectable(result.node, result.offset)
    }

    return result
}

export function getSelectableText(container: Node, context: SelectableContext = createSelectableContext()): SelectableText[] {
    const result = [] as SelectableText[]

    for (const node of container.childNodes) {
        result.push(
            normalizeSelectableText(node, context)
        )
    }

    return result
}

export function containsOrEqual(target: Node, node: Node | null) {
    if (node == null) {
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

    length: number

    collapsed: boolean
    multiline: boolean

    constructor(container: Element, selection: DocumentSelection) {
        this._selection = selection

        const { anchorNode, anchorOffset, focusNode, focusOffset } = selection

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

        this.length = 0

        let hasBeginning = false
        let hasAnchorNode = false
        let hasFocusNode = false

        let front = null as null | TextSelection
        let back = null as null | TextSelection

        const start = Date.now()
        
        const onSelectable = (node: Text, offset: number) => {
            if (front && back) {
                return
            }

            if (anchorNode === focusNode) {
                if (node === anchorNode) {
                    const off = Math.min(focusOffset, anchorOffset)
                    const len = Math.max(focusOffset, anchorOffset) - Math.min(focusOffset, anchorOffset)

                    this.length += len

                    const selection = {
                        index: offset,
                        offset: off,
                        length: len,
                        node,
                    }

                    front = selection
                    back = selection

                    return this.selection.push(selection)
                }

                return
            }

            if (!front && node === anchorNode) {
                const length = node.length - anchorOffset

                this.length += length

                return this.selection.push(front = {
                    index: offset,
                    offset: anchorOffset,
                    length,
                    node
                })
            }

            if (!front && node === focusNode) {
                const length = node.length - focusOffset

                this.length += length

                return this.selection.push(front = {
                    index: offset,
                    offset: focusOffset,
                    length,
                    node
                })
            }

            if (front == null) {
                return
            }

            if (node !== anchorNode && node !== focusNode) {
                const length = node.length

                this.length += length

                return this.selection.push({
                    index: offset,
                    offset: 0,
                    length,
                    node
                })
            }

            if (!back && node === anchorNode) {
                const length = anchorOffset

                this.length += length

                return this.selection.push(back = {
                    index: offset,
                    offset: 0,
                    length,
                    node
                })
            }

            if (!back && node === focusNode) {
                const length = focusOffset

                this.length += length

                return this.selection.push(back = {
                    index: offset,
                    offset: 0,
                    length,
                    node
                })
            }
        }

        for (const index in container.childNodes) {
            const line = container.childNodes[index]

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
             * 
             * TODO: Get front & back of TextSelection?
             */

            const selectable = getSelectableText(line, {
                offset: 0,
                onSelectable
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

        console.log('normalized in:', Date.now() - start)

        console.log('selectable:', this.selectable)
        console.log('selection:', this.selection)

        console.log('length:', this.length)

        this.collapsed = selection.isCollapsed
        this.multiline = this.selectable.length > 1
    }

    // findLineByNode(node: Node | null, cache?: SelectionLine[]): SelectionLine | null {
    //     if (node == null || !this.container.contains(node)) {
    //         return null
    //     }

    //     if (cache) {
    //         for (const entry of cache) {
    //             if (entry.container === node) {
    //                 return entry
    //             }
    //         }
    //     }

    //     let result = node

    //     while (result && result.parentElement !== this.container) {
    //         if (result.parentElement == null) {
    //             return null
    //         }

    //         result = result.parentElement
    //     }

    //     // TODO: Since we got a line now, find where this node sits, literally.

    //     return {
    //         index: this.findNodeIndex(result),
    //         node,
    //         container: result,
    //     }
    // }

    // findNodeIndex(node: Node, container: Node = this.container) {
    //     return Array.prototype.indexOf.call(container.childNodes, node)
    // }

    first() {
        return this.selection[0] || null
    }

    single(index: number = 0) {
        return this.selection[index] || null
    }

    last() {
        return this.selection[this.selection.length - 1] || null
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

        // TODO: Return normalized selection

        return new NormalizedSelection(this.editor.container, selection)
    }

    // findSelectedLine(selection = this.getSelection()) {
    //     if (!this.isCurrentlySelected(selection)) {
    //         return null
    //     }

    //     if (selection.isMultiline()) {
    //         return null
    //     }

    //     return selection.single()
    // }

    // findSelectedLineByElement(target: Element, selection = this.getSelection()) {
    //     if (!this.isCurrentlySelected(selection)) {
    //         return null
    //     }

    //     let result = target

    //     while (result && result.parentElement !== this.editor.container) {
    //         if (result.parentElement == null) {
    //             return null
    //         }

    //         result = result.parentElement
    //     }

    //     return result
    // }

    // getChildrenIndex(target: Element) {
    //     for (let index=0; index<this.editor.container.children.length; index++) {
    //         const children = this.editor.container.children[index]
    //         if (children === target) {
    //             return index
    //         }
    //     }

    //     return -1
    // }

    // toNextLine(target?: Element) {
    //     const selection = this.getSelection()

    //     if (selection == null) {
    //         return false
    //     }

    //     const currentLine = target ? this.findSelectedLineByElement(target, selection) : this.findSelectedLine(selection)

    //     if (currentLine == null) {
    //         return false
    //     }

    //     const currentLineIndex = this.getChildrenIndex(currentLine as Element)

    //     if (currentLineIndex === -1) {
    //         return false
    //     }

    //     const nextLine = this.editor.container.children[currentLineIndex + 1]

    //     if (nextLine == null) {
    //         return false
    //     }

    //     const range = document.createRange()

    //     range.setStart(nextLine, 0)
    //     range.setEnd(nextLine, 0)

    //     selection.setRange(range)

    //     return true
    // }

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
