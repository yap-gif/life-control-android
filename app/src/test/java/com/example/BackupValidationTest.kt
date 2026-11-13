package com.example

import com.example.data.local.JournalEntity
import com.example.data.local.LearningPathEntity
import com.example.data.local.LessonEntity
import com.example.data.local.TaskEntity
import com.example.data.local.TransactionEntity
import com.example.data.repository.BackupContainer
import com.example.data.repository.BackupData
import com.example.data.repository.BackupValidation
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Assert.*
import org.junit.Test

class BackupValidationTest {
    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()

    private fun completeData() = BackupData(
        tasks = listOf(TaskEntity(id = 1, title = "Task", category = "Study", priority = "High", dueDate = "2026-11-13")),
        transactions = listOf(TransactionEntity(id = 2, amount = 10.0, type = "income", category = "Work", note = "", date = "2026-11-13")),
        learningPaths = listOf(LearningPathEntity(id = 3, title = "Kotlin")),
        lessons = listOf(LessonEntity(id = 4, pathId = 3, title = "Room")),
        journalEntries = listOf(JournalEntity(id = 5, date = "2026-11-13", whatIDid = "Work", whatWentWell = "OK", whatToImprove = "", tomorrowPriorities = "Test")),
        settings = mapOf("main_life_goal" to "Study")
    )

    private fun json(data: BackupData, version: Int = 2): String {
        val backup = BackupContainer(version, "12.0", 1L, "test", data)
        return moshi.adapter(BackupContainer::class.java).toJson(backup)
    }

    @Test fun completeBackupIsAccepted() {
        assertNotNull(BackupValidation.parseCompleteBackup(json(completeData())))
    }

    @Test fun completeEmptyListsAreAccepted() {
        val data = completeData().copy(
            tasks = emptyList(), transactions = emptyList(), learningPaths = emptyList(),
            lessons = emptyList(), journalEntries = emptyList()
        )
        assertNotNull(BackupValidation.parseCompleteBackup(json(data)))
    }

    @Test fun missingCollectionIsRejectedBeforeDeletion() {
        assertNull(BackupValidation.parseCompleteBackup(json(completeData().copy(transactions = null))))
    }

    @Test fun missingSettingsAreRejected() {
        assertNull(BackupValidation.parseCompleteBackup(json(completeData().copy(settings = null))))
    }

    @Test fun unsupportedBackupVersionIsRejected() {
        assertNull(BackupValidation.parseCompleteBackup(json(completeData(), version = 99)))
    }

    @Test fun brokenLessonReferencesAreRejected() {
        assertNull(BackupValidation.parseCompleteBackup(json(
            completeData().copy(lessons = listOf(LessonEntity(id = 4, pathId = 999, title = "Orphan")))
        )))
    }

    @Test fun duplicateIdsAreRejected() {
        val dupe = TaskEntity(id = 1, title = "Repeated", category = "Study", priority = "Low", dueDate = "2026-11-13")
        assertNull(BackupValidation.parseCompleteBackup(json(completeData().copy(tasks = listOf(dupe, dupe)))))
    }

    @Test fun completeLegacyRawBackupIsAccepted() {
        val raw = moshi.adapter(BackupData::class.java).toJson(completeData())
        assertNotNull(BackupValidation.parseCompleteBackup(raw))
    }
}
