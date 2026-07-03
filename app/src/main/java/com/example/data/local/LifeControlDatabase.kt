package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        TaskEntity::class,
        TransactionEntity::class,
        LearningPathEntity::class,
        LessonEntity::class,
        JournalEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class LifeControlDatabase : RoomDatabase() {

    abstract fun dao(): LifeControlDao

    companion object {
        @Volatile
        private var INSTANCE: LifeControlDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): LifeControlDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    LifeControlDatabase::class.java,
                    "life_control_database"
                )
                .addCallback(DatabaseCallback(scope))
                .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback(
            private val scope: CoroutineScope
        ) : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    scope.launch(Dispatchers.IO) {
                        prepopulateDatabase(database.dao())
                    }
                }
            }

            private suspend fun prepopulateDatabase(dao: LifeControlDao) {
                // Prepopulate default learning paths
                val pathLinux = dao.insertLearningPath(
                    LearningPathEntity(title = "Linux", streak = 3, lastStudiedDate = "2026-07-01")
                ).toInt()
                val pathCyber = dao.insertLearningPath(
                    LearningPathEntity(title = "Cybersecurity", streak = 1, lastStudiedDate = "2026-07-02")
                ).toInt()
                val pathAndroid = dao.insertLearningPath(
                    LearningPathEntity(title = "Android Development", streak = 5, lastStudiedDate = "2026-07-02")
                ).toInt()
                val pathAI = dao.insertLearningPath(
                    LearningPathEntity(title = "AI Tools", streak = 2, lastStudiedDate = "2026-06-30")
                ).toInt()

                // Prepopulate lessons for Linux
                dao.insertLesson(LessonEntity(pathId = pathLinux, title = "Introduction to CLI", isCompleted = true))
                dao.insertLesson(LessonEntity(pathId = pathLinux, title = "File Permissions (chmod, chown)", isCompleted = true))
                dao.insertLesson(LessonEntity(pathId = pathLinux, title = "Process Management (ps, kill)", isCompleted = false))
                dao.insertLesson(LessonEntity(pathId = pathLinux, title = "Shell Scripting Basics", isCompleted = false))

                // Prepopulate lessons for Cybersecurity
                dao.insertLesson(LessonEntity(pathId = pathCyber, title = "Basic Security Principles", isCompleted = true))
                dao.insertLesson(LessonEntity(pathId = pathCyber, title = "Network Scanning (Nmap)", isCompleted = false))
                dao.insertLesson(LessonEntity(pathId = pathCyber, title = "Symmetric vs Asymmetric Encryption", isCompleted = false))
                dao.insertLesson(LessonEntity(pathId = pathCyber, title = "OWASP Top 10 Web Vulnerabilities", isCompleted = false))

                // Prepopulate lessons for Android
                dao.insertLesson(LessonEntity(pathId = pathAndroid, title = "Kotlin Fundamentals", isCompleted = true))
                dao.insertLesson(LessonEntity(pathId = pathAndroid, title = "Jetpack Compose Basics", isCompleted = true))
                dao.insertLesson(LessonEntity(pathId = pathAndroid, title = "Room Database Integration", isCompleted = true))
                dao.insertLesson(LessonEntity(pathId = pathAndroid, title = "MVVM Architecture", isCompleted = false))

                // Prepopulate lessons for AI Tools
                dao.insertLesson(LessonEntity(pathId = pathAI, title = "Prompt Engineering Best Practices", isCompleted = true))
                dao.insertLesson(LessonEntity(pathId = pathAI, title = "Using Large Language Models", isCompleted = false))
                dao.insertLesson(LessonEntity(pathId = pathAI, title = "AI-assisted Coding Workflows", isCompleted = false))
                dao.insertLesson(LessonEntity(pathId = pathAI, title = "Integrating Gemini APIs in Mobile Apps", isCompleted = false))

                // Add some default tasks for a clean starting experience
                dao.insertTask(TaskEntity(title = "Finish Android Room module", category = "Study", priority = "High", dueDate = "2026-07-02", isCompleted = false))
                dao.insertTask(TaskEntity(title = "Review server logs for unauthorized logins", category = "Work", priority = "Medium", dueDate = "2026-07-03", isCompleted = false))
                dao.insertTask(TaskEntity(title = "Morning stretching routines", category = "Health", priority = "Low", dueDate = "2026-07-02", isCompleted = true))
                dao.insertTask(TaskEntity(title = "Brainstorm new project features", category = "Personal Project", priority = "High", dueDate = "2026-07-04", isCompleted = false))

                // Add some default transactions
                dao.insertTransaction(TransactionEntity(amount = 250.00, type = "income", category = "Freelance", note = "UI design contract work", date = "2026-07-01"))
                dao.insertTransaction(TransactionEntity(amount = 15.50, type = "expense", category = "Food", note = "Lunch with friends", date = "2026-07-02"))
                dao.insertTransaction(TransactionEntity(amount = 120.00, type = "expense", category = "Education", note = "Tech course subscription", date = "2026-06-28"))
            }
        }
    }
}
