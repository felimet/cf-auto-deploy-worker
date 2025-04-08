# Modular Architecture of Cloudflare R2 File System Project

This document outlines the modular structure of the Cloudflare R2 file system project. The project has been refactored to follow a modular architecture, improving maintainability, extensibility, and code reuse.

## Directory Structure

### Backend (Server-side) Structure

```
src/
├── index.js                  # Main entry point, handles routing
├── handlers/                 # Feature handlers
│   ├── uploadHandler.js      # File upload logic
│   ├── downloadHandler.js    # File download logic
│   ├── deleteHandler.js      # File deletion logic
│   ├── listHandler.js        # File listing with folder support
│   └── bucketsHandler.js     # R2 bucket management
├── middlewares/              # Middleware components
│   ├── auth.js               # Authentication middleware
│   └── cors.js               # CORS handling and error responses
└── utils/                    # Utility functions
    └── fileUtils.js          # File-related utility functions
```

### Frontend (Client-side) Structure

```
frontend/
├── index.html                # Main HTML page
├── assets/                   # Static assets
│   └── favicon/              # Favicon files
├── scss/                     # SCSS source files
│   ├── _variables.scss       # Variables for colors and sizing
│   └── styles.scss           # Main SCSS file
├── css/                      # Compiled CSS
│   └── styles.css            # Compiled from SCSS
├── js/                       # JavaScript modules
│   ├── app.js                # Application entry point
│   ├── config.js             # Global configuration
│   ├── components/           # UI components
│   │   └── login.js          # Authentication UI component
│   ├── utils/                # Utility functions
│   │   ├── formatters.js     # Formatting utilities
│   │   ├── fileIcons.js      # File icon & path utilities
│   │   └── authUtils.js      # Authentication utilities
│   └── handlers/             # Feature handlers
│       ├── uploadHandler.js  # Upload handling
│       ├── fileListHandler.js # File list management
│       └── bucketHandler.js  # Bucket selection functionality
```

## Module Descriptions

### Backend Modules

#### 1. Core System

- **index.js**: Main entry point that routes requests to appropriate handlers based on URL path and HTTP method. Handles CORS preflight requests and provides a clean API interface.

#### 2. Handlers

- **uploadHandler.js**: Processes file upload requests, validates files, preserves folder structures, sanitizes filenames, and stores files in R2 buckets.
- **downloadHandler.js**: Handles file download requests, retrieves files from R2, sets appropriate headers for content type and caching.
- **deleteHandler.js**: Manages file deletion, including basic authorization checking and bucket selection.
- **listHandler.js**: Provides file listing functionality with folder structure support, includes features for pagination, prefix filtering, and bucket selection.
- **bucketsHandler.js**: Lists available R2 buckets for the application.

#### 3. Middleware

- **cors.js**: Contains CORS-related functions for handling cross-origin requests, setting appropriate headers, and generating error responses.

#### 4. Utilities

- **fileUtils.js**: Provides utility functions for file operations, including filename sanitization, file extension extraction, and content type determination.

### Frontend Modules

#### 1. Core Application

- **app.js**: The main entry point that initializes the application, sets up event listeners, and coordinates interactions between modules.
- **config.js**: Contains global configuration settings, such as API URL and application parameters.

#### 2. Utilities

- **formatters.js**: Utility functions for formatting data (bytes, time) in user-friendly formats.
- **fileIcons.js**: Provides icon mapping for different file types and path utility functions.

#### 3. Handlers

- **uploadHandler.js**: Manages the file upload process, including progress tracking, error handling, and folder uploads.
- **fileListHandler.js**: Handles file listing display, folder navigation, and file deletion.
- **bucketHandler.js**: Manages R2 bucket selection and filtering.

## Authentication Support

The system includes basic authentication support. In the backend, the delete handler has provisions for checking authorization headers, which can be extended to implement more robust authentication mechanisms.

## Advantages of Modular Architecture

1. **Maintainability**: Each module focuses on a specific functionality, making the code easier to understand and maintain.
2. **Extensibility**: New features can be added as independent modules without disrupting existing functionality.
3. **Code Reuse**: Common functions are abstracted into utility modules, reducing code duplication.
4. **Testability**: Modular structure facilitates unit testing by allowing each component to be tested in isolation.
5. **Collaboration**: Multiple developers can work on different modules simultaneously without conflicts.

## Folder Structure Support

Both backend and frontend have been enhanced to support folder structures:

1. The backend listHandler.js uses the delimiter parameter to support folder-based navigation.
2. The frontend fileListHandler.js provides UI components for folder navigation, including breadcrumb trails and back functionality.
3. When uploading folders, the complete folder structure is preserved.

This modular architecture maintains all original functionality while significantly improving code quality and structure, ensuring the application remains scalable and maintainable as it grows.
