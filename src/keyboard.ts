export function isKeyDelete(event: KeyboardEvent) {
    return event.key === 'Delete' || event.code === 'Delete'
}

export function isKeyBackspace(event: KeyboardEvent) {
    return event.key === 'Backspace' || event.code === 'Backspace'
}

export function isRemoving(event: KeyboardEvent) {
    return isKeyDelete(event) || isKeyBackspace(event)
}