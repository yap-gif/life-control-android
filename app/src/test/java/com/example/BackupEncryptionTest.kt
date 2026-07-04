package com.example

import com.example.data.repository.BackupEncryption
import com.example.data.repository.EncryptedBackupContainer
import com.example.data.repository.EncryptionMetadata
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class BackupEncryptionTest {

    private val testPassword = "super_secure_password_123".toCharArray()
    private val wrongPassword = "wrong_password_abc".toCharArray()
    private val testPayload = """{"tasks":[{"id":1,"title":"Learn Kotlin"}]}"""

    @Test
    fun test_encrypt_decrypt_roundtrip() {
        // 1. Encrypt payload
        val container = BackupEncryption.encrypt(testPayload, testPassword)
        assertNotNull(container)
        assertEquals(2, container.backupVersion)
        assertEquals("2.3.0", container.appVersion)
        assertNotNull(container.createdAt)
        assertEquals("AES-GCM", container.encryption?.algorithm)
        assertEquals("PBKDF2WithHmacSHA256", container.encryption?.kdf)
        assertEquals(150000, container.encryption?.iterations)
        assertNotNull(container.encryption?.salt)
        assertNotNull(container.encryption?.iv)
        assertNotNull(container.payload)

        // 2. Decrypt payload
        val decrypted = BackupEncryption.decrypt(container, testPassword)
        assertEquals(testPayload, decrypted)
    }

    @Test
    fun test_decrypt_with_wrong_password_throws_exception() {
        val container = BackupEncryption.encrypt(testPayload, testPassword)
        
        try {
            BackupEncryption.decrypt(container, wrongPassword)
            fail("Should throw AEADBadTagException or GeneralSecurityException on wrong password")
        } catch (e: Exception) {
            // Expected exception
            assertTrue(e is javax.crypto.AEADBadTagException || e.cause is javax.crypto.AEADBadTagException || e is IllegalArgumentException)
        }
    }

    @Test
    fun test_validateContainer_with_valid_container() {
        val container = BackupEncryption.encrypt(testPayload, testPassword)
        val validationResult = BackupEncryption.validateContainer(container)
        assertTrue(validationResult.first)
        assertNull(validationResult.second)
    }

    @Test
    fun test_validateContainer_with_invalid_versions_and_algorithms() {
        val validContainer = BackupEncryption.encrypt(testPayload, testPassword)
        
        // Unsupported backupVersion
        val badVersion = validContainer.copy(backupVersion = 99)
        val v1 = BackupEncryption.validateContainer(badVersion)
        assertFalse(v1.first)
        assertTrue(v1.second?.contains("backupVersion") == true)

        // Unsupported algorithm
        val badAlgo = validContainer.copy(
            encryption = validContainer.encryption?.copy(algorithm = "AES-CBC")
        )
        val v2 = BackupEncryption.validateContainer(badAlgo)
        assertFalse(v2.first)
        assertTrue(v2.second?.contains("algorithm") == true)

        // Unsupported KDF
        val badKdf = validContainer.copy(
            encryption = validContainer.encryption?.copy(kdf = "PBKDF2WithHmacSHA1")
        )
        val v3 = BackupEncryption.validateContainer(badKdf)
        assertFalse(v3.first)
        assertTrue(v3.second?.contains("kdf", ignoreCase = true) == true)

        // Low iterations
        val lowIterations = validContainer.copy(
            encryption = validContainer.encryption?.copy(iterations = 999)
        )
        val v4 = BackupEncryption.validateContainer(lowIterations)
        assertFalse(v4.first)
        assertTrue(v4.second?.contains("iterations") == true)
    }

    @Test
    fun test_validateContainer_with_corrupted_base64() {
        val validContainer = BackupEncryption.encrypt(testPayload, testPassword)
        
        // Corrupted Base64 salt
        val badSalt = validContainer.copy(
            encryption = validContainer.encryption?.copy(salt = "invalid base64!!!")
        )
        val v1 = BackupEncryption.validateContainer(badSalt)
        assertFalse(v1.first)
        assertTrue(v1.second?.contains("Salt") == true || v1.second?.contains("salt") == true)

        // Corrupted Base64 payload
        val badPayload = validContainer.copy(payload = "!!!invalid payload!!!")
        val v2 = BackupEncryption.validateContainer(badPayload)
        assertFalse(v2.first)
        assertTrue(v2.second?.contains("Payload") == true || v2.second?.contains("payload") == true)
    }
}
