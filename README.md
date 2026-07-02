# Java Apex 

## Overview

Java Apex Migration Wizard is a React + TypeScript application that helps users modernize Java applications by guiding them through a step-by-step migration workflow. The application analyzes repositories, discovers project configurations, allows users to configure migration strategies, and monitors migration progress until completion.

The project follows a modular React architecture where the application is divided into reusable UI components, custom hooks, services, and utility modules for better maintainability and scalability.

# Project Structure
src/
│
├── components/
│   ├── common/
│     ├── Button.tsx
│     ├── Card.tsx
│     ├── Input.tsx
│     ├── Select.tsx
│     ├── Loader.tsx
│     ├── Badge.tsx
│     ├── Tooltip.tsx
│     └── Modal.tsx
│   
│  
│
├── hooks/
│   ├── useMigration.ts
│   ├── useRepository.ts
│   └── useValidation.ts
│
|
|__  pages/
│       ├── MigrationWizard.tsx
│       ├── Header.tsx
│       ├── ConnectRepository.tsx
│       ├── RepositoryDiscovery.tsx
│       ├── StrategyStep.tsx
│       ├── ReviewStep.tsx
│       ├── MigrationStatus.tsx
│       ├── RepositoryCard.tsx
│       ├── ApiEndpointCard.tsx
│       ├── FileUploadCard.tsx
│       ├── ZipUploadCard.tsx
│       ├── LoadingOverlay.tsx
│       ├── SuccessDialog.tsx
│       ├── ErrorDialog.tsx
│       ├── ActionButtons.tsx
│       ├── styles.ts
│       ├── helpers.ts
│       ├── constants.ts
│       ├── types.ts
│       └── index.ts
├── services/
│   └── migrationService.ts
│
├── utils/
│   ├── validators.ts
│   ├── formatters.ts
│   └── constants.ts
│
└── types/
    └── migration.ts




# Application Architecture

The application is divided into two logical layers:

* Code Orchestration Flow
* User Journey Flow


1. Code Orchestration Flow

The React application follows a parent-child architecture where `MigrationWizard.tsx` acts as the central orchestrator.

```
App.tsx
    │
    ▼
AppShell.tsx
    │
    ▼
MigrationWizard.tsx
    │
    ├── useValidation()
    ├── useRepository()
    ├── useMigration()
    │
    ▼
Render Current Step
```

### App.tsx

The application's entry point.

Responsibilities:

* Initializes React application
* Loads AppShell component


### AppShell.tsx

Provides the global application layout.

Responsibilities:

* Header
* Navigation
* Theme controls
* Authentication dialogs
* Routing

Routes all wizard pages to:


MigrationWizard.tsx




### MigrationWizard.tsx

This is the main controller of the application.

Responsibilities:

* Stores application state
* Controls navigation between steps
* Calls custom hooks
* Communicates with backend services
* Renders step components
* Passes props to reusable components

It does **not** contain business logic directly after refactoring.



# Custom Hooks

## useValidation.ts

Responsible for:

* Repository URL validation
* GitHub/GitLab validation
* Token validation
* Form validation



## useRepository.ts

Responsible for:

* Repository cloning
* Repository discovery
* Reading project files
* Detecting Java version
* Detecting Spring Boot
* Detecting Maven/Gradle
* Parsing dependencies



## useMigration.ts

Responsible for:

* Starting migration
* Polling backend status
* Streaming logs
* Downloading reports
* Managing migration progress



# 2. User Journey Flow

The migration wizard guides users through several steps.



## Step 1 – Connect Repository

Component


ConnectRepository.tsx


User actions:

* Enter GitHub repository URL
* Enter GitLab repository URL
* Authenticate using Personal Access Token (PAT) if required

Validation:

* Repository URL
* Authentication
* Repository accessibility

After successful validation, the application proceeds to Step 2.



## Step 2 – Repository Discovery

Component


RepositoryDiscovery.tsx


Responsibilities:

* Analyze repository structure
* Display directory tree
* Locate build files
* Detect Java version
* Detect frameworks
* Identify modernization risks

The user reviews discovered information before proceeding.



## Step 3 – Migration Strategy

Component


StrategyStep.tsx


Responsibilities:

* Select target Java version
* Configure migration options
* Select migration approach
* Configure modernization settings

Selected options are stored in the global wizard state.



## Step 4 – Review Configuration

Component


ReviewStep.tsx


Responsibilities:

* Display migration summary
* Display repository details
* Display selected configuration
* Display modernization tools

When the user clicks **Start Migration**, a backend migration request is initiated.



## Step 5 – Migration Execution

Component


MigrationStatus.tsx


The migration progresses through three phases.

### /migrating

Displays:

* Loading overlay
* Spinner animation
* Initial worker startup



### /progress

Displays:

* Real-time logs
* Progress indicators
* Current migration stage
* API polling updates



### /report

Displays:

* Migration summary
* Build results
* Generated reports
* Download ZIP option
* Final execution logs



# Reusable Generic Components

Located in:
src/components/common/


| Component | Purpose                    |
| --------- | -------------------------- |
| Button    | Reusable styled button     |
| Card      | Standard content container |
| Input     | Text/password input        |
| Select    | Dropdown menu              |
| Loader    | Spinner loading animation  |
| Badge     | Status indicators          |
| Tooltip   | Hover information          |
| Modal     | Reusable popup dialog      |



# Migration Wizard Components

Located in:

src/components/MigrationWizard/


| Component       | Purpose                   |
| --------------- | ------------------------- |
| ActionButtons   | Next/Back navigation      |
| ApiEndpointCard | API endpoint information  |
| RepositoryCard  | Repository summary        |
| FileUploadCard  | File upload interface     |
| ZipUploadCard   | ZIP download interface    |
| SuccessDialog   | Success popup             |
| ErrorDialog     | Error popup               |
| LoadingOverlay  | Full-screen loading state |



# Benefits of the Refactored Architecture

* Reusable components
* Clear separation of concerns
* Improved maintainability
* Easier debugging
* Scalable project structure
* Better TypeScript organization
* Simplified testing
* Reduced code duplication
* Improved developer experience



# Technology Stack

* React
* TypeScript
* React Router
* Custom React Hooks
* CSS-in-JS / Inline Styles
* REST APIs
* GitHub API
* GitLab API



# Overall Application Flow


App.tsx
      │
      ▼
AppShell.tsx
      │
      ▼
MigrationWizard.tsx
      │
      ├───────────────┐
      │               │
      ▼               ▼
Custom Hooks     API Services
      │               │
      └───────┬───────┘
              ▼
Step Components
      │
      ▼
Reusable UI Components
      │
      ▼
User Interface


This layered architecture keeps business logic, presentation, and reusable components well separated, making the application easier to maintain, extend, and test.
