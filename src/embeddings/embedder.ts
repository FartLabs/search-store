/**
 * Embedder embeds text into a vector space.
 */
export interface Embedder {
  embed(text: string): Promise<number[]>;
}
