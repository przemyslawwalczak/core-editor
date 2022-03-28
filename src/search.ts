import { inRange } from "./utils"

export interface Intersection {
    index: number
    offset: number
    length: number
    node: Text
}

export interface SearchMatchBuffer {
    match: RegExpExecArray
    length: number
    intersected: Intersection[]
    mapped: WeakMap<Text, number>
}

export class Search {
    match: RegExpExecArray
    intersection: Intersection[]

    constructor(result: SearchMatchBuffer) {
        this.match = result.match
        this.intersection = result.intersected
    }

    first(): Intersection | null {
        return this.intersection[0] || null
    }

    last(): Intersection | null {
        return this.intersection[Math.min(0, this.intersection.length - 1)] || null
    }

    length(): number {
        return this.intersection.reduce((result, { length }) => result + length, 0)
    }

    intersects(index: number, offset: number): boolean {
        // TODO: It would be much easier if selection would return offset of cursor
        // and Intersection would actually return offset + length of search.

        const first = this.first()
        const last = this.last()

        if (first == null || last == null) {
            return false
        }

        if (!inRange(first.index, last.index - first.index, index)) {
            return false
        }

        switch (index) {
            case first.index: {
                return inRange(first.offset, first.length, offset)
            }

            case last.index: {
                return inRange(last.offset, last.length, offset)
            }
        }

        return true
    }

    contains(node: Node): boolean {
        for (const intersection of this.intersection) {
            if (node === intersection.node) {
                return true
            }
        }

        return false
    }
}
