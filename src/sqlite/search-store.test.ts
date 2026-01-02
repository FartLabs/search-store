import type { Client } from "@libsql/client";
import { createClient } from "@libsql/client/sqlite3";
import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { LibsqlSearchStore } from "./search-store.ts";
import * as schema from "./schema.ts";
import * as queries from "./queries.ts";

/**
 * Helper function to initialize the database schema
 */
async function initializeSchema(client: Client) {
  await client.execute({ sql: schema.termsTable });
  await client.execute({ sql: schema.quadsTable });
}

/**
 * Helper function to create test terms and return their IDs
 */
async function createTestTerms(
  client: Client,
): Promise<
  { subjectId: number; predicateId: number; objectId: number; graphId: number }
> {
  const subjectResult = await client.execute({
    sql: queries.insertTermQuery,
    args: ["NamedNode", "http://example.org/subject", null, null],
  });

  const predicateResult = await client.execute({
    sql: queries.insertTermQuery,
    args: ["NamedNode", "http://example.org/predicate", null, null],
  });

  const objectResult = await client.execute({
    sql: queries.insertTermQuery,
    args: ["Literal", "test value", null, null],
  });

  const graphResult = await client.execute({
    sql: queries.insertTermQuery,
    args: ["NamedNode", "http://example.org/graph", null, null],
  });

  return {
    subjectId: Number(subjectResult.lastInsertRowid),
    predicateId: Number(predicateResult.lastInsertRowid),
    objectId: Number(objectResult.lastInsertRowid),
    graphId: Number(graphResult.lastInsertRowid),
  };
}

Deno.test("LibsqlSearchStore - Create: insertQuads should insert quads and return IDs", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  const quads: Omit<schema.QuadRow, "quad_id">[] = [
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
  ];

  const insertedIds = await store.insertQuads(quads);

  assertEquals(insertedIds.length, 1);
  assertExists(insertedIds[0]);
  assertEquals(typeof insertedIds[0], "number");
});

Deno.test("LibsqlSearchStore - Create: insertQuads should handle multiple quads", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  // Create additional terms for second quad
  const object2Result = await client.execute({
    sql:
      "INSERT INTO terms (term_type, value, language, datatype) VALUES (?, ?, ?, ?)",
    args: ["Literal", "another value", null, null],
  });
  const object2Id = Number(object2Result.lastInsertRowid);

  const quads: Omit<schema.QuadRow, "quad_id">[] = [
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
    {
      subject: subjectId,
      predicate: predicateId,
      object: object2Id,
      graph: graphId,
    },
  ];

  const insertedIds = await store.insertQuads(quads);

  assertEquals(insertedIds.length, 2);
  assertEquals(insertedIds[0] !== insertedIds[1], true);
});

Deno.test("LibsqlSearchStore - Create: insertQuads should return empty array for empty input", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);

  const insertedIds = await store.insertQuads([]);

  assertEquals(insertedIds.length, 0);
});

Deno.test("LibsqlSearchStore - Create: insertQuads should handle duplicate quads (UNIQUE constraint)", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  const quad: Omit<schema.QuadRow, "quad_id"> = {
    subject: subjectId,
    predicate: predicateId,
    object: objectId,
    graph: graphId,
  };

  // First insert should succeed
  const firstIds = await store.insertQuads([quad]);
  assertEquals(firstIds.length, 1);

  // Second insert of the same quad should fail due to UNIQUE constraint
  await assertRejects(
    async () => {
      await store.insertQuads([quad]);
    },
    Error,
  );
});

Deno.test("LibsqlSearchStore - Read: getQuad should return a quad by ID", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  const quads: Omit<schema.QuadRow, "quad_id">[] = [
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
  ];

  const insertedIds = await store.insertQuads(quads);
  const quadId = insertedIds[0];

  const quad = await store.getQuad(quadId);

  assertExists(quad);
  assertEquals(quad?.quad_id, quadId);
  assertEquals(quad?.subject, subjectId);
  assertEquals(quad?.predicate, predicateId);
  assertEquals(quad?.object, objectId);
  assertEquals(quad?.graph, graphId);
});

Deno.test("LibsqlSearchStore - Read: getQuad should return null for non-existent quad", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);

  const quad = await store.getQuad(999);

  assertEquals(quad, null);
});

Deno.test("LibsqlSearchStore - Read: getQuads should return all quads", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  // Create additional terms
  const object2Result = await client.execute({
    sql:
      "INSERT INTO terms (term_type, value, language, datatype) VALUES (?, ?, ?, ?)",
    args: ["Literal", "value 2", null, null],
  });
  const object2Id = Number(object2Result.lastInsertRowid);

  const quads: Omit<schema.QuadRow, "quad_id">[] = [
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
    {
      subject: subjectId,
      predicate: predicateId,
      object: object2Id,
      graph: graphId,
    },
  ];

  await store.insertQuads(quads);
  const allQuads = await store.getQuads();

  assertEquals(allQuads.length, 2);
});

Deno.test("LibsqlSearchStore - Read: getQuadsByGraph should return quads filtered by graph", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  // Create another graph
  const graph2Result = await client.execute({
    sql:
      "INSERT INTO terms (term_type, value, language, datatype) VALUES (?, ?, ?, ?)",
    args: ["NamedNode", "http://example.org/graph2", null, null],
  });
  const graph2Id = Number(graph2Result.lastInsertRowid);

  // Create quads in different graphs
  const quads: Omit<schema.QuadRow, "quad_id">[] = [
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graph2Id,
    },
  ];

  await store.insertQuads(quads);

  const graph1Quads = await store.getQuadsByGraph(graphId);
  const graph2Quads = await store.getQuadsByGraph(graph2Id);

  assertEquals(graph1Quads.length, 1);
  assertEquals(graph2Quads.length, 1);
  assertEquals(graph1Quads[0].graph, graphId);
  assertEquals(graph2Quads[0].graph, graph2Id);
});

Deno.test("LibsqlSearchStore - Update: updateQuad should replace a quad", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  // Create original quad
  const insertedIds = await store.insertQuads([
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
  ]);
  const quadId = insertedIds[0];

  // Create new object term for update
  const newObjectResult = await client.execute({
    sql:
      "INSERT INTO terms (term_type, value, language, datatype) VALUES (?, ?, ?, ?)",
    args: ["Literal", "updated value", null, null],
  });
  const newObjectId = Number(newObjectResult.lastInsertRowid);

  // Update the quad
  await store.updateQuad(quadId, {
    subject: subjectId,
    predicate: predicateId,
    object: newObjectId,
    graph: graphId,
  });

  // Verify the quad was updated
  // Note: After update, the old quad is deleted and a new one is inserted,
  // so the quad_id will be different. Let's verify by checking all quads.
  const allQuads = await store.getQuads();
  const updatedQuadInList = allQuads.find((q) => q.object === newObjectId);

  assertExists(updatedQuadInList);
  assertEquals(updatedQuadInList?.object, newObjectId);
});

Deno.test("LibsqlSearchStore - Delete: deleteQuad should remove a quad", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  const insertedIds = await store.insertQuads([
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
  ]);
  const quadId = insertedIds[0];

  // Verify quad exists
  const beforeDelete = await store.getQuad(quadId);
  assertExists(beforeDelete);

  // Delete the quad
  await store.deleteQuad(quadId);

  // Verify quad is gone
  const afterDelete = await store.getQuad(quadId);
  assertEquals(afterDelete, null);
});

Deno.test("LibsqlSearchStore - Delete: deleteQuads should remove multiple quads", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  // Create multiple quads
  const object2Result = await client.execute({
    sql:
      "INSERT INTO terms (term_type, value, language, datatype) VALUES (?, ?, ?, ?)",
    args: ["Literal", "value 2", null, null],
  });
  const object2Id = Number(object2Result.lastInsertRowid);

  const insertedIds = await store.insertQuads([
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
    {
      subject: subjectId,
      predicate: predicateId,
      object: object2Id,
      graph: graphId,
    },
  ]);

  // Verify quads exist
  assertEquals((await store.getQuads()).length, 2);

  // Delete both quads
  await store.deleteQuads(insertedIds);

  // Verify quads are gone
  assertEquals((await store.getQuads()).length, 0);
});

Deno.test("LibsqlSearchStore - Delete: deleteQuads should handle empty array", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);

  // Should not throw
  await store.deleteQuads([]);
});

Deno.test("LibsqlSearchStore - Delete: deleteQuadsByGraph should remove all quads in a graph", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  // Create another graph
  const graph2Result = await client.execute({
    sql:
      "INSERT INTO terms (term_type, value, language, datatype) VALUES (?, ?, ?, ?)",
    args: ["NamedNode", "http://example.org/graph2", null, null],
  });
  const graph2Id = Number(graph2Result.lastInsertRowid);

  // Create quads in both graphs
  const object2Result = await client.execute({
    sql:
      "INSERT INTO terms (term_type, value, language, datatype) VALUES (?, ?, ?, ?)",
    args: ["Literal", "value 2", null, null],
  });
  const object2Id = Number(object2Result.lastInsertRowid);

  await store.insertQuads([
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
    {
      subject: subjectId,
      predicate: predicateId,
      object: object2Id,
      graph: graphId,
    },
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graph2Id,
    },
  ]);

  // Verify initial state
  assertEquals((await store.getQuadsByGraph(graphId)).length, 2);
  assertEquals((await store.getQuadsByGraph(graph2Id)).length, 1);

  // Delete all quads in graph1
  await store.deleteQuadsByGraph(graphId);

  // Verify graph1 quads are gone, graph2 quads remain
  assertEquals((await store.getQuadsByGraph(graphId)).length, 0);
  assertEquals((await store.getQuadsByGraph(graph2Id)).length, 1);
});

Deno.test("LibsqlSearchStore - Transaction: insertQuads should rollback on error", async () => {
  const client = createClient({ url: ":memory:" });
  await initializeSchema(client);
  const store = new LibsqlSearchStore(client);
  const { subjectId, predicateId, objectId, graphId } = await createTestTerms(
    client,
  );

  // Create a valid quad and an invalid one (using non-existent term ID)
  const quads: Omit<schema.QuadRow, "quad_id">[] = [
    {
      subject: subjectId,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    },
    {
      subject: 99999,
      predicate: predicateId,
      object: objectId,
      graph: graphId,
    }, // Invalid foreign key
  ];

  // Should throw error and rollback
  await assertRejects(
    async () => {
      await store.insertQuads(quads);
    },
    Error,
  );

  // Verify no quads were inserted (transaction rolled back)
  assertEquals((await store.getQuads()).length, 0);
});
