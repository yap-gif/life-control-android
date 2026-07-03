package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val category: String, // "Study", "Work", "Health", "Personal Project", "Life Admin"
    val priority: String, // "Low", "Medium", "High"
    val dueDate: String,
    val isCompleted: Boolean = false
)
