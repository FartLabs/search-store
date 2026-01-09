# search-store

[![JSR](https://jsr.io/badges/@fartlabs/search-store)](https://jsr.io/@fartlabs/search-store)
[![JSR score](https://jsr.io/badges/@fartlabs/search-store/score)](https://jsr.io/@fartlabs/search-store/score)
[![GitHub Actions](https://github.com/EthanThatOneKid/search-store/actions/workflows/check.yaml/badge.svg)](https://github.com/EthanThatOneKid/search-store/actions/workflows/check.yaml)

RDF Store extended with cutting-edge search capabilities.

## Overview

**search-store** adds full-text and semantic search capabilities to RDF
knowledge graphs, with real-time synchronization as the graph changes.

### Architecture

- **`PatchHandler`** interface handles patches (insertions and deletions of RDF
  quads)
- **`SearchStore`** interface extends `PatchHandler` and provides search
  functionality
- Helper functions (e.g., `proxyN3`, `connectSearchStoreToN3Store`) wrap RDF
  stores to monitor changes and emit patches

Proof-of-concept implementations exist for each interface, but the architecture
is defined by these interfaces rather than specific implementations. Optional
vector embeddings for semantic search can be provided by implementations (see
examples).

### Key Features

- **Patch-based updates**: Tracks insertions and deletions of RDF quads
- **Hybrid search**: Combines text search with optional vector embeddings (RRF)
  when provided by implementations
- **Real-time synchronization**: Helper functions wrap RDF stores to
  automatically emit patches on changes
- **Sequential processing**: Patches are processed in order to maintain
  consistency
- **String literal indexing**: Only string literals (language-tagged or plain)
  are indexed for search

### Use Case

Add full-text and semantic search to RDF knowledge graphs, with automatic
updates as the graph changes.

See the [Solar System example](./examples/solar-system/main.ts) for a search
store implementation with Orama.

### Contribute

Contributions are welcome! Please feel free to submit a pull request.

Run the precommit tasks:

```sh
deno task precommit
```

Run the Solar System example:

```sh
deno task example
```

### RDF 1.1 Notes

- A literal cannot have both a language tag and a datatype
- Language-tagged literals are `rdf:langString` (string type)
- Plain literals (no datatype) are treated as `xsd:string`

---

Developed with 🧪 [**@FartLabs**](https://fartlabs.org/)
