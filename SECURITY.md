# Security Policy & Specification

ProjectForge AI is committed to establishing rigorous standards for local data integrity, workspace privacy, and cryptographic safety.

## Cryptographic Parameters

For password-based encrypted backups, the application strictly implements the following technical specifications:

- **Authenticated Encryption**: AES-GCM authenticated encryption.
- **Derived Encryption Key**: 256-bit derived encryption key derived from user passwords.
- **Authentication Tag**: 128-bit GCM authentication tag for authenticated integrity protection.
- **Key Derivation Function**: PBKDF2-HMAC-SHA256 with 250,000 iterations for new backups.
- **Salt & IV**: Generated uniquely for each backup session using a cryptographically secure random number generator (`SecureRandom`).

## Security Disclosures & Guarantees

We adhere to standard security principles and maintain absolute transparency regarding data protection boundaries:

- **Zero Persistence of Credentials**: Passwords are never persisted to disk.
- **Volatile Buffers**: Mutable password buffers are cleared where practical, minimizing their lifecycle in memory.
- **Platform Limitations**: Android/JVM memory handling cannot guarantee immediate physical memory erasure due to garbage collection behavior and platform abstractions.
- **Irrecoverable Passwords**: Forgotten encrypted-backup passwords cannot be recovered under any circumstance, as there is no central key depository or backdoor.
- **Safe Validation Failures**: Invalid or corrupted backups fail validation before database replacement occurs, preventing existing databases from being compromised.
- **Legacy Compatibility**: Retains backward compatibility with older `life_control_database` files for seamless migration of installed user data, documented as an internal compatibility identifier never exposed in UI text or user-facing logs.
