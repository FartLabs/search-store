import type { QuadFilter } from "../core/quad-source.ts";

/**
 * buildSnapshotQuery builds a SPARQL CONSTRUCT query based on the filter criteria.
 */
export function buildSnapshotQuery(filter?: QuadFilter): string {
  const objectType = filter?.objectType ?? "all";

  const baseQuery = `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

CONSTRUCT {
  ?subject ?predicate ?object
}
WHERE {
  {
    ?subject ?predicate ?object
  }
  UNION
  {
    GRAPH ?graph { ?subject ?predicate ?object }
  }`;

  if (objectType === "all") {
    return `${baseQuery}
  FILTER (isLiteral(?object))
}`;
  }

  if (objectType === "string") {
    return `${baseQuery}
  FILTER (isLiteral(?object) && datatype(?object) = xsd:string)
}`;
  }

  if (objectType === "langString") {
    return `${baseQuery}
  FILTER (isLiteral(?object) && datatype(?object) = rdf:langString)
}`;
  }

  // Fallback to all
  return `${baseQuery}
  FILTER (isLiteral(?object))
}`;
}
