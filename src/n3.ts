import type { Store } from "n3";
import type * as rdfjs from "@rdfjs/types";
import { Parser } from "n3";
import type {
  Patch,
  PatchProxy,
  PatchPuller,
  PatchPusher,
} from "./rdf-patch.ts";

/**
 * filterStringLiteral filters quads with string literals.
 */
export function filterStringLiteral(quad: rdfjs.Quad): boolean {
  return (quad.object.termType === "Literal") &&
    (quad.object.language !== undefined ||
      (!quad.object.datatype ||
        quad.object.datatype.value ===
          "http://www.w3.org/2001/XMLSchema#string"));
}

/**
 * N3PatchPuller pulls patches from the N3 store.
 */
export class N3PatchPuller implements PatchPuller {
  public constructor(private readonly store: Store) {}

  public pull(): Patch[] {
    const insertions = Array.from(this.store).filter((quad) =>
      filterStringLiteral(quad)
    );

    const patch: Patch = {
      insertions,
      deletions: [],
    };

    return [patch];
  }
}

/**
 * executeSparqlUpdate executes a SPARQL UPDATE query against an N3 store.
 * For INSERT DATA, we parse the Turtle data and add quads directly.
 */
function executeSparqlUpdate(
  store: Store,
  sparql: string,
): void {
  // Extract INSERT DATA block (handles PREFIX declarations)
  const insertDataRegex = /INSERT\s+DATA\s*\{([\s\S]*?)\}/i;
  const match = sparql.match(insertDataRegex);

  if (match) {
    // Get the full query with prefixes for proper parsing
    // Extract prefixes
    const prefixMatch = sparql.match(/(PREFIX\s+\w+:\s*<[^>]+>\s*)+/i);
    const prefixes = prefixMatch ? prefixMatch[0] : "";
    const turtleData = match[1];

    // Combine prefixes with data for parsing
    const fullTurtle = prefixes + turtleData;
    const parser = new Parser({ format: "Turtle" });
    const quads = parser.parse(fullTurtle);
    store.addQuads(quads);
    return;
  }

  // For other SPARQL operations, we'd need a SPARQL engine
  // For now, throw an error for unsupported operations
  throw new Error(
    `Unsupported SPARQL operation. Only INSERT DATA is currently supported.`,
  );
}

/**
 * N3PatchProxy proxies an N3 Store with a patch handler.
 *
 * It intercepts and emits patches for add, remove, and update methods.
 */
export class N3PatchProxy implements PatchProxy<Store> {
  public proxy(target: Store, pusher: PatchPusher): Store {
    return new Proxy(target, {
      get(target: Store, prop: string | symbol, receiver: unknown) {
        switch (prop) {
          case "add": {
            return (quad: rdfjs.Quad) => {
              const result = target.add(quad);
              if (filterStringLiteral(quad)) {
                pusher.push({ insertions: [quad], deletions: [] });
              }
              return result;
            };
          }

          case "addQuad": {
            return (quad: rdfjs.Quad) => {
              const result = target.addQuad(quad);
              if (filterStringLiteral(quad)) {
                pusher.push({ insertions: [quad], deletions: [] });
              }
              return result;
            };
          }

          case "addQuads": {
            return (quads: rdfjs.Quad[]) => {
              const result = target.addQuads(quads);
              const stringLiteralQuads = quads.filter(filterStringLiteral);
              if (stringLiteralQuads.length > 0) {
                pusher.push({ insertions: stringLiteralQuads, deletions: [] });
              }
              return result;
            };
          }

          case "removeQuad": {
            return (quad: rdfjs.Quad) => {
              const result = target.removeQuad(quad);
              if (filterStringLiteral(quad)) {
                pusher.push({ insertions: [], deletions: [quad] });
              }
              return result;
            };
          }

          case "removeQuads": {
            return (quads: rdfjs.Quad[]) => {
              const result = target.removeQuads(quads);
              const stringLiteralQuads = quads.filter(filterStringLiteral);
              if (stringLiteralQuads.length > 0) {
                pusher.push({ insertions: [], deletions: stringLiteralQuads });
              }
              return result;
            };
          }

          case "update": {
            return (sparql: string) => {
              // Capture state before update
              const quadsBefore = Array.from(target);
              const quadsBeforeSet = new Set(
                quadsBefore.map((q) => q.toString()),
              );

              // Execute the SPARQL update
              executeSparqlUpdate(target, sparql);

              // Capture state after update
              const quadsAfter = Array.from(target);
              const quadsAfterSet = new Set(
                quadsAfter.map((q) => q.toString()),
              );

              // Find newly added string literal quads
              const newQuads = quadsAfter.filter(
                (quad) =>
                  !quadsBeforeSet.has(quad.toString()) &&
                  filterStringLiteral(quad),
              );

              // Find deleted string literal quads
              const deletedQuads = quadsBefore.filter(
                (quad) =>
                  !quadsAfterSet.has(quad.toString()) &&
                  filterStringLiteral(quad),
              );

              // Emit patches if there are changes
              if (newQuads.length > 0 || deletedQuads.length > 0) {
                pusher.push({
                  insertions: newQuads,
                  deletions: deletedQuads,
                });
              }
            };
          }

          default: {
            return Reflect.get(target, prop, receiver);
          }
        }
      },
    });
  }
}

/**
 * proxyN3 wraps an N3 Store with a proxy that emits patches.
 */
export function proxyN3(
  store: Store,
  pusher: PatchPusher,
): Store & { update: (sparql: string) => void } {
  const proxy = new N3PatchProxy();
  return proxy.proxy(store, pusher) as Store & {
    update: (sparql: string) => void;
  };
}
