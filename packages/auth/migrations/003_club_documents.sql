CREATE TABLE IF NOT EXISTS club_documents (
  id               SERIAL PRIMARY KEY,
  type             VARCHAR(50)  NOT NULL UNIQUE,
  label            VARCHAR(255) NOT NULL,
  filename         VARCHAR(255) NOT NULL,
  content_type     VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  data             BYTEA        NOT NULL,
  file_size_bytes  INTEGER,
  uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  uploaded_by      TEXT
);
