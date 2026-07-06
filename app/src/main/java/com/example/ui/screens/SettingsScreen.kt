package com.example.ui.screens

import android.widget.Toast
import androidx.activity.compose.BackHandler
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    viewModel: MainViewModel,
    onNavigateToAnalytics: () -> Unit = {},
    onNavigateToUserGuide: () -> Unit = {},
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

    // Encrypted Backup/Restore States
    var tempEncryptionPassword by remember { mutableStateOf("") }
    var showExportPasswordDialog by remember { mutableStateOf(false) }
    var exportPassword by remember { mutableStateOf("") }
    var exportPasswordConfirm by remember { mutableStateOf("") }
    var exportPasswordVisible by remember { mutableStateOf(false) }
    var exportPasswordConfirmVisible by remember { mutableStateOf(false) }
    var exportPasswordError by remember { mutableStateOf<String?>(null) }

    var showEncryptedRestorePasswordDialog by remember { mutableStateOf(false) }
    var encryptedRestorePassword by remember { mutableStateOf("") }
    var encryptedRestorePasswordVisible by remember { mutableStateOf(false) }
    var encryptedBackupJsonToRestore by remember { mutableStateOf<String?>(null) }
    var restorePasswordError by remember { mutableStateOf<String?>(null) }

    var showResetConfirmDialog by remember { mutableStateOf(false) }
    var resetTypeToConfirm by remember { mutableStateOf<String?>(null) } // "all", "tasks", "finances", "journal", "learning"

    val screenshotModeEnabled by viewModel.screenshotModeEnabled.collectAsState()
    val onboardingCompleted by viewModel.onboardingCompleted.collectAsState()

    var activeSettingsSubpage by remember { mutableStateOf<String?>(null) } // null, "about", "privacy", "readme", "checklist", "permissions"

    BackHandler(enabled = activeSettingsSubpage != null) {
        activeSettingsSubpage = null
    }

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
            "permissions" -> {
                PermissionsSubpage(
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

    val exportEncryptedBackupLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/octet-stream")
    ) { uri ->
        uri?.let {
            try {
                if (tempEncryptionPassword.length >= 8) {
                    val passwordChars = tempEncryptionPassword.toCharArray()
                    val encryptedJson = viewModel.getEncryptedBackupJson(passwordChars)
                    context.contentResolver.openOutputStream(it)?.use { stream ->
                        stream.write(encryptedJson.toByteArray())
                    }
                    // clear sensitive password variables
                    for (i in passwordChars.indices) {
                        passwordChars[i] = '0'
                    }
                    tempEncryptionPassword = ""
                    Toast.makeText(context, "Encrypted backup exported successfully!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Export failed: Password must be at least 8 characters.", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(context, "Export failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                tempEncryptionPassword = ""
            }
        }
    }

    val importEncryptedBackupLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        uri?.let {
            try {
                val json = context.contentResolver.openInputStream(it)?.use { stream ->
                    stream.bufferedReader().readText()
                }
                if (json != null) {
                    val container = com.example.data.repository.BackupEncryption.jsonToContainer(json)
                    val validation = com.example.data.repository.BackupEncryption.validateContainer(container)
                    if (validation.first) {
                        encryptedBackupJsonToRestore = json
                        showEncryptedRestorePasswordDialog = true
                    } else {
                        Toast.makeText(context, validation.second ?: "Invalid encrypted backup file structure.", Toast.LENGTH_LONG).show()
                    }
                } else {
                    Toast.makeText(context, "Failed to read backup file.", Toast.LENGTH_SHORT).show()
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

        // ====================================================================
        // SECTION 1: PROFILE & GOALS
        // ====================================================================
        Text(
            text = "Profile & Goals",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
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
                        text = "Profile Parameters & Benchmarks",
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

        // ====================================================================
        // SECTION 2: AI COACH
        // ====================================================================
        Text(
            text = "AI Coach",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        val aiCoachEnabled by viewModel.aiCoachEnabled.collectAsState()
        val aiAnalysisMode by viewModel.aiAnalysisMode.collectAsState()
        val aiConsentAccepted by viewModel.aiConsentAccepted.collectAsState()

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
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Enable AI Coach",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Enable smart reflection analysis and customized guidance logs.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = aiCoachEnabled,
                        onCheckedChange = { viewModel.updateAiCoachEnabled(it) },
                        modifier = Modifier.testTag("ai_coach_enabled_switch")
                    )
                }

                if (aiCoachEnabled) {
                    Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                    Text(
                        text = "AI Analysis Mode",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { viewModel.updateAiAnalysisMode("local") }
                        ) {
                            RadioButton(
                                selected = aiAnalysisMode == "local",
                                onClick = { viewModel.updateAiAnalysisMode("local") },
                                modifier = Modifier.testTag("ai_mode_local_radio")
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "Local Only",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Uses on-device rule engine. Works 100% offline with zero data leaving the device.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { viewModel.updateAiAnalysisMode("gemini") }
                        ) {
                            RadioButton(
                                selected = aiAnalysisMode == "gemini",
                                onClick = { viewModel.updateAiAnalysisMode("gemini") },
                                modifier = Modifier.testTag("ai_mode_gemini_radio")
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "Gemini AI when available",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Sends selected reflection texts to Gemini for high-impact tailored coaching feedback.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Consent Status",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (aiConsentAccepted) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier.padding(top = 2.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "Privacy Consent Accepted",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            } else {
                                Text(
                                    text = "Consent is required before first Gemini use.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                        if (aiConsentAccepted) {
                            TextButton(
                                onClick = {
                                    viewModel.updateAiConsentAccepted(false)
                                    Toast.makeText(context, "AI consent reset. You will see the prompt again on next analysis.", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.testTag("reset_consent_button")
                            ) {
                                Text("Reset Consent", color = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // ====================================================================
        // SECTION 5: DEMO & PORTFOLIO TOOLS
        // ====================================================================
        Text(
            text = "Demo & Portfolio Tools",
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

        // ====================================================================
        // SECTION 6: USER GUIDE
        // ====================================================================
        Text(
            text = "User Guide",
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
                // Row 1: User Guide Hub launcher
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onNavigateToUserGuide() }
                        .padding(vertical = 8.dp)
                        .testTag("settings_user_guide_hub_row"),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.MenuBook, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column(modifier = Modifier.weight(1f)) {
                        Text("User Guide Hub & First Week Setup", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text("Access offline explanations for task rules, savings formulas, and learning tracks.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Row 2: Re-watch Tutorial Onboarding
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            viewModel.updateOnboardingCompleted(false)
                            Toast.makeText(context, "Onboarding tutorial re-enabled!", Toast.LENGTH_SHORT).show()
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
            }
        }

        // ====================================================================
        // SECTION 7: PRIVACY & DATA
        // ====================================================================
        Text(
            text = "Privacy & Data",
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
                        Text("Verify local storage, offline execution, and optional cloud consent.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        // ====================================================================
        // SECTION 8: ABOUT APP
        // ====================================================================
        Text(
            text = "About App",
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
                // Row 1: About Life Control
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
                        Text("Developer info, tech stack blueprints, and license details.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Row 2: README Generator
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
                        Text("Generate and copy clean Markdown description for GitHub profiles.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.05f))

                // Row 3: App Permissions & Capabilities
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { activeSettingsSubpage = "permissions" }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.Security, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Column(modifier = Modifier.weight(1f)) {
                        Text("App Permissions & Privacy Audit", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text("Verify clean system permission access footprint and offline status.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        // ====================================================================
        // SECTION 9: DEVELOPER / QA TOOLS
        // ====================================================================
        Text(
            text = "Developer / QA Tools",
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

        // ====================================================================
        // SECTION 4: REMINDERS
        // ====================================================================
        Text(
            text = "Reminders",
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

        // ====================================================================
        // SECTION 3: BACKUP & RESTORE
        // ====================================================================
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
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Section 1: Plain JSON Backup
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Plain JSON Backup",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Export and import a complete unencrypted JSON backup file containing all tasks, financial transactions, learning paths, lessons, journal reflections, and benchmark settings.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    // Warning banner
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            MaterialTheme.colorScheme.error.copy(alpha = 0.3f)
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = "Warning",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "This file is readable by anyone who can access it.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

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
                            Text("Export Plain", fontWeight = FontWeight.Bold)
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
                            Text("Restore Plain", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                // Section 2: Encrypted Backup
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Encrypted Backup",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "This file is encrypted and requires a password to restore.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    // Information banner
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Security,
                                contentDescription = "Security",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Secured with military-grade AES-GCM encryption and PBKDF2 key derivation.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                exportPassword = ""
                                exportPasswordConfirm = ""
                                showExportPasswordDialog = true
                            },
                            modifier = Modifier.weight(1f).height(48.dp).testTag("export_encrypted_backup_button"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary
                            )
                        ) {
                            Icon(imageVector = Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Export Encrypted", fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                importEncryptedBackupLauncher.launch(arrayOf("*/*"))
                            },
                            modifier = Modifier.weight(1f).height(48.dp).testTag("import_encrypted_backup_button"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.secondary
                            )
                        ) {
                            Icon(imageVector = Icons.Default.LockOpen, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Restore Encrypted", fontWeight = FontWeight.Bold)
                        }
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
                    text = "Use this non-intrusive checklist to verify key stability and core features of Life Control v3.0.0 Public Portfolio Release.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Checklist Items
                val qaItems = listOf(
                    "Export Encrypted Backup" to "Go to Backup & Restore, click Export Encrypted, enter a password of at least 8 characters, confirm it, and export. Verify a valid .lcbackup file is written to device storage.",
                    "Restore with Correct Password" to "Click Restore Encrypted, select your .lcbackup file, enter the correct password, and click Decrypt & Verify. Then verify the final data restore confirmation behaves atomically.",
                    "Restore with Wrong Password" to "Try restoring an encrypted backup using an incorrect password. Verify the app displays a clear, friendly error, does not crash, and does not alter or delete current data.",
                    "Restore Corrupted Encrypted Backup" to "Try restoring a backup file with corrupted or modified payload contents. Verify it fails gracefully with clear validation/decryption warnings.",
                    "Restore Empty File" to "Select an empty file for restoration and verify that it fails immediately with a clear 'Empty file' or invalid container error.",
                    "Plain JSON in Encrypted Path" to "Try importing an unencrypted plain JSON file through the Restore Encrypted path. Verify the app detects the invalid container structure instantly and prevents password prompt or restoration.",
                    "Restore After Full Reset" to "Wipe the app data via FULL APP RESET, then import and restore your .lcbackup file. Verify that all records (tasks, ledger, study, journal, settings) are fully recovered.",
                    "No Data Loss on Failures" to "Confirm that any failed decryption or validation step completely aborts the restore process and keeps your current on-device data untouched.",
                    "Confirm Password is Not Stored" to "Check that passwords are never retained, logged, or shown in error dialogs, maintaining perfect cryptographic safety.",
                    "Restore After Reinstall" to "Verify that encrypted backups can be restored seamlessly on a fresh install or another device, since key derivation (PBKDF2) is entirely self-contained.",
                    "Plain JSON Backup Works" to "Ensure plain JSON exports and imports continue to function exactly as before, maintaining backward compatibility.",
                    "Privacy Page Explanation" to "Open the Privacy page and verify it details the AES-GCM and PBKDF2 parameters clearly, outlining user responsibility for the local password.",
                    "UI Small Screen Layout" to "Verify that all screens and cards render nicely on small and compact screen layouts, with everything wrapped in scrollable containers.",
                    "Text Wrapping & Large Values" to "Check long titles, category names, and large RM currency values. Verify they wrap safely without text overlapping or clipping cards.",
                    "Dark Theme & High Contrast" to "Verify that color scheme adheres to our Deep Slate theme, ensuring text and important status badges are highly readable under all lighting conditions.",
                    "Accessibility Tap Targets" to "Verify that all clickable rows, check circles, and action buttons have at least 48dp x 48dp of touch area for easy finger taps.",
                    "Screen Reader Support" to "Ensure all main action buttons and meaningful icons have clear, concise content descriptions, while purely decorative icons are set to null.",
                    "AI Consent & Danger Zone Dialogs" to "Verify that AI Consent dialog, Backup Password input dialogs, and Danger Zone Full Reset dialog have clear headers, distinct active/cancel buttons, and destructive warnings.",
                    "Screenshot Mode Privacy" to "Turn on Screenshot Mode. Verify that all sensitive personal journal reflections and specific transaction notes are fully redacted/hidden, while keeping analytics useful with demo data labels."
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

        // ====================================================================
        // SECTION 10: DANGER ZONE
        // ====================================================================
        Text(
            text = "Danger Zone",
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
                text = "Life Control v3.0.0 Public Portfolio Release",
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

    if (showExportPasswordDialog) {
        AlertDialog(
            onDismissRequest = { 
                showExportPasswordDialog = false
                exportPassword = ""
                exportPasswordConfirm = ""
                exportPasswordError = null
            },
            title = { Text("Export Encrypted Backup", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Set a secure password for this backup file. If you lose this password, the backup file can never be decrypted or restored.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    // Warning banner inside the dialog
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Warning: The app does not store your password. Lost passwords cannot be recovered.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(8.dp)
                        )
                    }

                    OutlinedTextField(
                        value = exportPassword,
                        onValueChange = { 
                            exportPassword = it
                            exportPasswordError = null
                        },
                        label = { Text("Enter Password (min 8 chars)") },
                        isError = exportPasswordError != null,
                        modifier = Modifier.fillMaxWidth().testTag("export_password_input"),
                        singleLine = true,
                        visualTransformation = if (exportPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { exportPasswordVisible = !exportPasswordVisible }) {
                                Icon(
                                    imageVector = if (exportPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = "Toggle password visibility"
                                )
                            }
                        }
                    )

                    OutlinedTextField(
                        value = exportPasswordConfirm,
                        onValueChange = { 
                            exportPasswordConfirm = it
                            exportPasswordError = null
                        },
                        label = { Text("Confirm Password") },
                        isError = exportPasswordError != null,
                        supportingText = {
                            if (exportPasswordError != null) {
                                Text(exportPasswordError!!, color = MaterialTheme.colorScheme.error)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().testTag("export_password_confirm_input"),
                        singleLine = true,
                        visualTransformation = if (exportPasswordConfirmVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { exportPasswordConfirmVisible = !exportPasswordConfirmVisible }) {
                                Icon(
                                    imageVector = if (exportPasswordConfirmVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = "Toggle password visibility"
                                )
                            }
                        }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (exportPassword.length < 8) {
                            exportPasswordError = "Password must be at least 8 characters"
                            Toast.makeText(context, "Password must be at least 8 characters", Toast.LENGTH_LONG).show()
                        } else if (exportPassword != exportPasswordConfirm) {
                            exportPasswordError = "Passwords do not match"
                            Toast.makeText(context, "Passwords do not match", Toast.LENGTH_LONG).show()
                        } else {
                            tempEncryptionPassword = exportPassword
                            exportPassword = ""
                            exportPasswordConfirm = ""
                            exportPasswordError = null
                            showExportPasswordDialog = false
                            
                            val dateStr = java.text.SimpleDateFormat("yyyy_MM_dd", java.util.Locale.US).format(java.util.Date())
                            exportEncryptedBackupLauncher.launch("life_control_encrypted_backup_$dateStr.lcbackup")
                        }
                    },
                    modifier = Modifier.testTag("confirm_export_encrypted_button")
                ) {
                    Text("Continue")
                }
            },
            dismissButton = {
                TextButton(onClick = { 
                    showExportPasswordDialog = false
                    exportPassword = ""
                    exportPasswordConfirm = ""
                    exportPasswordError = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showEncryptedRestorePasswordDialog) {
        AlertDialog(
            onDismissRequest = { 
                showEncryptedRestorePasswordDialog = false
                encryptedRestorePassword = ""
                restorePasswordError = null
            },
            title = { Text("Restore Encrypted Backup", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "This file is password-protected. Please enter the correct password to decrypt and restore your data.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Warning: Lost passwords cannot be recovered. Decryption will fail without the exact password.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(8.dp)
                        )
                    }

                    OutlinedTextField(
                        value = encryptedRestorePassword,
                        onValueChange = { 
                            encryptedRestorePassword = it
                            restorePasswordError = null
                        },
                        label = { Text("Backup Password") },
                        isError = restorePasswordError != null,
                        supportingText = {
                            if (restorePasswordError != null) {
                                Text(restorePasswordError!!, color = MaterialTheme.colorScheme.error)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().testTag("encrypted_restore_password_input"),
                        singleLine = true,
                        visualTransformation = if (encryptedRestorePasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { encryptedRestorePasswordVisible = !encryptedRestorePasswordVisible }) {
                                Icon(
                                    imageVector = if (encryptedRestorePasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = "Toggle password visibility"
                                )
                            }
                        }
                    )
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    onClick = {
                        if (encryptedRestorePassword.isEmpty()) {
                            restorePasswordError = "Password cannot be empty"
                            Toast.makeText(context, "Password cannot be empty", Toast.LENGTH_SHORT).show()
                        } else {
                            val passwordChars = encryptedRestorePassword.toCharArray()
                            val (decryptedJson, errorMsg) = viewModel.decryptAndValidateBackup(encryptedBackupJsonToRestore ?: "", passwordChars)
                            for (i in passwordChars.indices) {
                                passwordChars[i] = '0'
                            }
                            if (decryptedJson != null) {
                                encryptedRestorePassword = ""
                                restorePasswordError = null
                                showEncryptedRestorePasswordDialog = false
                                encryptedBackupJsonToRestore = null
                                restoreJsonToConfirm = decryptedJson
                                showRestoreConfirmDialog = true
                            } else {
                                restorePasswordError = errorMsg ?: "Decryption failed"
                                Toast.makeText(context, errorMsg ?: "Restore failed: Decryption failure", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    modifier = Modifier.testTag("confirm_encrypted_restore_button")
                ) {
                    Text("Decrypt & Verify")
                }
            },
            dismissButton = {
                TextButton(onClick = { 
                    showEncryptedRestorePasswordDialog = false
                    encryptedRestorePassword = ""
                    restorePasswordError = null
                }) {
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
                        text = "Life Control v3.0.0 Public Portfolio Release",
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
                    "Version" to "Life Control v3.0.0 Public Portfolio Release",
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
            Triple(Icons.Default.AutoAwesome, "Optional Gemini AI Coach", "The AI Coach is disabled by default and 100% optional. No background AI uploads occur, and no login or cloud databases are used. AI privacy consent is required before any interaction, and requests only happen after manual user action. Journal AI sends only your selected journal text, while Weekly and Monthly AI send aggregated retrospective metrics only (never your full database). You can disable the AI Coach at any time and reset your consent preferences in Settings."),
            Triple(Icons.Default.BugReport, "No Remote Analytics", "No telemetry, behavioral metrics, or analytics tracking SDKs are included. Your personal growth patterns are private to you."),
            Triple(Icons.Default.Storage, "Core Data Stored Natively on Device", "All daily tasks, financial transactions, learning tracks, and journal entries are securely written to your local physical device sandbox in a private Room SQLite file."),
            Triple(Icons.Default.Share, "User-Controlled CSV Export", "CSV spreadsheets containing your historic records are only compiled and shared when you manually trigger the export tool. No background data mining exists."),
            Triple(Icons.Default.Save, "User-Controlled Backup & Restore", "Plain JSON backup files are unencrypted and readable by anyone who accesses them. The new Encrypted Backup option protects your data using a secure, password-based AES-GCM key derived from a password you choose. This password is never stored, displayed, or logged by the app. If you lose your password, the backup file can never be recovered or restored. All backup, decryption, and restoration flows are entirely local, atomic, and user-controlled."),
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
    # ⚡ Life Control v3.0.0 (Public Portfolio Release)
    
    Life Control is a production-ready, local-first Android personal growth and self-management application designed to help individuals track their daily tasks, finances, study routines, and cognitive reflections, now augmented with an optional, secure Gemini AI Performance Coach. Built with a robust offline-first architecture, the application champions complete user privacy and frictionless utility without relying on remote cloud servers, login procedures, or tracking analytics.
    
    ---
    
    ## 🎯 Project Overview
    In a world dominated by constant online distraction, cloud subscription lock-ins, and data-privacy compromises, **Life Control** offers a highly structured, local-only sanctuary. It consolidates five core self-improvement modules into a singular, high-performance, and beautifully themed system:
    1. **Task & Action Items Management**: Structured prioritizing of your daily operations.
    2. **Financial Ledger & Money Ledger**: Localized RM transaction manager with goal milestones.
    3. **Daily Study & Continuous Education**: Interactive discipline-builder with focused lessons.
    4. **Mindful Reflection Journaling**: End-of-day cognitive audit loops and priority setting.
    5. **Retrospective Review Engines**: Analytical weekly and monthly audits of your growth.
    
    ---

    ## 📸 App Screenshots
    *Add your custom portfolio screenshots here to showcase the beautiful interface.*
    
    | Home Dashboard | Task Manager | Money Tracker |
    | :---: | :---: | :---: |
    | `[Placeholder: Home]` | `[Placeholder: Tasks]` | `[Placeholder: Money]` |
    
    | Learning Hub | Reflection Journal | Analytics Hub |
    | :---: | :---: | :---: |
    | `[Placeholder: Learning]` | `[Placeholder: Journal]` | `[Placeholder: Analytics]` |

    ---

    ## 🚀 Key Features
    - **100% Offline-First Persistence**: Powered by structured SQLite databases.
    - **Portfolio-Ready Custom Tools**: Features interactive README generator, visual presentation modes, and CSV export.
    - **Danger Zone Diagnostics**: Hardened full database resetting and clean, transactional JSON backup and restoration.
    - **Accountability Notifications**: Local background workers trigger system alerts on-device exactly when expected.
    - **Screenshot / Portfolio Mode**: Intelligently masks private data and notes with placeholders for safe online showcase.
    
    ---

    ## 📱 Screens & Core Modules
    - **Main Dashboard (Home)**: Aggregates active status percentages, habit counts, and weekly progress charts using custom canvas visualizations.
    - **Task Manager**: Organize tasks by category with interactive checkboxes and floating state cards.
    - **Money Tracker**: Track RM ledger with category chips, spending targets, and balance calculations.
    - **Learning Hub**: Focus on specific tracks like Linux, Cyber Security, Android Dev, or AI Tools with live progress trackers.
    - **Reflection Journal**: Maintain a safe local diary with distraction-obstacle analyzer.
    - **Weekly & Monthly Retrospective**: Audit historic completed tasks and aggregate finances.
    - **Presentation & Demo Mode Panel**: Allows immediate injection of mock records for quick testing and screenshot curation.
    
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
    
    ---

    ## 🧠 Optional AI Coach Privacy Model
    - **Explicit Opt-In Only**: Disabled by default. Requires explicit visual privacy consent before any AI interaction.
    - **User-Directed Analysis**: Gemini AI is called strictly on manual trigger; no background data uploading.
    - **Minimal Footprint Transmission**: Sends only selected journal text or high-level aggregated metrics.
    - **Graceful On-Device Fallback**: If the Gemini API key is unconfigured or unavailable, the app instantly transitions to high-quality local template analysis.
    
    ---

    ## 🗄️ Backup and Restore Model
    - **Plain JSON Backup**: Clear, readable unencrypted JSON export for easy data portability and custom inspections.
    - **Encrypted .lcbackup**: Password-protected backup secured on-device using AES-256-GCM.
    - **Key Derivation safety**: Uses PBKDF2 with HMAC-SHA256 and 150,000 iterations to derive keys locally.
    - **Atomic Integrity Validation**: Fully validates payload keys, iterations, and Base64 structures prior to writing to Room database within a single transaction. Incorrect passwords abort cleanly leaving local data untouched.
    
    ---

    ## 📦 APK Preparation & Release Guide
    The Life Control project is fully structured for simple compilation and production deployment. Follow these procedures to compile the application binary:

    ### 1. Compiling a Debug APK
    The Debug APK is fully suitable for local testing, presentation, and side-loading. It does not require code-signing credentials.
    * **Linux / macOS Bash**:
      ```bash
      ./gradlew assembleDebug
      ```
    * **Windows CMD / PowerShell**:
      ```cmd
      gradlew.bat assembleDebug
      ```
    * **Compiled Output Path**: `app/build/outputs/apk/debug/app-debug.apk`

    ### 2. Compiling a Release APK / App Bundle (AAB)
    Production distribution on the Google Play Store or formal hosting requires an encrypted release keystore.
    * **Compilation Command**:
      ```bash
      ./gradlew assembleRelease
      ```
    * **Security Guardrails**:
      * Never commit your `.jks` keystore files to the repository.
      * Never hardcode or commit keystore passwords in `build.gradle.kts` files. Ensure they are injected at compilation time using system environment variables (e.g., `KEYSTORE_PATH`, `STORE_PASSWORD`).
    
    ---

    ## 📌 Current Release Status
    **Active Public Portfolio Release**: Optimized for GitHub showcase, technical presentation, and APK side-loading. Tested successfully against rigorous Android SDK 24–36 targets.
    
    ---

    ## 📈 Version History & Changelog
    
    ### V3.0.0 (Current Version)
    - **Public Portfolio Release**: Refined user guidelines and prepared technical assets for public GitHub hosting and side-load demonstrations.
    - **Prinstine UI & Polished Layouts**: Validated typography sizing, spacing densities, and scroll behaviors for compact and tablet screen targets.
    - **Screenshot & Portfolio Masking**: Reinforced automated placeholder data replacement to hide private information while keeping graphs visually rich.
    - **Enhanced Manual QA checklist**: Added final repository safety and build verification checklists with visual progress indicators.
    - **Complete Offline Audit Screen**: Added an on-device privacy panel explicitly showcasing zero location, microphone, camera, or contacts exposure.

    ### V2.5.0
    - **Final Release QA Dashboard**: Added a comprehensive Release Verification subpage in Settings grouped into seven distinct verification categories with real-time completion tracking and progress visualizers.
    - **Permission & Capability Audit**: Introduced an explicit offline safety auditor screen clarifying minimal system access permissions and detailing strictly excluded hardware tracking hooks (no GPS, microphone, camera, or SMS).
    - **APK Preparation Guide**: Added fully documented build commands for generating both local Debug APKs and formal signed production Release APKs.
    - **Final Test Matrix**: Embedded a comprehensive, real-time-executable test execution plan containing 14 rigorous verification procedures for pristine app assurance.
    - **Repository Safety Audit**: Audited repository-facing configurations to guarantee zero local API keys are hardcoded, and validated `.env`/`local.properties` Git ignoring rules.

    ### V2.4.0
    - **UI Consistency Polish**: Harmonized vertical spacing, corner radii, padding, empty states, and typography sizes across all screens for a pristine layout.
    - **Accessibility Improvements**: Added semantic content descriptions, touch-target expansion (48dp+), and supportive text for status-labels (On Track, Needs Attention, At Risk) to improve screen reader support.
    - **Responsive Layout Stability**: Wrapped overflow-prone layouts in scrollable containers, fixed dialog height overflows, and ensured safe wrapping of long titles and currency values.
    - **Navigation Polish**: Streamlined Back-handling, resolved subpage routing, and ensured seamless transitions to and from the Analytics Hub and User Guide subpages.
    - **Dialog & Form Validation Polish**: Hardened inputs with short, clear user-facing validation errors for empty fields, invalid amounts, and short passwords.
    - **Screenshot & Portfolio Readiness**: Hidden personal journal entries and ledger notes in Screenshot Mode to enable pristine showcasing.

    ### V2.3.0
    - **User Guide Hub**: A comprehensive, offline documentation center accessible from the dashboard and Settings, covering daily tasks, financial logs, structured learning paths, reflection diaries, and analytics features.
    - **First Week Setup Checklist**: A step-by-step onboarding wizard showing real-time setup completion progress (%) and persisting task status locally in persistent shared preferences.
    - **Improved Empty State Actions**: Contextual call-to-actions on empty screens providing friendly guidance, helpful reminders, and instant access to default portfolio seedings.
    - **Backup, AI Coach & Privacy Guides**: Full, offline-safe explanation sub-sections detailed inside the main user guide explaining local storage limits, optional cloud integrations, and password-backed AES-GCM recovery rules.
    - **Settings Screen Reorganization**: Clearer modular groupings of settings options divided into ten clean, highly scan-friendly visual cards.

    ### V2.2.1
    - **Encrypted Backup Validation Hardening**: Validates presence of all keys, verifies iterations safety threshold, and confirms Base64 validity of salt, IV, and payload before decrypting.
    - **Wrong Password Restore Safety**: Wrong passwords abort immediately and cleanly without crashing or corrupting current on-device data.
    - **Corrupted File Handling**: Gracefully catches modified, truncated, plain JSON, or empty files during restoration, presenting concise user-friendly error banners.
    - **Atomic Restore Flow Verification**: Moves decryption and structure validation ahead of database mutation, keeping all operations strictly in atomic Room SQLite transactions.
    - **Backup Compatibility**: Fully supports plain JSON and legacy unencrypted configurations alongside robust .lcbackup imports.
    - **Password UX & Warning Hardening**: Expanded dialogue alert callouts on both export and import screens to prevent password recovery issues.
    - **Encryption QA Checklist Updates**: Complete manual checklist update covering 12 edge cases.

    ### V2.2.0
    - **Optional Encrypted Backup**: Protect your database backup with an AES-GCM password-encrypted payload.
    - **PBKDF2 Key Derivation**: Derives high-entropy 256-bit AES encryption keys locally using PBKDF2 with HMAC-SHA256 and 150,000 iterations.
    - **Secure User Password Input**: Password input validation checks and visibility toggles on both export and restore dialogs.
    - **Atomic Restoration Integrity**: Restoration requires decryption verification and full schema validation before writing. Runs atomically in single database transactions.
    - **Enhanced Privacy Page**: Reflected encrypted backup warnings, explaining local password policy and security parameters.

    ### V2.1.1
    - **Analytics calculation hardening**: Audited and hardened all local metrics calculations in the Analytics Hub.
    - **Date range accuracy improvements**: Restructured 7-day and 30-day calculations to strictly include today and respective previous days.
    - **Savings forecast edge-case handling**: Resolved timeline projections for zero goals, deficit spending, or stagnant income rates.
    - **Journal streak validation**: Verified correct streak calculation handling duplicate entries, leap years, and missing timestamps.
    - **Goal Forecast explanation labels**: Added detailed local reasoning texts for "On Track", "Needs Attention", and "At Risk" statuses.
    - **Analytics QA checklist updates**: Expanded offline diagnostics and verification criteria for local calculation logic.

    ### V2.1.0
    - **Analytics Hub**: New offline-first visual dashboard analyzing tasks, financials, study paths, and journal streaks.
    - **Task Trend Insights**: Computes 7d & 30d completion rates, category stats, priority rates, and suggests local growth areas.
    - **Money Trend Insights**: Projections, average daily spending, and category spend summaries.
    - **Learning Progress Analytics**: Syllabus completion indicators with lesson fraction displays.
    - **Journal Consistency Analytics**: Longest and current streak tracking using safe, local metadata.
    - **Savings Goal Forecast**: Multi-week timelines estimating savings milestones.
    - **Local-only visual analytics**: 100% on-device data computation prioritizing user privacy.

    ### V2.0.1
    - **AI Privacy Audit & Hardening**: Reviewed the AI privacy consent flow. Confirmed AI Coach is disabled by default, requiring manual opt-in. Aggregated reviews are manual and transmit only selected metrics or text under manual user action.
    - **Configuration Safety**: Cleaned up API key exposure vectors. Added a graceful warning if Gemini API keys are unconfigured and automatically transitioned requests to local fallbacks.
    - **Gemini Request Safety**: Enhanced request logic with explicit timeout handling, Retry options in Journal, Weekly, and Monthly states, robust JSON validation, and score range constraints.
    - **Prompt & Output Sanitization**: Improved prompts with strict medical, legal, and financial guardrails. Sanitized and clamped response values to prevent UI disruptions.
    
    ### V2.0
    - **Optional Gemini AI Coaching**: Multi-dimensional diagnostic reviews for Journal, Weekly, and Monthly retrospectives.
    - **Security & Privacy Safeguards**: Explicit privacy consent dialogs and automatic offline local analytics fallback.
    - **Gradle Wrapper & Secrets**: Upgraded system parameters, build automation wrapper, and secure BuildConfig credentials.
    
    ### V1.3.1
    
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
    
    ---

    ## 👨‍💻 Developer
    Developed by **YAP SHI XIAN** as a pristine demonstration of professional, modern Android software development principles.
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

private data class ChecklistGroup(val name: String, val items: List<String>)

@Composable
private fun ChecklistSubpage(
    onBack: () -> Unit
) {
    val groups = remember {
        listOf(
            ChecklistGroup(
                "A. Core App Modules",
                listOf(
                    "Fresh install (starts in clean state)",
                    "Onboarding checklist works",
                    "Demo data insertion (rich sample state loaded)",
                    "Screenshot Mode active (perfect redacted placeholders)",
                    "Home Dashboard (percentages and progress render)",
                    "Task Manager (categories and task cards work)",
                    "Money Tracker (RM balance ledger and categories work)",
                    "Learning Hub (course tracks and lesson checklists work)",
                    "Reflection Journal (diary entries and obstacles work)"
                )
            ),
            ChecklistGroup(
                "B. Reviews & Analytics",
                listOf(
                    "Weekly Review (loads historic stats correctly)",
                    "Monthly Review (collates monthly metrics correctly)",
                    "Analytics Hub (computes accurate 7d & 30d trends)",
                    "Goal Forecast (timelines and status labels work)",
                    "Empty states are safe and user-friendly"
                )
            ),
            ChecklistGroup(
                "C. AI Coach Security",
                listOf(
                    "AI Coach disabled by default",
                    "AI privacy consent dialog appears before first use",
                    "Local fallback works when Gemini is disconnected",
                    "No background AI uploading",
                    "Journal AI only sends selected entry text",
                    "Weekly & Monthly AI use aggregated metrics only"
                )
            ),
            ChecklistGroup(
                "D. Backup & Restore",
                listOf(
                    "Plain JSON export works (readable on-device file)",
                    "Plain JSON restore works",
                    "Encrypted .lcbackup export works (AES-256-GCM)",
                    "Encrypted .lcbackup restore works with correct password",
                    "Wrong password decryption fails safely (data untouched)",
                    "Corrupted file restore handled safely (no crashes)"
                )
            ),
            ChecklistGroup(
                "E. Privacy, Data & Reset",
                listOf(
                    "Privacy & Data page is clear and accurate",
                    "No login required / completely local storage",
                    "No cloud database / no remote analytics",
                    "Passwords are never stored by the app",
                    "User-controlled CSV export works",
                    "Full App Reset wipes SQLite modules safely",
                    "Permissions & Privacy Audit screen is fully accurate"
                )
            ),
            ChecklistGroup(
                "F. UI & Accessibility",
                listOf(
                    "Small screen layout responsiveness (no clipping)",
                    "Dark theme contrast is highly readable",
                    "Long text wraps safely in all cards",
                    "Touch targets are at least 48dp x 48dp",
                    "Screen reader content descriptions exist"
                )
            ),
            ChecklistGroup(
                "G. Repository Safety Checklist",
                listOf(
                    "README updated to v3.0.0 Public Portfolio Release",
                    "Version history and changelog updated",
                    "No real Gemini API key committed in source",
                    "'.env' ignored in git",
                    "'.env.example' has placeholders only",
                    "'local.properties' ignored",
                    "No real backup JSON files committed",
                    "No real CSV exports committed",
                    "No real '.lcbackup' files committed",
                    "Gradle Wrapper files exist",
                    "Debug build command documented (./gradlew assembleDebug)",
                    "Release signing warning documented (never commit keys/passwords)",
                    "Screenshots folder planned in repository",
                    "GitHub Release notes ready"
                )
            )
        )
    }

    val totalItems = remember(groups) { groups.sumOf { it.items.size } }
    val checkedStates = remember { androidx.compose.runtime.mutableStateListOf(*Array(totalItems) { false }) }
    val completedCount = checkedStates.count { it }
    val progress = if (totalItems > 0) completedCount.toFloat() / totalItems else 0f
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
                        text = "$completedCount of $totalItems verified",
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

        groups.forEachIndexed { groupIdx, group ->
            val startIdx = remember(groups, groupIdx) {
                groups.take(groupIdx).sumOf { it.items.size }
            }
            val groupCheckedCount = group.items.indices.count { checkedStates[startIdx + it] }
            val groupProgress = if (group.items.isNotEmpty()) groupCheckedCount.toFloat() / group.items.size else 0f
            val groupPercent = (groupProgress * 100).toInt()

            Text(
                text = "${group.name} ($groupCheckedCount/${group.items.size} verified)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.padding(top = 8.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(width = 1.dp, color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 6.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        LinearProgressIndicator(
                            progress = groupProgress,
                            modifier = Modifier
                                .weight(1f)
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp)),
                            color = MaterialTheme.colorScheme.secondary,
                            trackColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.1f)
                        )
                        Text(
                            text = "$groupPercent%",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    group.items.forEachIndexed { itemIdx, item ->
                        val absoluteIdx = startIdx + itemIdx
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { checkedStates[absoluteIdx] = !checkedStates[absoluteIdx] }
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Checkbox(
                                checked = checkedStates[absoluteIdx],
                                onCheckedChange = { checkedStates[absoluteIdx] = it ?: false },
                                colors = CheckboxDefaults.colors(checkedColor = MaterialTheme.colorScheme.primary)
                            )
                            Text(
                                text = item,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = if (checkedStates[absoluteIdx]) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (checkedStates[absoluteIdx]) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                            )
                        }
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

@Composable
private fun PermissionsSubpage(
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
                text = "Permissions & Privacy Audit",
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
                    text = "Declared App Permissions",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Life Control requires a very narrow permissions footprint. We strictly utilize on-device, sandbox storage and standard notification capabilities.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Notification Permission",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Used exclusively for local reminders, routines, task accountability, and daily reflections. Rest assured, no cloud notification servers (FCM) are contacted.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Language,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Internet Access",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Used solely to send optional, user-initiated text/aggregated metrics to the Gemini AI Coach model. This capability is strictly opt-in and disabled by default.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Local Storage / SAF (Storage Access Framework)",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Used only when the user requests manual CSV data export or triggers backup and restore operations (.lcbackup / plain JSON).",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
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
                    text = "Strictly Excluded Footprint",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.error
                )
                Text(
                    text = "To guarantee absolute local-first privacy, the following sensor and system access hooks are 100% excluded from the source code and manifest:",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                val excludedCapabilities = listOf(
                    "No Location Tracking" to "Geographic coordinates (GPS / WiFi location) are never requested or stored.",
                    "No Contacts Access" to "We have absolutely no access to your address book, phone numbers, or social graphs.",
                    "No Camera Access" to "Camera hardware permissions are omitted; no pictures, scanning, or recording.",
                    "No Microphone / Voice" to "Audio recording and voice tracking are completely absent.",
                    "No SMS or Cellular Access" to "We cannot read, send, or monitor your carrier network messages or call logs.",
                    "No Background Trackers" to "Absolutely no remote analytics, telemetry tools, or crash reporting integrations exist."
                )

                excludedCapabilities.forEach { (title, description) ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(20.dp)
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = title,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}
