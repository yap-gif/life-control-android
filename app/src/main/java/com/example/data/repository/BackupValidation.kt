package com.example.data.repository

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

/**
 * Destructive restore is permitted only for a complete, internally consistent backup.
 * Older partial backups are deliberately rejected rather than silently clearing tables.
 */
object BackupValidation {
    private val moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    fun parseCompleteBackup(json: String): BackupData? {
        if (json.isBlank()) return null

        val wrapper = try {
            moshi.adapter(BackupContainer::class.java).fromJson(json)
        } catch (_: Exception) {
            null
        }
        val data = if (wrapper != null) {
            if (wrapper.backupVersion != 2) return null
            wrapper.data
        } else {
            try {
                moshi.adapter(BackupData::class.java).fromJson(json)
            } catch (_: Exception) {
                null
            }
        } ?: return null

        val tasks = data.tasks ?: return null
        val transactions = data.transactions ?: return null
        val paths = data.learningPaths ?: return null
        val lessons = data.lessons ?: return null
        val journals = data.journalEntries ?: return null
        if (data.settings == null) return null

        // REPLACE inserts silently discard duplicate primary keys; reject bad data upfront.
        if (!uniquePositiveIds(tasks.map { it.id }) ||
            !uniquePositiveIds(transactions.map { it.id }) ||
            !uniquePositiveIds(paths.map { it.id }) ||
            !uniquePositiveIds(lessons.map { it.id }) ||
            !uniquePositiveIds(journals.map { it.id })) return null

        val pathIds = paths.map { it.id }.toSet()
        if (lessons.any { it.pathId !in pathIds }) return null
        return data
    }

    private fun uniquePositiveIds(ids: List<Int>): Boolean =
        ids.all { it > 0 } && ids.toSet().size == ids.size
}
