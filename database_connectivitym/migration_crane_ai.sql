USE portos;

-- Run once after schema.sql. Prediction records are keyed by the crane label
-- used in the current simulator (for example CRANE-001).
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
