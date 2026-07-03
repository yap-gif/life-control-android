package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.data.local.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class LifeControlRepository(
    private val dao: LifeControlDao,
    context: Context
) {
    // --- Room Database Access ---
    val allTasks: Flow<List<TaskEntity>> = dao.getAllTasks()
    val allTransactions: Flow<List<TransactionEntity>> = dao.getAllTransactions()
    val allLearningPaths: Flow<List<LearningPathEntity>> = dao.getAllLearningPaths()
    val allJournalReflections: Flow<List<JournalEntity>> = dao.getAllJournalReflections()
    val allLessons: Flow<List<LessonEntity>> = dao.getAllLessons()

    fun getLessonsForPath(pathId: Int): Flow<List<LessonEntity>> = dao.getLessonsForPath(pathId)

    suspend fun insertTask(task: TaskEntity) = dao.insertTask(task)
    suspend fun deleteTask(task: TaskEntity) = dao.deleteTask(task)
    suspend fun updateTaskStatus(id: Int, isCompleted: Boolean) = dao.updateTaskStatus(id, isCompleted)

    suspend fun insertTransaction(transaction: TransactionEntity) = dao.insertTransaction(transaction)
    suspend fun deleteTransaction(transaction: TransactionEntity) = dao.deleteTransaction(transaction)

    suspend fun insertLearningPath(path: LearningPathEntity): Long = dao.insertLearningPath(path)
    suspend fun updateLearningPath(path: LearningPathEntity) = dao.updateLearningPath(path)
    suspend fun deleteLearningPath(path: LearningPathEntity) = dao.deleteLearningPath(path)

    suspend fun insertLesson(lesson: LessonEntity) = dao.insertLesson(lesson)
    suspend fun updateLesson(lesson: LessonEntity) = dao.updateLesson(lesson)
    suspend fun deleteLesson(lesson: LessonEntity) = dao.deleteLesson(lesson)
    suspend fun updateLessonStatus(id: Int, isCompleted: Boolean) = dao.updateLessonStatus(id, isCompleted)

    suspend fun getReflectionByDate(date: String): JournalEntity? = dao.getReflectionByDate(date)
    suspend fun insertJournalReflection(journal: JournalEntity) = dao.insertJournalReflection(journal)
    suspend fun deleteJournalReflection(journal: JournalEntity) = dao.deleteJournalReflection(journal)


    // --- SharedPreferences Settings ---
    private val prefs: SharedPreferences = context.getSharedPreferences("life_control_prefs", Context.MODE_PRIVATE)

    private val _mainLifeGoal = MutableStateFlow(getMainLifeGoalPref())
    val mainLifeGoal: StateFlow<String> = _mainLifeGoal.asStateFlow()

    private val _monthlyIncomeTarget = MutableStateFlow(getMonthlyIncomeTargetPref())
    val monthlyIncomeTarget: StateFlow<Double> = _monthlyIncomeTarget.asStateFlow()

    private val _savingsGoal = MutableStateFlow(getSavingsGoalPref())
    val savingsGoal: StateFlow<Double> = _savingsGoal.asStateFlow()

    private val _dailyStudyTargetMinutes = MutableStateFlow(getDailyStudyTargetMinutesPref())
    val dailyStudyTargetMinutes: StateFlow<Int> = _dailyStudyTargetMinutes.asStateFlow()

    private fun getMainLifeGoalPref() = prefs.getString("main_life_goal", "Become an Independent Cybersecurity Professional") ?: "Become an Independent Cybersecurity Professional"
    private fun getMonthlyIncomeTargetPref() = prefs.getFloat("monthly_income_target", 1500.0f).toDouble()
    private fun getSavingsGoalPref() = prefs.getFloat("savings_goal", 5000.0f).toDouble()
    private fun getDailyStudyTargetMinutesPref() = prefs.getInt("daily_study_target_minutes", 60)

    fun saveMainLifeGoal(goal: String) {
        prefs.edit().putString("main_life_goal", goal).apply()
        _mainLifeGoal.value = goal
    }

    fun saveMonthlyIncomeTarget(target: Double) {
        prefs.edit().putFloat("monthly_income_target", target.toFloat()).apply()
        _monthlyIncomeTarget.value = target
    }

    fun saveSavingsGoal(goal: Double) {
        prefs.edit().putFloat("savings_goal", goal.toFloat()).apply()
        _savingsGoal.value = goal
    }

    fun saveDailyStudyTargetMinutes(minutes: Int) {
        prefs.edit().putInt("daily_study_target_minutes", minutes).apply()
        _dailyStudyTargetMinutes.value = minutes
    }

    private val _onboardingCompleted = MutableStateFlow(getOnboardingCompletedPref())
    val onboardingCompleted: StateFlow<Boolean> = _onboardingCompleted.asStateFlow()

    private val _screenshotModeEnabled = MutableStateFlow(getScreenshotModeEnabledPref())
    val screenshotModeEnabled: StateFlow<Boolean> = _screenshotModeEnabled.asStateFlow()

    private fun getOnboardingCompletedPref() = prefs.getBoolean("onboarding_completed", false)
    private fun getScreenshotModeEnabledPref() = prefs.getBoolean("screenshot_mode_enabled", false)

    fun saveOnboardingCompleted(completed: Boolean) {
        prefs.edit().putBoolean("onboarding_completed", completed).apply()
        _onboardingCompleted.value = completed
    }

    fun saveScreenshotModeEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("screenshot_mode_enabled", enabled).apply()
        _screenshotModeEnabled.value = enabled
    }

    // --- Reminder Preference Accessors ---
    fun getReminderEnabled(key: String, default: Boolean): Boolean = prefs.getBoolean(key, default)
    fun saveReminderEnabled(key: String, enabled: Boolean) = prefs.edit().putBoolean(key, enabled).apply()

    fun getReminderTime(key: String, default: String): String = prefs.getString(key, default) ?: default
    fun saveReminderTime(key: String, time: String) = prefs.edit().putString(key, time).apply()

    suspend fun clearTasks() = dao.deleteAllTasks()
    suspend fun clearTransactions() = dao.deleteAllTransactions()
    suspend fun clearLearningPaths() = dao.deleteAllLearningPaths()
    suspend fun clearLessons() = dao.deleteAllLessons()
    suspend fun clearJournalReflections() = dao.deleteAllJournalReflections()

    fun resetPreferencesToDefault() {
        val wasOnboardingCompleted = getOnboardingCompletedPref()
        prefs.edit().clear().apply()
        saveOnboardingCompleted(wasOnboardingCompleted)
        _mainLifeGoal.value = "Become an Independent Cybersecurity Professional"
        _monthlyIncomeTarget.value = 1500.0
        _savingsGoal.value = 5000.0
        _dailyStudyTargetMinutes.value = 60
    }

    suspend fun seedDefaultData() {
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

        // Add default tasks
        dao.insertTask(TaskEntity(title = "Finish Android Room module", category = "Study", priority = "High", dueDate = "2026-07-02", isCompleted = false))
        dao.insertTask(TaskEntity(title = "Review server logs for unauthorized logins", category = "Work", priority = "Medium", dueDate = "2026-07-03", isCompleted = false))
        dao.insertTask(TaskEntity(title = "Morning stretching routines", category = "Health", priority = "Low", dueDate = "2026-07-02", isCompleted = true))
        dao.insertTask(TaskEntity(title = "Brainstorm new project features", category = "Personal Project", priority = "High", dueDate = "2026-07-04", isCompleted = false))

        // Add default transactions
        dao.insertTransaction(TransactionEntity(amount = 250.00, type = "income", category = "Freelance", note = "UI design contract work", date = "2026-07-01"))
        dao.insertTransaction(TransactionEntity(amount = 15.50, type = "expense", category = "Food", note = "Lunch with friends", date = "2026-07-02"))
        dao.insertTransaction(TransactionEntity(amount = 120.00, type = "expense", category = "Education", note = "Tech course subscription", date = "2026-06-28"))
    }
}
