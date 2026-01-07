/**
 * Embedder embeds text into a vector space.
 */
export interface Embedder {
  embed(text: string): Promise<number[]>;
}

/**
 * ZeroEmbedder is an embedder that returns a zero vector.
 */
export class ZeroEmbedder implements Embedder {
  public constructor(private readonly vectorSize: number) {}

  public embed(_text: string): Promise<number[]> {
    return Promise.resolve(Array.from({ length: this.vectorSize }, () => 0));
  }
}
