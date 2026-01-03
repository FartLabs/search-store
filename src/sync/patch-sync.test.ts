import { assertEquals } from "@std/assert";
import { DataFactory } from "n3";
import type * as rdfjs from "@rdfjs/types";
import { DefaultPatchSync } from "./patch-sync.ts";
import type { QuadSource } from "../core/quad-source.ts";
import type { PatchSink } from "../core/patch-sink.ts";
import type { RDFPatch } from "../core/rdf-patch.ts";

const { quad, namedNode, literal } = DataFactory;

class FakeQuadSource implements QuadSource {
  constructor(private quads: rdfjs.Quad[]) {}

  async *snapshot(): AsyncIterable<rdfjs.Quad> {
    for (const q of this.quads) {
      yield q;
    }
  }
}

class FakePatchSink implements PatchSink {
  public appliedPatches: RDFPatch[] = [];

  async applyPatches(patches: AsyncIterable<RDFPatch>): Promise<void> {
    for await (const patch of patches) {
      this.appliedPatches.push(patch);
    }
  }
}

Deno.test("DefaultPatchSync.sync converts snapshot to add patches", async () => {
  const source = new FakeQuadSource([
    quad(
      namedNode("http://example.org/subject1"),
      namedNode("http://example.org/predicate"),
      literal("value1"),
    ),
    quad(
      namedNode("http://example.org/subject2"),
      namedNode("http://example.org/predicate"),
      literal("value2"),
    ),
  ]);
  const sink = new FakePatchSink();
  const sync = new DefaultPatchSync();

  await sync.sync(source, sink);

  assertEquals(sink.appliedPatches.length, 2);
  assertEquals(sink.appliedPatches[0].action, "add");
  assertEquals(sink.appliedPatches[1].action, "add");
});

Deno.test("DefaultPatchSync.subscribe applies patches with batching", async () => {
  const sink = new FakePatchSink();
  const sync = new DefaultPatchSync();

  const quad1 = quad(
    namedNode("http://example.org/subject1"),
    namedNode("http://example.org/predicate"),
    literal("value1"),
  );
  const quad2 = quad(
    namedNode("http://example.org/subject2"),
    namedNode("http://example.org/predicate"),
    literal("value2"),
  );

  const patches: AsyncIterable<RDFPatch> = (async function* () {
    yield { action: "add", quad: quad1 };
    yield { action: "remove", quad: quad2 };
  })();

  const subscription = await sync.subscribe(patches, sink, { batchSize: 2 });

  // Wait for processing to complete (with batchSize: 2, both patches should be processed together)
  await subscription.unsubscribe();

  // Should have batched and applied patches
  assertEquals(sink.appliedPatches.length, 2);
  assertEquals(sink.appliedPatches[0].action, "add");
  assertEquals(sink.appliedPatches[1].action, "remove");
});

Deno.test("DefaultPatchSync.subscribe can be unsubscribed", async () => {
  const sink = new FakePatchSink();
  const sync = new DefaultPatchSync();

  let patchCount = 0;
  const patches: AsyncIterable<RDFPatch> = (async function* () {
    while (true) {
      yield {
        action: "add" as const,
        quad: quad(
          namedNode(`http://example.org/subject${patchCount}`),
          namedNode("http://example.org/predicate"),
          literal("value"),
        ),
      };
      patchCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  })();

  const subscription = await sync.subscribe(patches, sink, { batchSize: 1 });

  // Wait a bit to let some patches through
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Unsubscribe
  await subscription.unsubscribe();

  // Wait a bit more to ensure no more patches are processed
  await new Promise((resolve) => setTimeout(resolve, 50));

  const patchesBeforeUnsubscribe = sink.appliedPatches.length;

  // Should have stopped processing after unsubscribe
  assertEquals(sink.appliedPatches.length, patchesBeforeUnsubscribe);
});
