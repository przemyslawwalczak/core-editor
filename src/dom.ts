import { Editor } from "./editor"

export interface Entity {
    type: string
    data?: any
}

export type Serialized = string | Entity | Serialized[]

export function isEntity(value: any): value is Entity {
    return value && value.type != null
}

export const EMPTY = '<p><br></p>'

export interface Template {
    element?: string | Element
    text?: string
    attribute?: { [key: string]: boolean | number | string }
    listener?: { [key: string]: () => void }
    children?: Template[] | (Element | Text)[] | Template | Element | Text
}

export class DocumentObjectModel<T> {
    editor: Editor<T>
    root: Element

    constructor(editor: Editor<T>) {
        this.editor = editor
        this.root = editor.container
    }

    createChildren(children: Template['children']) {
        const result = [] as (Element | Text)[]

        if (children == null) {
            return result
        }

        if (Array.isArray(children)) {
            for (const node of children) {
                if (node instanceof Element || node instanceof Text) {
                    result.push(node)
                    continue
                }

                const nodes = this.create(node)

                if (Array.isArray(nodes)) {
                    result.push(...nodes)
                    continue
                }

                result.push(nodes)
            }

            return result
        }

        if (children instanceof Element || children instanceof Text) {
            result.push(children)
            return result
        }

        const nodes = this.create(children)

        if (Array.isArray(nodes)) {
            result.push(...nodes)
            return result
        }

        result.push(nodes)

        return result
    }

    create({ element, attribute, text, listener, children }: Template) {
        if (element) {
            const parent = this.createElement(element)

            if (text) {
                parent.textContent = text
            }

            if (attribute) {
                for (const key in attribute) {
                    parent.setAttribute(key, String(attribute[key]))
                }
            }

            if (listener) {
                for (const key in listener) {
                    parent.addEventListener(key, listener[key])
                }
            }

            if (children) {
                parent.append(...this.createChildren(children))
            }

            return parent
        }

        if (text) {
            const parent = this.createText(text)

            if (listener) {
                for (const key in listener) {
                    parent.addEventListener(key, listener[key])
                }
            }

            return parent
        }

        return this.createChildren(children)
    }

    createElement(type: string | Element) {
        if (typeof type === 'string') {
            return document.createElement(type)
        }

        return type
    }

    createText(text: string) {
        return document.createTextNode(text)
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

    /**
     * Shallow formatter of serialized structure back to the HTML representation.
     *
     * @param target Element
     * @param serialized Serialized[]
     * @returns
     */
    format(target: Element, serialized: Serialized[]): boolean {
        for (const node of serialized) {
            if (typeof node === 'string') {
                /**
                 * Formatting paragraphs from string only.
                 */
                const paragraph: Template = {
                    element: 'p'
                }

                if (!node.trim().length) {
                    paragraph.children = {
                        element: 'br'
                    }

                    target.append(this.create(paragraph) as Element)
                    continue
                }

                paragraph.text = node

                target.append(this.create(paragraph) as Element)
                continue
            }

            if (isEntity(node)) {
                /**
                 * Entity sole paragraph, appending their elements as children of paragraph, back to the target.
                 */
                const entity = this.create({
                    element: 'p',
                    children: this.createEntity(node)
                })

                target.append(entity as Element)

                continue
            }

            const paragraph = this.create({
                element: 'p'
            }) as Element

            /**
             * Formatting serialized array and appending the results to the paragraph.
             */
            for (const child of node) {
                if (typeof child === 'string') {
                    paragraph.append(this.createText(child))
                    continue
                }

                if (!isEntity(child)) {
                    continue
                }

                const entity = this.createEntity(child)

                if (entity instanceof Element || entity instanceof Text) {
                    paragraph.append(entity)
                    continue
                }

                paragraph.append(...entity)
            }

            target.append(paragraph)
        }

        // NOTE: We are always returning true, as we don't know if any of these will succeed while formatting (for now).
        return true
    }

    isEmpty(): boolean {
        return this.root.innerHTML === EMPTY
    }

    clear() {
        this.root.innerHTML = EMPTY
    }
}
