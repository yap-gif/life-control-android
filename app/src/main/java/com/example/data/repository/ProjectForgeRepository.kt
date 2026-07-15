package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.data.local.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class ProjectForgeRepository(
    private val dao: ProjectForgeDao,
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

    // --- Localization Settings ---
    private val _appLanguage = MutableStateFlow(getAppLanguagePref())
    val appLanguage: StateFlow<String> = _appLanguage.asStateFlow()

    private val _generatedContentLanguage = MutableStateFlow(getGeneratedContentLanguagePref())
    val generatedContentLanguage: StateFlow<String> = _generatedContentLanguage.asStateFlow()

    private fun getAppLanguagePref() = prefs.getString("app_language", "system") ?: "system"
    private fun getGeneratedContentLanguagePref() = prefs.getString("generated_content_language", "follow") ?: "follow"

    fun saveAppLanguage(lang: String) {
        prefs.edit().putString("app_language", lang).apply()
        _appLanguage.value = lang
    }

    fun saveGeneratedContentLanguage(lang: String) {
        prefs.edit().putString("generated_content_language", lang).apply()
        _generatedContentLanguage.value = lang
    }

    // --- AI Coach Preferences ---
    private val _aiCoachEnabled = MutableStateFlow(getAiCoachEnabledPref())
    val aiCoachEnabled: StateFlow<Boolean> = _aiCoachEnabled.asStateFlow()

    private val _aiAnalysisMode = MutableStateFlow(getAiAnalysisModePref())
    val aiAnalysisMode: StateFlow<String> = _aiAnalysisMode.asStateFlow() // "local" or "gemini"

    private val _aiConsentAccepted = MutableStateFlow(getAiConsentAcceptedPref())
    val aiConsentAccepted: StateFlow<Boolean> = _aiConsentAccepted.asStateFlow()

    private fun getAiCoachEnabledPref() = prefs.getBoolean("ai_coach_enabled", false)
    private fun getAiAnalysisModePref() = prefs.getString("ai_analysis_mode", "local") ?: "local"
    private fun getAiConsentAcceptedPref() = prefs.getBoolean("ai_consent_accepted", false)

    fun saveAiCoachEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("ai_coach_enabled", enabled).apply()
        _aiCoachEnabled.value = enabled
    }

    fun saveAiAnalysisMode(mode: String) {
        prefs.edit().putString("ai_analysis_mode", mode).apply()
        _aiAnalysisMode.value = mode
    }

    fun saveAiConsentAccepted(accepted: Boolean) {
        prefs.edit().putBoolean("ai_consent_accepted", accepted).apply()
        _aiConsentAccepted.value = accepted
    }

    // --- First Week Setup Checklist ---
    private val _setupProfileGoal = MutableStateFlow(getChecklistItemPref("setup_profile_goal"))
    val setupProfileGoal: StateFlow<Boolean> = _setupProfileGoal.asStateFlow()

    private val _connectAiCoach = MutableStateFlow(getChecklistItemPref("connect_ai_coach"))
    val connectAiCoach: StateFlow<Boolean> = _connectAiCoach.asStateFlow()

    private val _customLearningPath = MutableStateFlow(getChecklistItemPref("custom_learning_path"))
    val customLearningPath: StateFlow<Boolean> = _customLearningPath.asStateFlow()

    private val _dailyReflection = MutableStateFlow(getChecklistItemPref("daily_reflection"))
    val dailyReflection: StateFlow<Boolean> = _dailyReflection.asStateFlow()

    private val _firstTransaction = MutableStateFlow(getChecklistItemPref("first_transaction"))
    val firstTransaction: StateFlow<Boolean> = _firstTransaction.asStateFlow()

    private val _triggerReminder = MutableStateFlow(getChecklistItemPref("trigger_reminder"))
    val triggerReminder: StateFlow<Boolean> = _triggerReminder.asStateFlow()

    private val _exportBackup = MutableStateFlow(getChecklistItemPref("export_backup"))
    val exportBackup: StateFlow<Boolean> = _exportBackup.asStateFlow()

    private fun getChecklistItemPref(key: String) = prefs.getBoolean("checklist_$key", false)

    fun saveChecklistItem(key: String, completed: Boolean) {
        prefs.edit().putBoolean("checklist_$key", completed).apply()
        when (key) {
            "setup_profile_goal" -> _setupProfileGoal.value = completed
            "connect_ai_coach" -> _connectAiCoach.value = completed
            "custom_learning_path" -> _customLearningPath.value = completed
            "daily_reflection" -> _dailyReflection.value = completed
            "first_transaction" -> _firstTransaction.value = completed
            "trigger_reminder" -> _triggerReminder.value = completed
            "export_backup" -> _exportBackup.value = completed
        }
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
        saveAiCoachEnabled(false)
        saveAiAnalysisMode("local")
        saveAiConsentAccepted(false)
        saveAppLanguage("system")
        saveGeneratedContentLanguage("follow")
        saveChecklistItem("setup_profile_goal", false)
        saveChecklistItem("connect_ai_coach", false)
        saveChecklistItem("custom_learning_path", false)
        saveChecklistItem("daily_reflection", false)
        saveChecklistItem("first_transaction", false)
        saveChecklistItem("trigger_reminder", false)
        saveChecklistItem("export_backup", false)
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
