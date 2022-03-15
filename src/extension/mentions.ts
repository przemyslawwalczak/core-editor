import { DocumentObjectModel } from "../dom";
import { Editor } from "../editor";
import { Extension } from "../extension";

import { EVENT_TYPE } from "../constants/event"

export class Mentions<T> extends Extension<T> {
    constructor(editor: Editor<T>) {
        super('mention', editor)
    }

    [EVENT_TYPE.ON_MUTATION_CHANGE](event: MutationRecord) {
        const { target } = event

        if (target == null) {
            return false
        }

        const attribute = this.editor.getVirtualAttributes(target)

        if (attribute == null || !attribute.guard || !(target instanceof Text)) {
            return false
        }

        const isRemoved = target.length === 0

        // TODO: Additional mutation like changing text is required to add text node or switch to the selection of this node when
        // mutation guard node.

        switch (attribute.direction) {
            case 'left': {
                if (isRemoved) {
                    attribute.parent.nextSibling.remove()
                    attribute.parent.remove()
                    return true
                }
                return false
            }

            case 'right': {
                if (isRemoved) {
                    attribute.parent.previousSibling.remove()
                    attribute.parent.remove()
                    return true
                }
                return false
            }
        }
    }

    [EVENT_TYPE.ON_SELECTION_CHANGE](event: Event) {
        const selection = this.editor.getSelection()

        if (selection == null) {
            return false
        }

        console.log('[selection] anchor:', selection.anchor)
        console.log('[selection] focus:', selection.focus)

        const attribute = {
            anchor: this.editor.getVirtualAttributes(selection.anchor),
            focus: this.editor.getVirtualAttributes(selection.focus),
        }

        if (
            attribute.anchor == null || !attribute.anchor.guard ||
            attribute.focus == null || !attribute.focus.guard
        ) {
            return false
        }

        if (selection.anchor === selection.focus && selection.isCollapsed()) {
            console.log('collapsed selection:', attribute)

            switch (attribute.anchor.direction) {
                case 'left': {
                    // TODO: Create Text node on the left side of guard
                    selection.anchorCreateTextNode('\uFEFF', -1)
                    selection.toBefore(selection.anchor)
                    return true
                }

                case 'right': {
                    // TODO: Create Text node on the right side of guard
                    selection.anchorCreateTextNode('\uFEFF', 1)
                    selection.toAfter(selection.anchor)
                    return true
                }
            }
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
        })

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
                mention as Element,
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
