package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import android.widget.Toast
import com.example.data.local.JournalEntity
import com.example.ui.MainViewModel
import com.example.ui.MockAnalysis

@Composable
fun JournalScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val reflections by viewModel.journalReflections.collectAsState()
    val screenshotModeEnabled by viewModel.screenshotModeEnabled.collectAsState()
    val todayDateStr = viewModel.getTodayDateString()

    val todayReflection = remember(reflections) {
        reflections.find { it.date == todayDateStr }
    }

    // Input States
    var whatIDid by remember { mutableStateOf("") }
    var whatWentWell by remember { mutableStateOf("") }
    var whatToImprove by remember { mutableStateOf("") }
    var tomorrowPriorities by remember { mutableStateOf("") }

    var isDidTodayError by remember { mutableStateOf(false) }
    var isPrioritiesError by remember { mutableStateOf(false) }

    // Sync input states when today's reflection loads
    LaunchedEffect(todayReflection) {
        if (todayReflection != null) {
            whatIDid = todayReflection.whatIDid
            whatWentWell = todayReflection.whatWentWell
            whatToImprove = todayReflection.whatToImprove
            tomorrowPriorities = todayReflection.tomorrowPriorities
        }
    }

    var showConsentDialog by remember { mutableStateOf(false) }

    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Title
        Text(
            text = "Reflection Journal",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )

        // Date indicator
        Text(
            text = "Daily reflection for today: ${viewModel.getTodayDisplayDate()}",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.secondary
        )

        // Journal form (Sleek Interface Styled)
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
                // Field 1: What I did today
                Text(
                    text = "What did you do today?",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                OutlinedTextField(
                    value = if (screenshotModeEnabled) "[Private reflection hidden in portfolio mode]" else whatIDid,
                    onValueChange = { 
                        if (!screenshotModeEnabled) {
                            whatIDid = it
                            if (isDidTodayError && it.isNotBlank()) {
                                isDidTodayError = false
                            }
                        }
                    },
                    placeholder = { Text("List major accomplishments, hours studied, or tasks finished...") },
                    readOnly = screenshotModeEnabled,
                    isError = isDidTodayError,
                    supportingText = {
                        if (isDidTodayError) {
                            Text("Reflection content is required", color = MaterialTheme.colorScheme.error)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .testTag("journal_did_today_input"),
                    maxLines = 4
                )

                // Field 2: What went well
                Text(
                    text = "What went well?",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                OutlinedTextField(
                    value = if (screenshotModeEnabled) "[Private reflection hidden in portfolio mode]" else whatWentWell,
                    onValueChange = { if (!screenshotModeEnabled) whatWentWell = it },
                    placeholder = { Text("What made you feel proud or successful today?") },
                    readOnly = screenshotModeEnabled,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .testTag("journal_went_well_input"),
                    maxLines = 3
                )

                // Field 3: What I need to improve
                Text(
                    text = "What do you need to improve?",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                OutlinedTextField(
                    value = if (screenshotModeEnabled) "[Private reflection hidden in portfolio mode]" else whatToImprove,
                    onValueChange = { if (!screenshotModeEnabled) whatToImprove = it },
                    placeholder = { Text("Any distractions, bottlenecks, or obstacles encountered?") },
                    readOnly = screenshotModeEnabled,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .testTag("journal_to_improve_input"),
                    maxLines = 3
                )

                // Field 4: Tomorrow's Top 3 Priorities
                Text(
                    text = "Tomorrow's Top 3 Priorities",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                OutlinedTextField(
                    value = if (screenshotModeEnabled) "• Focus on core portfolio presentation\n• Prepare system screenshots\n• Complete verification audit" else tomorrowPriorities,
                    onValueChange = { 
                        if (!screenshotModeEnabled) {
                            tomorrowPriorities = it
                            if (isPrioritiesError && it.isNotBlank()) {
                                isPrioritiesError = false
                            }
                        }
                    },
                    placeholder = { Text("Enter each priority on a new line...") },
                    readOnly = screenshotModeEnabled,
                    isError = isPrioritiesError,
                    supportingText = {
                        if (isPrioritiesError) {
                            Text("Priorities are required", color = MaterialTheme.colorScheme.error)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .testTag("journal_priorities_input"),
                    maxLines = 4
                )
            }
        }

        // Save & Analyze Buttons
        val aiCoachEnabled by viewModel.aiCoachEnabled.collectAsState()
        val aiConsentAccepted by viewModel.aiConsentAccepted.collectAsState()
        val journalAiState by viewModel.journalAiState.collectAsState()

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Button(
                onClick = {
                    isDidTodayError = whatIDid.trim().isBlank()
                    isPrioritiesError = tomorrowPriorities.trim().isBlank()
                    if (isDidTodayError) {
                        Toast.makeText(context, "Empty reflection content", Toast.LENGTH_SHORT).show()
                    } else if (isPrioritiesError) {
                        Toast.makeText(context, "Empty priority fields", Toast.LENGTH_SHORT).show()
                    } else {
                        viewModel.saveReflection(
                            whatIDid = whatIDid.trim(),
                            whatWentWell = whatWentWell.trim(),
                            whatToImprove = whatToImprove.trim(),
                            tomorrowPriorities = tomorrowPriorities.trim()
                        )
                        Toast.makeText(context, "Reflection saved successfully!", Toast.LENGTH_SHORT).show()
                    }
                },
                enabled = !screenshotModeEnabled,
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .testTag("save_reflection_button")
            ) {
                Icon(Icons.Default.Save, contentDescription = "Save")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save")
            }

            Button(
                onClick = {
                    isDidTodayError = whatIDid.trim().isBlank()
                    isPrioritiesError = tomorrowPriorities.trim().isBlank()
                    if (isDidTodayError) {
                        Toast.makeText(context, "Empty reflection content", Toast.LENGTH_SHORT).show()
                    } else if (isPrioritiesError) {
                        Toast.makeText(context, "Empty priority fields", Toast.LENGTH_SHORT).show()
                    } else {
                        // Save first to ensure the analytics are based on the latest journal inputs!
                        viewModel.saveReflection(
                            whatIDid = whatIDid.trim(),
                            whatWentWell = whatWentWell.trim(),
                            whatToImprove = whatToImprove.trim(),
                            tomorrowPriorities = tomorrowPriorities.trim()
                        )

                        val temporaryReflection = JournalEntity(
                            date = todayDateStr,
                            whatIDid = whatIDid.trim(),
                            whatWentWell = whatWentWell.trim(),
                            whatToImprove = whatToImprove.trim(),
                            tomorrowPriorities = tomorrowPriorities.trim()
                        )

                        // Gather contextual metrics
                        val todayTasks = viewModel.tasks.value.filter { it.dueDate == todayDateStr }
                        val completedTodayTasks = todayTasks.count { it.isCompleted }
                        val spentToday = viewModel.transactions.value
                            .filter { it.date == todayDateStr && it.type == "expense" }
                            .sumOf { it.amount }
                        val studyMinutes = viewModel.dailyStudyTargetMinutes.value
                        
                        val metrics = mapOf(
                            "totalTasks" to todayTasks.size,
                            "completedTasks" to completedTodayTasks,
                            "spentToday" to spentToday,
                            "studyMinutes" to studyMinutes,
                            "studyTarget" to viewModel.dailyStudyTargetMinutes.value
                        )

                        if (aiCoachEnabled && !aiConsentAccepted) {
                            showConsentDialog = true
                        } else {
                            viewModel.analyzeJournal(temporaryReflection, metrics)
                        }
                    }
                },
                enabled = !screenshotModeEnabled,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.secondary
                ),
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .testTag("analyze_day_button")
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = "Analyze")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Analyze Day")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // AI Coaching Results section inline
        when (val state = journalAiState) {
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
                            text = "AI Coach is analyzing your day...",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Reviewing task completion, spending habits, study logs, and reflection narratives.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
            is MainViewModel.AiState.Success -> {
                AiResultCard(result = state.result, onDismiss = { viewModel.resetJournalAiState() })
            }
            is MainViewModel.AiState.Error -> {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Card(
                        modifier = Modifier.fillMaxWidth().testTag("ai_coach_error_card"),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = "Analysis Failed: ${state.errorMessage}",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                            Text(
                                text = "Showing local fallback analysis below. You can try the remote analysis again.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                            Button(
                                onClick = {
                                    val todayTasks = viewModel.tasks.value.filter { it.dueDate == todayDateStr }
                                    val completedTodayTasks = todayTasks.count { it.isCompleted }
                                    val spentToday = viewModel.transactions.value
                                        .filter { it.date == todayDateStr && it.type == "expense" }
                                        .sumOf { it.amount }
                                    val studyMinutes = viewModel.dailyStudyTargetMinutes.value
                                    
                                    val metrics = mapOf(
                                        "totalTasks" to todayTasks.size,
                                        "completedTasks" to completedTodayTasks,
                                        "spentToday" to spentToday,
                                        "studyMinutes" to studyMinutes,
                                        "studyTarget" to viewModel.dailyStudyTargetMinutes.value
                                    )
                                    val temporaryReflection = JournalEntity(
                                        date = todayDateStr,
                                        whatIDid = whatIDid,
                                        whatWentWell = whatWentWell,
                                        whatToImprove = whatToImprove,
                                        tomorrowPriorities = tomorrowPriorities
                                    )
                                    viewModel.analyzeJournal(temporaryReflection, metrics)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                modifier = Modifier.align(Alignment.End).testTag("retry_analysis_button")
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = "Retry", modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Retry Analysis", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                    if (state.fallbackResult != null) {
                        AiResultCard(result = state.fallbackResult, onDismiss = { viewModel.resetJournalAiState() })
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
                // Trigger the analysis
                val temporaryReflection = JournalEntity(
                    date = todayDateStr,
                    whatIDid = whatIDid,
                    whatWentWell = whatWentWell,
                    whatToImprove = whatToImprove,
                    tomorrowPriorities = tomorrowPriorities
                )
                val todayTasks = viewModel.tasks.value.filter { it.dueDate == todayDateStr }
                val completedTodayTasks = todayTasks.count { it.isCompleted }
                val spentToday = viewModel.transactions.value
                    .filter { it.date == todayDateStr && it.type == "expense" }
                    .sumOf { it.amount }
                val studyMinutes = viewModel.dailyStudyTargetMinutes.value
                val metrics = mapOf(
                    "totalTasks" to todayTasks.size,
                    "completedTasks" to completedTodayTasks,
                    "spentToday" to spentToday,
                    "studyMinutes" to studyMinutes,
                    "studyTarget" to viewModel.dailyStudyTargetMinutes.value
                )
                viewModel.analyzeJournal(temporaryReflection, metrics)
            }
        )
    }
}

@Composable
fun AiConsentDialog(
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Security,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text("AI Privacy Consent")
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Before you enable the AI Coach analysis with Gemini, please review our privacy parameters:",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "• Local Storage: All your tasks, transactions, and learning history remain securely stored in your local on-device Room Database.",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "• Manual Transmissions: No data is ever uploaded in the background. Your selected journal text or aggregated retrospective metrics are ONLY sent to the secure Gemini API when you explicitly and manually click the 'Analyze' buttons.",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "• Completely Optional: AI analysis is 100% optional. The app's full local capability runs offline without any internet connection or remote services.",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "• Easy Revocation: You can toggle off the AI Coach or reset your consent preferences at any time from the Settings menu.",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                modifier = Modifier.testTag("consent_confirm_button")
            ) {
                Text("I Understand and Continue")
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                modifier = Modifier.testTag("consent_cancel_button")
            ) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun AiResultCard(
    result: com.example.data.ai.AiCoachResult,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("ai_coach_result_card"),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = if (result.isLocalFallback) {
                MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
            } else {
                MaterialTheme.colorScheme.primary.copy(alpha = 0.4f)
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = if (result.isLocalFallback) Icons.Default.Tune else Icons.Default.AutoAwesome,
                        contentDescription = null,
                        tint = if (result.isLocalFallback) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary
                    )
                    Column {
                        Text(
                            text = if (result.isLocalFallback) "Local Fallback Result" else "Gemini AI Result",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (result.isLocalFallback) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Generated ${java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault()).format(java.util.Date(result.timestamp))}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Score Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (result.isLocalFallback) {
                                MaterialTheme.colorScheme.secondaryContainer
                            } else {
                                MaterialTheme.colorScheme.primaryContainer
                            }
                        )
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "Score: ${result.score}/10",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (result.isLocalFallback) {
                            MaterialTheme.colorScheme.onSecondaryContainer
                        } else {
                            MaterialTheme.colorScheme.onPrimaryContainer
                        }
                    )
                }
            }

            // Fallback Banner
            if (result.isLocalFallback) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.2f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = if (!result.fallbackReason.isNullOrBlank()) {
                                "Local Fallback: ${result.fallbackReason}"
                            } else {
                                "Local Fallback Result: Local diagnostic engine generated this analysis."
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Summary
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Summary Insight",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = result.summary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

            // Strengths and Weaknesses
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Strengths
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "Strengths",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    result.strengths.forEach { item ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text("•", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                            Text(
                                text = item,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // Weaknesses / Growth Areas
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "Growth Areas",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )
                    result.weaknesses.forEach { item ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text("•", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                            Text(
                                text = item,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

            // Practical Suggestions
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "Strategic Suggestions",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                result.suggestions.forEach { item ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = Icons.Default.TipsAndUpdates,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(14.dp).padding(top = 2.dp)
                        )
                        Text(
                            text = item,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Priorities
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "Core Action Priorities",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                result.priorities.forEachIndexed { idx, item ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.secondary),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${idx + 1}",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondary
                            )
                        }
                        Text(
                            text = item,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Risk to Avoid Callout Box
            if (result.riskToAvoid.isNotBlank()) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.15f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(20.dp)
                        )
                        Column {
                            Text(
                                text = "Risk to Avoid",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                            Text(
                                text = result.riskToAvoid,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }

            // Safety notice
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "AI-generated content may be inaccurate",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )
            }

            // Action Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.testTag("dismiss_ai_analysis_button")
                ) {
                    Text("Clear Reflection Analysis")
                }
            }
        }
    }
}
