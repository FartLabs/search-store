import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type * as rdfjs from "@rdfjs/types";

/**
 * SearchStore is an RDF/JS Store extended with cutting-edge search capabilities.
 */
export class SearchStore<Q extends rdfjs.BaseQuad = rdfjs.Quad>
  implements rdfjs.Store<Q> {
  remove(stream: rdfjs.Stream<Q>): EventEmitter {
    throw new Error("Method not implemented.");
  }

  removeMatches(
    subject?: rdfjs.Term | null,
    predicate?: rdfjs.Term | null,
    object?: rdfjs.Term | null,
    graph?: rdfjs.Term | null,
  ): EventEmitter {
    throw new Error("Method not implemented.");
  }

  deleteGraph(graph: string | Q["graph"]): EventEmitter {
    throw new Error("Method not implemented.");
  }

  match(
    subject?: rdfjs.Term | null,
    predicate?: rdfjs.Term | null,
    object?: rdfjs.Term | null,
    graph?: rdfjs.Term | null,
  ): rdfjs.Stream<Q> {
    throw new Error("Method not implemented.");
  }

  import(stream: rdfjs.Stream<Q>): EventEmitter<any> {
    throw new Error("Method not implemented.");
  }
}
