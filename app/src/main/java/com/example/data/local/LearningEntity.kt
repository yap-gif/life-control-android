package com.example.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "learning_paths")
data class LearningPathEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val streak: Int = 0,
    val lastStudiedDate: String? = null
)

@Entity(
    tableName = "lessons",
    foreignKeys = [
        ForeignKey(
            entity = LearningPathEntity::class,
            parentColumns = ["id"],
            childColumns = ["pathId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["pathId"])]
)
data class LessonEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val pathId: Int,
    val title: String,
    val isCompleted: Boolean = false
)
