package com.example.data.ai

import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class AiCoachResult(
    val summary: String,
    val score: Int,
    val strengths: List<String>,
    val weaknesses: List<String>,
    val suggestions: List<String>,
    val priorities: List<String>,
    val riskToAvoid: String,
    val isLocalFallback: Boolean = false,
    val timestamp: Long = System.currentTimeMillis(),
    val fallbackReason: String? = null
)

interface AiCoachService {
    suspend fun generateJournalAnalysis(
        whatIDid: String,
        whatWentWell: String,
        whatToImprove: String,
        tomorrowPriorities: String,
        metrics: Map<String, Any>
    ): AiCoachResult

    suspend fun generateWeeklyAnalysis(
        metrics: Map<String, Any>
    ): AiCoachResult

    suspend fun generateMonthlyAnalysis(
        metrics: Map<String, Any>
    ): AiCoachResult
}

class LocalCoachService : AiCoachService {
    override suspend fun generateJournalAnalysis(
        whatIDid: String,
        whatWentWell: String,
        whatToImprove: String,
        tomorrowPriorities: String,
        metrics: Map<String, Any>
    ): AiCoachResult = withContext(Dispatchers.Default) {
        val totalTasks = metrics["totalTasks"] as? Int ?: 0
        val completedTasks = metrics["completedTasks"] as? Int ?: 0
        val completionRate = if (totalTasks > 0) completedTasks.toDouble() / totalTasks else 1.0
        val spentToday = metrics["spentToday"] as? Double ?: 0.0
        val studyMinutes = metrics["studyMinutes"] as? Int ?: 0
        val studyTarget = metrics["studyTarget"] as? Int ?: 60

        var calculatedScore = (completionRate * 5).toInt()
        if (spentToday == 0.0) calculatedScore += 3 else if (spentToday < 30) calculatedScore += 2 else if (spentToday < 100) calculatedScore += 1
        if (whatIDid.isNotBlank()) calculatedScore += 2
        val score = calculatedScore.coerceIn(1, 10)

        val summary = when {
            score >= 9 -> "You achieved exceptional productivity and mental clarity today. Your tasks were executed with precision, and you maintained solid self-regulation."
            score >= 7 -> "Very solid day! You maintained strong task traction and consistent discipline across your growth categories."
            score >= 5 -> "A balanced day. While you made progress, certain bottlenecks or minor distractions left room for optimization."
            else -> "Today served as a recovery or low-focus day. Use this self-awareness to rest, reset, and approach tomorrow with renewed intent."
        }

        val strengthsList = mutableListOf<String>()
        if (whatWentWell.isNotBlank()) {
            whatWentWell.split("\n", "•").map { it.trim().removePrefix("-").trim() }.filter { it.isNotBlank() }.forEach {
                strengthsList.add(it)
            }
        }
        if (strengthsList.isEmpty()) {
            if (completionRate >= 0.7) strengthsList.add("Strong execution of scheduled daily tasks ($completedTasks/$totalTasks)")
            if (spentToday < 20.0) strengthsList.add("Excellent expenditure containment, keeping daily spending low")
            if (studyMinutes >= studyTarget) strengthsList.add("Met daily target of $studyMinutes study minutes")
            if (strengthsList.isEmpty()) strengthsList.add("Recorded daily self-reflection for persistent accountability")
        }

        val weaknessesList = mutableListOf<String>()
        if (whatToImprove.isNotBlank()) {
            whatToImprove.split("\n", "•").map { it.trim().removePrefix("-").trim() }.filter { it.isNotBlank() }.forEach {
                weaknessesList.add(it)
            }
        }
        if (weaknessesList.isEmpty()) {
            val pending = totalTasks - completedTasks
            if (pending > 0) weaknessesList.add("Left $pending daily tasks incomplete")
            if (spentToday > 80.0) weaknessesList.add("Elevated daily spending of RM ${String.format(Locale.US, "%.2f", spentToday)}")
            if (studyMinutes < studyTarget) weaknessesList.add("Missed target study duration by ${studyTarget - studyMinutes} minutes")
            if (weaknessesList.isEmpty()) weaknessesList.add("Identified routine gaps that leave potential for minor delays")
        }

        val prioritiesList = mutableListOf<String>()
        if (tomorrowPriorities.isNotBlank()) {
            tomorrowPriorities.split("\n", "•").map { it.trim().removePrefix("-").trim() }.filter { it.isNotBlank() }.forEach {
                prioritiesList.add(it)
            }
        }
        if (prioritiesList.isEmpty()) {
            prioritiesList.add("Execute key discipline module or daily study lesson")
            prioritiesList.add("Maintain localized ledger monitoring and savings goal focus")
            prioritiesList.add("Recalibrate incomplete high-priority tasks first thing in the morning")
        }

        val suggestionsList = listOf(
            "Begin your day by tackling the single most difficult priority (the 'One-Task' rule) before opening notifications.",
            "Chunk your study sessions into focused 25-minute blocks using Pomodoro to beat starting friction.",
            "Ensure you allocate at least 15 minutes of recovery between screen-heavy study logs."
        )

        val riskToAvoid = when {
            spentToday > 100.0 -> "Impulse-spending trigger: Avoid retail applications or shopping districts tomorrow to offset today's ledger."
            completionRate < 0.5 -> "Task backlog risk: Do not schedule more than 3 tasks tomorrow to prevent piling up outstanding items."
            else -> "Routine burnout risk: Do not trade essential sleep or hydration blocks for hyper-productivity. Keep it balanced."
        }

        AiCoachResult(
            summary = summary,
            score = score,
            strengths = strengthsList,
            weaknesses = weaknessesList,
            suggestions = suggestionsList,
            priorities = prioritiesList,
            riskToAvoid = riskToAvoid,
            isLocalFallback = true
        )
    }

    override suspend fun generateWeeklyAnalysis(metrics: Map<String, Any>): AiCoachResult = withContext(Dispatchers.Default) {
        val totalTasks = metrics["totalTasks"] as? Int ?: 0
        val completedTasks = metrics["completedTasks"] as? Int ?: 0
        val completionRate = if (totalTasks > 0) completedTasks.toDouble() / totalTasks else 0.0
        val netSavings = metrics["netSavings"] as? Double ?: 0.0
        val journalCount = metrics["journalCount"] as? Int ?: 0
        val completedLessons = metrics["completedLessons"] as? Int ?: 0
        val bestCategory = metrics["bestCategory"] as? String ?: "None"
        val weakestArea = metrics["weakestArea"] as? String ?: "None"

        val score = ((completionRate * 5) + (if (netSavings >= 0) 3.0 else 1.0) + (if (journalCount >= 3) 2.0 else 1.0)).toInt().coerceIn(1, 10)

        val summary = "Weekly retrospective shows a completion rate of ${(completionRate * 100).toInt()}% across $totalTasks tasks, with a financial net position of RM ${String.format(Locale.US, "%.2f", netSavings)} and $journalCount active journal logs."

        val strengths = mutableListOf<String>()
        if (completionRate >= 0.7) strengths.add("Strong task velocity: Completed $completedTasks tasks.")
        if (netSavings > 0) strengths.add("Positive cash flow: Capitalized on RM ${String.format(Locale.US, "%.2f", netSavings)} savings.")
        if (completedLessons > 0) strengths.add("Continued educational discipline: Cleared $completedLessons lessons.")
        if (journalCount >= 3) strengths.add("Mindful compliance: Consistent end-of-day auditing ($journalCount entries).")
        if (strengths.isEmpty()) strengths.add("Successfully compiled weekly metric aggregates for review.")

        val weaknesses = mutableListOf<String>()
        if (completionRate < 0.6) weaknesses.add("Low task completion rate (${(completionRate * 100).toInt()}%). Check task scoping.")
        if (netSavings < 0) weaknesses.add("Financial deficit this week. Capital outflows exceeded incoming reserves.")
        if (journalCount < 3) weaknesses.add("Irregular mindfulness logging. Only $journalCount entries tracked.")
        if (completedLessons == 0) weaknesses.add("Academic stagnation: Zero study lessons completed.")
        if (weaknesses.isEmpty()) weaknesses.add("Minor bottlenecks identified in category: $weakestArea.")

        val suggestions = listOf(
            "Dedicate 10 minutes every Sunday night to map out your high-priority items for the upcoming week.",
            "Establish a daily automated reminder at 9 PM to capture your mindfulness reflection entries.",
            "Implement a 'No Spend' day mid-week to naturally compress discretionary overhead."
        )

        val priorities = listOf(
            "Reinforce routines in your best-performing category ($bestCategory)",
            "Address core deficiencies identified in weakest area ($weakestArea)",
            "Re-establish saving thresholds to restore positive cash flow"
        )

        AiCoachResult(
            summary = summary,
            score = score,
            strengths = strengths,
            weaknesses = weaknesses,
            suggestions = suggestions,
            priorities = priorities,
            riskToAvoid = "Avoid the temptation to start next week with double the task load. Over-planning is the primary cause of week-over-week burnout.",
            isLocalFallback = true
        )
    }

    override suspend fun generateMonthlyAnalysis(metrics: Map<String, Any>): AiCoachResult = withContext(Dispatchers.Default) {
        val totalTasks = metrics["totalTasks"] as? Int ?: 0
        val completedTasks = metrics["completedTasks"] as? Int ?: 0
        val completionRate = if (totalTasks > 0) completedTasks.toDouble() / totalTasks else 0.0
        val netSavings = metrics["netSavings"] as? Double ?: 0.0
        val journalCount = metrics["journalCount"] as? Int ?: 0
        val completedLessons = metrics["completedLessons"] as? Int ?: 0
        val averageDailySpending = metrics["averageDailySpending"] as? Double ?: 0.0
        val mostExpensiveCategory = metrics["mostExpensiveCategory"] as? String ?: "None"
        val bestCategory = metrics["bestCategory"] as? String ?: "None"
        val weakestCategory = metrics["weakestCategory"] as? String ?: "None"

        val score = ((completionRate * 4) + (if (netSavings >= 0) 3.0 else 1.0) + (if (journalCount >= 12) 3.0 else 1.5)).toInt().coerceIn(1, 10)

        val summary = "30-day comprehensive audit compiled. Your task velocity finished at ${(completionRate * 100).toInt()}% ($completedTasks/$totalTasks completed). Financial accounts recorded RM ${String.format(Locale.US, "%.2f", netSavings)} net savings with RM ${String.format(Locale.US, "%.2f", averageDailySpending)} average daily spend."

        val strengths = mutableListOf<String>()
        if (completionRate >= 0.7) strengths.add("Highly consistent execution in $bestCategory category.")
        if (netSavings > 0) strengths.add("Healthy financial standing with RM ${String.format(Locale.US, "%.2f", netSavings)} retained.")
        if (completedLessons >= 5) strengths.add("Substantial professional capability expansion ($completedLessons lessons completed).")
        if (journalCount >= 15) strengths.add("Exceptional self-awareness and diary routine adherence.")
        if (strengths.isEmpty()) strengths.add("Maintained active tracking of life vectors across the month.")

        val weaknesses = mutableListOf<String>()
        if (completionRate < 0.6) weaknesses.add("Task bottlenecks present. Core progress was slow in $weakestCategory.")
        if (netSavings < 0) weaknesses.add("Negative monthly reserve position. Urgent ledger adjustment needed.")
        if (averageDailySpending > 50.0) weaknesses.add("Elevated average daily spend. Peak expense category was $mostExpensiveCategory.")
        if (journalCount < 10) weaknesses.add("Deficit in self-reflection consistency ($journalCount/30 logs).")
        if (weaknesses.isEmpty()) weaknesses.add("Minor friction found in $weakestCategory tasks.")

        val suggestions = listOf(
            "Analyze the root cause of high spending in $mostExpensiveCategory and impose a hard budget cap next month.",
            "Re-prioritize the learning paths to ensure you progress at least 1 lesson every three days.",
            "Review your morning schedule to safeguard study blocks from administrative interruptions."
        )

        val priorities = listOf(
            "Stabilize operational output in $weakestCategory",
            "Optimize budget allocation to compress outflows in $mostExpensiveCategory",
            "Sustain momentum in high-performing sector ($bestCategory)",
            "Automate recurring transactions tracking inside the ledger module",
            "Establish solid weekly checkpoints next month to catch slip-ups early"
        )

        AiCoachResult(
            summary = summary,
            score = score,
            strengths = strengths,
            weaknesses = weaknesses,
            suggestions = suggestions,
            priorities = priorities,
            riskToAvoid = "Subscription bloat and task-creep. Keep your next monthly goal list short, action-focused, and restricted to two primary domains.",
            isLocalFallback = true
        )
    }
}

class GeminiCoachService(
    private val localFallback: LocalCoachService
) : AiCoachService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val mediaType = "application/json; charset=utf-8".toMediaType()

    private fun getApiKey(): String {
        return try {
            com.example.BuildConfig.GEMINI_API_KEY
        } catch (e: Exception) {
            ""
        }
    }

    private fun isKeyInvalid(key: String): Boolean {
        return key.isBlank() || key == "MY_GEMINI_API_KEY" || key.contains("PLACEHOLDER")
    }

    private fun sanitizeText(input: String): String {
        var s = input.trim()
        if (s.length > 300) {
            s = s.take(297) + "..."
        }
        val forbiddenPatterns = listOf(
            "suicide" to "emotional recovery",
            "depression" to "low focus",
            "therapy" to "mindful reflection",
            "prescribe" to "recommend routine adjustment",
            "medication" to "habit cycle",
            "diagnose" to "assess",
            "doctor" to "productivity coach",
            "invest" to "allocate",
            "stocks" to "resources",
            "crypto" to "savings",
            "legal" to "standard",
            "lawyer" to "advisor"
        )
        for ((pattern, replacement) in forbiddenPatterns) {
            s = s.replace("(?i)\\b$pattern\\b".toRegex(), replacement)
        }
        return s
    }

    private fun sanitizeListItem(input: String): String {
        var s = input.trim()
        if (s.length > 150) {
            s = s.take(147) + "..."
        }
        val forbiddenPatterns = listOf(
            "suicide" to "emotional recovery",
            "depression" to "low focus",
            "therapy" to "mindful reflection",
            "prescribe" to "recommend routine adjustment",
            "medication" to "habit cycle",
            "diagnose" to "assess",
            "doctor" to "productivity coach",
            "invest" to "allocate",
            "stocks" to "resources",
            "crypto" to "savings",
            "legal" to "standard",
            "lawyer" to "advisor"
        )
        for ((pattern, replacement) in forbiddenPatterns) {
            s = s.replace("(?i)\\b$pattern\\b".toRegex(), replacement)
        }
        return s
    }

    private fun getFriendlyErrorMessage(e: Throwable): String {
        return when (e) {
            is java.net.UnknownHostException -> "No internet connection. Please check your network."
            is java.net.SocketTimeoutException -> "Request timed out after 60 seconds."
            is java.io.IOException -> "Network error: ${e.localizedMessage}"
            is IllegalStateException -> e.message ?: "Invalid operational state."
            else -> e.localizedMessage ?: "Unknown API or parsing error."
        }
    }

    private fun parseResult(jsonStr: String): AiCoachResult {
        val clean = try {
            sanitizeJson(jsonStr)
        } catch (e: Exception) {
            throw IllegalArgumentException("Malformed response content: ${e.message}", e)
        }

        val obj = try {
            JSONObject(clean)
        } catch (e: Exception) {
            throw IllegalArgumentException("Response is not valid JSON: ${e.message}", e)
        }
        
        val summary = obj.optString("summary", "").trim()
        if (summary.isEmpty()) {
            throw IllegalArgumentException("Required field 'summary' is missing or empty in AI response.")
        }
        
        val score = obj.optInt("score", -1)
        if (score !in 1..10) {
            throw IllegalArgumentException("Score is missing or outside valid range 1-10: $score")
        }
        
        val strengths = mutableListOf<String>()
        obj.optJSONArray("strengths")?.let { arr ->
            for (i in 0 until arr.length()) {
                val item = arr.optString(i)
                if (item.isNotBlank()) {
                    strengths.add(sanitizeListItem(item))
                }
            }
        }
        if (strengths.isEmpty()) {
            strengths.add("Maintained active tracking of progress parameters.")
        }
        
        val weaknesses = mutableListOf<String>()
        obj.optJSONArray("weaknesses")?.let { arr ->
            for (i in 0 until arr.length()) {
                val item = arr.optString(i)
                if (item.isNotBlank()) {
                    weaknesses.add(sanitizeListItem(item))
                }
            }
        }
        if (weaknesses.isEmpty()) {
            weaknesses.add("Minor bottlenecks identified in daily growth routines.")
        }
        
        val suggestions = mutableListOf<String>()
        obj.optJSONArray("suggestions")?.let { arr ->
            for (i in 0 until arr.length()) {
                val item = arr.optString(i)
                if (item.isNotBlank()) {
                    suggestions.add(sanitizeListItem(item))
                }
            }
        }
        if (suggestions.isEmpty()) {
            suggestions.add("Analyze daily execution cycles and optimize focus intervals.")
        }
        
        val priorities = mutableListOf<String>()
        obj.optJSONArray("priorities")?.let { arr ->
            for (i in 0 until arr.length()) {
                val item = arr.optString(i)
                if (item.isNotBlank()) {
                    priorities.add(sanitizeListItem(item))
                }
            }
        }
        if (priorities.isEmpty()) {
            priorities.add("Continue executing your tailored local self-management schedule.")
        }
        
        val riskToAvoid = obj.optString("risk_to_avoid", "").trim()
        val finalRisk = if (riskToAvoid.isEmpty()) {
            "Burnout: Keep goals realistic and balanced."
        } else {
            sanitizeListItem(riskToAvoid)
        }
        
        return AiCoachResult(
            summary = sanitizeText(summary),
            score = score,
            strengths = strengths,
            weaknesses = weaknesses,
            suggestions = suggestions,
            priorities = priorities,
            riskToAvoid = finalRisk,
            isLocalFallback = false
        )
    }

    private fun sanitizeJson(raw: String): String {
        var s = raw.trim()
        if (s.startsWith("```json")) {
            s = s.substringAfter("```json")
        } else if (s.startsWith("```")) {
            s = s.substringAfter("```")
        }
        if (s.endsWith("```")) {
            s = s.substringBeforeLast("```")
        }
        s = s.trim()
        val firstBrace = s.indexOf('{')
        val lastBrace = s.lastIndexOf('}')
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            s = s.substring(firstBrace, lastBrace + 1)
        }
        return s
    }

    private suspend fun callGeminiApi(prompt: String, systemInstruction: String): String = withContext(Dispatchers.IO) {
        val apiKey = getApiKey()
        if (isKeyInvalid(apiKey)) {
            throw IllegalStateException("Missing or default Gemini API key configuration.")
        }

        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=$apiKey"

        val requestObj = JSONObject()
        
        val contentsArr = JSONArray()
        val contentObj = JSONObject()
        val partsArr = JSONArray()
        val partObj = JSONObject().apply {
            put("text", prompt)
        }
        partsArr.put(partObj)
        contentObj.put("parts", partsArr)
        contentsArr.put(contentObj)
        requestObj.put("contents", contentsArr)

        val systemInstructionObj = JSONObject().apply {
            val parts = JSONArray().put(JSONObject().put("text", systemInstruction))
            put("parts", parts)
        }
        requestObj.put("systemInstruction", systemInstructionObj)

        val configObj = JSONObject().apply {
            put("temperature", 0.3)
            put("responseMimeType", "application/json")
        }
        requestObj.put("generationConfig", configObj)

        val requestBody = requestObj.toString().toRequestBody(mediaType)
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val errorBody = response.body?.string() ?: "Empty body"
                throw IllegalStateException("API call failed with code ${response.code}: $errorBody")
            }
            val bodyString = response.body?.string() ?: throw IllegalStateException("Empty response body.")
            
            val responseObj = JSONObject(bodyString)
            val textResult = responseObj.getJSONArray("candidates")
                .getJSONObject(0)
                .getJSONObject("content")
                .getJSONArray("parts")
                .getJSONObject(0)
                .getString("text")
            
            textResult
        }
    }

    override suspend fun generateJournalAnalysis(
        whatIDid: String,
        whatWentWell: String,
        whatToImprove: String,
        tomorrowPriorities: String,
        metrics: Map<String, Any>
    ): AiCoachResult {
        return try {
            val systemInstruction = """
                You are Life Control's private, elite cognitive performance and habit coach.
                Your task is to analyze the user's daily journal reflection and productivity metrics.
                You MUST return a JSON object with EXACTLY the following structure:
                {
                  "summary": "A concise, objective 2-3 sentence overview of their day's performance",
                  "score": Int (a number from 1 to 10 evaluating their discipline and output),
                  "strengths": ["bullet point 1", "bullet point 2"],
                  "weaknesses": ["bullet point 1", "bullet point 2"],
                  "suggestions": ["specific practical advice 1", "specific practical advice 2"],
                  "priorities": ["clear priority tomorrow 1", "clear priority tomorrow 2"],
                  "risk_to_avoid": "A single specific behavioral loop, trap, or burnout risk they must avoid tomorrow"
                }
                Provide rigorous, constructive, and highly actionable analysis. Do not add any text before or after the JSON.
                DO NOT provide any medical, legal, financial, or emergency advice. Give practical productivity suggestions only.
                Do not assume, include, or ask for any personal identifiers or private details.
            """.trimIndent()

            val prompt = """
                Analyze the following data:
                Journal Entries:
                - What I Did: $whatIDid
                - What Went Well: $whatWentWell
                - What Needs Improvement: $whatToImprove
                - Tomorrow's Priorities: $tomorrowPriorities
                
                Metrics Today:
                - Scheduled Tasks: ${metrics["totalTasks"]}
                - Completed Tasks: ${metrics["completedTasks"]}
                - Spent money: RM ${metrics["spentToday"]}
                - Study duration: ${metrics["studyMinutes"]} minutes (Target: ${metrics["studyTarget"]} min)
            """.trimIndent()

            val jsonResponse = callGeminiApi(prompt, systemInstruction)
            parseResult(jsonResponse)
        } catch (e: Exception) {
            Log.e("GeminiCoachService", "Failed to generate journal analysis, falling back to Local", e)
            val fallback = localFallback.generateJournalAnalysis(whatIDid, whatWentWell, whatToImprove, tomorrowPriorities, metrics)
            fallback.copy(fallbackReason = getFriendlyErrorMessage(e))
        }
    }

    override suspend fun generateWeeklyAnalysis(metrics: Map<String, Any>): AiCoachResult {
        return try {
            val systemInstruction = """
                You are Life Control's private, elite cognitive performance and habit coach.
                Your task is to analyze the user's weekly retrospective aggregates.
                You MUST return a JSON object with EXACTLY the following structure:
                {
                  "summary": "A high-level 2-3 sentence analysis of their weekly trajectory, highlighting discipline vectors.",
                  "score": Int (a number from 1 to 10 representing overall weekly compliance),
                  "strengths": ["weekly strength 1", "weekly strength 2"],
                  "weaknesses": ["weekly bottleneck 1", "weekly bottleneck 2"],
                  "suggestions": ["strategic suggestion 1", "strategic suggestion 2"],
                  "priorities": ["focus priority next week 1", "focus priority next week 2"],
                  "risk_to_avoid": "A specific warning or burnout risk for the upcoming week based on current patterns"
                }
                Provide rigorous, constructive, and highly actionable analysis. Do not add any text before or after the JSON.
                DO NOT provide any medical, legal, financial, or emergency advice. Give practical productivity suggestions only.
                Do not assume, include, or ask for any personal identifiers or private details.
            """.trimIndent()

            val prompt = """
                Analyze the following weekly aggregates (last 7 days):
                - Total tasks scheduled: ${metrics["totalTasks"]}
                - Completed tasks: ${metrics["completedTasks"]}
                - Weekly financial net position: RM ${metrics["netSavings"]}
                - Study lessons completed: ${metrics["completedLessons"]}
                - Mindful journal reflections completed: ${metrics["journalCount"]}
                - Best performing task category: ${metrics["bestCategory"]}
                - Weakest task category/area: ${metrics["weakestArea"]}
            """.trimIndent()

            val jsonResponse = callGeminiApi(prompt, systemInstruction)
            parseResult(jsonResponse)
        } catch (e: Exception) {
            Log.e("GeminiCoachService", "Failed to generate weekly analysis, falling back to Local", e)
            val fallback = localFallback.generateWeeklyAnalysis(metrics)
            fallback.copy(fallbackReason = getFriendlyErrorMessage(e))
        }
    }

    override suspend fun generateMonthlyAnalysis(metrics: Map<String, Any>): AiCoachResult {
        return try {
            val systemInstruction = """
                You are Life Control's private, elite cognitive performance and habit coach.
                Your task is to analyze the user's monthly retrospective aggregates.
                You MUST return a JSON object with EXACTLY the following structure:
                {
                  "summary": "A definitive, high-impact 3-sentence monthly growth audit and behavioral assessment.",
                  "score": Int (a number from 1 to 10 evaluating monthly execution velocity),
                  "strengths": ["monthly achievement vector 1", "monthly achievement vector 2"],
                  "weaknesses": ["monthly friction area 1", "monthly friction area 2"],
                  "suggestions": ["high-level strategic advice 1", "high-level strategic advice 2"],
                  "priorities": ["transformational focus next month 1", "transformational focus next month 2"],
                  "risk_to_avoid": "A key warning or bottleneck trap they must actively avoid next month"
                }
                Provide rigorous, constructive, and highly actionable analysis. Do not add any text before or after the JSON.
                DO NOT provide any medical, legal, financial, or emergency advice. Give practical productivity suggestions only.
                Do not assume, include, or ask for any personal identifiers or private details.
            """.trimIndent()

            val prompt = """
                Analyze the following monthly aggregates (last 30 days):
                - Total tasks scheduled: ${metrics["totalTasks"]}
                - Completed tasks: ${metrics["completedTasks"]}
                - Net savings surplus: RM ${metrics["netSavings"]}
                - Average daily expenditures: RM ${metrics["averageDailySpending"]}
                - Peak expense category: ${metrics["mostExpensiveCategory"]}
                - Most consistent learning path: ${metrics["mostConsistentPath"]}
                - Study lessons completed: ${metrics["completedLessons"]}
                - Mindful journal reflections completed: ${metrics["journalCount"]}
                - Best task category: ${metrics["bestCategory"]}
                - Weakest task category: ${metrics["weakestCategory"]}
            """.trimIndent()

            val jsonResponse = callGeminiApi(prompt, systemInstruction)
            parseResult(jsonResponse)
        } catch (e: Exception) {
            Log.e("GeminiCoachService", "Failed to generate monthly analysis, falling back to Local", e)
            val fallback = localFallback.generateMonthlyAnalysis(metrics)
            fallback.copy(fallbackReason = getFriendlyErrorMessage(e))
        }
    }
}
