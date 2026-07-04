package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserGuideScreen(
    viewModel: MainViewModel,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    // Persistent checklist state from ViewModel
    val setupProfileGoal by viewModel.setupProfileGoal.collectAsState()
    val connectAiCoach by viewModel.connectAiCoach.collectAsState()
    val customLearningPath by viewModel.customLearningPath.collectAsState()
    val dailyReflection by viewModel.dailyReflection.collectAsState()
    val firstTransaction by viewModel.firstTransaction.collectAsState()
    val triggerReminder by viewModel.triggerReminder.collectAsState()
    val exportBackup by viewModel.exportBackup.collectAsState()

    val checklistItems = listOf(
        Triple("setup_profile_goal", "Setup a Profile & core Life Goal", setupProfileGoal),
        Triple("connect_ai_coach", "Connect optional Gemini AI Coach (or acknowledge fallback)", connectAiCoach),
        Triple("custom_learning_path", "Set up a custom Learning Path with at least 1 lesson", customLearningPath),
        Triple("daily_reflection", "Log a daily reflection entry", dailyReflection),
        Triple("first_transaction", "Create your first financial transaction", firstTransaction),
        Triple("trigger_reminder", "Trigger a local reminder", triggerReminder),
        Triple("export_backup", "Export a secure backup", exportBackup)
    )

    val completedCount = checklistItems.count { it.third }
    val progress = if (checklistItems.isNotEmpty()) completedCount.toFloat() / checklistItems.size else 0f
    val percentProgress = (progress * 100).toInt()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "User Guide Hub",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "First Week Setup & Learning",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.testTag("user_guide_back_button")
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
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            
            // --- First Week Setup Progress Card ---
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("first_week_setup_card"),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ),
                border = androidx.compose.foundation.BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
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
                            imageVector = Icons.Default.AssignmentInd,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(28.dp)
                        )
                        Text(
                            text = "First Week Setup Flow",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    // Progress Bar
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Setup Progress",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "$percentProgress%",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(10.dp)
                                .clip(RoundedCornerShape(5.dp)),
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                        )
                    }

                    Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

                    // Checklist Items
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        checklistItems.forEach { (key, label, isCompleted) ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        viewModel.updateChecklistItem(key, !isCompleted)
                                    }
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Checkbox(
                                    checked = isCompleted,
                                    onCheckedChange = { checked ->
                                        viewModel.updateChecklistItem(key, checked == true)
                                    },
                                    modifier = Modifier.testTag("setup_checkbox_$key")
                                )
                                Text(
                                    text = label,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = if (isCompleted) FontWeight.Normal else FontWeight.Medium,
                                    color = if (isCompleted) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }

            // --- Section Header: Documentation ---
            Text(
                text = "System Guides & Knowledge Hub",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(top = 8.dp)
            )

            // A. Core Life Goal
            GuideItem(
                title = "A. Core Life Goal",
                subtitle = "Define your path & anchor focus",
                icon = Icons.Default.Adjust,
                description = "Setting a core Life Goal in Settings serves as the foundational anchor of your personal independence journey. When you set this benchmark, it automatically populates as your primary focus indicator on the Home Dashboard, reminding you of your ultimate target every time you open the application."
            )

            // B. Connected optional Gemini AI Coach
            GuideItem(
                title = "B. Connected optional Gemini AI Coach",
                subtitle = "Local-first privacy & intelligence",
                icon = Icons.Default.AutoAwesome,
                description = "The Gemini AI Coach is a 100% optional, disabled-by-default component. No background telemetry or automated database synchronization occurs. AI requests only execute upon manual invocation (e.g., clicking 'Analyze Day'). When active, the journal analysis transmits only your narrative text, while weekly and monthly analysis send aggregated numeric metrics (never your full database). If you run offline, a completely private Local Fallback Analyst immediately acts as an alternative to ensure zero external network exposure."
            )

            // C. Custom Learning Path
            GuideItem(
                title = "C. Custom Learning Path",
                subtitle = "Consistently build valuable expertise",
                icon = Icons.Default.School,
                description = "Establishing structured learning paths allows you to systematically acquire skills in areas like cybersecurity or system administration. Keep track of daily study blocks, manage checklists of individual lessons, and maintain study streaks. If your learning roadmap is empty, you can add custom entries or restore the prepopulated technical study paths at any time."
            )

            // D. Daily reflection entry
            GuideItem(
                title = "D. Daily reflection entry",
                subtitle = "Track daily discipline and mindset",
                icon = Icons.Default.EditNote,
                description = "Daily journal reflections help you review accomplishments, bottlenecks, proud moments, and top priorities. Use the integrated analysis tool to review qualitative patterns. Your reflections remain completely offline on your device, private, secure, and under your absolute control."
            )

            // E. First financial transaction
            GuideItem(
                title = "E. First financial transaction",
                subtitle = "Unshackle career and income targets",
                icon = Icons.Default.AccountBalanceWallet,
                description = "Achieving career independence requires healthy cash flow and budget discipline. Log income and daily expenses, track net balance progress against your monthly savings target, and monitor categorization metrics. Every record is stored inside a highly secure offline Room Database."
            )

            // F. Local reminder
            GuideItem(
                title = "F. Local reminder",
                subtitle = "Build powerful consistency loops",
                icon = Icons.Default.NotificationsActive,
                description = "Configure custom reminder frequencies for tasks, study sessions, journal writing, and weekly performance reviews in Settings. These reminders run purely locally on your device via standard Android alarm schedules, requiring zero remote notifications or cloud server triggers."
            )

            // G. Secure backup
            GuideItem(
                title = "G. Secure backup",
                subtitle = "Plain and encrypted local storage",
                icon = Icons.Default.Backup,
                description = "Protect your data against hardware failure with two distinct offline backup formats: Plain JSON Backup (which saves your record collections in readable JSON) and Encrypted Backup (which encrypts the data locally with an ultra-secure AES-256-GCM container utilizing PBKDF2 salt derivation before exporting it as a .lcbackup package. Always store your custom passwords safely, as there are no cloud retrieval methods for lost passwords."
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun GuideItem(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { isExpanded = !isExpanded },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                            RoundedCornerShape(10.dp)
                        ),
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
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Icon(
                    imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (isExpanded) "Collapse" else "Expand",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            AnimatedVisibility(
                visible = isExpanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 22.sp,
                    modifier = Modifier.padding(top = 8.dp, start = 4.dp, end = 4.dp)
                )
            }
        }
    }
}
