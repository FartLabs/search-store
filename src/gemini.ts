import { GoogleGenAI } from "@google/genai";
import type { Embedder } from "./embedder.ts";

/**
 * GeminiEmbedder embeds text into a vector space using the Gemini embedding model.
 *
 * @see https://ai.google.dev/gemini-api/docs/embeddings
 */
export class GeminiEmbedder implements Embedder {
  public constructor(
    private readonly client: GoogleGenAI,
    private readonly vectorSize: number,
  ) {}

  public async embed(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: {
        outputDimensionality: this.vectorSize,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error("No embedding found");
    }

    return embedding;
  }
}
