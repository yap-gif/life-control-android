package com.example.ui.screens

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val mainLifeGoal by viewModel.mainLifeGoal.collectAsState()
    val monthlyIncomeTarget by viewModel.monthlyIncomeTarget.collectAsState()
    val savingsGoal by viewModel.savingsGoal.collectAsState()
    val dailyStudyTargetMinutes by viewModel.dailyStudyTargetMinutes.collectAsState()

    val tasks by viewModel.tasks.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val learningPaths by viewModel.learningPaths.collectAsState()
    val lessons by viewModel.allLessons.collectAsState()
    val journals by viewModel.journalReflections.collectAsState()

    // Reminder States
    val reminderTasksEnabled by viewModel.reminderTasksEnabled.collectAsState()
    val reminderTasksTime by viewModel.reminderTasksTime.collectAsState()
    val reminderJournalEnabled by viewModel.reminderJournalEnabled.collectAsState()
    val reminderJournalTime by viewModel.reminderJournalTime.collectAsState()
    val reminderStudyEnabled by viewModel.reminderStudyEnabled.collectAsState()
    val reminderStudyTime by viewModel.reminderStudyTime.collectAsState()
    val reminderWeeklyEnabled by viewModel.reminderWeeklyEnabled.collectAsState()
    val reminderWeeklyTime by viewModel.reminderWeeklyTime.collectAsState()

    // Temporary editor states
    var goalInput by remember { mutableStateOf("") }
    var incomeInput by remember { mutableStateOf("") }
    var savingsInput by remember { mutableStateOf("") }
    var studyInput by remember { mutableStateOf("") }

    // Dialog & Confirmation states
    var showRestoreConfirmDialog by remember { mutableStateOf(false) }
    var restoreJsonToConfirm by remember { mutableStateOf<String?>(null) }

    var showResetConfirmDialog by remember { mutableStateOf(false) }
    var resetTypeToConfirm by remember { mutableStateOf<String?>(null) } // "all", "tasks", "finances", "journal", "learning"

    val screenshotModeEnabled by viewModel.screenshotModeEnabled.collectAsState()
    val onboardingCompleted by viewModel.onboardingCompleted.collectAsState()

    var activeSettingsSubpage by remember { mutableStateOf<String?>(null) } // null, "about", "privacy", "readme"

    var showDemoInsertConfirm by remember { mutableStateOf(false) }
    var showDemoClearConfirm by remember { mutableStateOf(false) }
    var showDemoResetConfirm by remember { mutableStateOf(false) }

    // Synchronize inputs when preference values load
    LaunchedEffect(mainLifeGoal, monthlyIncomeTarget, savingsGoal, dailyStudyTargetMinutes) {
        goalInput = mainLifeGoal
        incomeInput = monthlyIncomeTarget.toString()
        savingsInput = savingsGoal.toString()
        studyInput = dailyStudyTargetMinutes.toString()
    }

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    if (activeSettingsSubpage != null) {
        when (activeSettingsSubpage) {
            "about" -> {
                AboutSubpage(
                    onBack = { activeSettingsSubpage = null }
                )
            }
            "privacy" -> {
                PrivacySubpage(
                    onBack = { activeSettingsSubpage = null }
                )
            }
            "readme" -> {
                ReadmeSubpage(
                    context = context,
                    onBack = { activeSettingsSubpage = null }
                )
            }
            "checklist" -> {
                ChecklistSubpage(
                    onBack = { activeSettingsSubpage = null }
                )
            }
        }
        return
    }

    // SAF File Launchers
    val exportBackupLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        uri?.let {
            try {
                val json = viewModel.getBackupJson()
                context.contentResolver.openOutputStream(it)?.use { stream ->
                    stream.write(json.toByteArray())
                }
                Toast.makeText(context, "Full backup exported successfully!", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(context, "Export failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    val importBackupLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        uri?.let {
            try {
                val json = context.contentResolver.openInputStream(it)?.use { stream ->
                    stream.bufferedReader().readText()
                }
                if (json != null) {
                    restoreJsonToConfirm = json
                    showRestoreConfirmDialog = true
                } else {
                    Toast.makeText(context, "Failed to read backup file", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(context, "Import failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    var pendingTypeToEnable by remember { mutableStateOf<String?>(null) }
    var showPermissionRationaleDialog by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            Toast.makeText(context, "Notification permission granted!", Toast.LENGTH_SHORT).show()
            pendingTypeToEnable?.let { type ->
                viewModel.setReminderEnabled(type, true)
            }
        } else {
            Toast.makeText(context, "Permission denied. You can enable notifications in System Settings.", Toast.LENGTH_LONG).show()
        }
        pendingTypeToEnable = null
    }

    fun handleReminderEnabledChange(type: String, enabled: Boolean) {
        if (enabled && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            val hasPermission = androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            
            if (!hasPermission) {
                pendingTypeToEnable = type
                showPermissionRationaleDialog = true
                return
            }
        }
        viewModel.setReminderEnabled(type, enabled)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Text(
            text = "Settings",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )

        Text(
            text = "Configure your personal growth benchmarks, local reminder frequencies, backups, and app resets below.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // 1. Benchmarks Configuration Card
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
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Tune,
                        contentDescription = "Benchmarks",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Independence Parameters",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                // Param 1: Main Life Goal
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "Main Life Goal",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    OutlinedTextField(
                        value = goalInput,
                        onValueChange = { goalInput = it },
                        placeholder = { Text("e.g. Become an Independent Software Engineer") },
                        modifier = Modifier.fillMaxWidth().testTag("settings_goal_input"),
                        singleLine = true
                    )
                }

                // Param 2: Monthly Income Target
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "Monthly Income Target ($)",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    OutlinedTextField(
                        value = incomeInput,
                        onValueChange = { incomeInput = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth().testTag("settings_income_input"),
                        singleLine = true
                    )
                }

                // Param 3: Savings Goal
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "Savings Goal Target ($)",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    OutlinedTextField(
                        value = savingsInput,
                        onValueChange = { savingsInput = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth().testTag("settings_savings_input"),
                        singleLine = true
                    )
                }

                // Param 4: Daily Study Target in Minutes
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "Daily Study Target (Minutes)",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    OutlinedTextField(
                        value = studyInput,
                        onValueChange = { studyInput = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth().testTag("settings_study_input"),
                        singleLine = true
                    )
                }
            }
        }

        // Save Button
        Button(
            onClick = {
                val incomeVal = incomeInput.toDoubleOrNull()
                val savingsVal = savingsInput.toDoubleOrNull()
                val studyVal = studyInput.toIntOrNull()

                if (goalInput.isBlank()) {
                    Toast.makeText(context, "Goal input cannot be blank", Toast.LENGTH_SHORT).show()
                } else if (incomeVal == null || incomeVal < 0) {
                    Toast.makeText(context, "Please enter a valid monthly income target", Toast.LENGTH_SHORT).show()
                } else if (savingsVal == null || savingsVal < 0) {
                    Toast.makeText(context, "Please enter a valid savings goal", Toast.LENGTH_SHORT).show()
                } else if (studyVal == null || studyVal < 0) {
                    Toast.makeText(context, "Please enter a valid study target in minutes", Toast.LENGTH_SHORT).show()
                } else {
                    viewModel.updateMainLifeGoal(goalInput)
                    viewModel.updateMonthlyIncomeTarget(incomeVal)
                    viewModel.updateSavingsGoal(savingsVal)
                    viewModel.updateDailyStudyTargetMinutes(studyVal)
                    Toast.makeText(context, "Settings Saved Successfully!", Toast.LENGTH_SHORT).show()
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .testTag("save_settings_button"),
            shape = RoundedCornerShape(16.dp)
        ) {
            Icon(Icons.Default.Save, contentDescription = "Save")
            Spacer(modifier = Modifier.width(8.dp))
            Text("Save Configurations", fontWeight = FontWeight.Bold)
        }

        // --- Presentation & Demo Mode Section ---
        Text(
            text = "Presentation & Portfolio Tools",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

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
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Subsection 1: Screenshot Mode
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Screenshot / Portfolio Mode",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Hide sensitive personal notes and use clean, polished labels for high-quality screenshots.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = screenshotModeEnabled,
                        onCheckedChange = { viewModel.updateScreenshotModeEnabled(it) },
                        modifier = Modifier.testTag("screenshot_mode_toggle")
                    )
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                // Subsection 2: Demo Data Management
                Text(
                    text = "Demo & Sample Data",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Load pre-configured, rich demo data to immediately inspect reviews, streak metrics, and full app capabilities without manual logging.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { showDemoInsertConfirm = true },
                            modifier = Modifier.weight(1f).height(40.dp).testTag("insert_demo_data_button"),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        ) {
                            Icon(imageVector = Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Insert Demo", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = { showDemoClearConfirm = true },
                            modifier = Modifier.weight(1f).height(40.dp).testTag("clear_demo_data_button"),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer,
                                contentColor = MaterialTheme.colorScheme.onErrorContainer
                            )
                        ) {
                            Icon(imageVector = Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Clear Demo", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Button(
                        onClick = { showDemoResetConfirm = true },
                        modifier = Modifier.fillMaxWidth().height(44.dp).testTag("reset_demo_state_button"),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Icon(imageVector = Icons.Default.Restore, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Reset to Demo Presentation State", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // --- App Info & Documentation Section ---
        Text(
            text = "App Resources",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

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
                // Row 1: About App
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { activeSettingsSubpage = "about" }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column(modifier = Modifier.weight(1f)) {
                        Text("About Life Control", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text("Developer info, tech stack, and build details.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Row 2: Privacy & Data
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { activeSettingsSubpage = "privacy" }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.Security, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Privacy & Data Transparency", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text("Verify local storage, offline execution, and tracking details.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Row 3: Project Summary (README Generator)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { activeSettingsSubpage = "readme" }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.Description, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Portfolio Project README Generator", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text("Generate and copy clean Markdown overview for GitHub.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Row 4: Reset Onboarding / View tutorial
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            viewModel.updateOnboardingCompleted(false)
                            Toast.makeText(context, "Onboarding re-enabled!", Toast.LENGTH_SHORT).show()
                        }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.Refresh, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Re-watch Tutorial Onboarding", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text("Reset the first-launch tutorial stream manually.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Row 5: Manual Release QA Checklist
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { activeSettingsSubpage = "checklist" }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Manual Release QA Checklist", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text("Verify all core features, backups, resets, and privacy protections.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        // 2. Local Reminders Configuration Card
        Text(
            text = "Local Reminders",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

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
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.NotificationsActive,
                        contentDescription = "Notifications",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Daily & Weekly Alarms",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                // Helper to display a single reminder row
                @Composable
                fun ReminderItem(
                    label: String,
                    description: String,
                    enabled: Boolean,
                    time: String,
                    onEnabledChange: (Boolean) -> Unit,
                    onTimeClick: () -> Unit
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .clickable { if (enabled) onTimeClick() }
                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.AccessTime,
                                    contentDescription = "Select Time",
                                    tint = if (enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = time,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                                )
                            }
                        }
                        Switch(
                            checked = enabled,
                            onCheckedChange = onEnabledChange
                        )
                    }
                }

                // Helper time dialog launcher
                fun launchTimePicker(currentTime: String, onTimeSelected: (String) -> Unit) {
                    val parts = currentTime.split(":")
                    val h = parts.getOrNull(0)?.toIntOrNull() ?: 9
                    val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                    android.app.TimePickerDialog(context, { _, selectedHour, selectedMinute ->
                        val formatted = String.format(java.util.Locale.US, "%02d:%02d", selectedHour, selectedMinute)
                        onTimeSelected(formatted)
                    }, h, m, true).show()
                }

                // Task Reminder
                ReminderItem(
                    label = "Daily Task Check-in",
                    description = "Stay accountable on pending roadmap goals.",
                    enabled = reminderTasksEnabled,
                    time = reminderTasksTime,
                    onEnabledChange = { handleReminderEnabledChange("tasks", it) },
                    onTimeClick = { launchTimePicker(reminderTasksTime) { viewModel.setReminderTime("tasks", it) } }
                )

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Journal Reminder
                ReminderItem(
                    label = "Mindfulness Journal Reflection",
                    description = "Reflect on accomplishments before ending your day.",
                    enabled = reminderJournalEnabled,
                    time = reminderJournalTime,
                    onEnabledChange = { handleReminderEnabledChange("journal", it) },
                    onTimeClick = { launchTimePicker(reminderJournalTime) { viewModel.setReminderTime("journal", it) } }
                )

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Study Target Reminder
                ReminderItem(
                    label = "Daily Study Target",
                    description = "Ensure compound growth blocks stay active.",
                    enabled = reminderStudyEnabled,
                    time = reminderStudyTime,
                    onEnabledChange = { handleReminderEnabledChange("study", it) },
                    onTimeClick = { launchTimePicker(reminderStudyTime) { viewModel.setReminderTime("study", it) } }
                )

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Weekly Review Reminder
                ReminderItem(
                    label = "Weekly Review Audit",
                    description = "Consistently review achievements every Sunday.",
                    enabled = reminderWeeklyEnabled,
                    time = reminderWeeklyTime,
                    onEnabledChange = { handleReminderEnabledChange("weekly", it) },
                    onTimeClick = { launchTimePicker(reminderWeeklyTime) { viewModel.setReminderTime("weekly", it) } }
                )
            }
        }

        // 3. Backup & Restore Data Card
        Text(
            text = "Backup & Restore",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

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
                    text = "Full App Data Backup",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Export and import a complete JSON backup file containing all tasks, financial transactions, learning paths, lessons, journal reflections, and benchmark settings.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            val dateStr = java.text.SimpleDateFormat("yyyy_MM_dd", java.util.Locale.US).format(java.util.Date())
                            exportBackupLauncher.launch("life_control_backup_$dateStr.json")
                        },
                        modifier = Modifier.weight(1f).height(48.dp).testTag("export_json_backup_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(imageVector = Icons.Default.CloudUpload, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Export Backup", fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = {
                            importBackupLauncher.launch(arrayOf("application/json", "text/*"))
                        },
                        modifier = Modifier.weight(1f).height(48.dp).testTag("import_json_backup_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.secondary
                        )
                    ) {
                        Icon(imageVector = Icons.Default.CloudDownload, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Restore Backup", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // 4. Data Administration (CSVs) Card
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
                    text = "Export Offline CSVs",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Securely package and share your data in CSV format. This generates independent records for spreadsheets.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Button(
                    onClick = {
                        exportAllToCsv(
                            context = context,
                            tasks = tasks,
                            transactions = transactions,
                            paths = learningPaths,
                            lessons = lessons,
                            journals = journals
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("export_data_button"),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.secondary,
                        contentColor = MaterialTheme.colorScheme.onSecondary
                    )
                ) {
                    Icon(imageVector = Icons.Default.Share, contentDescription = "Export")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Share 5 CSVs Package", fontWeight = FontWeight.Bold)
                }
            }
        }

        // 4.5. Manual QA & Stability Checklist Card
        Text(
            text = "QA & Stability",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

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
                    text = "Manual Verification Checklist",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Use this non-intrusive checklist to verify key stability and core features of Life Control v1.2.1.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Checklist Items
                val qaItems = listOf(
                    "JSON Backup & Restore" to "Go to Backup & Restore, click Export Backup. Ensure a JSON file is written. Try importing a backup to verify restoration.",
                    "Local Alarms & Reminders" to "Enable any alarm. On Android 13+, check that the system permission rationale dialog correctly requests permission.",
                    "Dynamic Performance Audits" to "Go to Home Dashboard, check Weekly Performance and Monthly Performance Reviews to ensure calculations load correctly.",
                    "Danger Zone Safety" to "Try clicking FULL APP RESET. Verify that the button is disabled until you type 'RESET' exactly.",
                    "Persistence & Database Safety" to "Go to Learning tab, make some lessons completed. Restart the app or reset the database to verify persistence and default seeds.",
                    "UI Adaptability" to "Verify that all screens scroll nicely on compact or folded screens, and text maintains modern readable contrast."
                )

                var expandedItemIndex by remember { mutableStateOf<Int?>(null) }

                qaItems.forEachIndexed { index, (title, description) ->
                    val isExpanded = expandedItemIndex == index
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { expandedItemIndex = if (isExpanded) null else index }
                            .background(if (isExpanded) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f) else Color.Transparent)
                            .padding(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = if (isExpanded) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                contentDescription = null,
                                tint = if (isExpanded) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = title,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = "Expand",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        if (isExpanded) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(start = 28.dp)
                            )
                        }
                    }
                }
            }
        }

        // 5. Advanced / Danger Zone Card
        Text(
            text = "Advanced Tools",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.1f)
            ),
            border = androidx.compose.foundation.BorderStroke(
                width = 1.dp,
                color = MaterialTheme.colorScheme.error.copy(alpha = 0.3f)
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Danger Zone",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.error
                )
                Text(
                    text = "These actions delete your offline data. Make sure you have exported backups if you wish to retain your records. Every action requires strict confirmation.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Individual Deletions Grid
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = {
                                resetTypeToConfirm = "tasks"
                                showResetConfirmDialog = true
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Clear Tasks", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = {
                                resetTypeToConfirm = "finances"
                                showResetConfirmDialog = true
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Clear Finances", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = {
                                resetTypeToConfirm = "journal"
                                showResetConfirmDialog = true
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Clear Journals", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = {
                                resetTypeToConfirm = "learning"
                                showResetConfirmDialog = true
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Clear Learning", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Divider(color = MaterialTheme.colorScheme.error.copy(alpha = 0.15f))

                // Full Reset Button
                Button(
                    onClick = {
                        resetTypeToConfirm = "all"
                        showResetConfirmDialog = true
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp).testTag("full_reset_app_button"),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError
                    )
                ) {
                    Icon(imageVector = Icons.Default.DeleteForever, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("FULL APP RESET (WIPE ALL)", fontWeight = FontWeight.Bold)
                }
            }
        }

        // --- Version & Status Footer ---
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = "Life Control v1.3.1 Final Release Candidate",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Offline-first • Local Room Database • No login required",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }

    // Confirmation Dialogs
    if (showRestoreConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showRestoreConfirmDialog = false },
            title = { Text("Confirm Data Restore", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to restore your data from this backup file? This will overwrite all of your current tasks, transactions, learning progress, and journal entries. This action cannot be undone.") },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    onClick = {
                        showRestoreConfirmDialog = false
                        restoreJsonToConfirm?.let { json ->
                            coroutineScope.launch {
                                val success = viewModel.restoreFromJson(json)
                                if (success) {
                                    Toast.makeText(context, "Data restored successfully!", Toast.LENGTH_LONG).show()
                                } else {
                                    Toast.makeText(context, "Restore failed: Invalid or corrupted backup file", Toast.LENGTH_LONG).show()
                                }
                            }
                        }
                    }
                ) {
                    Text("Restore Backup")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRestoreConfirmDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    var resetInput by remember { mutableStateOf("") }

    if (showPermissionRationaleDialog) {
        AlertDialog(
            onDismissRequest = { 
                showPermissionRationaleDialog = false
                pendingTypeToEnable = null
            },
            title = { Text("Notification Permission Required", fontWeight = FontWeight.Bold) },
            text = { Text("To receive daily and weekly reminders about your goals, tasks, and mindfulness journals, please grant the notification permission.") },
            confirmButton = {
                Button(
                    onClick = {
                        showPermissionRationaleDialog = false
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                            permissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                        } else {
                            pendingTypeToEnable?.let { type ->
                                viewModel.setReminderEnabled(type, true)
                            }
                            pendingTypeToEnable = null
                        }
                    }
                ) {
                    Text("Grant Permission")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showPermissionRationaleDialog = false
                        pendingTypeToEnable = null
                    }
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showResetConfirmDialog) {
        val title = when (resetTypeToConfirm) {
            "all" -> "Full App Reset"
            "tasks" -> "Clear All Tasks"
            "finances" -> "Clear All Transactions"
            "journal" -> "Clear All Journal Reflections"
            "learning" -> "Clear All Learning Paths"
            else -> "Confirm Destructive Action"
        }
        val text = when (resetTypeToConfirm) {
            "all" -> "This will permanently delete all of your custom tasks, financial transactions, journal reflections, learning progress, and restore your goals and daily targets to their defaults. It will also reload the initial core technical learning paths. This action is completely irreversible. Are you absolutely sure?"
            "tasks" -> "This will permanently delete all of your tasks. This action cannot be undone. Are you sure?"
            "finances" -> "This will permanently delete all of your income and expense transactions. This action cannot be undone. Are you sure?"
            "journal" -> "This will permanently delete all of your mindfulness journal reflections. This action cannot be undone. Are you sure?"
            "learning" -> "This will permanently delete all of your custom learning paths and lessons. This action cannot be undone. Are you sure?"
            else -> "Are you sure you want to proceed with this destructive action? This cannot be undone."
        }

        AlertDialog(
            onDismissRequest = { 
                showResetConfirmDialog = false
                resetInput = ""
            },
            title = { Text(title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text)
                    if (resetTypeToConfirm == "all") {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Type \"RESET\" below to confirm full application wipe:", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                        OutlinedTextField(
                            value = resetInput,
                            onValueChange = { resetInput = it },
                            placeholder = { Text("RESET") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("dialog_reset_type_input")
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    enabled = resetTypeToConfirm != "all" || resetInput.trim() == "RESET",
                    onClick = {
                        showResetConfirmDialog = false
                        val currentResetType = resetTypeToConfirm
                        resetTypeToConfirm = null
                        resetInput = ""
                        when (currentResetType) {
                            "all" -> {
                                viewModel.resetAllData()
                                Toast.makeText(context, "App fully reset to initial state.", Toast.LENGTH_LONG).show()
                            }
                            "tasks" -> {
                                viewModel.clearTasksOnly()
                                Toast.makeText(context, "All tasks cleared.", Toast.LENGTH_SHORT).show()
                            }
                            "finances" -> {
                                viewModel.clearTransactionsOnly()
                                Toast.makeText(context, "All financial transactions cleared.", Toast.LENGTH_SHORT).show()
                            }
                            "journal" -> {
                                viewModel.clearJournalsOnly()
                                Toast.makeText(context, "All journal reflections cleared.", Toast.LENGTH_SHORT).show()
                            }
                            "learning" -> {
                                viewModel.clearLearningOnly()
                                Toast.makeText(context, "All learning paths and lessons cleared.", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                ) {
                    Text("Delete Permanently")
                }
            },
            dismissButton = {
                TextButton(onClick = { 
                    showResetConfirmDialog = false
                    resetInput = ""
                }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showDemoInsertConfirm) {
        AlertDialog(
            onDismissRequest = { showDemoInsertConfirm = false },
            title = { Text("Confirm Demo Data Insertion", fontWeight = FontWeight.Bold) },
            text = { Text("This will append standard demo records (tasks, transactions, study paths, journal entries) to your database. It will not delete your current data. Proceed?") },
            confirmButton = {
                Button(
                    onClick = {
                        showDemoInsertConfirm = false
                        viewModel.insertDemoData(clearFirst = false)
                        Toast.makeText(context, "Demo data successfully inserted!", Toast.LENGTH_SHORT).show()
                    }
                ) {
                    Text("Insert")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDemoInsertConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showDemoClearConfirm) {
        AlertDialog(
            onDismissRequest = { showDemoClearConfirm = false },
            title = { Text("Confirm Demo Data Cleansing", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error) },
            text = { Text("This will delete ALL core tasks, financial transactions, learning paths, and journal reflections in your local database, reverting to a blank state. This action is irreversible. Proceed?") },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    onClick = {
                        showDemoClearConfirm = false
                        viewModel.clearAllDemoData()
                        Toast.makeText(context, "Database cleared successfully!", Toast.LENGTH_SHORT).show()
                    }
                ) {
                    Text("Clear All")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDemoClearConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showDemoResetConfirm) {
        AlertDialog(
            onDismissRequest = { showDemoResetConfirm = false },
            title = { Text("Reset to Demo Presentation State", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary) },
            text = { Text("This will permanently clear your current database and settings, then load a rich, pre-configured set of portfolio-ready logs and settings (RM targets, streaks, journal review indexes). This is highly recommended for demonstration or screenshot creation. Proceed?") },
            confirmButton = {
                Button(
                    onClick = {
                        showDemoResetConfirm = false
                        viewModel.insertDemoData(clearFirst = true)
                        Toast.makeText(context, "Successfully reset to Demo Presentation State!", Toast.LENGTH_LONG).show()
                    }
                ) {
                    Text("Reset & Load")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDemoResetConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

private fun exportAllToCsv(
    context: android.content.Context,
    tasks: List<com.example.data.local.TaskEntity>,
    transactions: List<com.example.data.local.TransactionEntity>,
    paths: List<com.example.data.local.LearningPathEntity>,
    lessons: List<com.example.data.local.LessonEntity>,
    journals: List<com.example.data.local.JournalEntity>
) {
    try {
        val cacheDir = context.cacheDir
        val tasksFile = java.io.File(cacheDir, "tasks.csv")
        val transactionsFile = java.io.File(cacheDir, "transactions.csv")
        val pathsFile = java.io.File(cacheDir, "learning_paths.csv")
        val lessonsFile = java.io.File(cacheDir, "lessons.csv")
        val journalsFile = java.io.File(cacheDir, "journal_entries.csv")

        fun escapeCsv(value: String): String {
            val escaped = value.replace("\"", "\"\"")
            return if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"")) {
                "\"$escaped\""
            } else {
                escaped
            }
        }

        // 1. tasks.csv
        tasksFile.bufferedWriter().use { writer ->
            writer.write("Id,Title,Category,Priority,DueDate,IsCompleted\n")
            tasks.forEach {
                writer.write("${it.id},${escapeCsv(it.title)},${escapeCsv(it.category)},${escapeCsv(it.priority)},${it.dueDate},${it.isCompleted}\n")
            }
        }

        // 2. transactions.csv - numeric values only, no prefixes
        transactionsFile.bufferedWriter().use { writer ->
            writer.write("Id,Amount,Type,Category,Note,Date\n")
            transactions.forEach {
                writer.write("${it.id},${it.amount},${escapeCsv(it.type)},${escapeCsv(it.category)},${escapeCsv(it.note)},${it.date}\n")
            }
        }

        // 3. learning_paths.csv
        pathsFile.bufferedWriter().use { writer ->
            writer.write("Id,Title,Streak,LastStudiedDate\n")
            paths.forEach {
                writer.write("${it.id},${escapeCsv(it.title)},${it.streak},${it.lastStudiedDate ?: ""}\n")
            }
        }

        // 4. lessons.csv
        lessonsFile.bufferedWriter().use { writer ->
            writer.write("Id,PathId,Title,IsCompleted\n")
            lessons.forEach {
                writer.write("${it.id},${it.pathId},${escapeCsv(it.title)},${it.isCompleted}\n")
            }
        }

        // 5. journal_entries.csv
        journalsFile.bufferedWriter().use { writer ->
            writer.write("Id,Date,WhatIDid,WhatWentWell,WhatToImprove,TomorrowPriorities\n")
            journals.forEach {
                writer.write("${it.id},${it.date},${escapeCsv(it.whatIDid)},${escapeCsv(it.whatWentWell)},${escapeCsv(it.whatToImprove)},${escapeCsv(it.tomorrowPriorities)}\n")
            }
        }

        val authority = "com.example.fileprovider"
        val uris = arrayListOf<android.net.Uri>(
            androidx.core.content.FileProvider.getUriForFile(context, authority, tasksFile),
            androidx.core.content.FileProvider.getUriForFile(context, authority, transactionsFile),
            androidx.core.content.FileProvider.getUriForFile(context, authority, pathsFile),
            androidx.core.content.FileProvider.getUriForFile(context, authority, lessonsFile),
            androidx.core.content.FileProvider.getUriForFile(context, authority, journalsFile)
        )

        val intent = android.content.Intent(android.content.Intent.ACTION_SEND_MULTIPLE).apply {
            type = "text/comma-separated-values"
            putParcelableArrayListExtra(android.content.Intent.EXTRA_STREAM, uris)
            addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(android.content.Intent.createChooser(intent, "Export Life Control CSV Data"))
        Toast.makeText(context, "CSV data packages prepared successfully!", Toast.LENGTH_SHORT).show()
    } catch (e: Exception) {
        e.printStackTrace()
        Toast.makeText(context, "Export Failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
    }
}

@Composable
private fun AboutSubpage(
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
            }
            Text(
                text = "About Life Control",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(100.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.1f))
                ) {
                    Icon(
                        imageVector = Icons.Default.OfflineBolt,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(56.dp)
                    )
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Life Control",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Version 1.3.1 Final Release Candidate",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                Text(
                    text = "Life Control is a personal growth and independence tracker designed to help users manage tasks, finances, learning progress, and daily reflection through a focused offline-first Android experience.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    lineHeight = 22.sp
                )
            }
        }

        Text(
            text = "Technical Blueprint",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val bluePrintItems = listOf(
                    "App Name" to "Life Control",
                    "Version" to "1.3.1 Final Release Candidate",
                    "Developer" to "YAP SHI XIAN",
                    "Project Type" to "Offline-first Android personal growth management app",
                    "Architecture" to "Single-Activity (Clean MVVM + UDF)",
                    "UI Framework" to "Jetpack Compose (Material 3)",
                    "Data Layer" to "Room Database SQLite (DAO + Repository Pattern)",
                    "Storage Mode" to "Local-first Offline Storage"
                )

                bluePrintItems.forEach { (label, value) ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = label,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = value,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            textAlign = TextAlign.End,
                            modifier = Modifier.weight(1f).padding(start = 8.dp)
                        )
                    }
                }
            }
        }

        Text(
            text = "Architecture Summary",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Text(
                text = "Life Control uses a local-first architecture with Room SQLite persistence, structured repositories, and Jetpack Compose UI screens. It does not require login, cloud storage, or external AI APIs in this release.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(16.dp),
                lineHeight = 22.sp
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun PrivacySubpage(
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
            }
            Text(
                text = "Privacy & Data",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }

        val privacyCards = listOf(
            Triple(Icons.Default.Lock, "No Login Required", "No accounts, registrations, or login screens exist. You start managing your growth instantly without providing email addresses or passwords."),
            Triple(Icons.Default.Security, "No Google Firebase", "Google Firebase integration, Crashlytics SDK, and remote performance monitoring are completely excluded to guarantee local application purity."),
            Triple(Icons.Default.CloudOff, "No Cloud Database", "Your routines and records are never sent to remote storage. There are no backend syncing systems or remote servers storing your data."),
            Triple(Icons.Default.OfflineBolt, "No Gemini API in This Version", "This release runs entirely offline with zero external large language model (LLM) or Gemini generative API dependencies."),
            Triple(Icons.Default.BugReport, "No Remote Analytics", "No telemetry, behavioral metrics, or analytics tracking SDKs are included. Your personal growth patterns are private to you."),
            Triple(Icons.Default.Storage, "Core Data Stored Natively on Device", "All daily tasks, financial transactions, learning tracks, and journal entries are securely written to your local physical device sandbox in a private Room SQLite file."),
            Triple(Icons.Default.Share, "User-Controlled CSV Export", "CSV spreadsheets containing your historic records are only compiled and shared when you manually trigger the export tool. No background data mining exists."),
            Triple(Icons.Default.Save, "User-Controlled JSON Backup & Restore", "Full JSON database backup exports and recovery restores are strictly on-demand operations executed under your direct oversight."),
            Triple(Icons.Default.Notifications, "Local Reminders System", "Accountability notifications use the Android system WorkManager or AlarmManager framework. Reminders are generated locally on-device without contacting cloud servers."),
            Triple(Icons.Default.DeleteForever, "User-Controlled Data Reset", "Purging individual sections or executing a complete application wipe is restricted to your confirmation and will never happen automatically.")
        )

        privacyCards.forEach { (icon, title, desc) ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.1f))
                    ) {
                        Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = desc,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 18.sp
                        )
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun ReadmeSubpage(
    context: android.content.Context,
    onBack: () -> Unit
) {
    val readmeContent = """
    # ⚡ Life Control v1.3.1 (Final Release Candidate)
    
    Life Control is a production-ready, local-first Android personal growth and self-management application designed to help individuals track their daily tasks, finances, study routines, and cognitive reflections. Built with a robust offline-first architecture, the application champions complete user privacy and frictionless utility without relying on remote cloud servers, login procedures, or tracking analytics.
    
    ---
    
    ## 👨‍💻 Developer
    Developed by **YAP SHI XIAN** as a pristine demonstration of professional, modern Android software development principles.
    
    ---
    
    ## 🎯 Project Overview
    In a world dominated by constant online distraction, cloud subscription lock-ins, and data-privacy compromises, **Life Control** offers a highly structured, local-only sanctuary. It consolidates five core self-improvement modules into a singular, high-performance, and beautifully themed system:
    1. **Task & Action Items Management**: Structured prioritizing of your daily operations.
    2. **Financial Ledger & Money Ledger**: Localized RM transaction manager with goal milestones.
    3. **Daily Study & Continuous Education**: Interactive discipline-builder with focused lessons.
    4. **Mindful Reflection Journaling**: End-of-day cognitive audit loops and priority setting.
    5. **Retrospective Review Engines**: Analytical weekly and monthly audits of your growth.
    
    ---
    
    ## 📱 Screens & Core Modules
    - **Main Dashboard (Home)**: Aggregates active status percentages, habit counts, and weekly progress charts using custom canvas visualizations.
    - **Task Manager**: Organize tasks by category with interactive checkboxes and floating state cards.
    - **Money Tracker**: Track RM ledger with category chips, spending targets, and balance calculations.
    - **Learning Hub**: Focus on specific tracks like Linux, Cyber Security, Android Dev, or AI Tools with live progress trackers.
    - **Reflection Journal**: Maintain a safe local diary with distraction-obstacle analyzers.
    - **Weekly & Monthly Retrospective**: Audit historic completed tasks and aggregate finances.
    - **Presentation & Demo Mode Panel**: Allows immediate injection of mock records for quick testing and screenshot curation.
    
    ---
    
    ## 🚀 Key Features
    - **100% Offline-First Persistence**: Powered by structured SQLite databases.
    - **Portfolio-Ready Custom Tools**: Features interactive README generator, visual presentation modes, and CSV export.
    - **Danger Zone Diagnostics**: Hardened full database resetting and clean, transactional JSON backup and restoration.
    - **Accountability Notifications**: Local background workers trigger system alerts on-device exactly when expected.
    - **Screenshot / Portfolio Mode**: Intelligently masks private data and notes with placeholders for safe online showcase.
    
    ---
    
    ## 🛠️ Modern Tech Stack
    - **Language**: Kotlin (100% modern programming)
    - **UI Architecture**: Jetpack Compose (Material 3 declarative design)
    - **Database Engine**: Room SQLite with KSP Code Generator
    - **Concurrency & Streams**: Kotlin Coroutines & reactive Flow
    - **Navigation System**: Safe, Type-safe Compose Navigation API
    - **Local Utilities**: WorkManager, AlarmManager, SharedPreferences
    - **Verification Engine**: Robolectric for local JVM unit and screenshot verification
    
    ---
    
    ## 🏗️ Architecture & Blueprint
    Adheres strictly to the principles of Clean Architecture and Unidirectional Data Flow (UDF) within a Single-Activity framework:
    - **Presentation Layer**: Custom Jetpack Compose views observing immutable, reactive UI state from centralized ViewModels.
    - **Domain/Business Logic**: ViewModel manages operations transactionally and exposes flows safely.
    - **Data Layer**: Encapsulates data retrieval via DAOs, unified under repository abstractions for database records and local shared preferences.
    
    ---
    
    ## 🔒 Offline-First Privacy Model
    - **Zero Login Required**: Instant initialization without credentials.
    - **Absolute Local Storage**: Sandboxed database file on physical hardware.
    - **No Third-Party Analytics**: Completely excludes Firebase, Crashlytics, and tracking trackers.
    - **Zero AI Cloud Leaks**: Generates all local analysis locally without external LLM API calls.
    
    ---
    
    ## 📈 Version History & Changelog
    
    ### V1.3.1 (Current Version)
    - **Final Release Preparation**: Safe versioning increments and documentation polish.
    - **Packaging Refinements**: High-fidelity UI styling with clean blueprint definitions.
    - **Manual QA Checklist**: Interactive, integrated release checklist subpage.
    
    ### V1.3
    - **Portfolio Additions**: Integrated About, Privacy details, and Markdown README generator.
    - **Developer Assets**: Added Screenshot Mode toggling and rich Demo Presentation State injection.
    - **Interactive Walkthroughs**: Multi-step tutorial onboarding overlay.
    
    ### V1.2.1
    - **Integrity Improvements**: Added notification permissions handling and safer confirmation states.
    - **Stability Updates**: Transactional JSON safety and data schema checks.
    
    ### V1.2
    - **Backups & Security**: Fully implemented JSON database export and local restore functionality.
    - **Reminders**: Integrated local WorkManager accountability reminders.
    - **Analytics**: Introduced custom graphical review panels.
    
    ### V1.1
    - **Historic Audits**: Developed Weekly retrospective review templates.
    - **Export Capabilities**: Structured multi-document CSV export using FileProvider.
    
    ### V1.0
    - **Foundation**: Established SQLite Room schema, MVVM patterns, Material 3 theming, and five core dashboard screens.
    
    ---
    
    ## 🗺️ Future Roadmap
    1. **Local Gemini AI Integration**: Incorporate local, on-device Gemini Nano execution for offline journal synthesis.
    2. **Encrypted SQLite**: Integrate SQLCipher to encrypt the offline database file.
    3. **Advanced Widget Support**: Native home screen widgets for tracking task lists and RM limits.
    """.trimIndent()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
            }
            Text(
                text = "Portfolio Project README",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }

        Text(
            text = "Copy this production-ready Markdown template directly to your GitHub repository to showcase your skills and system capabilities.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Button(
            onClick = {
                val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                val clip = android.content.ClipData.newPlainText("Life Control README", readmeContent)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(context, "README Markdown copied to clipboard!", Toast.LENGTH_SHORT).show()
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .testTag("copy_readme_button"),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(imageVector = Icons.Default.ContentCopy, contentDescription = "Copy")
            Spacer(modifier = Modifier.width(8.dp))
            Text("Copy README to Clipboard", fontWeight = FontWeight.Bold)
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(width = 1.dp, color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
        ) {
            Text(
                text = readmeContent,
                style = MaterialTheme.typography.bodySmall,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .padding(16.dp)
                    .fillMaxWidth()
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun ChecklistSubpage(
    onBack: () -> Unit
) {
    val checklistItems = listOf(
        "App launches successfully",
        "All bottom navigation tabs work",
        "Tasks can be added, edited, completed, and deleted",
        "Transactions can be added and deleted",
        "Learning lessons can be completed",
        "Journal entries can be created",
        "Weekly review opens safely",
        "Monthly review opens safely",
        "CSV export works",
        "JSON backup export works",
        "JSON restore works",
        "Local reminders can be enabled and disabled",
        "Demo data can be inserted and cleared",
        "Screenshot mode can be enabled and disabled",
        "Full reset requires RESET confirmation",
        "App works after full reset",
        "No private demo data is exposed in screenshot mode"
    )

    // Store checklist states in a local state list
    val checkedStates = remember { androidx.compose.runtime.mutableStateListOf(*Array(checklistItems.size) { false }) }
    val completedCount = checkedStates.count { it }
    val progress = if (checklistItems.isNotEmpty()) completedCount.toFloat() / checklistItems.size else 0f
    val percentPercent = (progress * 100).toInt()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
            }
            Text(
                text = "Manual QA Checklist",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(width = 1.dp, color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Release Verification Progress",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "$completedCount of ${checklistItems.size} verified",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "$percentPercent%",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                LinearProgressIndicator(
                    progress = progress,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f)
                )

                Text(
                    text = "Perform these checks manually before building the final release APK to guarantee zero regressions.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Text(
            text = "Verification Criteria",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                checklistItems.forEachIndexed { index, item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { checkedStates[index] = !checkedStates[index] }
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Checkbox(
                            checked = checkedStates[index],
                            onCheckedChange = { checkedStates[index] = it ?: false },
                            colors = CheckboxDefaults.colors(checkedColor = MaterialTheme.colorScheme.primary)
                        )
                        Text(
                            text = item,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (checkedStates[index]) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (checkedStates[index]) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }

        Button(
            onClick = {
                for (i in checkedStates.indices) {
                    checkedStates[i] = false
                }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Reset Checklist", fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}
