import type { Client } from "@libsql/client";
import * as queries from "./queries.ts";
import * as schema from "./schema.ts";

export class LibsqlSearchStore {
  public constructor(private readonly client: Client) {}

  /**
   * Create: Insert quads into the store
   */
  public async insertQuads(
    quads: Omit<schema.QuadRow, "quad_id">[],
  ): Promise<number[]> {
    if (quads.length === 0) return [];

    const transaction = await this.client.transaction("write");
    const insertedIds: number[] = [];

    try {
      for (const quad of quads) {
        const result = await transaction.execute({
          sql: queries.insertQuadQuery,
          args: [
            quad.subject,
            quad.predicate,
            quad.object,
            quad.graph,
          ],
        });

        if (result.lastInsertRowid !== undefined) {
          insertedIds.push(Number(result.lastInsertRowid));
        }
      }

      await transaction.commit();
      return insertedIds;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Read: Get a single quad by ID
   */
  public async getQuad(quadId: number): Promise<schema.QuadRow | null> {
    const result = await this.client.execute({
      sql: queries.selectQuadQuery,
      args: [quadId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      quad_id: Number(row.quad_id),
      subject: Number(row.subject),
      predicate: Number(row.predicate),
      object: Number(row.object),
      graph: Number(row.graph),
    };
  }

  /**
   * Read: Get all quads
   */
  public async getQuads(): Promise<schema.QuadRow[]> {
    const result = await this.client.execute({
      sql: queries.selectQuadsQuery,
    });

    return result.rows.map((row) => ({
      quad_id: Number(row.quad_id),
      subject: Number(row.subject),
      predicate: Number(row.predicate),
      object: Number(row.object),
      graph: Number(row.graph),
    }));
  }

  /**
   * Read: Get all quads in a specific graph
   */
  public async getQuadsByGraph(graphId: number): Promise<schema.QuadRow[]> {
    const result = await this.client.execute({
      sql: queries.selectQuadsByGraphQuery,
      args: [graphId],
    });

    return result.rows.map((row) => ({
      quad_id: Number(row.quad_id),
      subject: Number(row.subject),
      predicate: Number(row.predicate),
      object: Number(row.object),
      graph: Number(row.graph),
    }));
  }

  /**
   * Update: Replace a quad with new values
   */
  public async updateQuad(
    quadId: number,
    quad: Omit<schema.QuadRow, "quad_id">,
  ): Promise<void> {
    const transaction = await this.client.transaction("write");

    try {
      // Delete the old quad
      await transaction.execute({
        sql: queries.deleteQuadQuery,
        args: [quadId],
      });

      // Insert the new quad
      await transaction.execute({
        sql: queries.insertQuadQuery,
        args: [
          quad.subject,
          quad.predicate,
          quad.object,
          quad.graph,
        ],
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete: Remove a single quad by ID
   */
  public async deleteQuad(quadId: number): Promise<void> {
    await this.client.execute({
      sql: queries.deleteQuadQuery,
      args: [quadId],
    });
  }

  /**
   * Delete: Remove multiple quads by IDs
   */
  public async deleteQuads(quadIds: number[]): Promise<void> {
    if (quadIds.length === 0) return;

    const transaction = await this.client.transaction("write");

    try {
      for (const quadId of quadIds) {
        await transaction.execute({
          sql: queries.deleteQuadQuery,
          args: [quadId],
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      await transaction.close();
    }
  }

  /**
   * Delete: Remove all quads in a specific graph
   */
  public async deleteQuadsByGraph(graphId: number): Promise<void> {
    await this.client.execute({
      sql: queries.deleteQuadsByGraphQuery,
      args: [graphId],
    });
  }
}
