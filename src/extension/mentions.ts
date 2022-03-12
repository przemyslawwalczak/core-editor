import { DocumentObjectModel } from "../dom";
import { Editor } from "../editor";
import { Extension } from "../extension";

import { EVENT_TYPE } from "../constants/event"

export class Mentions<T> extends Extension<T> {
    constructor(editor: Editor<T>) {
        super('mention', editor)
    }

    [EVENT_TYPE.ON_MUTATION_CHANGE](event: MutationRecord) {
        console.log('on mutation change:', event)

        const { target } = event

        if (target == null) {
            return false
        }

        const attribute = this.editor.getVirtualAttributes(target)

        console.log('attribute:', attribute)

        if (attribute == null || !attribute.guard || !(target instanceof Text)) {
            return false
        }

        const isRemoved = target.length === 0

        switch (attribute.direction) {
            case 'left': {
                if (isRemoved) {
                    attribute.parent.nextSibling.remove()
                    attribute.parent.remove()
                    return true
                }

                console.log('left guard mutation')
                return false
            }

            case 'right': {
                if (isRemoved) {
                    attribute.parent.previousSibling.remove()
                    attribute.parent.remove()
                    return true
                }

                console.log('right guard mutation')
                return false
            }
        }
    }

    [EVENT_TYPE.ON_SELECTION_CHANGE](event: Event) {
        const selection = this.editor.getSelection()

        if (selection == null) {
            return false
        }

        console.log('on selection change:', event)
        console.log('selection:', selection)
    }

    createEntity(dom: DocumentObjectModel<T>, data: any) {
        const mention = dom.create({
            element: 'span',
            text: `@${data.name}`,
            attribute: {
                class: 'mention',
                contenteditable: false
            },
        }) as Element

        return dom.create({
            children: [
                {
                    text: "\uFEFF",
                    attribute: {
                        parent: mention,
                        guard: true,
                        direction: 'left'
                    }
                },
                mention,
                {
                    text: "\uFEFF",
                    attribute: {
                        parent: mention,
                        guard: true,
                        direction: 'right'
                    }
                },
            ]
        })
    }
}
