# LMS

A desktop laboratory and patient management system built with Tauri, React, and TypeScript.

It is an application for managing laboratory workflows, patient records, investigation requests,
results, billing, and user access in a desktop environment.

## Overview

LMS is designed for clinical and laboratory operations where staff need a fast, reliable system to:

- register and manage patients
- create and track investigation requests
- record and review lab results
- generate printable reports and receipts
- manage billing and payment records
- support role-based access for users and administrators
- run as a native desktop app on Windows, macOS, and Linux

## Tech Stack

- React + TypeScript
- Vite for frontend tooling
- Tauri for desktop packaging
- Rust backend for data access and business logic
- SQLite for local data storage
- authentication and secure local storage patterns

## Core Features

- patient management
- requests and investigations workflow
- result entry and reporting
- billing and receipt generation
- user and settings management
- desktop-first experience with local persistence
- printable report and receipt pages

## Application Structure

```text
.
├── src/               # React frontend application
│   ├── components/   # Shared UI components
│   ├── pages/        # Dashboard, patients, requests, billing, etc.
│   ├── stores/       # State management
│   └── styles.css    # App styling
├── public/            # Static assets
├── src-tauri/         # Tauri app and Rust backend
│   └── src/           # Authentication, database, billing, requests, results, and app commands
├── package.json       # Frontend dependencies and scripts
├── vite.config.ts     # Vite config
├── tsconfig.json      # TypeScript config
├── README.md          # Project documentation
├── index.html         # Browser entry point
└── pnpm-lock.yaml     # Lockfile
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm or npm
- Rust toolchain
- Tauri system dependencies for your OS

### Install dependencies

```bash
npm install
```

or

```bash
pnpm install
```

### Run the app in development mode

```bash
npm run tauri dev
```

This launches the React frontend together with the Tauri desktop application.

### Build for production

```bash
npm run tauri build
```

This compiles the app and produces desktop build artifacts for the target platform.


## Notes

The repo is a practical app foundation for a diagnostic or laboratory management workflow, with Tauri providing a desktop shell and React providing the frontend UI.

## License

This project is intended for use and modification under GNU General Public License v3.0 (GPL-3.0).
