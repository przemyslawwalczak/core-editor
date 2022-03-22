import { Editor } from './editor'
import { EDITOR_HOOK } from './constants/hook'
import { addEventListener, isChildrenOf } from './utils'

type DocumentSelection = globalThis.Selection

export enum DIRECTION {
    LEFT,
    RIGHT,
}

export interface SelectionLine {
    index: number
    node: Node
    container: Node
}

export interface SelectionLengthOffset {
    offset: number
    length: number
}

export type SelectionLineLengthOffset = SelectionLine & SelectionLengthOffset

export interface SearchContext {
    node: Node
    hasBeginning: boolean
    breakpoint: Node | null
}

export function findByContainedNode(node: Node, collection: SelectionLine[]): SelectionLine | null {
    for (const bucket of collection) {
        if (bucket.node === node) {
            return bucket
        }
    }

    return null
}

export interface NodeOffset {
    offset: number
}

export function findNodeOffset(target: Node, container: Node, result: NodeOffset = { offset: 0 }): number {
    if (!container.contains(target)) {
        return -1
    }

    if (container === target) {
        return result.offset
    }

    for (const node of container.childNodes) {
        if ()

        if (node === target) {
            return result.offset
        }


    }

    return result.offset
}

export interface SelectableText {
    offset: number
    node: Text
}

export function getSelectableText() {

}

export class SelectionCollection {
    private _selection: DocumentSelection

    // collection: SelectionLineLengthOffset[]
    container: Element
    normalized: SelectableText[]

    collapsed: boolean
    multiline: boolean

    constructor(container: Element, selection: DocumentSelection) {
        this._selection = selection

        // this.collection = []
        this.container = container
        this.normalized = []

        // TODO: Get front and back anchor node (which one is closer to start), flip if necessary.

        

        // const anchor = selection.anchorNode
        // const focus = selection.focusNode

        this.multiline = false
        this.collapsed = selection.isCollapsed



        // let front = null as Node | null
        // let back = null as Node | null

        // for (const index in this.container.childNodes) {
        //     const container = this.container.childNodes[index]
            
        //     // const containsAnchorNode = container.contains(selection.anchorNode)
        //     // const containsFocusNode = container.contains(selection.focusNode)
                
        //     // if (front == null && (containsAnchorNode || containsFocusNode)) {
        //     //     front = container
        //     // }

        //     // if (back == null && (containsAnchorNode || containsFocusNode)) {
        //     //     back = container
        //     // }

        //     if (front == null) {
        //         continue
        //     }


        // }


        // const anchor = this.findLineByNode(selection.anchorNode)
        // const focus = this.findLineByNode(selection.focusNode)

        // console.log('anchor node:', selection.anchorNode)
        // console.log('focus node:', selection.focusNode)

        // if (!anchor || !focus) {
        //     throw new Error(`
        //         SelectionCollection constructed out of boundary.
        //         (Either anchor or focus node of selection is outside/unfound of container)
        //     `)
        // }

        // this.multiline = !(anchor.node === focus.node)
        // this.collapsed = selection.isCollapsed

        // this.index = 0
        // this.length = 0

        // console.log('anchor.index:', anchor.index)
        // console.log(' focus.index:', focus.index)

        // const start = this.start = anchor.index <= focus.index ? anchor : focus
        // const end = this.end = anchor.index <= focus.index ? focus : anchor

        // const cache = [ start, end ]

        // let hasBeginning = false

        // for (const node of container.childNodes) {
        //     if (node === start.container && !hasBeginning) {
        //         hasBeginning = true
        //     }

        //     if (hasBeginning) {
        //         const line = this.findLineByNode(node, cache)

        //         if (line == null) {
        //             continue
        //         }

        //         if (node === start.container && node === end.container) {
        //             this.collection.push({
        //                 offset: this.getOffsetInNode(line.container, start.node, end.node),
        //                 length: this.getLengthInNode(line.container, start.node, end.node),
        //                 index: line.index,
        //                 node: line.node,
        //                 container: line.container,
        //             })

        //             break
        //         }

        //         if (node === start.container) {
        //             this.collection.push({
        //                 offset: this.getOffsetInNode(line.container, start.node),
        //                 length: this.getLengthInNode(line.container, start.node),
        //                 index: line.index,
        //                 node: line.node,
        //                 container: line.container,
        //             })

        //             continue
        //         }

        //         if (node === end.container) {
        //             this.collection.push({
        //                 offset: this.getOffsetInNode(line.container, end.node),
        //                 length: this.getLengthInNode(line.container, end.node),
        //                 index: line.index,
        //                 node: line.node,
        //                 container: line.container,
        //             })

        //             break
        //         }

        //         this.collection.push({
        //             offset: 0,
        //             length: line.container.textContent?.length || 0,
        //             index: line.index,
        //             node: line.node,
        //             container: line.container,
        //         })
        //     }
        // }

        // console.log('collection: multiline:', this.multiline, 'collapsed:', this.collapsed, 'collection:', this.collection)
    }

    private getOffsetRecursively(target: Node, context: SearchContext): number {
        console.log('--target:', target)

        if (target === context.node && !context.hasBeginning) {
            context.hasBeginning = true

            console.log('got the target node')

            return this.getOffsetRecursively(target, context)
        }

        if (context.breakpoint && target === context.breakpoint) {
            console.log('got the breakpoint')
            return -1
        }

        let offset = 0

        for (const node of target.childNodes) {
            if (!(node instanceof Text)) {
                const result = this.getOffsetRecursively(node, context)

                if (result === -1) {
                    return offset
                }

                offset += result
                continue
            }

            console.log('-- node:', node)

            if (!context.hasBeginning && node === context.node) {
                context.hasBeginning = true
            }

            if (context.hasBeginning) {
                offset += node.length
            }
        }

        return offset
    }

    getOffsetInNode(container: Node, node: Node, breakpoint: Node | null = null): number {
        const context: SearchContext = {
            node,
            hasBeginning: false,
            breakpoint
        }

        console.log('getOffsetInNode Context:', context)

        return this.getOffsetRecursively(container, context)
    }

    findLineByNode(node: Node | null, cache?: SelectionLine[]): SelectionLine | null {
        if (node == null || !this.container.contains(node)) {
            return null
        }

        if (cache) {
            for (const entry of cache) {
                if (entry.container === node) {
                    return entry
                }
            }
        }

        let result = node

        while (result && result.parentElement !== this.container) {
            if (result.parentElement == null) {
                return null
            }

            result = result.parentElement
        }

        // TODO: Since we got a line now, find where this node sits, literally.

        return {
            index: this.findNodeIndex(result),
            node,
            container: result,
        }
    }

    findNodeIndex(node: Node, container: Node = this.container) {
        return Array.prototype.indexOf.call(container.childNodes, node)
    }

    first(): SelectionLineLengthOffset | null {
        return this.collection[0] || null
    }

    single(index: number = 0): SelectionLineLengthOffset | null {
        return this.collection[index] || null
    }

    last(): SelectionLineLengthOffset | null {
        return this.collection[this.collection.length - 1] || null
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

    getSelection(): SelectionCollection | null {
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

        return new SelectionCollection(this.editor.container, selection)
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

    findSelectedLine(selection = this.getSelection()) {
        if (!this.isCurrentlySelected(selection)) {
            return null
        }

        if (selection.isMultiline()) {
            return null
        }

        return selection.single()
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

    isCurrentlySelected(selection: SelectionCollection | null = this.getSelection()): selection is SelectionCollection {
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
