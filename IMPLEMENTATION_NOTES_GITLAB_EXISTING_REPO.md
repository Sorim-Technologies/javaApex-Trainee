# GitLab + Existing Repository Enhancement

Implemented with minimal workflow/UI impact.

## Backend changes

- Added lightweight platform detection based on repository URL:
  - `github.com` / GitHub Enterprise-style URLs use existing GitHub service.
  - `gitlab.com` uses GitLab service.
- Extended `MigrationRequest` with:
  - `destination_repo_url`
  - `target_branch_name`
  - `create_new_branch`
  - `base_branch`
- Added GitHub endpoints:
  - `GET /api/github/check-repo-access`
  - `GET /api/github/list-branches`
  - `POST /api/github/create-branch`
- Added GitLab endpoints:
  - `GET /api/gitlab/repo-visibility`
  - `GET /api/gitlab/check-repo-access`
  - `GET /api/gitlab/list-branches`
  - `POST /api/gitlab/create-branch`
- Updated Existing Repository push behavior:
  - Uses `destination_repo_url` instead of `source_repo_url`.
  - Validates that source and destination platforms match.
  - Verifies destination access.
  - Supports pushing to an existing branch or creating a new branch from a selected base branch.
- Preserved untouched services:
  - `migration_service.py`
  - `sonarqube_service.py`
  - `fossa_service.py`
  - `hf_recommendation_service.py`

## Frontend changes

- Kept the same two output options:
  - Create New Repository
  - Existing Repository
- Existing Repository now asks for:
  - Destination repository URL
  - Branch option: existing branch or new branch
  - Base branch and new branch name when creating a branch
- API calls now route to GitHub or GitLab based on the repository URL.

## Validation performed

- Python syntax check passed for updated backend files.
- Frontend production build passed with `npm run build`.
