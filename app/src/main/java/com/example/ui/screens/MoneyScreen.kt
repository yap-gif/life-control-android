package com.example.ui.screens

import android.widget.Toast
import android.app.DatePickerDialog
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Delete
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.TransactionEntity
import com.example.ui.MainViewModel
import java.util.Calendar
import java.util.Locale

@Composable
fun MoneyScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val transactions by viewModel.transactions.collectAsState()
    val savingsGoalPref by viewModel.savingsGoal.collectAsState()
    val screenshotModeEnabled by viewModel.screenshotModeEnabled.collectAsState()

    // Calculations
    val totalIncome = transactions.filter { it.type == "income" }.sumOf { it.amount }
    val totalExpenses = transactions.filter { it.type == "expense" }.sumOf { it.amount }
    val currentSavings = totalIncome - totalExpenses

    val savingsGoalProgress = if (savingsGoalPref > 0) {
        (currentSavings / savingsGoalPref).coerceIn(0.0, 1.0).toFloat()
    } else {
        0f
    }

    var showAddDialog by remember { mutableStateOf(false) }
    var showGoalDialog by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.testTag("add_transaction_fab")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Transaction")
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Money Tracker",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                IconButton(
                    onClick = { showGoalDialog = true },
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.secondaryContainer)
                ) {
                    Icon(
                        imageVector = Icons.Default.TrackChanges,
                        contentDescription = "Set Goal",
                        tint = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }

            // Savings Balance Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = androidx.compose.foundation.BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                ),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Net Balance",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "RM ${String.format(Locale.US, "%.2f", currentSavings)}",
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Bold,
                        color = if (currentSavings >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                    )

                    Divider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF4CAF50))
                                )
                                Text(
                                    text = "Total Income",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = "+RM ${String.format(Locale.US, "%.2f", totalIncome)}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4CAF50)
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.error)
                                )
                                Text(
                                    text = "Total Expenses",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = "-RM ${String.format(Locale.US, "%.2f", totalExpenses)}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }

                    // Savings Goal Progress
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Savings Goal Target",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "Goal: RM ${String.format(Locale.US, "%.0f", savingsGoalPref)}",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        LinearProgressIndicator(
                            progress = { savingsGoalProgress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)
                        )
                    }
                }
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
                        text = "Financial Analytics",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    // 1. Income vs Expense Comparison Bar
                    val totalSum = totalIncome + totalExpenses
                    val incomeWeight = if (totalSum > 0) (totalIncome / totalSum).toFloat() else 0.5f
                    val expenseWeight = if (totalSum > 0) (totalExpenses / totalSum).toFloat() else 0.5f

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Income vs Expenses Ratio",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(16.dp)
                                .clip(RoundedCornerShape(8.dp))
                        ) {
                            if (totalSum == 0.0) {
                                Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)))
                            } else {
                                if (incomeWeight > 0f) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxHeight()
                                            .weight(incomeWeight)
                                            .background(Color(0xFF4CAF50))
                                    )
                                }
                                if (expenseWeight > 0f) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxHeight()
                                            .weight(expenseWeight)
                                            .background(MaterialTheme.colorScheme.error)
                                    )
                                }
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Income: ${if (totalSum > 0) String.format(Locale.US, "%.0f%%", incomeWeight * 100) else "0%"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF4CAF50),
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Expenses: ${if (totalSum > 0) String.format(Locale.US, "%.0f%%", expenseWeight * 100) else "0%"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // 2. Spending by Category
                    val expenses = transactions.filter { it.type == "expense" }
                    if (expenses.isNotEmpty()) {
                        val categorySpending = expenses.groupBy { it.category }
                            .mapValues { it.value.sumOf { t -> t.amount } }
                            .toList()
                            .sortedByDescending { it.second }

                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(
                                text = "Spending by Category",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            categorySpending.take(4).forEach { (cat, amt) ->
                                val proportion = if (totalExpenses > 0) (amt / totalExpenses).toFloat() else 0f
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
                                            text = "RM ${String.format(Locale.US, "%.2f", amt)} (${String.format(Locale.US, "%.0f%%", proportion * 100)})",
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
                                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                                        trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                                    )
                                }
                            }
                        }
                    } else {
                        Text(
                            text = "No expenses recorded yet for category analysis.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                        )
                    }
                }
            }

            // Transactions Header
            Text(
                text = "Transaction History",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            // Transaction List
            if (transactions.isEmpty()) {
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
                                        color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f),
                                        shape = RoundedCornerShape(16.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ReceiptLong,
                                    contentDescription = "No transactions",
                                    tint = MaterialTheme.colorScheme.secondary,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                            Text(
                                text = "No Transactions Recorded",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Keep a secure log of your daily income and expenses. Track your progress toward your financial targets with every transaction.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                lineHeight = 20.sp
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.05f)
                                ),
                                shape = RoundedCornerShape(12.dp),
                                border = androidx.compose.foundation.BorderStroke(
                                    width = 1.dp,
                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                                )
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = "💡 Practical Next Step",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        text = "Tap the Floating Action Button (+) below to record an income or expense. Log educational materials, study courses, or local bills to refine your savings margin!",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                        lineHeight = 16.sp
                                    )
                                }
                            }
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(transactions, key = { it.id }) { txn ->
                        TransactionItem(
                            transaction = txn,
                            screenshotModeEnabled = screenshotModeEnabled,
                            onDelete = { viewModel.deleteTransaction(txn) }
                        )
                    }
                }
            }
        }
    }

    // Goal Setting Dialog
    if (showGoalDialog) {
        var goalInput by remember { mutableStateOf(savingsGoalPref.toString()) }
        AlertDialog(
            onDismissRequest = { showGoalDialog = false },
            title = { Text("Set Savings Goal") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Update your long-term target savings goal (RM):")
                    OutlinedTextField(
                        value = goalInput,
                        onValueChange = { goalInput = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("dialog_savings_goal_input")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val parsed = goalInput.toDoubleOrNull()
                        if (parsed != null && parsed >= 0) {
                            viewModel.updateSavingsGoal(parsed)
                        }
                        showGoalDialog = false
                    },
                    modifier = Modifier.testTag("dialog_save_goal_button")
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showGoalDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Add Transaction Dialog
    if (showAddDialog) {
        AddTransactionDialog(
            onDismiss = { showAddDialog = false },
            onSave = { amount, type, category, note, date ->
                viewModel.addTransaction(amount, type, category, note, date)
                showAddDialog = false
            },
            viewModel = viewModel
        )
    }
}

@Composable
fun TransactionItem(
    transaction: TransactionEntity,
    screenshotModeEnabled: Boolean = false,
    onDelete: () -> Unit
) {
    val isIncome = transaction.type == "income"
    val color = if (isIncome) Color(0xFF4CAF50) else MaterialTheme.colorScheme.error
    val indicatorIcon = if (isIncome) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("transaction_item_${transaction.id}"),
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
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Type Icon Indicator
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = indicatorIcon,
                    contentDescription = transaction.type,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Transaction Info
            Column(modifier = Modifier.weight(1f)) {
                val displayNote = if (screenshotModeEnabled) {
                    if (transaction.type == "income") "Confidential Revenue" else "Confidential Expense"
                } else {
                    if (transaction.note.isNotBlank()) transaction.note else transaction.category
                }
                Text(
                    text = displayNote,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = transaction.category,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "•",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = transaction.date,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Price & Delete
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "${if (isIncome) "+" else "-"}RM ${String.format(Locale.US, "%.2f", transaction.amount)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = color
                )

                IconButton(onClick = onDelete) {
                    Icon(
                        imageVector = Icons.Outlined.Delete,
                        contentDescription = "Delete Transaction",
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionDialog(
    onDismiss: () -> Unit,
    onSave: (Double, String, String, String, String) -> Unit,
    viewModel: MainViewModel
) {
    var amount by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("expense") } // "income" or "expense"
    var category by remember { mutableStateOf("Food") }
    var note by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(viewModel.getTodayDateString()) }

    var isAmountError by remember { mutableStateOf(false) }
    var amountErrorMessage by remember { mutableStateOf("") }

    // Money categories
    val incomeCategories = listOf("Salary", "Freelance", "Other")
    val expenseCategories = listOf("Food", "Transport", "Education", "Tools", "Personal", "Other")

    val categories = if (type == "income") incomeCategories else expenseCategories

    // Auto update category if the list changes
    LaunchedEffect(type) {
        category = categories.first()
    }

    var categoryExpanded by remember { mutableStateOf(false) }
    val localContext = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Transaction") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                // Type Switcher Button Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = { type = "expense" },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (type == "expense") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.surfaceVariant,
                            contentColor = if (type == "expense") Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.weight(1f).testTag("dialog_expense_type_btn")
                    ) {
                        Text("Expense")
                    }

                    Button(
                        onClick = { type = "income" },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (type == "income") Color(0xFF4CAF50) else MaterialTheme.colorScheme.surfaceVariant,
                            contentColor = if (type == "income") Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.weight(1f).testTag("dialog_income_type_btn")
                    ) {
                        Text("Income")
                    }
                }

                // Amount Field
                OutlinedTextField(
                    value = amount,
                    onValueChange = { 
                        amount = it 
                        if (isAmountError) {
                            isAmountError = false
                            amountErrorMessage = ""
                        }
                    },
                    label = { Text("Amount (RM)") },
                    isError = isAmountError,
                    supportingText = {
                        if (isAmountError) {
                            Text(amountErrorMessage, color = MaterialTheme.colorScheme.error)
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("dialog_transaction_amount_input")
                )

                // Category Selector
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

                // Note Field
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Note / Description") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("dialog_transaction_note_input")
                )

                // Date Picker Field
                OutlinedTextField(
                    value = date,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Transaction Date") },
                    trailingIcon = {
                        IconButton(onClick = {
                            val calendar = Calendar.getInstance()
                            if (date.isNotEmpty()) {
                                try {
                                    val parts = date.split("-")
                                    calendar.set(Calendar.YEAR, parts[0].toInt())
                                    calendar.set(Calendar.MONTH, parts[1].toInt() - 1)
                                    calendar.set(Calendar.DAY_OF_MONTH, parts[2].toInt())
                                } catch (e: Exception) { /* use current */ }
                            }
                            DatePickerDialog(
                                localContext,
                                { _, year, month, dayOfMonth ->
                                    date = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth)
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
                    val trimmed = amount.trim()
                    if (trimmed.isEmpty()) {
                        isAmountError = true
                        amountErrorMessage = "Amount is required"
                        Toast.makeText(localContext, "Empty amount", Toast.LENGTH_SHORT).show()
                    } else {
                        val parsedAmt = trimmed.toDoubleOrNull()
                        if (parsedAmt == null) {
                            isAmountError = true
                            amountErrorMessage = "Invalid numeric format"
                            Toast.makeText(localContext, "Invalid amount", Toast.LENGTH_SHORT).show()
                        } else if (parsedAmt < 0) {
                            isAmountError = true
                            amountErrorMessage = "Amount cannot be negative"
                            Toast.makeText(localContext, "Negative amount not allowed", Toast.LENGTH_SHORT).show()
                        } else if (parsedAmt == 0.0) {
                            isAmountError = true
                            amountErrorMessage = "Amount must be greater than zero"
                            Toast.makeText(localContext, "Amount must be positive", Toast.LENGTH_SHORT).show()
                        } else if (category.trim().isEmpty()) {
                            Toast.makeText(localContext, "Missing category", Toast.LENGTH_SHORT).show()
                        } else {
                            onSave(parsedAmt, type, category, note, date)
                        }
                    }
                },
                modifier = Modifier.testTag("dialog_save_transaction_button")
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
