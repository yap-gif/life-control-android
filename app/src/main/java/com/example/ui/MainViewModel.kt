package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.room.withTransaction
import com.example.data.local.*
import com.example.data.repository.LifeControlRepository
import com.example.data.ai.AiCoachResult
import com.example.data.ai.AiCoachService
import com.example.data.ai.LocalCoachService
import com.example.data.ai.GeminiCoachService
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: LifeControlRepository = LifeControlRepository(
        LifeControlDatabase.getDatabase(application, viewModelScope).dao(),
        application
    )

    // --- Reminder States ---
    val reminderTasksEnabled = MutableStateFlow(false)
    val reminderTasksTime = MutableStateFlow("09:00")

    val reminderJournalEnabled = MutableStateFlow(false)
    val reminderJournalTime = MutableStateFlow("21:00")

    val reminderStudyEnabled = MutableStateFlow(false)
    val reminderStudyTime = MutableStateFlow("17:00")

    val reminderWeeklyEnabled = MutableStateFlow(false)
    val reminderWeeklyTime = MutableStateFlow("10:00")

    // --- AI Coach Services & Settings ---
    val localCoachService = LocalCoachService()
    val geminiCoachService = GeminiCoachService(localCoachService)

    val aiCoachEnabled = repository.aiCoachEnabled
    val aiAnalysisMode = repository.aiAnalysisMode
    val aiConsentAccepted = repository.aiConsentAccepted

    // --- First Week Setup Checklist ---
    val setupProfileGoal = repository.setupProfileGoal
    val connectAiCoach = repository.connectAiCoach
    val customLearningPath = repository.customLearningPath
    val dailyReflection = repository.dailyReflection
    val firstTransaction = repository.firstTransaction
    val triggerReminder = repository.triggerReminder
    val exportBackup = repository.exportBackup

    fun updateChecklistItem(key: String, completed: Boolean) {
        repository.saveChecklistItem(key, completed)
    }

    fun updateAiCoachEnabled(enabled: Boolean) {
        repository.saveAiCoachEnabled(enabled)
        if (enabled) {
            updateChecklistItem("connect_ai_coach", true)
        }
    }
    fun updateAiAnalysisMode(mode: String) = repository.saveAiAnalysisMode(mode)
    fun updateAiConsentAccepted(accepted: Boolean) = repository.saveAiConsentAccepted(accepted)

    sealed class AiState {
        object Idle : AiState()
        object Loading : AiState()
        data class Success(val result: com.example.data.ai.AiCoachResult) : AiState()
        data class Error(val errorMessage: String, val fallbackResult: com.example.data.ai.AiCoachResult?) : AiState()
    }

    val journalAiState = MutableStateFlow<AiState>(AiState.Idle)
    val weeklyAiState = MutableStateFlow<AiState>(AiState.Idle)
    val monthlyAiState = MutableStateFlow<AiState>(AiState.Idle)

    fun resetJournalAiState() { journalAiState.value = AiState.Idle }
    fun resetWeeklyAiState() { weeklyAiState.value = AiState.Idle }
    fun resetMonthlyAiState() { monthlyAiState.value = AiState.Idle }

    fun analyzeJournal(journal: JournalEntity?, metrics: Map<String, Any>) {
        viewModelScope.launch {
            journalAiState.value = AiState.Loading
            if (journal == null) {
                journalAiState.value = AiState.Error("Journal entry is empty.", null)
                return@launch
            }
            try {
                val serviceToUse = if (aiCoachEnabled.value && aiAnalysisMode.value == "gemini") geminiCoachService else localCoachService
                val result = serviceToUse.generateJournalAnalysis(
                    whatIDid = journal.whatIDid,
                    whatWentWell = journal.whatWentWell,
                    whatToImprove = journal.whatToImprove,
                    tomorrowPriorities = journal.tomorrowPriorities,
                    metrics = metrics
                )
                journalAiState.value = AiState.Success(result)
            } catch (e: Exception) {
                val localFallback = localCoachService.generateJournalAnalysis(
                    whatIDid = journal.whatIDid,
                    whatWentWell = journal.whatWentWell,
                    whatToImprove = journal.whatToImprove,
                    tomorrowPriorities = journal.tomorrowPriorities,
                    metrics = metrics
                )
                journalAiState.value = AiState.Error(e.localizedMessage ?: "Unknown error occurred.", localFallback)
            }
        }
    }

    fun analyzeWeekly(metrics: Map<String, Any>) {
        viewModelScope.launch {
            weeklyAiState.value = AiState.Loading
            try {
                val serviceToUse = if (aiCoachEnabled.value && aiAnalysisMode.value == "gemini") geminiCoachService else localCoachService
                val result = serviceToUse.generateWeeklyAnalysis(metrics)
                weeklyAiState.value = AiState.Success(result)
            } catch (e: Exception) {
                val localFallback = localCoachService.generateWeeklyAnalysis(metrics)
                weeklyAiState.value = AiState.Error(e.localizedMessage ?: "Unknown error occurred.", localFallback)
            }
        }
    }

    fun analyzeMonthly(metrics: Map<String, Any>) {
        viewModelScope.launch {
            monthlyAiState.value = AiState.Loading
            try {
                val serviceToUse = if (aiCoachEnabled.value && aiAnalysisMode.value == "gemini") geminiCoachService else localCoachService
                val result = serviceToUse.generateMonthlyAnalysis(metrics)
                monthlyAiState.value = AiState.Success(result)
            } catch (e: Exception) {
                val localFallback = localCoachService.generateMonthlyAnalysis(metrics)
                monthlyAiState.value = AiState.Error(e.localizedMessage ?: "Unknown error occurred.", localFallback)
            }
        }
    }

    init {
        // Load reminder preferences
        reminderTasksEnabled.value = repository.getReminderEnabled("reminder_tasks_enabled", false)
        reminderTasksTime.value = repository.getReminderTime("reminder_tasks_time", "09:00")
        reminderJournalEnabled.value = repository.getReminderEnabled("reminder_journal_enabled", false)
        reminderJournalTime.value = repository.getReminderTime("reminder_journal_time", "21:00")
        reminderStudyEnabled.value = repository.getReminderEnabled("reminder_study_enabled", false)
        reminderStudyTime.value = repository.getReminderTime("reminder_study_time", "17:00")
        reminderWeeklyEnabled.value = repository.getReminderEnabled("reminder_weekly_enabled", false)
        reminderWeeklyTime.value = repository.getReminderTime("reminder_weekly_time", "10:00")

        // Schedule reminders
        com.example.data.receiver.ReminderManager.scheduleAll(application)
    }

    fun setReminderEnabled(type: String, enabled: Boolean) {
        val key = "reminder_${type}_enabled"
        repository.saveReminderEnabled(key, enabled)
        when (type) {
            "tasks" -> reminderTasksEnabled.value = enabled
            "journal" -> reminderJournalEnabled.value = enabled
            "study" -> reminderStudyEnabled.value = enabled
            "weekly" -> reminderWeeklyEnabled.value = enabled
        }
        if (enabled) {
            updateChecklistItem("trigger_reminder", true)
        }
        com.example.data.receiver.ReminderManager.scheduleAll(getApplication())
    }

    fun setReminderTime(type: String, time: String) {
        val key = "reminder_${type}_time"
        repository.saveReminderTime(key, time)
        when (type) {
            "tasks" -> reminderTasksTime.value = time
            "journal" -> reminderJournalTime.value = time
            "study" -> reminderStudyTime.value = time
            "weekly" -> reminderWeeklyTime.value = time
        }
        com.example.data.receiver.ReminderManager.scheduleAll(getApplication())
    }

    // --- State Exposing ---
    val tasks: StateFlow<List<TaskEntity>> = repository.allTasks
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val transactions: StateFlow<List<TransactionEntity>> = repository.allTransactions
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val learningPaths: StateFlow<List<LearningPathEntity>> = repository.allLearningPaths
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val journalReflections: StateFlow<List<JournalEntity>> = repository.allJournalReflections
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allLessons: StateFlow<List<LessonEntity>> = repository.allLessons
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // --- Settings Preferences ---
    val mainLifeGoal = repository.mainLifeGoal
    val monthlyIncomeTarget = repository.monthlyIncomeTarget
    val savingsGoal = repository.savingsGoal
    val dailyStudyTargetMinutes = repository.dailyStudyTargetMinutes

    // --- Today's Date Utility ---
    fun getTodayDateString(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    fun getTodayDisplayDate(): String {
        return SimpleDateFormat("EEEE, MMMM dd, yyyy", Locale.getDefault()).format(Date())
    }

    // --- Task Operations ---
    fun addTask(title: String, category: String, priority: String, dueDate: String) {
        viewModelScope.launch {
            repository.insertTask(
                TaskEntity(
                    title = title,
                    category = category,
                    priority = priority,
                    dueDate = dueDate,
                    isCompleted = false
                )
            )
        }
    }

    fun saveTask(task: TaskEntity) {
        viewModelScope.launch {
            repository.insertTask(task)
        }
    }

    fun toggleTaskCompletion(id: Int, isCompleted: Boolean) {
        viewModelScope.launch {
            repository.updateTaskStatus(id, isCompleted)
        }
    }

    fun deleteTask(task: TaskEntity) {
        viewModelScope.launch {
            repository.deleteTask(task)
        }
    }

    // --- Transaction Operations ---
    fun addTransaction(amount: Double, type: String, category: String, note: String, date: String) {
        viewModelScope.launch {
            repository.insertTransaction(
                TransactionEntity(
                    amount = amount,
                    type = type,
                    category = category,
                    note = note,
                    date = date
                )
            )
            updateChecklistItem("first_transaction", true)
        }
    }

    fun deleteTransaction(transaction: TransactionEntity) {
        viewModelScope.launch {
            repository.deleteTransaction(transaction)
        }
    }

    // --- Learning Paths & Lesson Operations ---
    fun getLessonsForPath(pathId: Int): Flow<List<LessonEntity>> {
        return repository.getLessonsForPath(pathId)
    }

    fun addLesson(pathId: Int, title: String) {
        viewModelScope.launch {
            repository.insertLesson(
                LessonEntity(
                    pathId = pathId,
                    title = title,
                    isCompleted = false
                )
            )
            updateChecklistItem("custom_learning_path", true)
            // Increment/Update path last studied or keep streak updated if needed
            updatePathStreakIfNeeded(pathId)
        }
    }

    fun toggleLessonCompletion(lessonId: Int, pathId: Int, isCompleted: Boolean) {
        viewModelScope.launch {
            repository.updateLessonStatus(lessonId, isCompleted)
            if (isCompleted) {
                updatePathStreakIfNeeded(pathId)
            }
        }
    }

    fun deleteLesson(lesson: LessonEntity) {
        viewModelScope.launch {
            repository.deleteLesson(lesson)
        }
    }

    private suspend fun updatePathStreakIfNeeded(pathId: Int) {
        val path = repository.allLearningPaths.firstOrNull()?.find { it.id == pathId } ?: return
        val today = getTodayDateString()
        if (path.lastStudiedDate != today) {
            val currentStreak = path.streak
            val newStreak = if (path.lastStudiedDate == getYesterdayDateString()) {
                currentStreak + 1
            } else {
                1
            }
            repository.updateLearningPath(
                path.copy(streak = newStreak, lastStudiedDate = today)
            )
        }
    }

    private fun getYesterdayDateString(): String {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DATE, -1)
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time)
    }

    // --- Reflection / Journal Operations ---
    fun saveReflection(whatIDid: String, whatWentWell: String, whatToImprove: String, tomorrowPriorities: String) {
        viewModelScope.launch {
            repository.insertJournalReflection(
                JournalEntity(
                    date = getTodayDateString(),
                    whatIDid = whatIDid,
                    whatWentWell = whatWentWell,
                    whatToImprove = whatToImprove,
                    tomorrowPriorities = tomorrowPriorities
                )
            )
            updateChecklistItem("daily_reflection", true)
        }
    }

    // --- Settings Savers ---
    fun updateMainLifeGoal(goal: String) {
        repository.saveMainLifeGoal(goal)
        if (goal.isNotBlank()) {
            updateChecklistItem("setup_profile_goal", true)
        }
    }
    fun updateMonthlyIncomeTarget(target: Double) = repository.saveMonthlyIncomeTarget(target)
    fun updateSavingsGoal(goal: Double) = repository.saveSavingsGoal(goal)
    fun updateDailyStudyTargetMinutes(minutes: Int) = repository.saveDailyStudyTargetMinutes(minutes)

    val onboardingCompleted = repository.onboardingCompleted
    val screenshotModeEnabled = repository.screenshotModeEnabled

    fun updateOnboardingCompleted(completed: Boolean) {
        repository.saveOnboardingCompleted(completed)
    }

    fun updateScreenshotModeEnabled(enabled: Boolean) {
        repository.saveScreenshotModeEnabled(enabled)
    }


    // --- Advanced Mock Analysis Local Generation ---
    fun generateLocalAnalysis(journal: JournalEntity?): MockAnalysis {
        val todayTasks = tasks.value.filter { it.dueDate == getTodayDateString() }
        val completedTodayTasks = todayTasks.count { it.isCompleted }
        val completionRate = if (todayTasks.isNotEmpty()) {
            completedTodayTasks.toDouble() / todayTasks.size
        } else {
            1.0
        }

        val spentToday = transactions.value
            .filter { it.date == getTodayDateString() && it.type == "expense" }
            .sumOf { it.amount }

        val studyTimeMinutes = dailyStudyTargetMinutes.value

        // Productivity Score calculation: Tasks (max 5) + Spending (max 3) + Journal complete (max 2)
        var score = (completionRate * 5).toInt()
        if (spentToday == 0.0) score += 3 else if (spentToday < 30) score += 2 else if (spentToday < 100) score += 1
        if (journal != null && journal.whatIDid.isNotBlank()) score += 2

        score = score.coerceIn(1, 10)

        val summary = when {
            score >= 9 -> "You had an exceptionally structured and productive day. Your task management was impeccable, and your discipline shines through."
            score >= 7 -> "Very solid day! You made consistent progress on your goals and maintained healthy habits across studies and life administration."
            score >= 5 -> "A balanced day, though there's some room for optimization. You completed several key tasks but encountered some distractions."
            else -> "Today was a recovery day. Use it to rest, reflect, and reset. Tomorrow is a brand new opportunity to seize control."
        }

        val suggestion = when {
            completionRate < 0.5 -> "Try chunking your larger projects into bite-sized 20-minute intervals. Getting over the starting friction is your main challenge."
            spentToday > 100.0 -> "Your daily spending is higher than average today. Review your monthly target of \$${monthlyIncomeTarget.value} and consider a 'no-spend' day tomorrow."
            else -> "Maintain this momentum! Balance your focused study blocks (target: ${studyTimeMinutes} min) with physical health blocks to prevent burnout."
        }

        val priorities = if (journal != null && journal.tomorrowPriorities.isNotBlank()) {
            journal.tomorrowPriorities.split("\n")
                .map { it.trim().removePrefix("-").trim() }
                .filter { it.isNotBlank() }
                .take(3)
        } else {
            emptyList()
        }

        val defaultPriorities = listOf(
            "Complete core daily learning path session",
            "Maintain financial discipline & track expenses",
            "Review and complete outstanding high-priority tasks"
        )

        val finalPriorities = if (priorities.size >= 3) priorities else (priorities + defaultPriorities).take(3)

        return MockAnalysis(
            summary = summary,
            productivityScore = score,
            practicalSuggestion = suggestion,
            topPriorities = finalPriorities
        )
    }

    // --- Backup & Restore (Moshi JSON format) ---
    fun getBackupJson(): String {
        updateChecklistItem("export_backup", true)
        val moshi = com.squareup.moshi.Moshi.Builder()
            .addLast(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
            .build()
        val adapter = moshi.adapter(com.example.data.repository.BackupContainer::class.java)

        val settingsMap = mapOf(
            "main_life_goal" to mainLifeGoal.value,
            "monthly_income_target" to monthlyIncomeTarget.value.toString(),
            "savings_goal" to savingsGoal.value.toString(),
            "daily_study_target_minutes" to dailyStudyTargetMinutes.value.toString(),
            "reminder_tasks_enabled" to reminderTasksEnabled.value.toString(),
            "reminder_tasks_time" to reminderTasksTime.value,
            "reminder_journal_enabled" to reminderJournalEnabled.value.toString(),
            "reminder_journal_time" to reminderJournalTime.value,
            "reminder_study_enabled" to reminderStudyEnabled.value.toString(),
            "reminder_study_time" to reminderStudyTime.value,
            "reminder_weekly_enabled" to reminderWeeklyEnabled.value.toString(),
            "reminder_weekly_time" to reminderWeeklyTime.value
        )

        val backupData = com.example.data.repository.BackupData(
            tasks = tasks.value,
            transactions = transactions.value,
            learningPaths = learningPaths.value,
            lessons = allLessons.value,
            journalEntries = journalReflections.value,
            settings = settingsMap
        )

        val appVersion = try {
            val pInfo = getApplication<Application>().packageManager.getPackageInfo(getApplication<Application>().packageName, 0)
            pInfo.versionName ?: "1.2.1"
        } catch (e: Exception) {
            "1.2.1"
        }

        val deviceInfo = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL} (Android ${android.os.Build.VERSION.RELEASE})"

        val container = com.example.data.repository.BackupContainer(
            backupVersion = 2,
            appVersion = appVersion,
            createdAt = System.currentTimeMillis(),
            deviceInfo = deviceInfo,
            data = backupData
        )

        return adapter.toJson(container)
    }

    suspend fun restoreFromJson(json: String): Boolean {
        return try {
            val moshi = com.squareup.moshi.Moshi.Builder()
                .addLast(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
                .build()

            var backupVersion = 1
            var backupData: com.example.data.repository.BackupData? = null

            // Try parsing new format (BackupContainer)
            try {
                val containerAdapter = moshi.adapter(com.example.data.repository.BackupContainer::class.java)
                val container = containerAdapter.fromJson(json)
                if (container != null) {
                    backupVersion = container.backupVersion
                    backupData = container.data
                }
            } catch (e: Exception) {
                // Not the new format, fallback to legacy
            }

            // Fallback to legacy
            if (backupData == null) {
                try {
                    val legacyAdapter = moshi.adapter(com.example.data.repository.BackupData::class.java)
                    backupData = legacyAdapter.fromJson(json)
                } catch (e: Exception) {
                    return false
                }
            }

            val data = backupData ?: return false

            // Validation check
            if (data.tasks == null && data.transactions == null && data.learningPaths == null && data.journalEntries == null) {
                return false
            }

            // Database restore inside a Room transaction to ensure atomicity
            val db = LifeControlDatabase.getDatabase(getApplication(), viewModelScope)
            db.withTransaction {
                // Clear tables first
                db.dao().deleteAllTasks()
                db.dao().deleteAllTransactions()
                db.dao().deleteAllLessons()
                db.dao().deleteAllLearningPaths()
                db.dao().deleteAllJournalReflections()

                // Insert records
                data.tasks?.forEach { db.dao().insertTask(it) }
                data.transactions?.forEach { db.dao().insertTransaction(it) }
                data.learningPaths?.forEach { db.dao().insertLearningPath(it) }
                data.lessons?.forEach { db.dao().insertLesson(it) }
                data.journalEntries?.forEach { db.dao().insertJournalReflection(it) }
            }

            // Restore settings
            data.settings?.let { settings ->
                settings["main_life_goal"]?.let { repository.saveMainLifeGoal(it) }
                settings["monthly_income_target"]?.toDoubleOrNull()?.let { repository.saveMonthlyIncomeTarget(it) }
                settings["savings_goal"]?.toDoubleOrNull()?.let { repository.saveSavingsGoal(it) }
                settings["daily_study_target_minutes"]?.toIntOrNull()?.let { repository.saveDailyStudyTargetMinutes(it) }

                settings["reminder_tasks_enabled"]?.toBooleanStrictOrNull()?.let { setReminderEnabled("tasks", it) }
                settings["reminder_tasks_time"]?.let { setReminderTime("tasks", it) }
                settings["reminder_journal_enabled"]?.toBooleanStrictOrNull()?.let { setReminderEnabled("journal", it) }
                settings["reminder_journal_time"]?.let { setReminderTime("journal", it) }
                settings["reminder_study_enabled"]?.toBooleanStrictOrNull()?.let { setReminderEnabled("study", it) }
                settings["reminder_study_time"]?.let { setReminderTime("study", it) }
                settings["reminder_weekly_enabled"]?.toBooleanStrictOrNull()?.let { setReminderEnabled("weekly", it) }
                settings["reminder_weekly_time"]?.let { setReminderTime("weekly", it) }
            }

            com.example.data.receiver.ReminderManager.scheduleAll(getApplication())
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    fun getEncryptedBackupJson(password: CharArray): String {
        updateChecklistItem("export_backup", true)
        val plainText = getBackupJson()
        val container = com.example.data.repository.BackupEncryption.encrypt(plainText, password)
        return com.example.data.repository.BackupEncryption.containerToJson(container)
    }

    fun decryptAndValidateBackup(encryptedJson: String, password: CharArray): Pair<String?, String?> {
        return try {
            if (encryptedJson.isBlank()) {
                return Pair(null, "Invalid backup: Backup file is empty.")
            }
            val container = com.example.data.repository.BackupEncryption.jsonToContainer(encryptedJson)
                ?: return Pair(null, "Invalid backup: File is not a valid JSON structure.")
            
            val validation = com.example.data.repository.BackupEncryption.validateContainer(container)
            if (!validation.first) {
                return Pair(null, validation.second ?: "Invalid encrypted backup container.")
            }
            
            val decryptedJson = try {
                com.example.data.repository.BackupEncryption.decrypt(container, password)
            } catch (e: javax.crypto.AEADBadTagException) {
                return Pair(null, "Incorrect password or corrupted data (decryption failure).")
            } catch (e: Exception) {
                return Pair(null, "Incorrect password or corrupted backup file.")
            }
            
            // Validate the decrypted JSON structure
            val moshi = com.squareup.moshi.Moshi.Builder()
                .addLast(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
                .build()
            
            var backupData: com.example.data.repository.BackupData? = null
            try {
                val containerAdapter = moshi.adapter(com.example.data.repository.BackupContainer::class.java)
                val parsedContainer = containerAdapter.fromJson(decryptedJson)
                if (parsedContainer != null) {
                    backupData = parsedContainer.data
                }
            } catch (e: Exception) {
                // Not the BackupContainer format, try raw BackupData
            }

            if (backupData == null) {
                try {
                    val legacyAdapter = moshi.adapter(com.example.data.repository.BackupData::class.java)
                    backupData = legacyAdapter.fromJson(decryptedJson)
                } catch (e: Exception) {
                    return Pair(null, "Restore failed: Decrypted backup JSON structure is invalid.")
                }
            }

            val data = backupData ?: return Pair(null, "Restore failed: Decrypted backup contains no valid data.")
            if (data.tasks == null && data.transactions == null && data.learningPaths == null && data.journalEntries == null) {
                return Pair(null, "Restore failed: Decrypted backup contains no valid records.")
            }
            
            Pair(decryptedJson, null)
        } catch (e: Exception) {
            Pair(null, "Validation failed: ${e.localizedMessage}")
        }
    }

    suspend fun restoreFromEncryptedJson(encryptedJson: String, password: CharArray): Pair<Boolean, String?> {
        val (decryptedJson, errorMsg) = decryptAndValidateBackup(encryptedJson, password)
        if (decryptedJson == null) {
            return Pair(false, errorMsg)
        }
        
        val success = restoreFromJson(decryptedJson)
        return if (success) {
            Pair(true, null)
        } else {
            Pair(false, "Restore failed: Atomic database restoration failed.")
        }
    }

    // --- Demo / Sample Data Mode ---
    fun insertDemoData(clearFirst: Boolean) {
        viewModelScope.launch {
            if (!clearFirst) {
                // Avoid duplicating sample data repeatedly by checking if a unique demo task already exists
                if (tasks.value.any { it.title == "Complete advanced networking labs" }) {
                    return@launch
                }
            }

            val db = LifeControlDatabase.getDatabase(getApplication(), viewModelScope)
            db.withTransaction {
                if (clearFirst) {
                    db.dao().deleteAllTasks()
                    db.dao().deleteAllTransactions()
                    db.dao().deleteAllLessons()
                    db.dao().deleteAllLearningPaths()
                    db.dao().deleteAllJournalReflections()
                }

                val today = getTodayDateString()
                val cal = Calendar.getInstance()

                // Insert demo tasks
                db.dao().insertTask(TaskEntity(title = "Complete advanced networking labs", category = "Study", priority = "High", dueDate = today, isCompleted = false))
                db.dao().insertTask(TaskEntity(title = "Dockerize localized security audit tool", category = "Personal Project", priority = "High", dueDate = today, isCompleted = false))
                db.dao().insertTask(TaskEntity(title = "Team status sync & logs review", category = "Work", priority = "Medium", dueDate = today, isCompleted = true))
                db.dao().insertTask(TaskEntity(title = "30-minute high-intensity cardio run", category = "Health", priority = "Low", dueDate = today, isCompleted = true))
                db.dao().insertTask(TaskEntity(title = "Pay water and internet utilities bills", category = "Life Admin", priority = "Low", dueDate = today, isCompleted = false))

                cal.add(Calendar.DATE, -1)
                val yesterday = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time)
                db.dao().insertTask(TaskEntity(title = "Read OWASP Mobile Top 10 vulnerabilities", category = "Study", priority = "Medium", dueDate = yesterday, isCompleted = true))
                db.dao().insertTask(TaskEntity(title = "Submit final weekly progress report", category = "Work", priority = "High", dueDate = yesterday, isCompleted = true))

                cal.add(Calendar.DATE, -1)
                val twoDaysAgo = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time)
                db.dao().insertTask(TaskEntity(title = "Meal prep and vitamin purchase", category = "Health", priority = "Low", dueDate = twoDaysAgo, isCompleted = true))

                // Insert learning paths & lessons
                val pathLinux = db.dao().insertLearningPath(LearningPathEntity(title = "Linux", streak = 5, lastStudiedDate = today)).toInt()
                val pathCyber = db.dao().insertLearningPath(LearningPathEntity(title = "Cybersecurity", streak = 3, lastStudiedDate = today)).toInt()
                val pathAndroid = db.dao().insertLearningPath(LearningPathEntity(title = "Android Development", streak = 7, lastStudiedDate = today)).toInt()
                val pathAI = db.dao().insertLearningPath(LearningPathEntity(title = "AI Tools", streak = 2, lastStudiedDate = yesterday)).toInt()

                // Linux Lessons
                db.dao().insertLesson(LessonEntity(pathId = pathLinux, title = "Understanding BASH scripting loops", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathLinux, title = "Mastering grep, sed, and awk commands", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathLinux, title = "Systemd service file creation", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathLinux, title = "Linux PAM configuration & security", isCompleted = false))

                // Cybersecurity Lessons
                db.dao().insertLesson(LessonEntity(pathId = pathCyber, title = "Network packets sniffing with Wireshark", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathCyber, title = "Metasploit framework exploitation steps", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathCyber, title = "Analyzing firewall logs & IPTables rules", isCompleted = false))
                db.dao().insertLesson(LessonEntity(pathId = pathCyber, title = "Social Engineering toolkit setup", isCompleted = false))

                // Android Development Lessons
                db.dao().insertLesson(LessonEntity(pathId = pathAndroid, title = "Kotlin Coroutines & Flow structured concurrency", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathAndroid, title = "Jetpack Compose state hoarding best practices", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathAndroid, title = "Room Database with pre-seeded migrations", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathAndroid, title = "Robolectric local JVM unit and integration tests", isCompleted = false))

                // AI Tools Lessons
                db.dao().insertLesson(LessonEntity(pathId = pathAI, title = "System instructions and few-shot formatting", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathAI, title = "Using Gemini Structured Outputs with JSON schema", isCompleted = true))
                db.dao().insertLesson(LessonEntity(pathId = pathAI, title = "Retrieval Augmented Generation (RAG) agent flow", isCompleted = false))

                // Insert transactions (past month and today)
                db.dao().insertTransaction(TransactionEntity(amount = 250.00, type = "income", category = "Freelance", note = "Landing page backend draft", date = today))
                db.dao().insertTransaction(TransactionEntity(amount = 12.50, type = "expense", category = "Food", note = "Chicken rice and iced tea", date = today))

                cal.setTime(Date())
                val datesList = mutableListOf<String>()
                for (i in 1..28) {
                    cal.add(Calendar.DATE, -1)
                    datesList.add(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time))
                }

                db.dao().insertTransaction(TransactionEntity(amount = 1200.00, type = "income", category = "Salary", note = "Part-time consulting retainer", date = datesList[2]))
                db.dao().insertTransaction(TransactionEntity(amount = 15.00, type = "expense", category = "Transport", note = "Bus and LRT fare", date = datesList[0]))
                db.dao().insertTransaction(TransactionEntity(amount = 45.00, type = "expense", category = "Food", note = "Dinner with colleagues", date = datesList[4]))
                db.dao().insertTransaction(TransactionEntity(amount = 99.00, type = "expense", category = "Education", note = "Online course platform fee", date = datesList[10]))
                db.dao().insertTransaction(TransactionEntity(amount = 35.00, type = "expense", category = "Tools", note = "API key and cloud credits", date = datesList[15]))
                db.dao().insertTransaction(TransactionEntity(amount = 300.00, type = "income", category = "Freelance", note = "Vulnerability assessment report", date = datesList[20]))
                db.dao().insertTransaction(TransactionEntity(amount = 18.00, type = "expense", category = "Personal", note = "Daily hygiene supplies", date = datesList[22]))
                db.dao().insertTransaction(TransactionEntity(amount = 50.00, type = "expense", category = "Other", note = "Minor emergency pharmacy run", date = datesList[25]))

                // Insert journal entries for reviews
                db.dao().insertJournalReflection(JournalEntity(
                    date = today,
                    whatIDid = "Worked on local Room migrations, completed card styling for the settings redesign, and ran standard Linux grep filters.",
                    whatWentWell = "The database transaction queries execute flawlessly with zero Main Thread blocks.",
                    whatToImprove = "Need to allocate more time to reading cybersecurity journals rather than just coding.",
                    tomorrowPriorities = "- Finish Docker file setup\n- Update backup restore scripts"
                ))
                db.dao().insertJournalReflection(JournalEntity(
                    date = datesList[0],
                    whatIDid = "Practiced OWASP Web security basics, completed 3 modules of prompt engineering, and logged spending.",
                    whatWentWell = "Kept daily spending below 20 RM.",
                    whatToImprove = "Procrastinated on the early morning run.",
                    tomorrowPriorities = "- 5km morning run\n- Complete CLI loops practice"
                ))
                db.dao().insertJournalReflection(JournalEntity(
                    date = datesList[1],
                    whatIDid = "Built standard Room models with KSP, tested with local JUnit, and practiced BASH scripting.",
                    whatWentWell = "High productivity flow, solved tricky SQL query issues quickly.",
                    whatToImprove = "Stayed up too late, leading to poor sleep quality.",
                    tomorrowPriorities = "- Sleep by 11:30 PM\n- Set up daily notification triggers"
                ))
            }

            // Save settings values
            repository.saveMainLifeGoal("Build discipline, financial independence, and useful software products.")
            repository.saveMonthlyIncomeTarget(1000.0)
            repository.saveSavingsGoal(3000.0)
            repository.saveDailyStudyTargetMinutes(120)
        }
    }

    fun clearAllDemoData() {
        viewModelScope.launch {
            repository.clearTasks()
            repository.clearTransactions()
            repository.clearLessons()
            repository.clearLearningPaths()
            repository.clearJournalReflections()
        }
    }

    // --- Advanced / Danger Zone Reset Operations ---
    fun clearTasksOnly() {
        viewModelScope.launch {
            repository.clearTasks()
        }
    }

    fun clearTransactionsOnly() {
        viewModelScope.launch {
            repository.clearTransactions()
        }
    }

    fun clearJournalsOnly() {
        viewModelScope.launch {
            repository.clearJournalReflections()
        }
    }

    fun clearLearningOnly() {
        viewModelScope.launch {
            repository.clearLessons()
            repository.clearLearningPaths()
        }
    }

    fun resetAllData() {
        viewModelScope.launch {
            repository.clearTasks()
            repository.clearTransactions()
            repository.clearLessons()
            repository.clearLearningPaths()
            repository.clearJournalReflections()
            repository.resetPreferencesToDefault()

            // Reset local flows
            reminderTasksEnabled.value = false
            reminderTasksTime.value = "09:00"
            reminderJournalEnabled.value = false
            reminderJournalTime.value = "21:00"
            reminderStudyEnabled.value = false
            reminderStudyTime.value = "17:00"
            reminderWeeklyEnabled.value = false
            reminderWeeklyTime.value = "10:00"

            repository.seedDefaultData()
            com.example.data.receiver.ReminderManager.scheduleAll(getApplication())
        }
    }
}

data class MockAnalysis(
    val summary: String,
    val productivityScore: Int,
    val practicalSuggestion: String,
    val topPriorities: List<String>
)
