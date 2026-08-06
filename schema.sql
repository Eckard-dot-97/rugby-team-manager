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
  reset_token_hash VARCHAR(64) NULL,
  reset_token_expires DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  date_of_birth DATE NULL,
  school VARCHAR(150) NULL,
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
  competition VARCHAR(100) NULL,
  opponent VARCHAR(100) NULL,
  venue VARCHAR(150) NULL,
  kickoff_time VARCHAR(20) NULL,
  referee_name VARCHAR(100) NULL,
  referee_bs_no VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Club-level defaults for the team sheet header — set once, editable any time.
-- Single row (id always 1).
CREATE TABLE club_settings (
  id INT PRIMARY KEY DEFAULT 1,
  club_name VARCHAR(150) NULL,
  team_age_group VARCHAR(30) NULL,
  coach_1_name VARCHAR(100) NULL,
  coach_1_bs_no VARCHAR(30) NULL,
  coach_2_name VARCHAR(100) NULL,
  coach_2_bs_no VARCHAR(30) NULL,
  coach_3_name VARCHAR(100) NULL,
  coach_3_bs_no VARCHAR(30) NULL,
  team_manager_name VARCHAR(100) NULL,
  team_manager_email VARCHAR(150) NULL,
  team_manager_cell VARCHAR(30) NULL,
  team_manager_bs_no VARCHAR(30) NULL
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
  position_played VARCHAR(50) NULL,
  tries INT NOT NULL DEFAULT 0,
  kicks_made INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
  UNIQUE KEY unique_child_fixture_stats (child_id, fixture_id)
);

-- Coach-built team sheet per Saturday game (1, 2, or 3). One row per
-- jersey slot (15 per game); child_id is NULL if that slot is unfilled.
CREATE TABLE team_selections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fixture_id INT NOT NULL,
  game_number TINYINT NOT NULL,
  jersey_number TINYINT NOT NULL,
  position VARCHAR(50) NOT NULL,
  child_id INT NULL,
  FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL,
  UNIQUE KEY unique_fixture_game_jersey (fixture_id, game_number, jersey_number)
);
