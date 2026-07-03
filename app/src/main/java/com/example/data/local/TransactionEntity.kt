package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val amount: Double,
    val type: String, // "income" or "expense"
    val category: String, // "Salary", "Freelance", "Food", "Transport", "Education", "Tools", "Personal", "Other"
    val note: String,
    val date: String // e.g. "2026-07-02"
)
