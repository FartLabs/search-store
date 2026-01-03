import type * as rdfjs from "@rdfjs/types";
import type { Store } from "n3";
import type { QuadFilter, QuadSource } from "../core/quad-source.ts";

/**
 * N3QuadSource uses N3.js Store as a quad source.
 *
 * N3.js stores use pattern matching rather than SPARQL queries,
 * so this implementation filters quads based on the filter criteria
 * by iterating through matching quads.
 */
export class N3QuadSource implements QuadSource {
  public constructor(
    private readonly store: Store,
  ) {}

  public async *snapshot(filter?: QuadFilter): AsyncIterable<rdfjs.Quad> {
    // N3 Store.match() returns all quads matching the pattern
    // We match all quads (no pattern = match everything)
    const quads = this.store.match();

    for (const quad of quads) {
      // Apply filter if provided
      if (filter && !this.matchesFilter(quad, filter)) {
        continue;
      }

      yield quad;
    }
  }

  /**
   * matchesFilter checks if a quad matches the filter criteria.
   */
  private matchesFilter(quad: rdfjs.Quad, filter: QuadFilter): boolean {
    if (!filter.objectType || filter.objectType === "all") {
      return true;
    }

    const object = quad.object;
    if (object.termType !== "Literal") {
      return false;
    }

    if (filter.objectType === "string") {
      return object.datatype.value ===
        "http://www.w3.org/2001/XMLSchema#string";
    }

    if (filter.objectType === "langString") {
      return (
        object.datatype.value ===
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
      );
    }

    return true;
  }
}
