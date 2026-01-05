import type { Embedder } from "./embedder.ts";

/**
 * FakeEmbedder for testing that returns a fixed-size vector.
 * All values are zero-filled for simplicity.
 */
export class FakeEmbedder implements Embedder {
  constructor(private readonly vectorSize: number) {}

  embed(_text: string): Promise<number[]> {
    return Promise.resolve(new Array(this.vectorSize).fill(0));
  }
}
