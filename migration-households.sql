-- One-time migration to add household support to an already-deployed
-- database (the tables in schema.sql alone won't have these yet).
-- Safe to run once against the live `rugby_manager` database:
--   mysql -u root -p rugby_manager < migration-households.sql
-- (or paste into `mysql -u root -p` after `USE rugby_manager;`)

CREATE TABLE IF NOT EXISTS households (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS household_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  household_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_household_user (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS household_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  household_id INT NOT NULL,
  invited_email VARCHAR(255) NOT NULL,
  invited_by INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status ENUM('pending', 'accepted', 'declined', 'revoked') NOT NULL DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- ALTER TABLE has no IF NOT EXISTS for ADD COLUMN in all MySQL versions,
-- so this is wrapped so re-running the script harmlessly no-ops if the
-- column/constraint is already there.
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'children' AND COLUMN_NAME = 'household_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE children ADD COLUMN household_id INT NULL AFTER parent_id',
  'SELECT ''household_id column already exists, skipping'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'children' AND CONSTRAINT_NAME = 'fk_children_household'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE children ADD CONSTRAINT fk_children_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL',
  'SELECT ''fk_children_household already exists, skipping'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
