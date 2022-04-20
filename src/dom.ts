import { Editor } from "./editor"
import { Extension } from "./extension"

export interface Entity {
    type: string
    data?: any
}

export type Serialized<T> = string | Entity | Extension<T> | Serialized<T>[]

export function isEntity(value: any): value is Entity {
    return value && value.type != null && typeof value.type === 'string'
}

export function isExtension<T>(value: any): value is Extension<T> {
    return value && value instanceof Extension
}

export const EMPTY = '<p><br></p>'

export interface Template {
    element?: string | Element
    text?: string
    attribute?: { [key: string]: any }
    listener?: { [key: string]: () => void }
    children?: (Template | Element | Text)[] | Template | Element | Text
}

export class DocumentObjectModel<T> {
    editor: Editor<T>
    root: Element
    vAttributes: WeakMap<Text | Element, any>
    vEntities: WeakMap<Text | Element | Node, any>

    constructor(editor: Editor<T>) {
        this.editor = editor
        this.root = editor.container

        this.vAttributes = new WeakMap()
        this.vEntities = new WeakMap()
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

            if (attribute) {
                this.vAttributes.set(parent, attribute)
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
        const Extension = this.editor.findExtensionByType(type)

        if (Extension == null) {
            return this.create({
                element: 'span',
                text: `undefined:extension:${type}`
            })
        }

        const extension = new Extension(this.editor, data) as Extension<T>

        if (extension.render == null) {
            return this.create({
                element: 'span',
                text: `undefined:extension:render:${type}`
            })
        }

        const entity = extension.render(this)

        // TODO: Clear it from vExtensions when garbage collected.
        this.editor.vExtensions.push(extension)

        if (Array.isArray(entity)) {
            for (const node of entity) {
                this.vEntities.set(node, {
                    owner: extension
                })
            }

            return entity
        }

        this.vEntities.set(entity, {
            owner: extension
        })

        return entity
    }

    /**
     * Shallow formatter of serialized structure back to the HTML representation.
     *
     * @param target Element
     * @param serialized Serialized[]
     * @returns
     */
    format(target: Element, serialized: Serialized<T>[]): boolean {
        if (serialized.length === 0) {
            this.root.innerHTML = EMPTY

            return true
        }

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

            if (isExtension(node)) {
                const constructor = node.constructor as typeof Extension

                const entity = this.create({
                    element: 'p',
                    children: this.createEntity({
                        type: constructor.type,
                        data: node.data,
                    })
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
            for (const snode of node) {
                if (typeof snode === 'string') {
                    paragraph.append(this.createText(snode))
                    continue
                }

                if (!isEntity(snode)) {
                    continue
                }

                const entity = this.createEntity(snode)

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

    replaceWithEntity(entity: Entity): boolean {
        // return this.editor.selection.replace(
        //     document.createTextNode(text)
        // )

        return false
    }

    setAttribute(target: Text | Element, attribute: any) {
        const result = this.vAttributes.get(target) || {}
        const record = {
            ...result,
            ...attribute
        }

        this.vAttributes.set(target, record)

        return record
    }

    isEmpty(): boolean {
        return (
            this.root.innerHTML === EMPTY ||
            this.root.childNodes.length === 0 ||
            !this.root.textContent ||
            this.root.textContent.trim().length === 0
        )
    }

    clear() {
        if (this.root.innerHTML !== EMPTY) {
            this.root.innerHTML = EMPTY
        }
    }
}
