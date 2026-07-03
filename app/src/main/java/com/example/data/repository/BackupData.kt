package com.example.data.repository

import com.example.data.local.*

data class BackupContainer(
    val backupVersion: Int,
    val appVersion: String,
    val createdAt: Long,
    val deviceInfo: String?,
    val data: BackupData
)

data class BackupData(
    val tasks: List<TaskEntity>?,
    val transactions: List<TransactionEntity>?,
    val learningPaths: List<LearningPathEntity>?,
    val lessons: List<LessonEntity>?,
    val journalEntries: List<JournalEntity>?,
    val settings: Map<String, String>?
)
