package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel
import com.example.data.local.TaskEntity
import com.example.data.local.TransactionEntity
import com.example.data.local.LearningPathEntity
import com.example.data.local.LessonEntity
import com.example.data.local.JournalEntity
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsHubScreen(
    viewModel: MainViewModel,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tasks by viewModel.tasks.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val learningPaths by viewModel.learningPaths.collectAsState()
    val journals by viewModel.journalReflections.collectAsState()
    val lessons by viewModel.allLessons.collectAsState()

    val savingsGoalPref by viewModel.savingsGoal.collectAsState()
    val monthlyIncomeTargetPref by viewModel.monthlyIncomeTarget.collectAsState()

    var selectedTab by remember { mutableStateOf(0) }
    val tabTitles = listOf("Tasks", "Finance", "Learning", "Journal", "Forecast")

    // Generate date ranges locally
    val todayDateStr = viewModel.getTodayDateString()
    val last7Days = remember(todayDateStr) { getLastNDays(7) }
    val last30Days = remember(todayDateStr) { getLastNDays(30) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Analytics Hub",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Local-first performance insights",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.testTag("analytics_back_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Tab Selector
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                edgePadding = 16.dp,
                containerColor = MaterialTheme.colorScheme.background,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("analytics_tabs")
            ) {
                tabTitles.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = {
                            Text(
                                text = title,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Medium
                            )
                        },
                        modifier = Modifier.testTag("analytics_tab_$index")
                    )
                }
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background)
            ) {
                when (selectedTab) {
                    0 -> TaskAnalyticsSection(tasks = tasks, last7Days = last7Days, last30Days = last30Days)
                    1 -> MoneyAnalyticsSection(
                        transactions = transactions,
                        savingsGoalPref = savingsGoalPref,
                        last7Days = last7Days,
                        last30Days = last30Days
                    )
                    2 -> LearningAnalyticsSection(
                        learningPaths = learningPaths,
                        lessons = lessons,
                        last7Days = last7Days,
                        last30Days = last30Days
                    )
                    3 -> JournalAnalyticsSection(journals = journals, last7Days = last7Days, last30Days = last30Days)
                    4 -> GoalForecastSection(
                        tasks = tasks,
                        transactions = transactions,
                        learningPaths = learningPaths,
                        lessons = lessons,
                        journals = journals,
                        savingsGoalPref = savingsGoalPref,
                        monthlyIncomeTargetPref = monthlyIncomeTargetPref,
                        last7Days = last7Days,
                        last30Days = last30Days
                    )
                }
            }
        }
    }
}

// ==========================================
// TASK ANALYTICS SECTION
// ==========================================
@Composable
fun TaskAnalyticsSection(
    tasks: List<TaskEntity>,
    last7Days: List<String>,
    last30Days: List<String>
) {
    if (tasks.isEmpty()) {
        EmptyAnalyticsState(
            icon = Icons.Default.Task,
            title = "No Task Data Found",
            subtitle = "Add daily routines and mark tasks as complete on the Tasks tab to view trend insights."
        )
        return
    }

    val scrollState = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Safe calculations ignoring invalid dates
        val validTasks = tasks.filter { it.dueDate.isNotBlank() }
        
        val completedLast7 = validTasks.filter { it.dueDate in last7Days && it.isCompleted }.size
        val totalLast7 = validTasks.filter { it.dueDate in last7Days }.size
        val rate7 = if (totalLast7 > 0) (completedLast7.toFloat() / totalLast7 * 100f).toInt().coerceIn(0, 100) else 0

        val completedLast30 = validTasks.filter { it.dueDate in last30Days && it.isCompleted }.size
        val totalLast30 = validTasks.filter { it.dueDate in last30Days }.size
        val rate30 = if (totalLast30 > 0) (completedLast30.toFloat() / totalLast30 * 100f).toInt().coerceIn(0, 100) else 0

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            MetricCard(
                title = "Completed (7d)",
                value = "$completedLast7",
                subtitle = "Out of $totalLast7 tasks ($rate7%)",
                icon = Icons.Default.CheckCircle,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f)
            )
            MetricCard(
                title = "Completed (30d)",
                value = "$completedLast30",
                subtitle = "Out of $totalLast30 tasks ($rate30%)",
                icon = Icons.Default.Timeline,
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.weight(1f)
            )
        }

        // Detailed Completion Statistics Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Discipline Metrics & Completion Volume",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                val pendingLast30 = (totalLast30 - completedLast30).coerceAtLeast(0)
                val ratioText = if (pendingLast30 > 0) {
                    String.format(Locale.US, "%.2f", completedLast30.toDouble() / pendingLast30)
                } else if (completedLast30 > 0) {
                    "All Completed"
                } else {
                    "0.00"
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MetricDetailRow("Total Tasks Created (7d)", "$totalLast7")
                    MetricDetailRow("Total Tasks Completed (7d)", "$completedLast7")
                    MetricDetailRow("Task Completion Rate (7d)", "$rate7%")
                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))
                    MetricDetailRow("Total Tasks Created (30d)", "$totalLast30")
                    MetricDetailRow("Total Tasks Completed (30d)", "$completedLast30")
                    MetricDetailRow("Task Completion Rate (30d)", "$rate30%")
                    MetricDetailRow("Completed vs Pending Ratio (30d)", "$ratioText completed per pending task")
                }

                if (totalLast30 > 0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    val compFraction = (completedLast30.toFloat() / totalLast30).coerceIn(0f, 1f)
                    LinearProgressIndicator(
                        progress = { compFraction },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(5.dp)),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.outlineVariant
                    )
                }
            }
        }

        // High Priority Task Mastery
        val highPriorityTasks = tasks.filter { it.priority.equals("High", ignoreCase = true) }
        val highPriorityCompleted = highPriorityTasks.count { it.isCompleted }
        val highPriorityRate = if (highPriorityTasks.isNotEmpty()) {
            (highPriorityCompleted.toFloat() / highPriorityTasks.size * 100f).toInt().coerceIn(0, 100)
        } else {
            -1
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "High Priority Task Mastery",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                if (highPriorityRate == -1) {
                    Text(
                        text = "No high priority tasks created yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .background(MaterialTheme.colorScheme.error.copy(alpha = 0.1f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "$highPriorityRate%",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        Column {
                            Text(
                                text = "$highPriorityCompleted of ${highPriorityTasks.size} Completed",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "High priority tasks demand immediate attention and drive maximum discipline.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // Category Breakdown
        val categories = listOf("Study", "Work", "Health", "Personal Project", "Life Admin")
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Tasks by Category (All Time)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                categories.forEach { cat ->
                    val catTasks = tasks.filter { it.category.equals(cat, ignoreCase = true) }
                    val catCompleted = catTasks.count { it.isCompleted }
                    val fraction = if (catTasks.isNotEmpty()) (catCompleted.toFloat() / catTasks.size).coerceIn(0f, 1f) else 0f

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = cat, 
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "$catCompleted/${catTasks.size} (${(fraction * 100).toInt()}%)",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        LinearProgressIndicator(
                            progress = { fraction },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = MaterialTheme.colorScheme.secondary,
                            trackColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    }
                }
            }
        }

        // Local Insights Card
        val activeCatsWithTasks = categories.map { cat ->
            val catTasks = validTasks.filter { it.dueDate in last30Days && it.category.equals(cat, ignoreCase = true) }
            val rate = if (catTasks.isNotEmpty()) {
                (catTasks.count { it.isCompleted }.toFloat() / catTasks.size).coerceIn(0f, 1f)
            } else {
                -1f
            }
            cat to rate
        }.filter { it.second >= 0f }

        val strongestCategory = activeCatsWithTasks.maxByOrNull { it.second }
        val weakestCategory = activeCatsWithTasks.minByOrNull { it.second }

        val suggestedFocus = when {
            weakestCategory == null -> "Study"
            weakestCategory.second == 1.0f -> "Keep it up! All categories are perfect."
            else -> weakestCategory.first
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Insights",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Local Task Trend Insights",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Strongest Area (30d)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = strongestCategory?.let { "${it.first} (${(it.second * 100).toInt()}%)" } ?: "None",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Weakest Area (30d)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = weakestCategory?.let { "${it.first} (${(it.second * 100).toInt()}%)" } ?: "None",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Suggested Focus: $suggestedFocus",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.secondary
                )
                Text(
                    text = "Prioritize adding tasks and completing reflections in the '${suggestedFocus}' category to maintain balanced personal growth.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// ==========================================
// MONEY ANALYTICS SECTION
// ==========================================
@Composable
fun MoneyAnalyticsSection(
    transactions: List<TransactionEntity>,
    savingsGoalPref: Double,
    last7Days: List<String>,
    last30Days: List<String>
) {
    if (transactions.isEmpty()) {
        EmptyAnalyticsState(
            icon = Icons.Default.AccountBalanceWallet,
            title = "No Financial Records",
            subtitle = "Log your financial transactions in the Money tab to access detailed savings projections and category spend breakdowns."
        )
        return
    }

    val scrollState = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Calculations with safe numeric validations (no negative amounts allowed for aggregates)
        val validTransactions = transactions.filter { it.amount >= 0.0 && it.date.isNotBlank() }

        val income7 = validTransactions.filter { it.type == "income" && it.date in last7Days }.sumOf { it.amount }
        val expenses7 = validTransactions.filter { it.type == "expense" && it.date in last7Days }.sumOf { it.amount }

        val income30 = validTransactions.filter { it.type == "income" && it.date in last30Days }.sumOf { it.amount }
        val expenses30 = validTransactions.filter { it.type == "expense" && it.date in last30Days }.sumOf { it.amount }

        val totalAllTimeIncome = validTransactions.filter { it.type == "income" }.sumOf { it.amount }
        val totalAllTimeExpense = validTransactions.filter { it.type == "expense" }.sumOf { it.amount }
        val currentNetSavings = totalAllTimeIncome - totalAllTimeExpense

        // Core Financial Stats Grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            MetricCard(
                title = "Income (30d)",
                value = "RM ${String.format(Locale.US, "%.2f", income30)}",
                subtitle = "RM ${String.format(Locale.US, "%.2f", income7)} last 7 days",
                icon = Icons.Default.ArrowUpward,
                color = Color(0xFF4CAF50),
                modifier = Modifier.weight(1f)
            )
            MetricCard(
                title = "Expenses (30d)",
                value = "RM ${String.format(Locale.US, "%.2f", expenses30)}",
                subtitle = "RM ${String.format(Locale.US, "%.2f", expenses7)} last 7 days",
                icon = Icons.Default.ArrowDownward,
                color = Color(0xFFF44336),
                modifier = Modifier.weight(1f)
            )
        }

        // Net savings Trend Card
        val monthlySavings = income30 - expenses30
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Net Savings (Last 30 Days)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "RM ${String.format(Locale.US, "%.2f", monthlySavings)}",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (monthlySavings >= 0) Color(0xFF4CAF50) else Color(0xFFF44336)
                )
                Text(
                    text = if (monthlySavings >= 0) "Your income exceeds your spending. Excellent surplus management!" else "Warning: Deficit spending registered. Review your expensive categories.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Aggregate Financial Metrics Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Detailed Monetary Statistics",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                val averageDailySpend = expenses30 / 30.0
                val weeklyAverageSavings = (monthlySavings / 30.0) * 7.0

                MetricDetailRow("Total Income Last 7 Days", "RM ${String.format(Locale.US, "%.2f", income7)}")
                MetricDetailRow("Total Expenses Last 7 Days", "RM ${String.format(Locale.US, "%.2f", expenses7)}")
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))
                MetricDetailRow("Total Income Last 30 Days", "RM ${String.format(Locale.US, "%.2f", income30)}")
                MetricDetailRow("Total Expenses Last 30 Days", "RM ${String.format(Locale.US, "%.2f", expenses30)}")
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))
                MetricDetailRow("Net Saved Balance (All Time)", "RM ${String.format(Locale.US, "%.2f", currentNetSavings)}")
                MetricDetailRow("Average Daily Spending", "RM ${String.format(Locale.US, "%.2f", averageDailySpend)}")
                MetricDetailRow("Average Weekly Net Savings", "RM ${String.format(Locale.US, "%.2f", weeklyAverageSavings)}")
            }
        }

        // Category Spend Breakdown
        val expenseCats = listOf("Food", "Transport", "Education", "Tools", "Personal", "Other")
        val expensesByCat = expenseCats.map { cat ->
            cat to validTransactions.filter { it.type == "expense" && it.category.equals(cat, ignoreCase = true) && it.date in last30Days }.sumOf { it.amount }
        }.sortedByDescending { it.second }

        val totalExpenses30 = expensesByCat.sumOf { it.second }
        val mostExpensiveCategory = expensesByCat.firstOrNull { it.second > 0 }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Spending by Category (30d)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                if (totalExpenses30 == 0.0) {
                    Text(
                        text = "No expenses logged in the last 30 days.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    expensesByCat.forEach { (cat, amount) ->
                        val fraction = if (totalExpenses30 > 0.0) (amount / totalExpenses30).coerceIn(0.0, 1.0) else 0.0
                        if (amount > 0) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = cat, 
                                        style = MaterialTheme.typography.bodyMedium,
                                        modifier = Modifier.weight(1f),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "RM ${String.format(Locale.US, "%.2f", amount)} (${(fraction * 100).toInt()}%)",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                LinearProgressIndicator(
                                    progress = { fraction.toFloat() },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp)),
                                    color = MaterialTheme.colorScheme.error,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        // Projections & Forecast
        val weeklyAverageSavings = (monthlySavings / 30.0) * 7.0
        val remainingToGoal = (savingsGoalPref - currentNetSavings).coerceAtLeast(0.0)

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.TrendingUp,
                        contentDescription = "Forecast",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Goal Forecast: Savings Projection",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "Target Goal",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                        )
                        Text(
                            text = "RM ${String.format(Locale.US, "%.2f", savingsGoalPref)}",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "Net Balance",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                        )
                        Text(
                            text = "RM ${String.format(Locale.US, "%.2f", currentNetSavings)}",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (currentNetSavings >= 0) Color(0xFF4CAF50) else Color(0xFFF44336)
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "Weekly Surplus Rate",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                        )
                        Text(
                            text = "RM ${String.format(Locale.US, "%.2f", weeklyAverageSavings)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (weeklyAverageSavings >= 0) Color(0xFF4CAF50) else Color(0xFFF44336)
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "Remaining Needed",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                        )
                        Text(
                            text = "RM ${String.format(Locale.US, "%.2f", remainingToGoal)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                val estimationText = when {
                    savingsGoalPref <= 0.0 -> "Define a savings goal in your Settings to project accurate timelines."
                    remainingToGoal == 0.0 -> "Congratulations! Your net balance has exceeded your savings target! 🎉"
                    weeklyAverageSavings <= 0.0 -> "Timeline: Infinite. Your current weekly surplus rate is negative or zero. Trim expenses to save."
                    else -> {
                        val weeks = remainingToGoal / weeklyAverageSavings
                        if (weeks > 520) {
                            "Timeline: Very long-term (10+ years at current rate)."
                        } else if (weeks < 1.0) {
                            "Timeline: Less than 1 week to reach your goal at your current savings rate!"
                        } else if (weeks <= 8) {
                            "Timeline: Approx. ${String.format(Locale.US, "%.1f", weeks)} weeks remaining."
                        } else {
                            val months = weeks / 4.34
                            "Timeline: Approx. ${String.format(Locale.US, "%.1f", months)} months remaining."
                        }
                    }
                }

                Text(
                    text = estimationText,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )

                // Average Daily Spend Metric
                val averageDailySpend = expenses30 / 30.0
                Text(
                    text = "• Average Daily Spend: RM ${String.format(Locale.US, "%.2f", averageDailySpend)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                )

                mostExpensiveCategory?.let { (cat, amount) ->
                    Text(
                        text = "• Most Expensive Category: $cat (RM ${String.format(Locale.US, "%.2f", amount)} over last 30d)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                    )
                }
            }
        }
    }
}

// ==========================================
// LEARNING ANALYTICS SECTION
// ==========================================
@Composable
fun LearningAnalyticsSection(
    learningPaths: List<LearningPathEntity>,
    lessons: List<LessonEntity>,
    last7Days: List<String>,
    last30Days: List<String>
) {
    if (learningPaths.isEmpty()) {
        EmptyAnalyticsState(
            icon = Icons.Default.School,
            title = "No Learning Tracks",
            subtitle = "Create custom skill syllabus matrices on the Learning tab to analyze course completions and track streaks."
        )
        return
    }

    val scrollState = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Aggregate totals
        val totalLessons = lessons.size
        val completedLessons = lessons.count { it.isCompleted }
        val overallProgressFraction = if (totalLessons > 0) (completedLessons.toFloat() / totalLessons).coerceIn(0f, 1f) else 0f

        // Recent studies: Safe checks
        val pathsStudied7 = learningPaths.filter { it.lastStudiedDate != null && it.lastStudiedDate in last7Days }.size
        val pathsStudied30 = learningPaths.filter { it.lastStudiedDate != null && it.lastStudiedDate in last30Days }.size

        // Total lessons completed in last 7 and 30 days based on active path timestamp markers
        val completedLessons7 = learningPaths
            .filter { it.lastStudiedDate != null && it.lastStudiedDate in last7Days }
            .flatMap { path -> lessons.filter { it.pathId == path.id && it.isCompleted } }
            .distinctBy { it.id }
            .size

        val completedLessons30 = learningPaths
            .filter { it.lastStudiedDate != null && it.lastStudiedDate in last30Days }
            .flatMap { path -> lessons.filter { it.pathId == path.id && it.isCompleted } }
            .distinctBy { it.id }
            .size

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            MetricCard(
                title = "Lessons Done",
                value = "$completedLessons",
                subtitle = "Out of $totalLessons overall lessons",
                icon = Icons.Default.AssignmentTurnedIn,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f)
            )
            MetricCard(
                title = "Paths Studied",
                value = "$pathsStudied7",
                subtitle = "Active in last 7 days",
                icon = Icons.Default.CalendarToday,
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.weight(1f)
            )
        }

        // Detailed Progress Statistics Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Syllabus Progress & Completion Rates",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                MetricDetailRow("Completed Lessons (7d)", "$completedLessons7")
                MetricDetailRow("Completed Lessons (30d)", "$completedLessons30")
                MetricDetailRow("Total Configured Lessons", "$totalLessons")
                MetricDetailRow("Total Completed Lessons", "$completedLessons")
                MetricDetailRow("Overall Syllabus Progress", "${(overallProgressFraction * 100).toInt()}%")
            }
        }

        // Learning progress bars comparison
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Learning Path Progress Breakdown",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                learningPaths.forEach { path ->
                    val pathLessons = lessons.filter { it.pathId == path.id }
                    val done = pathLessons.count { it.isCompleted }
                    val total = pathLessons.size
                    val frac = if (total > 0) (done.toFloat() / total).coerceIn(0f, 1f) else 0f

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = path.title,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "$done/$total (${(frac * 100).toInt()}%)",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        LinearProgressIndicator(
                            progress = { frac },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = MaterialTheme.colorScheme.surfaceVariant
                        )

                        path.lastStudiedDate?.let { date ->
                            Text(
                                text = "Last studied: $date • Streak: ${path.streak} day(s)",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // Consistency Insights
        val mostConsistent = learningPaths.maxByOrNull { it.streak }
        val leastActive = learningPaths.minByOrNull { path ->
            val pathLessons = lessons.filter { it.pathId == path.id }
            if (pathLessons.isEmpty()) 0.0 else (pathLessons.count { l -> l.isCompleted }.toDouble() / pathLessons.size).coerceIn(0.0, 1.0)
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Insights",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Local Learning Insights",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Most Consistent Path (Highest Streak):",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = mostConsistent?.let { "${it.title} (${it.streak} days)" } ?: "None",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Least Active Path (Progress / Completion):",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = leastActive?.title ?: "None",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

// ==========================================
// JOURNAL ANALYTICS SECTION
// ==========================================
@Composable
fun JournalAnalyticsSection(
    journals: List<JournalEntity>,
    last7Days: List<String>,
    last30Days: List<String>
) {
    if (journals.isEmpty()) {
        EmptyAnalyticsState(
            icon = Icons.Default.EditNote,
            title = "No Journal Reflections",
            subtitle = "Scribble daily mental highlights and action plans in the Journal tab to unlock habit loops and visual streak calculations."
        )
        return
    }

    val scrollState = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        val validJournals = journals.filter { it.date.isNotBlank() }
        val entries7 = validJournals.filter { it.date in last7Days }.size
        val entries30 = validJournals.filter { it.date in last30Days }.size

        val consistency7 = (entries7.toFloat() / 7.0f * 100f).toInt().coerceIn(0, 100)
        val consistency30 = (entries30.toFloat() / 30.0f * 100f).toInt().coerceIn(0, 100)

        val journalDatesSet = validJournals.map { it.date }.toSet()
        val currentStreak = calculateCurrentJournalStreak(journalDatesSet)
        val longestStreak = calculateMaxJournalStreak(journalDatesSet)
        val lastReflection = validJournals.maxByOrNull { it.date }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            MetricCard(
                title = "Reflections (7d)",
                value = "$entries7",
                subtitle = "Consistency: $consistency7%",
                icon = Icons.Default.EditCalendar,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f)
            )
            MetricCard(
                title = "Reflections (30d)",
                value = "$entries30",
                subtitle = "Consistency: $consistency30%",
                icon = Icons.Default.EventAvailable,
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.weight(1f)
            )
        }

        // Detailed Consistency Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Reflection Activity & Consistency",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                MetricDetailRow("Journal entries logged (last 7 days)", "$entries7")
                MetricDetailRow("Journal entries logged (last 30 days)", "$entries30")
                MetricDetailRow("7-Day Reflection Consistency", "$consistency7%")
                MetricDetailRow("30-Day Reflection Consistency", "$consistency30%")
                MetricDetailRow("Last Reflection Date", lastReflection?.date ?: "Never")
            }
        }

        // Streak Board
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .background(Color(0xFFFF9800).copy(alpha = 0.12f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalFireDepartment,
                        contentDescription = "Streak",
                        tint = Color(0xFFFF9800),
                        modifier = Modifier.size(36.dp)
                    )
                }

                Column {
                    Text(
                        text = "Reflection Habit Streaks",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Current Streak: $currentStreak days",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFFF9800)
                    )
                    Text(
                        text = "All-time Longest: $longestStreak days",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Privacy details card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = "Privacy Shield",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(32.dp)
                )
                Column {
                    Text(
                        text = "100% Offline Privacy Standard",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "This screen only processes journal reflection timestamps to determine habits. Your written self-reflections, private observations, or Tomorrow Priorities are never read, indexed, or uploaded.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

// ==========================================
// GOAL FORECAST SECTION
// ==========================================
@Composable
fun GoalForecastSection(
    tasks: List<TaskEntity>,
    transactions: List<TransactionEntity>,
    learningPaths: List<LearningPathEntity>,
    lessons: List<LessonEntity>,
    journals: List<JournalEntity>,
    savingsGoalPref: Double,
    monthlyIncomeTargetPref: Double,
    last7Days: List<String>,
    last30Days: List<String>
) {
    val scrollState = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Strategic Local Performance Forecast",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )

        Text(
            text = "Using local execution logs and habit algorithms to verify if your current output rates align with user targets.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        HorizontalDivider()

        // Gather all metrics to determine statuses
        val validTransactions = transactions.filter { it.amount >= 0.0 && it.date.isNotBlank() }
        val currentSavings = validTransactions.filter { it.type == "income" }.sumOf { it.amount } -
                validTransactions.filter { it.type == "expense" }.sumOf { it.amount }
        val income30 = validTransactions.filter { it.type == "income" && it.date in last30Days }.sumOf { it.amount }
        val expenses30 = validTransactions.filter { it.type == "expense" && it.date in last30Days }.sumOf { it.amount }
        val monthlySavings = income30 - expenses30
        val weeklySavingsRate = (monthlySavings / 30.0) * 7.0

        // 1. Savings Status with Transparent Local Rules
        val savingsStatus = when {
            savingsGoalPref <= 0.0 -> ForecastStatus.OnTrack("No savings goal is currently active in Settings.")
            currentSavings >= savingsGoalPref -> ForecastStatus.OnTrack("Goal Achieved! You have successfully saved the target amount on-device.")
            weeklySavingsRate > 0.0 -> {
                val weeksToGoal = (savingsGoalPref - currentSavings) / weeklySavingsRate
                if (weeksToGoal <= 24) {
                    ForecastStatus.OnTrack("On Track: Your daily savings surplus puts you on track to hit your goal in ${String.format(Locale.US, "%.1f", weeksToGoal)} weeks.")
                } else {
                    ForecastStatus.NeedsAttention("Needs Attention: Your current weekly savings rate of RM ${String.format(Locale.US, "%.2f", weeklySavingsRate)} will require ${String.format(Locale.US, "%.1f", weeksToGoal)} weeks. Consider lowering expenses.")
                }
            }
            else -> ForecastStatus.AtRisk("At Risk: Deficit spending or zero surplus detected. Stagnant progress cannot support your RM ${String.format(Locale.US, "%.2f", savingsGoalPref)} savings goal.")
        }

        // 2. Monthly Income Target Status
        val todayDateStr = if (last30Days.isNotEmpty()) last30Days.first() else ""
        val currentYearMonth = if (todayDateStr.length >= 7) todayDateStr.substring(0, 7) else ""
        val thisMonthIncome = validTransactions
            .filter { it.type == "income" && it.date.startsWith(currentYearMonth) }
            .sumOf { it.amount }

        val incomeStatus = when {
            monthlyIncomeTargetPref <= 0.0 -> ForecastStatus.OnTrack("No monthly income target is currently active.")
            thisMonthIncome >= monthlyIncomeTargetPref -> ForecastStatus.OnTrack("Goal Achieved! Your on-device logged income has met your RM ${String.format(Locale.US, "%.2f", monthlyIncomeTargetPref)} goal.")
            thisMonthIncome > 0.0 -> {
                val completionFraction = (thisMonthIncome / monthlyIncomeTargetPref).coerceIn(0.0, 1.0)
                val percent = (completionFraction * 100).toInt()
                if (completionFraction >= 0.5) {
                    ForecastStatus.OnTrack("On Track: You have achieved $percent% of your target and are pacing well for this month.")
                } else {
                    ForecastStatus.NeedsAttention("Needs Attention: Only $percent% of your monthly target has been achieved. Look for extra income streams.")
                }
            }
            else -> ForecastStatus.AtRisk("At Risk: No income logged this month. Your stated RM ${String.format(Locale.US, "%.2f", monthlyIncomeTargetPref)} income target is currently unsupported.")
        }

        // 3. Daily Study Consistency Status
        val maxStudyStreak = if (learningPaths.isNotEmpty()) learningPaths.maxOf { it.streak } else 0
        val studyStatus = when {
            learningPaths.isEmpty() -> ForecastStatus.NeedsAttention("Needs Attention: No active learning paths have been created in the syllabus.")
            maxStudyStreak >= 5 -> ForecastStatus.OnTrack("On Track: Excellent learning habit! Your consistent $maxStudyStreak-day streak keeps you on track.")
            maxStudyStreak >= 1 -> ForecastStatus.NeedsAttention("Needs Attention: Learning path streak is only $maxStudyStreak days. Try to study daily to build momentum.")
            else -> ForecastStatus.AtRisk("At Risk: Streak is 0. No consecutive study sessions logged. Daily progress is critical for skill acquisition.")
        }

        // 4. Task Backlog Discipline Status
        val validTasks = tasks.filter { it.dueDate.isNotBlank() }
        val completed7 = validTasks.filter { it.dueDate in last7Days && it.isCompleted }.size
        val total7 = validTasks.filter { it.dueDate in last7Days }.size
        val rate7 = if (total7 > 0) (completed7.toFloat() / total7 * 100f).toInt().coerceIn(0, 100) else -1

        val taskStatus = when {
            rate7 == -1 -> ForecastStatus.NeedsAttention("Needs Attention: No tasks configured or pending for this week.")
            rate7 >= 70 -> ForecastStatus.OnTrack("On Track: High task completion rate ($rate7%) indicates excellent daily execution and focus.")
            rate7 >= 40 -> ForecastStatus.NeedsAttention("Needs Attention: Moderate task completion rate ($rate7%). Some tasks are slipping into your backlog.")
            else -> ForecastStatus.AtRisk("At Risk: Low task completion rate ($rate7%). High risk of backlog accumulation and stalled projects.")
        }

        // 5. Learning syllabus consistency Status
        val totalLessons = lessons.size
        val completedLessons = lessons.count { it.isCompleted }
        val overallFrac = if (totalLessons > 0) (completedLessons.toFloat() / totalLessons).coerceIn(0f, 1f) else -1f

        val learningStatus = when {
            overallFrac == -1f -> ForecastStatus.NeedsAttention("Needs Attention: No custom learning courses or lessons configured.")
            overallFrac >= 0.6f -> ForecastStatus.OnTrack("On Track: Deep progress into configured learning path lessons (${(overallFrac * 100).toInt()}% complete).")
            overallFrac >= 0.2f -> ForecastStatus.NeedsAttention("Needs Attention: Moderate lesson completion (${(overallFrac * 100).toInt()}%). Build out more active study habits.")
            else -> ForecastStatus.AtRisk("At Risk: Syllabus completion is very low (${(overallFrac * 100).toInt()}%). Please engage with your lessons to unlock goals.")
        }

        // 6. Journal Consistency Status
        val validJournals = journals.filter { it.date.isNotBlank() }
        val journalEntries7 = validJournals.filter { it.date in last7Days }.size
        val journalConsistency7 = (journalEntries7.toFloat() / 7.0f * 100f).toInt().coerceIn(0, 100)

        val journalStatus = when {
            journalConsistency7 >= 70 -> ForecastStatus.OnTrack("On Track: High reflection rate ($journalConsistency7%) supports excellent cognitive and mental balance.")
            journalConsistency7 >= 30 -> ForecastStatus.NeedsAttention("Needs Attention: Moderate cognitive reflection consistency ($journalConsistency7%). Try logging thoughts daily.")
            else -> ForecastStatus.AtRisk("At Risk: Low cognitive reflection consistency ($journalConsistency7%). Reflecting regularly solidifies personal learning.")
        }

        // Overall Aggregate Strategic Forecast
        val forecastList = listOf(savingsStatus, incomeStatus, studyStatus, taskStatus, learningStatus, journalStatus)
        val numOnTrack = forecastList.count { it is ForecastStatus.OnTrack }
        val numAtRisk = forecastList.count { it is ForecastStatus.AtRisk }

        val overallLabel: String
        val overallColor: Color
        val overallExplanation: String

        if (numAtRisk >= 2) {
            overallLabel = "At Risk"
            overallColor = Color(0xFFEF5350)
            overallExplanation = "Current progress is too low to support your stated goals. Some critical metrics have stalled or are in deficit."
        } else if (numOnTrack >= 4) {
            overallLabel = "On Track"
            overallColor = Color(0xFF4CAF50)
            overallExplanation = "Your task completion and savings progress are currently strong. Keep maintaining this solid execution pace!"
        } else {
            overallLabel = "Needs Attention"
            overallColor = Color(0xFFFFA726)
            overallExplanation = "Some areas are progressing, but consistency is uneven. Review your pending tasks or daily study routines to re-align."
        }

        // Overall Forecast Card at the top
        Card(
            modifier = Modifier.fillMaxWidth().testTag("overall_forecast_card"),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            ),
            border = androidx.compose.foundation.BorderStroke(
                width = 2.dp,
                color = overallColor.copy(alpha = 0.5f)
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Overall Growth Forecast",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(overallColor.copy(alpha = 0.15f))
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = overallLabel,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = overallColor
                        )
                    }
                }

                Text(
                    text = overallExplanation,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "On Track Metrics: $numOnTrack / 6",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "At Risk Metrics: $numAtRisk / 6",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Metric-By-Metric Forecast Analysis",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // Forecast Row Displays
        ForecastItemRow(
            title = "Savings Goal Target",
            subtitle = "Goal: RM ${String.format(Locale.US, "%.2f", savingsGoalPref)} • Saved: RM ${String.format(Locale.US, "%.2f", currentSavings)}",
            icon = Icons.Default.Savings,
            status = savingsStatus
        )

        ForecastItemRow(
            title = "Monthly Income Target",
            subtitle = "Goal: RM ${String.format(Locale.US, "%.2f", monthlyIncomeTargetPref)} • Income: RM ${String.format(Locale.US, "%.2f", thisMonthIncome)}",
            icon = Icons.Default.Payments,
            status = incomeStatus
        )

        ForecastItemRow(
            title = "Study Streak Habit",
            subtitle = "Maximum active consecutive study days logged: $maxStudyStreak days",
            icon = Icons.Default.LocalFireDepartment,
            status = studyStatus
        )

        ForecastItemRow(
            title = "Task Backlog Discipline",
            subtitle = "Weekly task completion rate: $completed7 of $total7 completed ($rate7%)",
            icon = Icons.Default.Rule,
            status = taskStatus
        )

        ForecastItemRow(
            title = "Learning Progress Consistency",
            subtitle = "Course syllabus progression: $completedLessons of $totalLessons completed",
            icon = Icons.Default.HistoryEdu,
            status = learningStatus
        )

        ForecastItemRow(
            title = "Journal Reflection Habit",
            subtitle = "7-day cognitive reflection rate: $journalEntries7 of 7 days logged ($journalConsistency7%)",
            icon = Icons.Default.EditNote,
            status = journalStatus
        )
    }
}

sealed class ForecastStatus {
    data class OnTrack(val msg: String) : ForecastStatus()
    data class NeedsAttention(val msg: String) : ForecastStatus()
    data class AtRisk(val msg: String) : ForecastStatus()
}

@Composable
fun ForecastItemRow(
    title: String,
    subtitle: String,
    icon: ImageVector,
    status: ForecastStatus
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon, 
                    contentDescription = null, 
                    tint = MaterialTheme.colorScheme.primary, 
                    modifier = Modifier.size(20.dp)
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                
                Spacer(modifier = Modifier.height(6.dp))
                
                val statusLabel: String
                val statusColor: Color
                val statusMsg: String

                when (status) {
                    is ForecastStatus.OnTrack -> {
                        statusLabel = "On Track"
                        statusColor = Color(0xFF4CAF50)
                        statusMsg = status.msg
                    }
                    is ForecastStatus.NeedsAttention -> {
                        statusLabel = "Needs Attention"
                        statusColor = Color(0xFFFFA726)
                        statusMsg = status.msg
                    }
                    is ForecastStatus.AtRisk -> {
                        statusLabel = "At Risk"
                        statusColor = Color(0xFFEF5350)
                        statusMsg = status.msg
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically, 
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(statusColor.copy(alpha = 0.12f))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = statusLabel,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = statusColor
                        )
                    }
                    Text(
                        text = statusMsg,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

// ==========================================
// SHARED COMMON WIDGETS
// ==========================================
@Composable
fun MetricCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun MetricDetailRow(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.End
        )
    }
}

@Composable
fun EmptyAnalyticsState(
    icon: ImageVector,
    title: String,
    subtitle: String
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(40.dp)
                )
            }

            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                lineHeight = 22.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.05f)
                ),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                ),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "💡 Practical Next Step",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Seed your portfolio database with sample mock statistics in Settings > Portfolio Tools to instantly experience full analytics curves, charts, metrics, and coaching reports!",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        lineHeight = 16.sp
                    )
                }
            }
        }
    }
}

// Helper to get last N days string date formats descending
private fun getLastNDays(n: Int): List<String> {
    val list = mutableListOf<String>()
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val cal = Calendar.getInstance()
    for (i in 0 until n) {
        list.add(sdf.format(cal.time))
        cal.add(Calendar.DATE, -1)
    }
    return list
}

// Streaks Calculators
private fun calculateCurrentJournalStreak(journalDates: Set<String>): Int {
    if (journalDates.isEmpty()) return 0
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val cal = Calendar.getInstance()
    var streak = 0

    var dateStr = sdf.format(cal.time)
    if (journalDates.contains(dateStr)) {
        streak++
        while (true) {
            cal.add(Calendar.DATE, -1)
            dateStr = sdf.format(cal.time)
            if (journalDates.contains(dateStr)) {
                streak++
            } else {
                break
            }
        }
    } else {
        // Check if started yesterday
        cal.add(Calendar.DATE, -1)
        dateStr = sdf.format(cal.time)
        if (journalDates.contains(dateStr)) {
            streak++
            while (true) {
                cal.add(Calendar.DATE, -1)
                dateStr = sdf.format(cal.time)
                if (journalDates.contains(dateStr)) {
                    streak++
                } else {
                    break
                }
            }
        }
    }
    return streak
}

private fun calculateMaxJournalStreak(journalDates: Set<String>): Int {
    if (journalDates.isEmpty()) return 0
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val sortedDates = journalDates.mapNotNull {
        try { sdf.parse(it) } catch (e: Exception) { null }
    }.sorted()

    if (sortedDates.isEmpty()) return 0

    var maxStreak = 1
    var currentStreak = 1
    val oneDayMs = 24 * 60 * 60 * 1000L

    for (i in 1 until sortedDates.size) {
        val diff = sortedDates[i].time - sortedDates[i - 1].time
        val diffDays = Math.round(diff.toDouble() / oneDayMs)
        if (diffDays == 1L) {
            currentStreak++
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak
            }
        } else if (diffDays > 1L) {
            currentStreak = 1
        }
    }
    return maxStreak
}
