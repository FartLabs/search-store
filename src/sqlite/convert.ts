import type * as rdfjs from "@rdfjs/types";
import type { TermRow } from "./schema.ts";

export function toTerm(df: rdfjs.DataFactory, row: TermRow): rdfjs.Term {
  switch (row.term_type) {
    case "NamedNode": {
      return df.namedNode(row.value);
    }

    case "BlankNode": {
      return df.blankNode(row.value);
    }

    case "Literal": {
      if (row.datatype) {
        return df.literal(row.value, df.namedNode(row.datatype));
      } else if (row.language) {
        return df.literal(row.value, row.language);
      } else {
        return df.literal(row.value);
      }
    }

    default: {
      throw new Error(`Unknown term type: ${row.term_type}`);
    }
  }
}

export function fromTerm(term: rdfjs.Term): Omit<TermRow, "term_id"> {
  return {
    term_type: term.termType,
    value: term.value,
    language: (term as rdfjs.Literal).language,
    datatype: (term as rdfjs.Literal).datatype?.value,
  };
}
