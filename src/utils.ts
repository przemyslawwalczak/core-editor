export type Listener = (event: Event | KeyboardEvent | CompositionEvent) => void

export function addEventListener(target: Element | Document | Window, event: string, listener: Listener) {
    target.addEventListener(event, listener as any)
    return listener
}

export function isChildrenOf(container: Element, target: Element | Node | null) {
    if (target == null) {
        return false
    }

    return container.contains(target)
}

export function iterateTextNodes(parent: Node, callback: (node: Text) => void) {
    for (const node of parent.childNodes) {
        if (node instanceof Text) {
            callback(node)
            continue
        }

        iterateTextNodes(node, callback)
    }
}