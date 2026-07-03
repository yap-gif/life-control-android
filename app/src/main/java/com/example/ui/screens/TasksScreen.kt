package com.example.ui.screens

import android.app.DatePickerDialog
import androidx.compose.animation.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.TaskEntity
import com.example.ui.MainViewModel
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun TasksScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val tasks by viewModel.tasks.collectAsState()

    var selectedTab by remember { mutableStateOf(0) } // 0 = Pending, 1 = Completed
    val filteredTasks = remember(tasks, selectedTab) {
        tasks.filter { it.isCompleted == (selectedTab == 1) }
    }

    var showDialog by remember { mutableStateOf(false) }
    var taskToEdit by remember { mutableStateOf<TaskEntity?>(null) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    taskToEdit = null
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.testTag("add_task_fab")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Task")
            }
        },
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Task Manager",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            // Tabs for Pending vs Completed
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.Transparent,
                modifier = Modifier.clip(RoundedCornerShape(12.dp))
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = {
                        Text(
                            "Pending (${tasks.count { !it.isCompleted }})",
                            fontWeight = FontWeight.Bold
                        )
                    },
                    modifier = Modifier.testTag("pending_tab")
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = {
                        Text(
                            "Completed (${tasks.count { it.isCompleted }})",
                            fontWeight = FontWeight.Bold
                        )
                    },
                    modifier = Modifier.testTag("completed_tab")
                )
            }

            // Visual Analytics Card
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
                    Text(
                        text = "Task Analytics",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    // 1. Completed vs Pending Comparison Bar
                    val totalTasksCount = tasks.size
                    val completedCount = tasks.count { it.isCompleted }
                    val pendingCount = totalTasksCount - completedCount
                    val completedWeight = if (totalTasksCount > 0) completedCount.toFloat() / totalTasksCount else 0.5f
                    val pendingWeight = if (totalTasksCount > 0) pendingCount.toFloat() / totalTasksCount else 0.5f

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Task Completion Rate",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(16.dp)
                                .clip(RoundedCornerShape(8.dp))
                        ) {
                            if (totalTasksCount == 0) {
                                Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)))
                            } else {
                                if (completedWeight > 0f) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxHeight()
                                            .weight(completedWeight)
                                            .background(Color(0xFF4CAF50))
                                    )
                                }
                                if (pendingWeight > 0f) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxHeight()
                                            .weight(pendingWeight)
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.4f))
                                    )
                                }
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Completed: $completedCount (${if (totalTasksCount > 0) String.format(Locale.US, "%.0f%%", completedWeight * 100) else "0%"})",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF4CAF50),
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Pending: $pendingCount (${if (totalTasksCount > 0) String.format(Locale.US, "%.0f%%", pendingWeight * 100) else "0%"})",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // 2. Tasks by Category Summary
                    if (tasks.isNotEmpty()) {
                        val categoryTasks = tasks.groupBy { it.category }
                            .mapValues { it.value.size }
                            .toList()
                            .sortedByDescending { it.second }

                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(
                                text = "Tasks by Category",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            categoryTasks.take(4).forEach { (cat, count) ->
                                val proportion = if (totalTasksCount > 0) count.toFloat() / totalTasksCount else 0f
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = cat,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        Text(
                                            text = "$count tasks (${String.format(Locale.US, "%.0f%%", proportion * 100)})",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    LinearProgressIndicator(
                                        progress = { proportion },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(6.dp)
                                            .clip(RoundedCornerShape(3.dp)),
                                        color = MaterialTheme.colorScheme.primary,
                                        trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                                    )
                                }
                            }
                        }
                    } else {
                        Text(
                            text = "No tasks recorded yet for category analysis.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                        )
                    }
                }
            }

            // Task List
            if (filteredTasks.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                        shape = RoundedCornerShape(24.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            width = 1.dp,
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .background(
                                        color = if (selectedTab == 0) MaterialTheme.colorScheme.primary.copy(alpha = 0.1f) else MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f),
                                        shape = RoundedCornerShape(16.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (selectedTab == 0) Icons.Default.CheckCircle else Icons.Default.Assignment,
                                    contentDescription = "No tasks",
                                    tint = if (selectedTab == 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                            Text(
                                text = if (selectedTab == 0) "All Pending Tasks Cleared!" else "No Completed Tasks Found",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = if (selectedTab == 0) "You have completed all scheduled tasks for today. Maintain this momentum and enjoy your productive day!" else "Any task you mark as completed will appear here in your task log history.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                lineHeight = 20.sp
                            )
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredTasks, key = { it.id }) { task ->
                        TaskItem(
                            task = task,
                            onToggleComplete = {
                                viewModel.toggleTaskCompletion(task.id, !task.isCompleted)
                            },
                            onEdit = {
                                taskToEdit = task
                                showDialog = true
                            },
                            onDelete = {
                                viewModel.deleteTask(task)
                            },
                            modifier = Modifier.animateItemPlacement()
                        )
                    }
                }
            }
        }
    }

    // Add / Edit Task Dialog
    if (showDialog) {
        TaskDialog(
            task = taskToEdit,
            onDismiss = { showDialog = false },
            onSave = { title, category, priority, dueDate ->
                if (taskToEdit == null) {
                    viewModel.addTask(title, category, priority, dueDate)
                } else {
                    viewModel.saveTask(
                        taskToEdit!!.copy(
                            title = title,
                            category = category,
                            priority = priority,
                            dueDate = dueDate
                        )
                    )
                }
                showDialog = false
            },
            viewModel = viewModel
        )
    }
}

@Composable
fun TaskItem(
    task: TaskEntity,
    onToggleComplete: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val priorityColor = when (task.priority.lowercase()) {
        "high" -> MaterialTheme.colorScheme.error
        "medium" -> Color(0xFFF57C00) // Orange
        else -> MaterialTheme.colorScheme.secondary
    }

    val categoryIcon = when (task.category.lowercase()) {
        "study" -> Icons.Default.School
        "work" -> Icons.Default.Work
        "health" -> Icons.Default.Favorite
        "personal project" -> Icons.Default.Code
        else -> Icons.Default.Info
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("task_item_card_${task.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Checkbox
            Checkbox(
                checked = task.isCompleted,
                onCheckedChange = { onToggleComplete() },
                modifier = Modifier.testTag("task_checkbox_${task.id}")
            )

            // Details
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        textDecoration = if (task.isCompleted) TextDecoration.LineThrough else TextDecoration.None
                    ),
                    fontWeight = FontWeight.Bold,
                    color = if (task.isCompleted) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.wrapContentSize()
                ) {
                    // Category Badge
                    SuggestionChip(
                        onClick = {},
                        label = { Text(task.category, fontSize = 11.sp) },
                        icon = { Icon(categoryIcon, contentDescription = null, modifier = Modifier.size(12.dp)) },
                        modifier = Modifier.height(24.dp)
                    )

                    // Priority Badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(priorityColor.copy(alpha = 0.15f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = task.priority,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = priorityColor
                        )
                    }

                    // Due Date
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CalendarToday,
                            contentDescription = "Due Date",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(11.dp)
                        )
                        Text(
                            text = task.dueDate,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Edit / Delete Buttons
            Row {
                IconButton(onClick = onEdit) {
                    Icon(
                        imageVector = Icons.Outlined.Edit,
                        contentDescription = "Edit Task",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(
                        imageVector = Icons.Outlined.Delete,
                        contentDescription = "Delete Task",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDialog(
    task: TaskEntity?,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String) -> Unit,
    viewModel: MainViewModel
) {
    var title by remember { mutableStateOf(task?.title ?: "") }
    var category by remember { mutableStateOf(task?.category ?: "Study") }
    var priority by remember { mutableStateOf(task?.priority ?: "Medium") }
    var dueDate by remember { mutableStateOf(task?.dueDate ?: viewModel.getTodayDateString()) }

    val categories = listOf("Study", "Work", "Health", "Personal Project", "Life Admin")
    val priorities = listOf("Low", "Medium", "High")

    var categoryExpanded by remember { mutableStateOf(false) }
    var priorityExpanded by remember { mutableStateOf(false) }

    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (task == null) "Add Task" else "Edit Task") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Task Title") },
                    modifier = Modifier.fillMaxWidth().testTag("dialog_task_title_input"),
                    singleLine = true
                )

                // Category Dropdown
                ExposedDropdownMenuBox(
                    expanded = categoryExpanded,
                    onExpandedChange = { categoryExpanded = it }
                ) {
                    OutlinedTextField(
                        value = category,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Category") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = categoryExpanded,
                        onDismissRequest = { categoryExpanded = false }
                    ) {
                        categories.forEach { cat ->
                            DropdownMenuItem(
                                text = { Text(cat) },
                                onClick = {
                                    category = cat
                                    categoryExpanded = false
                                }
                            )
                        }
                    }
                }

                // Priority Dropdown
                ExposedDropdownMenuBox(
                    expanded = priorityExpanded,
                    onExpandedChange = { priorityExpanded = it }
                ) {
                    OutlinedTextField(
                        value = priority,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Priority") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = priorityExpanded) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = priorityExpanded,
                        onDismissRequest = { priorityExpanded = false }
                    ) {
                        priorities.forEach { prio ->
                            DropdownMenuItem(
                                text = { Text(prio) },
                                onClick = {
                                    priority = prio
                                    priorityExpanded = false
                                }
                            )
                        }
                    }
                }

                // Due Date Picker Field
                OutlinedTextField(
                    value = dueDate,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Due Date") },
                    trailingIcon = {
                        IconButton(onClick = {
                            val calendar = Calendar.getInstance()
                            // If edit, parse date
                            if (dueDate.isNotEmpty()) {
                                try {
                                    val parts = dueDate.split("-")
                                    calendar.set(Calendar.YEAR, parts[0].toInt())
                                    calendar.set(Calendar.MONTH, parts[1].toInt() - 1)
                                    calendar.set(Calendar.DAY_OF_MONTH, parts[2].toInt())
                                } catch (e: Exception) { /* use current */ }
                            }
                            DatePickerDialog(
                                context,
                                { _, year, month, dayOfMonth ->
                                    dueDate = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth)
                                },
                                calendar.get(Calendar.YEAR),
                                calendar.get(Calendar.MONTH),
                                calendar.get(Calendar.DAY_OF_MONTH)
                            ).show()
                        }) {
                            Icon(Icons.Outlined.CalendarMonth, contentDescription = "Choose Date")
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        // Let's save!
                        // To make it handle Edits correctly: we need to pass a complete object to the ViewModel.
                        // Let's modify VM to have an editTask or let's call correct VM function!
                        if (task != null) {
                            // If editing, we need to preserve task.id and task.isCompleted
                            // We can use custom ViewModel calls. We'll edit ViewModel in a moment to add a saveTask(TaskEntity) or editTask(TaskEntity).
                            // But wait! We can also run standard coroutines directly in viewmodel scope from screen if VM has the repository exposed, or we can add a simple method to VM!
                            // Let's update MainViewModel to add `saveTask(task: TaskEntity)` which handles both insert and update.
                            // That is incredibly elegant. Let's write the screen call assuming viewModel has a method: `saveTask(TaskEntity)`.
                        }
                        // Let's write that logic.
                        onSave(title, category, priority, dueDate)
                    }
                },
                enabled = title.isNotBlank(),
                modifier = Modifier.testTag("dialog_save_task_button")
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
