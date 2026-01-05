# search-store

RDF Store extended with cutting-edge search capabilities.

## Overview

**search-store** adds full-text and semantic search capabilities to RDF
knowledge graphs, with real-time synchronization as the graph changes.

### Architecture

The project follows a **source-sink pattern**:

- **Sources**: Track RDF changes and emit patches
  - `N3PatchSource`: Wraps N3 stores with a proxy that monitors changes
  - `OxigraphPatchSource`: Similar functionality for Oxigraph stores

- **Sinks**: Consume patches and provide search functionality
  - `OramaSearchStore`: Full implementation with hybrid search support
  - `Elasticsearch`: Planned implementation

- **Embeddings**: Optional vector embeddings for semantic search
  - FastEmbed
  - Google Gemini
  - TensorFlow.js

### Key Features

- **Patch-based updates**: Tracks insertions and deletions of RDF quads
- **Hybrid search**: Combines text search with vector embeddings (when embedder
  is provided)
- **Real-time synchronization**: Proxy wraps RDF stores to automatically emit
  patches on changes
- **Sequential processing**: Patches are processed in order to maintain
  consistency

### Use Case

Add full-text and semantic search to RDF knowledge graphs, with automatic
updates as the graph changes.

## RDF 1.1 Notes

- A literal cannot have both a language tag and a datatype
- Language-tagged literals are `rdf:langString` (string type)
- Plain literals (no datatype) are treated as `xsd:string`

---

Developed with 🧪 [**@FartLabs**](https://fartlabs.org/)
