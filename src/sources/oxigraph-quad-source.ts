import type * as rdfjs from "@rdfjs/types";
import { Store } from "oxigraph";
import type { QuadFilter, QuadSource } from "../core/quad-source.ts";
import { buildSnapshotQuery } from "../utils/sparql-queries.ts";

/**
 * OxigraphQuadSource uses Oxigraph Store as a quad source.
 */
export class OxigraphQuadSource implements QuadSource {
  public constructor(
    private readonly store: Store,
    private readonly options?: Parameters<Store["query"]>[1],
  ) {}

  public async *snapshot(filter?: QuadFilter): AsyncIterable<rdfjs.Quad> {
    const query = buildSnapshotQuery(filter);
    const quads = this.store.query(query, this.options) as rdfjs.Quad[];
    yield* quads;
  }
}
