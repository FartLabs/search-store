# Architecture Overview

This document summarizes the purpose of each file and how they work together in
the search-store codebase.

## Core Interfaces

### `src/search-store.ts`

**Purpose:** Defines the `SearchStore` interface for search-optimized RDF data
storage.

**Key Features:**

- `addQuad(quad)` / `addQuads(quads)` - Add RDF quads to the search store
- `removeQuad(quad)` / `removeQuads(quads)` - Remove RDF quads from the search
  store

**Usage:** This is the target interface for search-optimized storage. It's
adapted to `PatchSink` via `SearchPatchSink`.

### `src/utils.ts`

**Purpose:** Utility functions for testing and assertions.

**Key Features:**

- `assertQuadEquals(expected, actual)` - Asserts that two RDF quads are equal

---

## Source/Sink Pattern (`src/`)

The architecture separates concerns into **sources** (produce quads), **sinks**
(consume quads), and **sync** (connects them).

### Directory Structure

The codebase is organized into logical submodules:

- **`core/`** - Core interfaces and types (QuadSource, PatchSink, RDFPatch,
  etc.)
- **`sources/`** - Source implementations (OxigraphQuadSource, N3QuadSource,
  PatchSource)
- **`sinks/`** - Sink implementations (SearchPatchSink)
- **`sync/`** - Sync implementations (DefaultPatchSync)
- **`utils/`** - Utilities (SPARQL queries, convenience sync functions)

Each submodule has an `index.ts` file for easy imports, and the main `index.ts`
at the root re-exports everything.

### Core Interfaces

#### `src/core/quad-source.ts`

**Purpose:** Defines the `QuadSource` interface for producing RDF quads.

**Key Features:**

- `snapshot(filter?)` - Returns all quads matching filter criteria as an async
  iterable
- `QuadFilter` - Interface for filtering quads by object type (`string`,
  `langString`, or `all`)

**Design Pattern:** Producer/Iterator pattern - sources produce quads that can
be consumed incrementally via snapshots.

### Patch-Based Pattern

The architecture uses a **Patch-Based Pattern** that addresses the naming
ambiguity (from RDF perspective it's a source, from third-party perspective it's
also a source) and properly handles removals (which standard RDFJS Sinks don't
support) by using atomic patches that explicitly handle both insertions and
deletions.

#### `src/core/rdf-patch.ts`

**Purpose:** Defines the `RDFPatch` interface for atomic changes.

**Key Features:**

- `action` - Either "add" or "remove"
- `quad` - The quad that should be added or removed

**Design Pattern:** Simplified patch model - each patch represents one quad with
an action, making the API more direct and easier to work with. Inspired by the
Equinor rdf-graph library's approach.

#### `src/core/patchable-store.ts`

**Purpose:** Unified interface for a store that can both provide data (like a
Source) and accept patches (like a Sink that understands removals).

**Key Features:**

- `match(subject?, predicate?, object?, graph?)` - RDFJS-compatible query method
- `applyPatch(patch)` - Applies atomic patches with insertions and deletions
- `snapshot(filter?)` - Inherited from QuadSource for filtered snapshots

**Design Pattern:** Repository/Store pattern - makes the dual nature explicit.
From RDF perspective it's a source, from third-party perspective it consumes
patches. The name "PatchableStore" avoids directional confusion.

#### `src/core/patch-sink.ts`

**Purpose:** Sink interface that consumes patches.

**Key Features:**

- `applyPatches(patches)` - Applies a stream of patches (async iterable)

**Design Pattern:** Patch-based sink - unlike standard RDFJS Sinks which only
handle additions, PatchSink handles both insertions and deletions via patches.
The sink accepts an async iterable of individual patches, allowing it to batch
them efficiently if needed.

#### `src/sync/patch-sync.ts`

**Purpose:** Synchronization using the patch/delta pattern.

**Key Features:**

- `sync(source, sink, filter?)` - One-time sync - converts snapshot quads to
  patches with "add" action
- `subscribe(patches, sink, options?)` - Live sync with batching
  - Accepts an async iterable of patches directly from sources
  - Batches patches before applying for efficiency
- `subscribeToCallbacks(source, sink, filter?, options?)` - Live sync via typed
  callbacks
  - Subscribes directly to `PatchCallbackSource` callbacks (more efficient)
  - No async iterable conversion needed
  - Batches patches before applying for efficiency
- `PatchSyncOptions` - Configurable batching (batchSize, batchTimeout)

**Design Pattern:** Patch-based synchronization - sources emit patches directly,
which are then applied to sinks. Batching is an optimization layer, not a
requirement.

**Benefits:**

- **Direct API**: Sources emit patches directly, no conversion layer needed
- **Simple Types**: One patch = one quad + action (like Equinor rdf-graph)
- **Batching**: Optional batching for efficiency when processing many patches
- **Clear Semantics**: Patch-based approach makes the dual nature explicit
- **RDFJS Compatible**: Works with standard RDFJS Source interfaces for
  snapshots

### Implementations

#### `src/sources/oxigraph-quad-source.ts`

**Purpose:** Implements `QuadSource` using Oxigraph Store as the backend.

**How it works:**

1. Wraps an Oxigraph `Store` instance
2. Uses `buildSnapshotQuery()` to generate SPARQL queries based on filter
   criteria
3. Executes queries against the Oxigraph store
4. Yields quads as an async iterable

**Dependencies:**

- `oxigraph` - The underlying RDF store
- `sparql-queries.ts` - For building SPARQL queries

#### `src/sources/n3-quad-source.ts`

**Purpose:** Implements `QuadSource` using N3.js Store as the backend.

**How it works:**

1. Wraps an N3.js `Store` instance
2. Uses `store.match()` to iterate through all quads (N3 uses pattern matching
   rather than SPARQL)
3. Filters quads based on the filter criteria (object type)
4. Yields quads as an async iterable

**Key Differences from Oxigraph:**

- N3.js uses pattern matching (`match()`) instead of SPARQL queries
- Filtering is done in JavaScript rather than at the query level
- More suitable for in-memory stores or smaller datasets

**Dependencies:**

- `n3` - The underlying RDF store library

#### `src/sources/event-driven-patch-source.ts`

**Purpose:** Adapts a callback-based RDF store for patch-based synchronization.

**How it works:**

1. Wraps an RDF store that can query for snapshots
2. Uses typed callbacks (`PatchCallbackSource`) instead of event emitters for
   better maintainability
3. Provides `snapshot()` for one-time sync
4. Provides `patches()` that converts callbacks to an async iterable for use
   with PatchSync

**Key Interfaces:**

- `PatchCallbackSource` - Typed callback interface for receiving patches
  (`onPatch(callback)`)
- `PatchStore` - Unified interface for stores that both query and provide patch
  callbacks

**Use Case:** Perfect for RDF stores that provide patch callbacks, allowing
real-time synchronization to document stores as third-party entities are added
or removed. The callback-based approach is simpler and more maintainable than
event emitters.

**Dependencies:**

- `PatchCallbackSource` - Typed callback interface for subscribing to patches
- `sparql-queries.ts` - For building snapshot queries

#### `src/sinks/search-patch-sink.ts`

**Purpose:** Adapter that converts `SearchStore` to `PatchSink`.

**How it works:**

1. Wraps a `SearchStore` instance
2. Collects patches from the async iterable
3. Separates patches into insertions (action: "add") and deletions (action:
   "remove")
4. Applies deletions first, then insertions (to avoid conflicts)
5. Delegates to the underlying `SearchStore`

**Design Pattern:** Adapter pattern - bridges `SearchStore` and `PatchSink`.

#### `src/utils/sync.ts`

**Purpose:** Convenience functions for simplified synchronization setup.

**Key Functions:**

- `syncToSearchStore(rdfStore, searchStore, filter?, options?)` - One-line
  patch-based synchronization using typed callbacks (synchronous, returns
  Subscription directly)
- `syncSnapshot(rdfStore, searchStore, filter?)` - One-time snapshot
  synchronization using patches

**Usage:** Simplifies the common case of syncing a callback-based RDF store to a
search store. Handles all the setup internally using the patch-based approach.
Uses direct callback subscription for better performance (no async iterable
conversion needed).

**Example:**

```typescript
import { syncToSearchStore } from "./utils/sync.ts";

const subscription = syncToSearchStore(
  rdfStore,
  searchStore,
  { objectType: "string" },
  { batchSize: 10, batchTimeout: 1000 },
);

// When done:
await subscription.unsubscribe();
```

#### `src/utils/sparql-queries.ts`

**Purpose:** Utility for building SPARQL CONSTRUCT queries based on filter
criteria.

**How it works:**

1. Takes a `QuadFilter` (object type: `string`, `langString`, or `all`)
2. Builds a SPARQL CONSTRUCT query that:
   - Matches quads from default graph and named graphs
   - Filters by literal type based on the filter criteria
3. Returns the complete SPARQL query string

**Query Structure:**

- Base query matches all quads (default graph + named graphs)
- Filter clause restricts to literal objects
- Optional type-specific filters for `string` or `langString`

---

## How They Work Together

### Typical Usage Flow

```
┌─────────────────┐
│  RDF Store      │  (callback-based RDF data source)
│  (PatchStore)   │
└────────┬────────┘
         │
         │ onPatch() callbacks
         ▼
┌─────────────────┐
│ DefaultPatchSync│  (batches patches for efficiency)
│ subscribeToCallbacks()│
└────────┬────────┘
         │
         │ applies patches
         ▼
┌──────────────────┐
│  SearchPatchSink  │  (implements PatchSink)
└────────┬─────────┘
         │
         │ delegates to
         ▼
┌─────────────────┐
│  SearchStore    │  (search-optimized storage)
└─────────────────┘
```

### Recommended Flow for External Database Sync

To keep an external database (search store) in sync with an RDF store, follow
this recommended pattern:

1. **Initialize**: First, initialize the empty search store with the
   `syncSnapshot` function to establish initial parity.
2. **Subscribe**: Second, register a subscription to keep the search store in
   sync with ongoing changes. **Always register the subscription before any
   operations are made on the RDF store** to prevent corruption.
3. **Recovery**: When a conflict or corruption is detected, delete all documents
   from the search store and reinsert them all again using `syncSnapshot` to
   regain parity.

**Example:**

```typescript
import { syncSnapshot, syncToSearchStore } from "./utils/sync.ts";
import { PatchSource } from "./sources/index.ts";

const rdfStore = new YourPatchStore(); // Must implement PatchStore interface
const searchStore = new YourSearchStore();
const filter = { objectType: "string" };

// Step 1: Initialize the empty search store
await syncSnapshot(rdfStore, searchStore, filter);

// Step 2: Register subscription BEFORE any operations on the RDF store
// Note: syncToSearchStore is synchronous (returns Subscription directly)
const subscription = syncToSearchStore(
  rdfStore,
  searchStore,
  filter,
  { batchSize: 10, batchTimeout: 1000 },
);

// Now the RDF store can be used - changes will be automatically synced
// ... perform operations on rdfStore ...

// Step 3: If corruption is detected, recover by reinitializing
async function recoverFromCorruption() {
  // Unsubscribe first
  await subscription.unsubscribe();

  // Delete all documents: Get all quads from RDF store and remove them
  // (This ensures we remove everything that should be in the search store)
  const dummyCallbackSource = { onPatch: () => () => {} };
  const source = new PatchSource(rdfStore, dummyCallbackSource);
  const allQuads: rdfjs.Quad[] = [];
  for await (const quad of source.snapshot(filter)) {
    allQuads.push(quad);
  }
  await searchStore.removeQuads(allQuads);

  // Reinitialize from snapshot (reinserts all quads)
  await syncSnapshot(rdfStore, searchStore, filter);

  // Re-register subscription
  return syncToSearchStore(rdfStore, searchStore, filter, {
    batchSize: 10,
    batchTimeout: 1000,
  });
}

// When done:
await subscription.unsubscribe();
```

### Example Code Flow

#### One-Time Synchronization

```typescript
import { syncSnapshot } from "./utils/sync.ts";

const rdfStore = new YourRDFStore();
const searchStore = new YourSearchStore();

await syncSnapshot(rdfStore, searchStore, { objectType: "string" });
```

#### Patch-Based Live Synchronization (Simplified API)

```typescript
import { syncToSearchStore } from "./utils/sync.ts";

// One-line setup! Changes automatically reflected in document store via typed callbacks
const rdfStore = new YourPatchStore(); // Must implement PatchStore interface
const searchStore = new YourSearchStore();

// Note: syncToSearchStore is synchronous (returns Subscription directly)
const subscription = syncToSearchStore(
  rdfStore,
  searchStore,
  { objectType: "string" },
  { batchSize: 10, batchTimeout: 1000 },
);

// When done:
await subscription.unsubscribe();
```

#### Patch-Based Live Synchronization (Manual Setup)

For more control, you can set up the components manually:

```typescript
import { SearchPatchSink } from "./sinks/index.ts";
import { DefaultPatchSync } from "./sync/index.ts";

// 1. Your RDF store must implement PatchStore interface
const rdfStore = new YourPatchStore();

// 2. Create patch sink
const searchStore = new YourSearchStore();
const sink = new SearchPatchSink(searchStore);

// 3. Subscribe to callbacks directly (more efficient than async iterable conversion)
const sync = new DefaultPatchSync();
const subscription = sync.subscribeToCallbacks(
  rdfStore,
  sink,
  { objectType: "string" },
  { batchSize: 10 },
);

// Changes in RDF store are now automatically reflected in document store
// When done:
await subscription.unsubscribe();
```

### Data Flow

1. **Source Production**: `PatchSource.snapshot()` queries RDF store using
   SPARQL (for one-time sync)
2. **Query Building**: `buildSnapshotQuery()` generates appropriate SPARQL based
   on filter
3. **Patches**: `PatchSource.patches()` converts callbacks to async iterable
   (for use with `subscribe()`), or `PatchSync.subscribeToCallbacks()`
   subscribes directly to typed callbacks (more efficient)
4. **Batching**: `DefaultPatchSync.subscribeToCallbacks()` batches patches
   before applying (optional optimization)
5. **Patch Application**: `SearchPatchSink.applyPatches()` receives patches
6. **Storage**: `SearchStore.addQuads()` and `removeQuads()` store quads in
   search-optimized format

---

## Design Benefits

1. **Patch-Based**: Atomic patches ensure insertions and deletions are handled
   together
2. **Separation of Concerns**: Source produces, patch sink consumes, sync
   connects
3. **Flexibility**: Any source works with any patch sink
4. **Composability**: Easy to chain and combine different implementations
5. **Testability**: Simple to mock interfaces for testing
6. **Extensibility**: Easy to add new source/sink types (e.g., `FileQuadSource`,
   `DatabasePatchSink`)
7. **Batching**: Configurable batching for efficient synchronization

---

## File Summary Table

| File                                   | Purpose                     | Type           | Module     |
| -------------------------------------- | --------------------------- | -------------- | ---------- |
| `search-store.ts`                      | Search store interface      | Interface      | `src/`     |
| `utils.ts`                             | Test utilities              | Utility        | `src/`     |
| `core/quad-source.ts`                  | Quad producer interface     | Interface      | `core/`    |
| `core/rdf-patch.ts`                    | Patch/delta types           | Type           | `core/`    |
| `core/patchable-store.ts`              | Unified store interface     | Interface      | `core/`    |
| `core/patch-sink.ts`                   | Patch-based sink interface  | Interface      | `core/`    |
| `sources/oxigraph-quad-source.ts`      | Oxigraph source impl        | Implementation | `sources/` |
| `sources/n3-quad-source.ts`            | N3.js source impl           | Implementation | `sources/` |
| `sources/event-driven-patch-source.ts` | Callback-based patch source | Implementation | `sources/` |
| `sinks/search-patch-sink.ts`           | SearchStore patch adapter   | Adapter        | `sinks/`   |
| `sync/patch-sync.ts`                   | Patch-based sync impl       | Implementation | `sync/`    |
| `sync/subscription.ts`                 | Subscription interface      | Interface      | `sync/`    |
| `utils/sync.ts`                        | Convenience sync functions  | Utility        | `utils/`   |
| `utils/sparql-queries.ts`              | SPARQL query builder        | Utility        | `utils/`   |
