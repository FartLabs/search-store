export const insertQuadQuery =
  `INSERT INTO quads (subject, predicate, object, graph) VALUES (?, ?, ?, ?)`;

export const selectQuadQuery = `SELECT * FROM quads WHERE quad_id = ?`;

export const selectQuadsQuery = `SELECT * FROM quads`;

export const selectQuadsByGraphQuery = `SELECT * FROM quads WHERE graph = ?`;

export const deleteQuadQuery = `DELETE FROM quads WHERE quad_id = ?`;

export const deleteQuadsByGraphQuery = `DELETE FROM quads WHERE graph = ?`;

export const insertTermQuery =
  `INSERT INTO terms (term_type, value, language, datatype) VALUES (?, ?, ?, ?)`;

export const selectTermQuery = `SELECT * FROM terms WHERE term_id = ?`;

export const selectTermByPropertiesQuery =
  `SELECT * FROM terms WHERE term_type = ? AND value = ? AND (language = ? OR (language IS NULL AND ? IS NULL)) AND (datatype = ? OR (datatype IS NULL AND ? IS NULL))`;

export const deleteTermQuery = `DELETE FROM terms WHERE term_id = ?`;
