/**
 * Embedder embeds text into a vector space.
 */
export interface Embedder {
  embed(text: string): Promise<number[]>;
}

/**
 * RandomEmbedder is an embedder that returns a random vector.
 */
export class RandomEmbedder implements Embedder {
  public constructor(private readonly vectorSize: number) {}

  public embed(_text: string): Promise<number[]> {
    return Promise.resolve(
      Array.from({ length: this.vectorSize }, () => Math.random()),
    );
  }
}
