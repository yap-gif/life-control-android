package com.example.data.repository

import android.util.Base64
import java.security.SecureRandom
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

object BackupEncryption {

    private const val ALGORITHM = "AES-GCM"
    private const val KDF = "PBKDF2WithHmacSHA256"
    private const val ITERATIONS = 150000
    private const val KEY_LENGTH_BITS = 256
    private const val SALT_LENGTH_BYTES = 16
    private const val IV_LENGTH_BYTES = 12
    private const val GCM_TAG_LENGTH_BITS = 128

    fun encrypt(plainText: String, password: CharArray): EncryptedBackupContainer {
        val random = SecureRandom()
        
        // Generate random salt
        val salt = ByteArray(SALT_LENGTH_BYTES)
        random.nextBytes(salt)
        
        // Generate random IV
        val iv = ByteArray(IV_LENGTH_BYTES)
        random.nextBytes(iv)
        
        // Derive AES key
        val spec = PBEKeySpec(password, salt, ITERATIONS, KEY_LENGTH_BITS)
        val skf = SecretKeyFactory.getInstance(KDF)
        val keyBytes = skf.generateSecret(spec).encoded
        spec.clearPassword()
        
        val secretKey = SecretKeySpec(keyBytes, "AES")
        
        // Encrypt using AES-GCM
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec)
        
        val encryptedBytes = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
        
        // Zero out key bytes
        for (i in keyBytes.indices) {
            keyBytes[i] = 0
        }
        
        // Base64 encode values
        val saltBase64 = Base64.encodeToString(salt, Base64.NO_WRAP)
        val ivBase64 = Base64.encodeToString(iv, Base64.NO_WRAP)
        val payloadBase64 = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)
        
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US)
        val createdAtStr = dateFormat.format(Date())
        
        return EncryptedBackupContainer(
            backupVersion = 2,
            appVersion = "3.0.0",
            createdAt = createdAtStr,
            encryption = EncryptionMetadata(
                algorithm = ALGORITHM,
                kdf = KDF,
                iterations = ITERATIONS,
                salt = saltBase64,
                iv = ivBase64
            ),
            payload = payloadBase64
        )
    }

    fun decrypt(container: EncryptedBackupContainer, password: CharArray): String {
        val validationResult = validateContainer(container)
        if (!validationResult.first) {
            throw IllegalArgumentException(validationResult.second ?: "Invalid encrypted backup container")
        }

        val encryption = container.encryption!!
        val salt = Base64.decode(encryption.salt, Base64.NO_WRAP)
        val iv = Base64.decode(encryption.iv, Base64.NO_WRAP)
        val encryptedBytes = Base64.decode(container.payload, Base64.NO_WRAP)
        
        // Derive AES key using the container's parameters
        val spec = PBEKeySpec(password, salt, encryption.iterations ?: ITERATIONS, KEY_LENGTH_BITS)
        val skf = SecretKeyFactory.getInstance(encryption.kdf ?: KDF)
        val keyBytes = skf.generateSecret(spec).encoded
        spec.clearPassword()
        
        val secretKey = SecretKeySpec(keyBytes, "AES")
        
        // Decrypt using AES-GCM
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)
        
        val decryptedBytes = cipher.doFinal(encryptedBytes)
        
        // Zero out key bytes
        for (i in keyBytes.indices) {
            keyBytes[i] = 0
        }
        
        return String(decryptedBytes, Charsets.UTF_8)
    }

    private fun isValidBase64(str: String): Boolean {
        val sanitized = str.replace("\n", "").replace("\r", "").trim()
        val regex = Regex("^[A-Za-z0-9+/]*={0,2}$")
        return regex.matches(sanitized)
    }

    fun validateContainer(container: EncryptedBackupContainer?): Pair<Boolean, String?> {
        if (container == null) {
            return Pair(false, "Invalid backup: Empty or unparseable container.")
        }
        if (container.backupVersion == null) {
            return Pair(false, "Invalid backup: Missing 'backupVersion' field.")
        }
        if (container.backupVersion != 2) {
            return Pair(false, "Unsupported backup: backupVersion '${container.backupVersion}' is not supported.")
        }
        if (container.appVersion.isNullOrBlank()) {
            return Pair(false, "Invalid backup: Missing or empty 'appVersion' field.")
        }
        if (container.createdAt.isNullOrBlank()) {
            return Pair(false, "Invalid backup: Missing or empty 'createdAt' field.")
        }
        
        val encryption = container.encryption
            ?: return Pair(false, "Invalid backup: Missing 'encryption' metadata block.")
            
        if (encryption.algorithm.isNullOrBlank()) {
            return Pair(false, "Invalid backup: Missing encryption 'algorithm' field.")
        }
        if (encryption.algorithm != ALGORITHM) {
            return Pair(false, "Unsupported backup: Encryption algorithm '${encryption.algorithm}' is not supported. Only '$ALGORITHM' is allowed.")
        }
        
        if (encryption.kdf.isNullOrBlank()) {
            return Pair(false, "Invalid backup: Missing encryption 'kdf' (key derivation function) field.")
        }
        if (encryption.kdf != KDF) {
            return Pair(false, "Unsupported backup: Key derivation function '${encryption.kdf}' is not supported. Only '$KDF' is allowed.")
        }
        
        val iterations = encryption.iterations
            ?: return Pair(false, "Invalid backup: Missing PBKDF2 'iterations' field.")
        if (iterations <= 0) {
            return Pair(false, "Invalid backup: PBKDF2 iterations must be a positive integer.")
        }
        if (iterations < 10000) {
            return Pair(false, "Unsupported backup: PBKDF2 iterations count ($iterations) is below the minimum safety threshold (10,000).")
        }
        
        if (encryption.salt.isNullOrBlank()) {
            return Pair(false, "Invalid backup: Missing or empty encryption 'salt' field.")
        }
        if (!isValidBase64(encryption.salt)) {
            return Pair(false, "Invalid backup: Salt field is not valid Base64 encoded data.")
        }
        try {
            val saltBytes = Base64.decode(encryption.salt, Base64.NO_WRAP)
            if (saltBytes.isEmpty()) {
                return Pair(false, "Invalid backup: Salt cannot be empty.")
            }
        } catch (e: Exception) {
            return Pair(false, "Invalid backup: Salt field is not valid Base64 encoded data.")
        }
        
        if (encryption.iv.isNullOrBlank()) {
            return Pair(false, "Invalid backup: Missing or empty encryption 'iv' (initialization vector) field.")
        }
        if (!isValidBase64(encryption.iv)) {
            return Pair(false, "Invalid backup: IV field is not valid Base64 encoded data.")
        }
        try {
            val ivBytes = Base64.decode(encryption.iv, Base64.NO_WRAP)
            if (ivBytes.isEmpty()) {
                return Pair(false, "Invalid backup: IV cannot be empty.")
            }
        } catch (e: Exception) {
            return Pair(false, "Invalid backup: IV field is not valid Base64 encoded data.")
        }
        
        if (container.payload.isNullOrBlank()) {
            return Pair(false, "Invalid backup: Missing or empty 'payload' data field.")
        }
        if (!isValidBase64(container.payload)) {
            return Pair(false, "Invalid backup: Payload field is not valid Base64 encoded data.")
        }
        try {
            val payloadBytes = Base64.decode(container.payload, Base64.NO_WRAP)
            if (payloadBytes.isEmpty()) {
                return Pair(false, "Invalid backup: Payload cannot be empty.")
            }
        } catch (e: Exception) {
            return Pair(false, "Invalid backup: Payload field is not valid Base64 encoded data.")
        }
        
        return Pair(true, null)
    }

    fun containerToJson(container: EncryptedBackupContainer): String {
        val moshi = com.squareup.moshi.Moshi.Builder()
            .addLast(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
            .build()
        val adapter = moshi.adapter(EncryptedBackupContainer::class.java)
        return adapter.toJson(container)
    }

    fun jsonToContainer(json: String): EncryptedBackupContainer? {
        return try {
            val moshi = com.squareup.moshi.Moshi.Builder()
                .addLast(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
                .build()
            val adapter = moshi.adapter(EncryptedBackupContainer::class.java)
            adapter.fromJson(json)
        } catch (e: Exception) {
            null
        }
    }
}

data class EncryptedBackupContainer(
    val backupVersion: Int?,
    val appVersion: String?,
    val createdAt: String?,
    val encryption: EncryptionMetadata?,
    val payload: String?
)

data class EncryptionMetadata(
    val algorithm: String?,
    val kdf: String?,
    val iterations: Int?,
    val salt: String?,
    val iv: String?
)
