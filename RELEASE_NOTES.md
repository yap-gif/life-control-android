# Release Notes: ProjectForge AI v2.4.0

We are proud to announce the release of **ProjectForge AI v2.4.0 (Localization & Multilingual Output)**. This release resolves outstanding security, product-scope, localization, and technical documentation inconsistencies to deliver a seamless, enterprise-grade localized workspace experience.

## Key Highlights

### 1. Cryptographic and Password-Based Encrypted Backup Hardening
- **Enhanced Iterations Count**: Standardized new encrypted backups to use 250,000 iterations of PBKDF2-HMAC-SHA256 for key derivation.
- **Strict Legacy Isolation**: Restores legacy backups safely by using the exact `iterationCount` stored in their own metadata block.
- **Improved Metadata Storage**: Encrypted backup metadata now fully stores detailed attributes:
  - `encryptionAlgorithm` (AES-GCM)
  - `keyDerivationAlgorithm` (PBKDF2-HMAC-SHA256)
  - `iterationCount` (250,000)
  - `keyLengthBits` (256-bit)
  - `gcmTagLengthBits` (128-bit)
  - Cryptographically secure `salt` and `iv` (Base64)
- **Fail-Safe Integrity Check**: Backups missing iterationCount metadata fail validation safely. Incorrect passwords and malformed payloads abort instantly within single atomic Room SQLite transactions, leaving on-device workspace databases completely untouched.

### 2. Localization & Multilingual Engine
- **Independent Language Architecture**: Stored language identifiers are mapped to stable system keys (`system`, `en`, `zh`, `ms`, `follow_app`) independently of user-facing translations.
- **Comprehensive UI Localization**: Full localization across all visual interfaces including bottom navigation, workspaces, settings, Release Studio, Template Studio, and plain/encrypted backup dialogs.
- **Technical Key Preservation**: JSON configuration keys and vital identifiers (e.g., Kotlin, Jetpack Compose, Material 3, Room, MVVM, StateFlow, Gemini, AES-GCM, PBKDF2-HMAC-SHA256, SHA-256) remain strictly in English, ensuring high compatibility across system boundaries.

### 3. Product Scope Refactoring & Legacy Database Isolation
- **Refactored PortfolioReviewService**: Removed all generic personal coaching and "Life Control" branding concepts (personal habits, daily logs, weekly reflection diaries). The AI service focuses purely on:
  - Portfolio project progress analysis
  - Project activity review
  - Documentation quality assessment
  - Release readiness evaluation
- **Legacy Filename Isolation**: Kept the physical Room database file name `life_control_database` solely to preserve existing user installations. This compatibility identifier is isolated internally and is never exposed in user-facing metadata, logs, or UI panels.
