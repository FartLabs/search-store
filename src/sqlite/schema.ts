export const quadsTable = `CREATE TABLE IF NOT EXISTS quads (
  quad_id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject INTEGER NOT NULL REFERENCES terms(term_id),
  predicate INTEGER NOT NULL REFERENCES terms(term_id),
  object INTEGER NOT NULL REFERENCES terms(term_id),
  graph INTEGER NOT NULL REFERENCES terms(term_id),

  UNIQUE(subject, predicate, object, graph)
)`;

export interface QuadRow {
  quad_id: number;
  subject: number;
  predicate: number;
  object: number;
  graph: number;
}

export const termsTable = `CREATE TABLE IF NOT EXISTS terms (
  term_id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_type TEXT NOT NULL,
  value TEXT NOT NULL,
  language TEXT,
  datatype TEXT,

  UNIQUE(term_type, value, language, datatype)
)`;

export interface TermRow {
  term_id: number;
  term_type: string;
  value: string;
  language?: string;
  datatype?: string;
}
