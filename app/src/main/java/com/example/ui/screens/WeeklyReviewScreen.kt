package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel
import java.util.Locale

@Composable
fun WeeklyReviewScreen(
    viewModel: MainViewModel,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showConsentDialog by remember { mutableStateOf(false) }
    val tasks by viewModel.tasks.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val lessons by viewModel.allLessons.collectAsState()
    val journalReflections by viewModel.journalReflections.collectAsState()

    // Generate last 7 days dates (including today)
    val last7Days = remember {
        val list = mutableListOf<String>()
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val cal = java.util.Calendar.getInstance()
        for (i in 0..6) {
            list.add(sdf.format(cal.time))
            cal.add(java.util.Calendar.DATE, -1)
        }
        list
    }

    // Calculations for the last 7 days
    val tasksInLast7Days = tasks.filter { it.dueDate in last7Days }
    val totalTasksCreated = tasksInLast7Days.size
    val totalTasksCompleted = tasksInLast7Days.count { it.isCompleted }
    val taskCompletionPercentage = if (totalTasksCreated > 0) {
        (totalTasksCompleted.toFloat() / totalTasksCreated * 100).toInt()
    } else {
        0
    }

    val txsInLast7Days = transactions.filter { it.date in last7Days }
    val totalIncome = txsInLast7Days.filter { it.type == "income" }.sumOf { it.amount }
    val totalExpenses = txsInLast7Days.filter { it.type == "expense" }.sumOf { it.amount }
    val netSavings = totalIncome - totalExpenses

    // Lessons completed (overall or path-related, safely evaluated)
    val completedLessonsCount = lessons.count { it.isCompleted }

    // Journal entries written in last 7 days
    val journalCount = journalReflections.count { it.date in last7Days }

    // Best and Weakest Categories in last 7 days
    val taskCategories = tasksInLast7Days.groupBy { it.category }
    val categoryRates = taskCategories.mapValues { (_, list) ->
        val completed = list.count { it.isCompleted }
        completed.toDouble() / list.size
    }

    val bestCategory = if (categoryRates.isNotEmpty()) {
        val maxRate = categoryRates.maxByOrNull { it.value }
        if (maxRate != null && maxRate.value > 0.0) {
            "${maxRate.key} (${(maxRate.value * 100).toInt()}% completed)"
        } else {
            "None yet"
        }
    } else {
        "No tasks scheduled"
    }

    val weakestCategory = if (categoryRates.isNotEmpty()) {
        val minRate = categoryRates.minByOrNull { it.value }
        if (minRate != null && minRate.value < 1.0) {
            "${minRate.key} (${(minRate.value * 100).toInt()}% completed)"
        } else {
            "None (All 100% completed!)"
        }
    } else {
        "No tasks scheduled"
    }

    // Local summary text generation
    val weeklySummary = when {
        totalTasksCreated == 0 -> "An empty slate week. You did not schedule any tasks in the last 7 days. Setting clear, action-oriented daily goals is the first step to personal mastery."
        taskCompletionPercentage >= 75 -> "A stellar week of high productivity and self-mastery! You crushed $totalTasksCompleted of your $totalTasksCreated scheduled tasks ($taskCompletionPercentage%). Keep this exceptional standard going."
        taskCompletionPercentage >= 40 -> "A balanced week. You made consistent progress, completing $totalTasksCompleted tasks, but fell short on some. Focus on planning realistic daily workloads next week."
        else -> "A low productivity week. You completed just $totalTasksCompleted of $totalTasksCreated tasks. Reduce your daily scope next week to 1-2 critical tasks and rebuild your momentum."
    }

    val wentWell = remember(taskCompletionPercentage, netSavings, totalIncome, totalExpenses, completedLessonsCount, journalCount) {
        buildList {
            if (taskCompletionPercentage >= 60) {
                add("• Completed $totalTasksCompleted scheduled tasks with a solid $taskCompletionPercentage% completion rate.")
            }
            if (netSavings > 0) {
                add("• Maintained financial discipline with a positive net savings of RM ${String.format(Locale.US, "%.2f", netSavings)}.")
            } else if (totalIncome > 0 && totalExpenses == 0.0) {
                add("• Recorded RM ${String.format(Locale.US, "%.2f", totalIncome)} in income without incurring any expenses.")
            }
            if (completedLessonsCount > 0) {
                add("• Enriched your skill-set by completing $completedLessonsCount learning lessons.")
            }
            if (journalCount > 0) {
                add("• Maintained mindfulness by writing $journalCount daily reflections.")
            }
            if (isEmpty()) {
                add("• Kept track of your daily routine and maintained awareness of your life parameters.")
            }
        }.joinToString("\n")
    }

    val needsImprovement = remember(totalTasksCreated, totalTasksCompleted, netSavings, completedLessonsCount, journalCount) {
        buildList {
            val pendingTasks = totalTasksCreated - totalTasksCompleted
            if (pendingTasks > 0) {
                add("• Left $pendingTasks task${if (pendingTasks > 1) "s" else ""} incomplete. Ensure task descriptions are realistic and highly actionable.")
            }
            if (netSavings < 0) {
                add("• Financial deficit: Expenses exceeded income by RM ${String.format(Locale.US, "%.2f", kotlin.math.abs(netSavings))}. Review non-essential transactions.")
            }
            if (journalCount == 0) {
                add("• No journal reflections written. Recording daily reflections is critical for compound self-improvement.")
            }
            if (completedLessonsCount == 0) {
                add("• No lessons completed. Consistency is key to mastering cybersecurity and career paths.")
            }
            if (isEmpty()) {
                add("• Plan and log more tasks, studies, and finances next week to generate deeper insights.")
            }
        }.joinToString("\n")
    }

    val suggestedFocus = when {
        taskCompletionPercentage < 50 && totalTasksCreated > 0 -> "Commit to a 'One-Priority-Task' rule. Schedule exactly one high-impact task daily and finish it before moving to secondary goals."
        netSavings < 0 -> "Implement a 'No-Spend Week' or set a strict daily expense budget to restore financial equilibrium."
        completedLessonsCount == 0 -> "Schedule a dedicated 15-minute learning block every morning to consistently advance your learning paths."
        journalCount == 0 -> "Write just three sentences in your journal before bed. Reflect on what went well and what to optimize tomorrow."
        else -> "Maintain this excellent momentum! Increase the difficulty of your weekly learning goals or challenge yourself to increase savings by 10%."
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 4.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onNavigateBack,
                    modifier = Modifier.testTag("weekly_review_back_button")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Weekly Performance Review",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header Statement
            Text(
                text = "Last 7 Days Audit",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Statistics Overview Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = androidx.compose.foundation.BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "METRICS BREAKDOWN",
                        style = MaterialTheme.typography.labelLarge.copy(
                            letterSpacing = 1.2.sp,
                            fontWeight = FontWeight.Bold
                        ),
                        color = MaterialTheme.colorScheme.primary
                    )

                    // Task Completion Progress Row
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Task Completion Rate",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "$totalTasksCompleted of $totalTasksCreated done ($taskCompletionPercentage%)",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        LinearProgressIndicator(
                            progress = { taskCompletionPercentage.toFloat() / 100f },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)
                        )
                    }

                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    // Money Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "7-Day Income",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "RM ${String.format(Locale.US, "%.2f", totalIncome)}",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "7-Day Expenses",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "RM ${String.format(Locale.US, "%.2f", totalExpenses)}",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Net Savings",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "RM ${String.format(Locale.US, "%.2f", netSavings)}",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (netSavings >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                            )
                        }
                    }

                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    // Other Stats Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Completed Lessons",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "$completedLessonsCount lessons",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Reflections Logged",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "$journalCount entries",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }

                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    // Category Performance
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.TrendingUp, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                            Text(
                                text = "Best Performing Area:",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            text = bestCategory,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.TrendingDown, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                            Text(
                                text = "Weakest Area (Needs Focus):",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            text = weakestCategory,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            // --- AI Coach Section ---
            val aiCoachEnabled by viewModel.aiCoachEnabled.collectAsState()
            val aiConsentAccepted by viewModel.aiConsentAccepted.collectAsState()
            val weeklyAiState by viewModel.weeklyAiState.collectAsState()

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "AI Cognitive Coaching",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                if (aiCoachEnabled && aiConsentAccepted) {
                    Text(
                        text = "Consent Active",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = androidx.compose.foundation.BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Unlock smart, multi-dimensional diagnostics on your task consistency, spending behavior, and study parameters from the past 7 days.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Button(
                        onClick = {
                            val metrics = mapOf(
                                "totalTasks" to totalTasksCreated,
                                "completedTasks" to totalTasksCompleted,
                                "completionRate" to taskCompletionPercentage,
                                "totalIncome" to totalIncome,
                                "totalExpenses" to totalExpenses,
                                "netSavings" to netSavings,
                                "completedLessons" to completedLessonsCount,
                                "journalCount" to journalCount,
                                "bestCategory" to bestCategory,
                                "weakestCategory" to weakestCategory,
                                "weeklySummary" to weeklySummary,
                                "wentWell" to wentWell,
                                "needsImprovement" to needsImprovement,
                                "suggestedFocus" to suggestedFocus
                            )

                            if (aiCoachEnabled && !aiConsentAccepted) {
                                showConsentDialog = true
                            } else {
                                viewModel.analyzeWeekly(metrics)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("analyze_week_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Analyze Week with AI", fontWeight = FontWeight.Bold)
                    }
                }
            }

            // AI State renderer
            when (val state = weeklyAiState) {
                is MainViewModel.AiState.Idle -> {
                    // Do nothing
                }
                is MainViewModel.AiState.Loading -> {
                    Card(
                        modifier = Modifier.fillMaxWidth().testTag("ai_coach_loading_card"),
                        shape = RoundedCornerShape(24.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                            Text(
                                text = "AI Coach is diagnosing your week...",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
                is MainViewModel.AiState.Success -> {
                    AiResultCard(result = state.result, onDismiss = { viewModel.resetWeeklyAiState() })
                }
                is MainViewModel.AiState.Error -> {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    text = "AI Coaching Diagnosis Failed: ${state.errorMessage}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                                Text(
                                    text = "Showing local fallback diagnostics below. You can try the remote analysis again.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = {
                                        val metrics = mapOf(
                                            "totalTasks" to totalTasksCreated,
                                            "completedTasks" to totalTasksCompleted,
                                            "completionRate" to taskCompletionPercentage,
                                            "totalIncome" to totalIncome,
                                            "totalExpenses" to totalExpenses,
                                            "netSavings" to netSavings,
                                            "completedLessons" to completedLessonsCount,
                                            "journalCount" to journalCount,
                                            "bestCategory" to bestCategory,
                                            "weakestCategory" to weakestCategory,
                                            "weeklySummary" to weeklySummary,
                                            "wentWell" to wentWell,
                                            "needsImprovement" to needsImprovement,
                                            "suggestedFocus" to suggestedFocus
                                        )
                                        viewModel.analyzeWeekly(metrics)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                    modifier = Modifier.align(Alignment.End).testTag("retry_weekly_analysis_button")
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = "Retry", modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Retry Analysis", style = MaterialTheme.typography.labelMedium)
                                }
                            }
                        }
                        if (state.fallbackResult != null) {
                            AiResultCard(result = state.fallbackResult, onDismiss = { viewModel.resetWeeklyAiState() })
                        }
                    }
                }
            }

            // Offline Summary Title
            Text(
                text = "Performance Diagnostics",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
 
            // diagnostics sections
            DiagnosticSectionCard(
                title = "Weekly Summary",
                content = weeklySummary,
                icon = Icons.Default.Summarize,
                color = MaterialTheme.colorScheme.primary
            )
 
            DiagnosticSectionCard(
                title = "What Went Well",
                content = wentWell,
                icon = Icons.Default.ThumbUp,
                color = Color(0xFF4CAF50)
            )
 
            DiagnosticSectionCard(
                title = "What Needs Improvement",
                content = needsImprovement,
                icon = Icons.Default.Warning,
                color = MaterialTheme.colorScheme.error
            )
 
            DiagnosticSectionCard(
                title = "Suggested Focus for Next Week",
                content = suggestedFocus,
                icon = Icons.Default.Flag,
                color = MaterialTheme.colorScheme.secondary
            )
 
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    if (showConsentDialog) {
        AiConsentDialog(
            onDismiss = { showConsentDialog = false },
            onConfirm = {
                showConsentDialog = false
                viewModel.updateAiConsentAccepted(true)
                val metrics = mapOf(
                    "totalTasks" to totalTasksCreated,
                    "completedTasks" to totalTasksCompleted,
                    "completionRate" to taskCompletionPercentage,
                    "totalIncome" to totalIncome,
                    "totalExpenses" to totalExpenses,
                    "netSavings" to netSavings,
                    "completedLessons" to completedLessonsCount,
                    "journalCount" to journalCount,
                    "bestCategory" to bestCategory,
                    "weakestCategory" to weakestCategory,
                    "weeklySummary" to weeklySummary,
                    "wentWell" to wentWell,
                    "needsImprovement" to needsImprovement,
                    "suggestedFocus" to suggestedFocus
                )
                viewModel.analyzeWeekly(metrics)
            }
        )
    }
}

@Composable
fun DiagnosticSectionCard(
    title: String,
    content: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
        )
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = title.uppercase(Locale.US),
                    style = MaterialTheme.typography.labelLarge.copy(
                        letterSpacing = 1.2.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    color = color
                )
            }
            Text(
                text = content,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                lineHeight = 22.sp
            )
        }
    }
}
