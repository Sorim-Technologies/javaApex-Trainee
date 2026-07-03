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
  error_message TEXT NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_migration_history_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_migration_history_session FOREIGN KEY (session_id) REFERENCES user_sessions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
