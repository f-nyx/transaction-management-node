CREATE TABLE tasks (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE entity_locks (
  entity_name VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  is_locked BOOLEAN NOT NULL,
  locked_at TIMESTAMP NOT NULL
);
