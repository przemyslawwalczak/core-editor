export type Listener = (event: Event | KeyboardEvent) => void

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
