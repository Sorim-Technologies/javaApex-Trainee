CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) NULL,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  avatar_url TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  last_login_at DATETIME NULL,
  last_logout_at DATETIME NULL,
  UNIQUE KEY uq_users_provider_user_id (provider, provider_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL,
  role VARCHAR(50) NOT NULL,
  login_time DATETIME NOT NULL,
  logout_time DATETIME NULL,
  last_active_time DATETIME NULL,
  session_status VARCHAR(50) NOT NULL,
  ip_address VARCHAR(100) NULL,
  user_agent TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guest_usage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  migrations_used INT NOT NULL DEFAULT 0,
  migration_limit INT NOT NULL DEFAULT 3,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_guest_usage_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS repository_analysis (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  session_id BIGINT NULL,
  repository_url TEXT NOT NULL,
  repository_name VARCHAR(255) NULL,
  branch_name VARCHAR(255) NULL,
  total_files INT NOT NULL DEFAULT 0,
  java_files INT NOT NULL DEFAULT 0,
  build_tool VARCHAR(100) NULL,
  detected_java_version VARCHAR(50) NULL,
  detected_spring_boot_version VARCHAR(50) NULL,
  api_endpoint_count INT NOT NULL DEFAULT 0,
  dependency_count INT NOT NULL DEFAULT 0,
  analysis_status VARCHAR(50) NOT NULL DEFAULT 'completed',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_repository_analysis_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_repository_analysis_session FOREIGN KEY (session_id) REFERENCES user_sessions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_endpoints (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  analysis_id BIGINT NOT NULL,
  method VARCHAR(20) NULL,
  path TEXT NULL,
  name VARCHAR(255) NULL,
  file_path TEXT NULL,
  class_name VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_api_endpoints_analysis FOREIGN KEY (analysis_id) REFERENCES repository_analysis(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migration_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  session_id BIGINT NULL,
  repository_url TEXT NOT NULL,
  repository_name VARCHAR(255) NULL,
  source_java_version VARCHAR(50) NULL,
  target_java_version VARCHAR(50) NULL,
  source_spring_boot_version VARCHAR(50) NULL,
  target_spring_boot_version VARCHAR(50) NULL,
  conversion_types TEXT NULL,
  status VARCHAR(50) NOT NULL,
  migrated_repo_url TEXT NULL,
  migrated_branch_name VARCHAR(255) NULL,
  vector_indexed BOOLEAN NOT NULL DEFAULT FALSE,
  vector_indexed_at DATETIME NULL,
  vector_index_error TEXT NULL,
  local_migrated_repo_path TEXT NULL,
  error_message TEXT NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_migration_history_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_migration_history_session FOREIGN KEY (session_id) REFERENCES user_sessions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dependency_changes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  migration_id BIGINT NOT NULL,
  repository_name VARCHAR(255) NULL,
  dependency_name VARCHAR(500) NULL,
  old_version VARCHAR(100) NULL,
  new_version VARCHAR(100) NULL,
  change_type VARCHAR(50) NOT NULL,
  file_path TEXT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_dependency_migration_id (migration_id),
  INDEX idx_dependency_user_id (user_id),
  CONSTRAINT fk_dependency_changes_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_dependency_changes_migration FOREIGN KEY (migration_id) REFERENCES migration_history(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
