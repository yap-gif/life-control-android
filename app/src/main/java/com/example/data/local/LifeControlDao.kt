package com.example.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface LifeControlDao {

    // --- Tasks ---
    @Query("SELECT * FROM tasks ORDER BY id DESC")
    fun getAllTasks(): Flow<List<TaskEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: TaskEntity)

    @Delete
    suspend fun deleteTask(task: TaskEntity)

    @Query("UPDATE tasks SET isCompleted = :isCompleted WHERE id = :id")
    suspend fun updateTaskStatus(id: Int, isCompleted: Boolean)


    // --- Money Tracker ---
    @Query("SELECT * FROM transactions ORDER BY date DESC, id DESC")
    fun getAllTransactions(): Flow<List<TransactionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: TransactionEntity)

    @Delete
    suspend fun deleteTransaction(transaction: TransactionEntity)


    // --- Learning Paths & Lessons ---
    @Query("SELECT * FROM learning_paths ORDER BY id ASC")
    fun getAllLearningPaths(): Flow<List<LearningPathEntity>>

    @Query("SELECT * FROM learning_paths WHERE id = :id")
    suspend fun getLearningPathById(id: Int): LearningPathEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLearningPath(path: LearningPathEntity): Long

    @Update
    suspend fun updateLearningPath(path: LearningPathEntity)

    @Delete
    suspend fun deleteLearningPath(path: LearningPathEntity)

    @Query("SELECT * FROM lessons WHERE pathId = :pathId ORDER BY id ASC")
    fun getLessonsForPath(pathId: Int): Flow<List<LessonEntity>>

    @Query("SELECT * FROM lessons ORDER BY id ASC")
    fun getAllLessons(): Flow<List<LessonEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLesson(lesson: LessonEntity)

    @Update
    suspend fun updateLesson(lesson: LessonEntity)

    @Delete
    suspend fun deleteLesson(lesson: LessonEntity)

    @Query("UPDATE lessons SET isCompleted = :isCompleted WHERE id = :id")
    suspend fun updateLessonStatus(id: Int, isCompleted: Boolean)


    // --- Journal / Reflections ---
    @Query("SELECT * FROM journal_reflections ORDER BY date DESC")
    fun getAllJournalReflections(): Flow<List<JournalEntity>>

    @Query("SELECT * FROM journal_reflections WHERE date = :date LIMIT 1")
    suspend fun getReflectionByDate(date: String): JournalEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertJournalReflection(journal: JournalEntity)

    @Delete
    suspend fun deleteJournalReflection(journal: JournalEntity)


    // --- Advanced / Danger Zone Reset Queries ---
    @Query("DELETE FROM tasks")
    suspend fun deleteAllTasks()

    @Query("DELETE FROM transactions")
    suspend fun deleteAllTransactions()

    @Query("DELETE FROM learning_paths")
    suspend fun deleteAllLearningPaths()

    @Query("DELETE FROM lessons")
    suspend fun deleteAllLessons()

    @Query("DELETE FROM journal_reflections")
    suspend fun deleteAllJournalReflections()
}
