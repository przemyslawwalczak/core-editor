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

export function getChildrenIndex(target: Element, container: Element) {
    for (let index=0; index<container.children.length; index++) {
        const children = container.children[index]

        if (children === target) {
            return index
        }
    }

    return -1
}