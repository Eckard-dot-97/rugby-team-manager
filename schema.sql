CREATE DATABASE IF NOT EXISTS rugby_manager;
USE rugby_manager;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  cell_number VARCHAR(30) NOT NULL,
  role ENUM('parent', 'coach') NOT NULL DEFAULT 'parent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  position_1 VARCHAR(50) NOT NULL,
  position_2 VARCHAR(50) NOT NULL,
  position_3 VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE fixtures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  week_date DATE NOT NULL,
  game_1_label VARCHAR(100) DEFAULT 'Game 1',
  game_2_label VARCHAR(100) DEFAULT 'Game 2',
  game_3_label VARCHAR(100) DEFAULT 'Game 3',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  fixture_id INT NOT NULL,
  friday_training BOOLEAN NOT NULL DEFAULT FALSE,
  game_1 BOOLEAN NOT NULL DEFAULT FALSE,
  game_2 BOOLEAN NOT NULL DEFAULT FALSE,
  game_3 BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
  UNIQUE KEY unique_child_fixture (child_id, fixture_id)
);

-- Tries/kicks per child, per fixture. Populated by the coach re-uploading
-- the exported Excel sheet once it's filled in with match results.
CREATE TABLE game_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  fixture_id INT NOT NULL,
  tries INT NOT NULL DEFAULT 0,
  kicks_made INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
  UNIQUE KEY unique_child_fixture_stats (child_id, fixture_id)
);
