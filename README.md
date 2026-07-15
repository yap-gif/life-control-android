# ProjectForge AI

ProjectForge AI is an advanced, offline-first mobile workspace and release studio designed to manage projects, verify documentation quality, compile localized release materials, and generate promotional content using local-first templates and optional Gemini AI assessments.

## Architectural Pillars

1. **Local-First Resilience & Privacy**: All workspace data resides strictly inside on-device SQLite databases. External integrations like the Gemini API are 100% manual and opt-in, with zero silent background telemetries.
2. **Cryptographically Secure Portability**: Export and import workspace backups securely. Encrypted backups employ:
   - **Authenticated Encryption**: AES-GCM authenticated encryption.
   - **Derived Keys**: 256-bit derived keys from a user-provided password.
   - **Authentication Tag**: 128-bit GCM authentication tag for tamper resistance.
   - **Key Derivation Function**: PBKDF2-HMAC-SHA256 with 250,000 iterations for new backups.
3. **Robust Localization and Multilingual Outputs**: Supports full system interface translation and template content generation in:
   - English (en)
   - Chinese (zh)
   - Bahasa Melayu (ms)

## High-Security Backups & Validation
- **No Persistence of Credentials**: Passwords are never saved or stored.
- **Atomic Operations**: All restoration procedures are tested, verified, and parsed fully in memory before performing single atomic transactions on the SQLite database. Invalid backups abort cleanly, keeping current data secure.
- **Physical Isolation**: Standardized on-device persistence uses the `ProjectForgeDatabase` abstraction over the legacy compatibility physical file identifier `life_control_database` (retained internally only to preserve pre-existing installations).
- **Safe Metadata Audits**: Legacy backups with lower iteration counts are parsed securely by checking container metadata fields, while any files lacking valid iteration configurations fail validation safely to protect against attacks.
