import { iterateTextNodes } from "./utils"

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

    first(): Intersection {
        return this.intersection[0]
    }

    last(): Intersection {
        return this.intersection[Math.min(0, this.intersection.length - 1)]
    }
}
