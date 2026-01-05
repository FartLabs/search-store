import type * as rdfjs from "@rdfjs/types";

/**
 * SearchStore is a store that can be searched.
 */
export interface SearchStore {
  /**
   * search searches the store for nodes matching the query.
   */
  search(
    query: string,
    limit?: number,
  ): Promise<RankedResult<rdfjs.NamedNode>[]>;
}

/**
 * RankedResult is a result with a score.
 */
export interface RankedResult<T> {
  /**
   * rank is the rank of the result in the search results.
   */
  rank: number;

  /**
   * score is the score of the result.
   */
  score: number;

  /**
   * value is the result value.
   */
  value: T;
}
