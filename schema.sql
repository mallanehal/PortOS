-- Create and select the database used by the Express API.
CREATE DATABASE IF NOT EXISTS portos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE portos;

-- One parent row per saved simulator configuration.
CREATE TABLE IF NOT EXISTS simulations (
  simulation_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  legacy_saved_simulation_id BIGINT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (simulation_id),
  UNIQUE KEY uq_simulations_legacy_saved (legacy_saved_simulation_id)
);

-- Ship identity and details; source_ship_id preserves the ID used by the simulator.
CREATE TABLE IF NOT EXISTS ships (
  ship_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  simulation_id INT UNSIGNED NOT NULL,
  source_ship_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT '',
  captain_name VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (ship_id),
  UNIQUE KEY uq_ships_simulation_source (simulation_id, source_ship_id),
  UNIQUE KEY uq_ships_simulation_ship (simulation_id, ship_id),
  CONSTRAINT fk_ships_simulation
    FOREIGN KEY (simulation_id) REFERENCES simulations (simulation_id)
    ON DELETE CASCADE
);

-- Berths, cranes, and trucks share this table and are distinguished by resource_type.
CREATE TABLE IF NOT EXISTS resources (
  resource_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  simulation_id INT UNSIGNED NOT NULL,
  resource_type ENUM('berth', 'crane', 'truck') NOT NULL,
  resource_number INT UNSIGNED NOT NULL,
  size ENUM('Small', 'Medium', 'Large') NOT NULL,
  PRIMARY KEY (resource_id),
  UNIQUE KEY uq_resources_simulation_type_number (simulation_id, resource_type, resource_number),
  CONSTRAINT fk_resources_simulation
    FOREIGN KEY (simulation_id) REFERENCES simulations (simulation_id)
    ON DELETE CASCADE
);

-- Each request belongs to a simulation and references one of its ships.
CREATE TABLE IF NOT EXISTS ship_requests (
  request_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  simulation_id INT UNSIGNED NOT NULL,
  pid INT UNSIGNED NOT NULL,
  ship_id INT UNSIGNED NOT NULL,
  priority INT UNSIGNED NOT NULL,
  arrival INT UNSIGNED NOT NULL,
  burst INT UNSIGNED NOT NULL,
  berth_count INT UNSIGNED NOT NULL DEFAULT 0,
  crane_count INT UNSIGNED NOT NULL DEFAULT 0,
  truck_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_requests_simulation_pid (simulation_id, pid),
  CONSTRAINT fk_requests_simulation
    FOREIGN KEY (simulation_id) REFERENCES simulations (simulation_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_requests_ship
    FOREIGN KEY (simulation_id, ship_id) REFERENCES ships (simulation_id, ship_id)
    ON DELETE CASCADE
);

-- The earlier JSON-based saved_simulations table remains in place on upgrades.


-- MLP crane prediction history. First version is explicitly demo-only until
-- a validated, labelled crane failure dataset replaces synthetic training data.
CREATE TABLE IF NOT EXISTS crane_ai_predictions (
  prediction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  crane_id VARCHAR(80) NOT NULL,
  temperature DECIMAL(7,2) NOT NULL,
  vibration DECIMAL(7,3) NOT NULL,
  load_percent DECIMAL(7,2) NOT NULL,
  operating_hours DECIMAL(12,2) NOT NULL,
  failure_probability DECIMAL(7,6) NOT NULL,
  risk_category ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
  model_version VARCHAR(80) NOT NULL,
  model_mode VARCHAR(40) NOT NULL DEFAULT 'SYNTHETIC_DEMO_ONLY',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (prediction_id),
  KEY idx_crane_ai_predictions_crane_date (crane_id, created_at)
) ENGINE=InnoDB;
