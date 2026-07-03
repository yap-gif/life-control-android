package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "journal_reflections")
data class JournalEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val date: String, // e.g. "2026-07-02"
    val whatIDid: String,
    val whatWentWell: String,
    val whatToImprove: String,
    val tomorrowPriorities: String // Comma or newline separated, or simple text block
)
