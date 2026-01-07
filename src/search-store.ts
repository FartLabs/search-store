/**
 * SearchStore is a store that can be searched.
 */
export interface SearchStore<T> {
  /**
   * search searches the store for nodes matching the query.
   */
  search(query: string, limit?: number): Promise<SearchResult<T>[]>;
}

/**
 * SearchResult is a result with a score.
 */
export interface SearchResult<T> {
  /**
   * score is the score of the result.
   */
  score: number;

  /**
   * value is the result value.
   */
  value: T;
}
