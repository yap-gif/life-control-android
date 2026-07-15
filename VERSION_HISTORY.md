# Version History

### v2.4.0 (Current Release) - Localization & Multilingual Output
- Upgraded the cryptographic parameters for new backups to use PBKDF2-HMAC-SHA256 with 250,000 iterations and 256-bit derived encryption keys.
- Implemented full English, Chinese, and Bahasa Melayu translation capabilities for bottom navigation, workspaces, Settings, and plain/encrypted backup flows.
- Refactored `PortfolioReviewService` to focus strictly on portfolio project progress analysis, project activity review, documentation quality assessment, and release readiness evaluation, removing generic personal coaching items.
- Preserved legacy physical database filename `life_control_database` for backward compatibility, isolating it completely from user-facing screens or metadata.

### v2.3.0
- Introduced the offline-safe User Guide Hub containing comprehensive setup progress guides.
- Added localized in-app security warning text describing AES-GCM and PBKDF2 parameters.
- Standardized settings card structures.

### v2.2.1
- Hardened encrypted backup validation checks to verify the presence of all keys, verify the safety threshold of PBKDF2 iterations, and confirm Base64 validity prior to decryption.
- Implemented atomic restore flows to prevent malformed backups or incorrect passwords from modifying the Room SQLite database.

### v2.2.0
- Added optional AES-GCM password-encrypted backups with PBKDF2 key derivation using 150,000 iterations.
- Implemented password visibility toggles and validation safeguards.
