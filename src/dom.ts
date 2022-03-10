import { Editor } from "./editor"

export interface Entity {
    type: string
    data?: any
}

export type Serialized = string | Entity | Serialized[]

export function isEntity(value: Entity): value is Entity {
    return value && value.type != null
}

export const EMPTY = '<p><br></p>'

export interface ElementDescriptor {
    element?: string | ElementDescriptor | Element
    text?: string
    attribute?: { [key: string]: boolean | number | string }
    listener?: { [key: string]: () => void }
    children?: ElementDescriptor[] | (Element | Text | null)[] | ElementDescriptor
}

export class DocumentObjectModel<T> {
    editor: Editor<T>
    root: Element

    constructor(editor: Editor<T>) {
        this.editor = editor
        this.root = editor.container
    }

    create({ element, attribute, text, listener, children }: ElementDescriptor) {

    }

    createEntity({ type, data }: Entity) {
        const extension = this.editor.findExtensionByType(type)

        if (extension == null) {
            return this.create({
                element: 'span',
                text: `undefined:extension:${type}`
            })
        }

        if (extension.createEntity == null) {
            return this.create({
                element: 'span',
                text: `undefined:extension.createEntity:${type}`
            })
        }

        return extension.createEntity(this, data)
    }

    format(serialized: Serialized[]): boolean {
        return true
    }

    // createElement(element: string | Build | Element) {
    //     if (typeof element === 'string') {
    //         return document.createElement(element)
    //     }

    //     if (element instanceof Element) {
    //         return element
    //     }

    //     return this.create(element) as Element
    // }

    // createEntity(constructor: Entity) {
    //     const extension = this.editor.findExtensionByType(constructor.type)

    //     if (extension == null) {
    //         return this.create({
    //             element: 'span',
    //             text: `undefined:extension:${constructor.type}`
    //         })
    //     }

    //     if (extension.createEntity == null) {
    //         return this.create({
    //             element: 'span',
    //             text: `undefined:extension.createEntity:${constructor.type}`
    //         })
    //     }

    //     return extension.createEntity(this, constructor.data)
    // }

    // create(constructor: Build): Element {
    //     const { element, text, attribute, listener, children } = constructor

    //     if (!element && text) {
    //         return document.createTextNode(text) as any
    //     }

    //     const parent = this.createElement(element)

    //     if (attribute) {
    //         for (const key in attribute) {
    //             parent.setAttribute(key, String(attribute[key]))
    //         }
    //     }

    //     if (listener) {
    //         for (const key in listener) {
    //             parent.addEventListener(key, listener[key])
    //         }
    //     }

    //     if (typeof text === 'string') {
    //         parent.append(document.createTextNode(text))
    //         return parent
    //     }

    //     if (children == null || Array.isArray(children)) {
    //         for (const node of children || []) {
    //             if (node == null) {
    //                 continue
    //             }

    //             if (node instanceof Element || node instanceof Text) {
    //                 parent.append(node)
    //                 continue
    //             }

    //             parent.append(this.create(node))
    //         }

    //         return parent
    //     }

    //     parent.append(this.create(children))

    //     return parent
    // }

    // append(constructor: Build) {
    //     const { element, text, children } = constructor

    //     if (!element && !text && Array.isArray(children)) {
    //         for (const node of children) {
    //             this.root.append(this.create(node as Build))
    //         }

    //         return this.root
    //     }

    //     const result = this.create(constructor)

    //     this.root.append(result)

    //     return result
    // }

    // format(serialized: Serialized[]) {
    //     if (serialized.length === 0) {
    //         this.append({
    //             element: 'p',
    //             children: {
    //                 element: 'br'
    //             }
    //         })
    //         return
    //     }

    //     for (const value of serialized) {
    //         if (typeof value === 'string') {
    //             this.append({
    //                 element: 'p',
    //                 text: value
    //             })

    //             continue
    //         }

    //         if (Array.isArray(value)) {
    //             this.append({
    //                 element: 'p',
    //                 children: value.map((value) => {
    //                     if (Array.isArray(value)) {
    //                         return null
    //                     }

    //                     if (typeof value === 'string') {
    //                         return document.createTextNode(value)
    //                     }

    //                     return this.createEntity(value)
    //                 })
    //                 .filter((value) => value != null)
    //             })
    //             continue
    //         }

    //         this.append({
    //             element: 'p',
    //             children: {
    //                 element: this.createEntity(value)
    //             }
    //         })
    //     }
    // }

    isEmpty(): boolean {
        return this.root.innerHTML === EMPTY
    }

    clear() {
        this.root.innerHTML = EMPTY
    }
}
