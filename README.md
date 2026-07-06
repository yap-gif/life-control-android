# Life Control

Life Control is an offline-first Android personal growth management app built with Kotlin, Jetpack Compose, Material 3, and Room Database.

It helps users manage daily tasks, income and expenses, savings goals, learning progress, daily reflections, weekly and monthly reviews, local analytics, optional AI coaching, and secure backups in one focused Android experience.

## Overview

Life Control was designed as a personal growth and independence tracker.

The app focuses on:

- Daily discipline
- Financial awareness
- Learning consistency
- Self-reflection
- Local analytics
- Privacy-first data ownership

The core app works fully offline. It does not require login, cloud storage, Firebase, or remote analytics.

## Key Features

- Home Dashboard
- Task Manager
- Money Tracker
- Learning Tracker
- Reflection Journal
- Weekly Review
- Monthly Review
- Analytics Hub
- Goal Forecast
- Optional Gemini AI Coach
- Local fallback analysis
- CSV export
- Plain JSON backup
- Encrypted `.lcbackup` backup
- Local reminders
- Demo Data Mode
- Screenshot / Portfolio Mode
- User Guide Hub
- Privacy & Data page
- Final Release QA Dashboard
- Permission & Privacy Audit screen

## Screens / Modules

- Home Dashboard
- Task Manager
- Money Tracker
- Learning Tracker
- Reflection Journal
- Weekly Review
- Monthly Review
- Analytics Hub
- Settings
- User Guide
- Privacy & Data
- About App
- Final QA Checklist
- Permission Audit

## Tech Stack

- Kotlin
- Jetpack Compose
- Material 3
- Room Database
- DAO + Repository Pattern
- Single-Activity Architecture
- Local-first Storage
- Android Notifications
- Storage Access Framework
- AES-GCM encrypted backup
- PBKDF2WithHmacSHA256 key derivation
- Optional Gemini AI integration

## Architecture

Life Control uses a local-first Android architecture.

Core data is stored in a local Room SQLite database. DAO and Repository patterns are used to separate data access from UI logic. Jetpack Compose powers the interface, while Material 3 provides the visual design system.

The app is structured around offline reliability, privacy transparency, secure backup handling, and optional AI-powered coaching.

## Offline-First Privacy Model

Life Control is designed to keep core user data local.

- No login required
- No cloud database
- No Firebase dependency for core features
- No remote analytics
- Local Room database storage
- User-controlled CSV export
- User-controlled JSON backup and restore
- User-controlled encrypted backup and restore
- Local Android reminders only
- User-controlled reset tools

## Optional AI Coach

Life Control includes an optional Gemini AI Coach.

The AI Coach is disabled by default. The app works normally without AI or internet access.

AI analysis only runs when the user manually taps an AI analysis button and grants consent.

- No automatic AI uploads
- No background AI processing
- No full database upload
- Journal AI uses only selected journal text
- Weekly and Monthly AI use aggregated metrics
- Local fallback analysis is used when AI is disabled, unavailable, or misconfigured
- AI-generated content may be inaccurate

To use AI features, configure your own Gemini API key locally. Do not commit API keys to GitHub.

## Backup & Restore

Life Control supports multiple data export and backup options.

### Plain JSON Backup

Plain JSON backup is readable and useful for debugging or manual transfer.

### Encrypted Backup

Encrypted backup creates a password-protected `.lcbackup` file.

- Uses AES-GCM authenticated encryption
- Uses PBKDF2WithHmacSHA256 key derivation
- Password is not stored by the app
- Wrong passwords cannot restore the backup
- Restore is validated before database mutation
- Restore is performed inside an atomic Room transaction

If the password is lost, the encrypted backup cannot be restored.

## How to Run

1. Clone this repository.
2. Open the project in Android Studio.
3. Let Gradle sync finish.
4. Run the app on an Android emulator or physical Android device.

Build debug APK:

```bash
./gradlew assembleDebug
