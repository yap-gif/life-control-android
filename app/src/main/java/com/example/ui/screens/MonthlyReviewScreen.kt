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
fun MonthlyReviewScreen(
    viewModel: MainViewModel,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tasks by viewModel.tasks.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val lessons by viewModel.allLessons.collectAsState()
    val journalReflections by viewModel.journalReflections.collectAsState()
    val learningPaths by viewModel.learningPaths.collectAsState()

    val aiCoachEnabled by viewModel.aiCoachEnabled.collectAsState(initial = false)
    val aiConsentAccepted by viewModel.aiConsentAccepted.collectAsState(initial = false)
    val monthlyAiState by viewModel.monthlyAiState.collectAsState()
    var showConsentDialog by remember { mutableStateOf(false) }

    // Generate last 30 days dates (including today)
    val last30Days = remember {
        val list = mutableListOf<String>()
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val cal = java.util.Calendar.getInstance()
        for (i in 0..29) {
            list.add(sdf.format(cal.time))
            cal.add(java.util.Calendar.DATE, -1)
        }
        list
    }

    // Calculations for the last 30 days
    val tasksInLast30Days = tasks.filter { it.dueDate in last30Days }
    val totalTasksCreated = tasksInLast30Days.size
    val totalTasksCompleted = tasksInLast30Days.count { it.isCompleted }
    val taskCompletionPercentage = if (totalTasksCreated > 0) {
        (totalTasksCompleted.toFloat() / totalTasksCreated * 100).toInt()
    } else {
        0
    }

    val txsInLast30Days = transactions.filter { it.date in last30Days }
    val totalIncome = txsInLast30Days.filter { it.type == "income" }.sumOf { it.amount }
    val totalExpenses = txsInLast30Days.filter { it.type == "expense" }.sumOf { it.amount }
    val netSavings = totalIncome - totalExpenses

    val averageDailySpending = totalExpenses / 30.0

    val expenseCategories = txsInLast30Days.filter { it.type == "expense" }.groupBy { it.category }
    val mostExpensiveCategory = if (expenseCategories.isNotEmpty()) {
        val maxCategory = expenseCategories.maxByOrNull { (_, list) -> list.sumOf { it.amount } }
        if (maxCategory != null) {
            "${maxCategory.key} (RM ${String.format(Locale.US, "%.2f", maxCategory.value.sumOf { it.amount })})"
        } else {
            "None"
        }
    } else {
        "None"
    }

    val mostConsistentPath = if (learningPaths.isNotEmpty()) {
        val maxStreakPath = learningPaths.maxByOrNull { it.streak }
        if (maxStreakPath != null && maxStreakPath.streak > 0) {
            "${maxStreakPath.title} (${maxStreakPath.streak} day streak)"
        } else {
            "None with active streak"
        }
    } else {
        "No learning paths"
    }

    // Lessons completed (overall completed lessons count)
    val completedLessonsCount = lessons.count { it.isCompleted }

    // Journal entries written in last 30 days
    val journalCount = journalReflections.count { it.date in last30Days }

    // Best and Weakest Categories in last 30 days
    val taskCategories = tasksInLast30Days.groupBy { it.category }
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
    val monthlySummary = when {
        totalTasksCreated == 0 -> "An empty month. No tasks were logged in the last 30 days. Actionable daily structures are necessary to make career breakthroughs."
        taskCompletionPercentage >= 75 -> "Outstanding monthly milestone! You completed $totalTasksCompleted of your $totalTasksCreated tasks ($taskCompletionPercentage%). This level of consistency is standard-setting."
        taskCompletionPercentage >= 40 -> "Solid month of progress. You completed $totalTasksCompleted tasks but left room for optimization. Narrow your focus to daily critical tasks next month."
        else -> "Low output month. You completed just $totalTasksCompleted of $totalTasksCreated tasks. Focus on smaller, manageable goals next month to build self-efficacy."
    }

    val wentWell = remember(taskCompletionPercentage, netSavings, totalIncome, totalExpenses, completedLessonsCount, journalCount) {
        buildList {
            if (taskCompletionPercentage >= 60) {
                add("• Maintained a robust task completion rate of $taskCompletionPercentage% across $totalTasksCompleted completed tasks.")
            }
            if (netSavings > 0) {
                add("• Stayed cash flow positive with a savings surplus of RM ${String.format(Locale.US, "%.2f", netSavings)}.")
            }
            if (completedLessonsCount > 0) {
                add("• Built compound career capability by completing $completedLessonsCount lessons.")
            }
            if (journalCount >= 10) {
                add("• Maintained high self-awareness with $journalCount journal reflections this month.")
            } else if (journalCount > 0) {
                add("• Logged $journalCount journal reflections to trace mental growth.")
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
                add("• Had $pendingTasks tasks left pending. Focus on reducing task complexity.")
            }
            if (netSavings < 0) {
                add("• Deficit of RM ${String.format(Locale.US, "%.2f", kotlin.math.abs(netSavings))}. Prioritize vital needs over wants.")
            }
            if (journalCount < 15) {
                add("• Only wrote $journalCount journal entries. Aim for at least 15 reflections next month.")
            }
            if (completedLessonsCount == 0) {
                add("• Zero lessons completed. Study targets require active commitment.")
            }
        }.joinToString("\n")
    }

    val suggestedFocus = when {
        taskCompletionPercentage < 50 && totalTasksCreated > 0 -> "Next month, focus on completing at least one critical task before opening other tabs."
        netSavings < 0 -> "Eliminate subscription redundancies and direct RM 100 into savings immediately next month."
        completedLessonsCount == 0 -> "Commit to a 10-minute study block during lunch or morning routines next month."
        journalCount < 10 -> "Integrate journal reflection into your Sunday evening review to process achievements systematically."
        else -> "Exemplary consistency! Up your targets next month: set higher study goals or direct more cash to investments."
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
                    modifier = Modifier.testTag("monthly_review_back_button")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Monthly Performance Review",
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
                text = "Last 30 Days Audit",
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
                        text = "MONTHLY METRICS BREAKDOWN",
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
                                text = "30-Day Income",
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
                                text = "30-Day Expenses",
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
                                color = if (netSavings >= 0) Color(0xFF4CAF50) else MaterialTheme.colorScheme.error
                            )
                        }
                    }

                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    // Other summary statistics
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Mindfulness Reflected",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                Icon(
                                    imageVector = Icons.Default.Book,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "$journalCount entries",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Study Progress",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                Icon(
                                    imageVector = Icons.Default.School,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "$completedLessonsCount lessons",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    // Best and weakest areas
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                text = "Best Performing Category",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = bestCategory,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4CAF50)
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                text = "Weakest Area (Needs Focus)",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = weakestCategory,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                text = "Avg Daily Spending",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "RM ${String.format(Locale.US, "%.2f", averageDailySpending)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                text = "Most Expensive Category",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = mostExpensiveCategory,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                text = "Most Consistent Path",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = mostConsistentPath,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }

            // AI Coaching section
            Text(
                text = "AI Coaching",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("ai_coach_card"),
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
                        text = "Unlock smart, multi-dimensional monthly diagnostics on your goals, saving margins, and learning paths from the past 30 days.",
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
                                "monthlySummary" to monthlySummary,
                                "wentWell" to wentWell,
                                "needsImprovement" to needsImprovement,
                                "suggestedFocus" to suggestedFocus
                            )

                            if (aiCoachEnabled && !aiConsentAccepted) {
                                showConsentDialog = true
                            } else {
                                viewModel.analyzeMonthly(metrics)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("analyze_month_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Analyze Month with AI", fontWeight = FontWeight.Bold)
                    }
                }
            }

            // AI State renderer
            when (val state = monthlyAiState) {
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
                                text = "AI Coach is diagnosing your month...",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
                is MainViewModel.AiState.Success -> {
                    AiResultCard(result = state.result, onDismiss = { viewModel.resetMonthlyAiState() })
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
                                            "monthlySummary" to monthlySummary,
                                            "wentWell" to wentWell,
                                            "needsImprovement" to needsImprovement,
                                            "suggestedFocus" to suggestedFocus
                                        )
                                        viewModel.analyzeMonthly(metrics)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                    modifier = Modifier.align(Alignment.End).testTag("retry_monthly_analysis_button")
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = "Retry", modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Retry Analysis", style = MaterialTheme.typography.labelMedium)
                                }
                            }
                        }
                        if (state.fallbackResult != null) {
                            AiResultCard(result = state.fallbackResult, onDismiss = { viewModel.resetMonthlyAiState() })
                        }
                    }
                }
            }

            // Local Performance Diagnostics Title
            Text(
                text = "Performance Diagnostics",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Local Monthly Audit Summary Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ),
                border = androidx.compose.foundation.BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "Analysis",
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "MONTHLY AUDIT SUMMARY",
                            style = MaterialTheme.typography.labelLarge.copy(
                                letterSpacing = 1.2.sp,
                                fontWeight = FontWeight.Bold
                            ),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Text(
                        text = monthlySummary,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        lineHeight = 22.sp
                    )

                    Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))

                    // What Went Well
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "WHAT WENT WELL",
                            style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 1.sp),
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4CAF50)
                        )
                        Text(
                            text = wentWell,
                            style = MaterialTheme.typography.bodyMedium,
                            lineHeight = 20.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.9f)
                        )
                    }

                    Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))

                    // Needs Improvement
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "OPPORTUNITIES FOR IMPROVEMENT",
                            style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 1.sp),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                        Text(
                            text = needsImprovement,
                            style = MaterialTheme.typography.bodyMedium,
                            lineHeight = 20.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.9f)
                        )
                    }

                    Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))

                    // Suggested Focus
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "RECOMMENDED ACTION FOR NEXT MONTH",
                            style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 1.sp),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = suggestedFocus,
                            style = MaterialTheme.typography.bodyMedium,
                            lineHeight = 20.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
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
                    "monthlySummary" to monthlySummary,
                    "wentWell" to wentWell,
                    "needsImprovement" to needsImprovement,
                    "suggestedFocus" to suggestedFocus
                )
                viewModel.analyzeMonthly(metrics)
            }
        )
    }
}
