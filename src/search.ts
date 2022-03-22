export interface Intersection {
    node: Text
    offset: number
    length: number
}

export interface SearchMatchBuffer {
    match: RegExpExecArray
    position: number
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

    intersects(index: number): boolean {
        const first = this.first()
        const last = this.last()

        if (first == null || last == null) {
            return false
        }

        return (first.offset <= index && index <= last.offset + last.length)
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
