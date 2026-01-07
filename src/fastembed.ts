import { EmbeddingModel, FlagEmbedding } from "fastembed";
import type { Embedder } from "./embedder.ts";

/**
 * FastEmbedder embeds text into a vector space using FastEmbed models.
 *
 * @see https://github.com/Anush008/fastembed-js
 */
export class FastEmbedder implements Embedder {
  private readonly model: FlagEmbedding;

  private constructor(model: FlagEmbedding) {
    this.model = model;
  }

  /**
   * init initializes the FastEmbedder with the specified model.
   */
  public static async init(
    model:
      | EmbeddingModel.AllMiniLML6V2
      | EmbeddingModel.BGEBaseEN
      | EmbeddingModel.BGEBaseENV15
      | EmbeddingModel.BGESmallEN
      | EmbeddingModel.BGESmallENV15
      | EmbeddingModel.BGESmallZH
      | EmbeddingModel.MLE5Large = EmbeddingModel.BGESmallENV15,
  ): Promise<FastEmbedder> {
    const embeddingModel = await FlagEmbedding.init({ model });
    return new FastEmbedder(embeddingModel);
  }

  public async embed(text: string): Promise<number[]> {
    const embeddings = this.model.embed([text], 1);
    for await (const batch of embeddings) {
      const embedding = batch[0];
      if (!embedding) {
        throw new Error("No embedding found");
      }

      return embedding;
    }

    throw new Error("No embedding found");
  }
}
