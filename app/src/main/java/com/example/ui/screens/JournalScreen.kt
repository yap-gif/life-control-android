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
import com.example.data.local.JournalEntity
import com.example.ui.MainViewModel
import com.example.ui.MockAnalysis

@Composable
fun JournalScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
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

    // Sync input states when today's reflection loads
    LaunchedEffect(todayReflection) {
        if (todayReflection != null) {
            whatIDid = todayReflection.whatIDid
            whatWentWell = todayReflection.whatWentWell
            whatToImprove = todayReflection.whatToImprove
            tomorrowPriorities = todayReflection.tomorrowPriorities
        }
    }

    var showAnalysisDialog by remember { mutableStateOf(false) }
    var activeAnalysis by remember { mutableStateOf<MockAnalysis?>(null) }

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
                    onValueChange = { if (!screenshotModeEnabled) whatIDid = it },
                    placeholder = { Text("List major accomplishments, hours studied, or tasks finished...") },
                    readOnly = screenshotModeEnabled,
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
                    onValueChange = { if (!screenshotModeEnabled) tomorrowPriorities = it },
                    placeholder = { Text("Enter each priority on a new line...") },
                    readOnly = screenshotModeEnabled,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .testTag("journal_priorities_input"),
                    maxLines = 4
                )
            }
        }

        // Save & Analyze Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Button(
                onClick = {
                    viewModel.saveReflection(
                        whatIDid = whatIDid,
                        whatWentWell = whatWentWell,
                        whatToImprove = whatToImprove,
                        tomorrowPriorities = tomorrowPriorities
                    )
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
                    // Save first to ensure the analytics are based on the latest journal inputs!
                    viewModel.saveReflection(
                        whatIDid = whatIDid,
                        whatWentWell = whatWentWell,
                        whatToImprove = whatToImprove,
                        tomorrowPriorities = tomorrowPriorities
                    )
                    // Then generate analysis
                    val temporaryReflection = JournalEntity(
                        date = todayDateStr,
                        whatIDid = whatIDid,
                        whatWentWell = whatWentWell,
                        whatToImprove = whatToImprove,
                        tomorrowPriorities = tomorrowPriorities
                    )
                    activeAnalysis = viewModel.generateLocalAnalysis(temporaryReflection)
                    showAnalysisDialog = true
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
    }

    // Analysis Result Dialog
    if (showAnalysisDialog && activeAnalysis != null) {
        val analysis = activeAnalysis!!
        AlertDialog(
            onDismissRequest = { showAnalysisDialog = false },
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.BarChart,
                        contentDescription = "Analysis Results",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text("Daily Performance Audit", fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Productivity Score Circle Indicator
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(80.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "${analysis.productivityScore}/10",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            Text(
                                text = "Productivity Score",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // Audit Summary
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Summary Insights",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = analysis.summary,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Practical Suggestion
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.TipsAndUpdates,
                                contentDescription = "Suggestion",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                            Text(
                                text = analysis.practicalSuggestion,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Priorities Bullet list
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "Top 3 Priorities for Tomorrow",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        analysis.topPriorities.forEachIndexed { idx, prio ->
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
                                    text = prio,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showAnalysisDialog = false },
                    modifier = Modifier.testTag("dismiss_analysis_button")
                ) {
                    Text("Acknowledge")
                }
            }
        )
    }
}
