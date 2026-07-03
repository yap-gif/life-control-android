package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Alignment
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Assignment
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.ui.MainViewModel
import com.example.ui.screens.*
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                MainAppContainer(viewModel = viewModel)
            }
        }
    }
}

sealed class NavigationTab(
    val route: String,
    val title: String,
    val filledIcon: ImageVector,
    val outlinedIcon: ImageVector
) {
    object Home : NavigationTab("home", "Home", Icons.Filled.Dashboard, Icons.Outlined.Dashboard)
    object Tasks : NavigationTab("tasks", "Tasks", Icons.Filled.Assignment, Icons.Outlined.Assignment)
    object Money : NavigationTab("money", "Money", Icons.Filled.AccountBalanceWallet, Icons.Outlined.AccountBalanceWallet)
    object Learning : NavigationTab("learning", "Learning", Icons.Filled.School, Icons.Outlined.School)
    object Journal : NavigationTab("journal", "Journal", Icons.Filled.EditNote, Icons.Outlined.EditNote)
    object Settings : NavigationTab("settings", "Settings", Icons.Filled.Settings, Icons.Outlined.Settings)
}

@Composable
fun MainAppContainer(viewModel: MainViewModel) {
    val onboardingCompleted by viewModel.onboardingCompleted.collectAsState()

    if (!onboardingCompleted) {
        OnboardingScreen(viewModel = viewModel)
    } else {
        val navController = rememberNavController()
        val navBackStackEntry by navController.currentBackStackEntryAsState()
        val currentRoute = navBackStackEntry?.destination?.route

        val tabs = listOf(
            NavigationTab.Home,
            NavigationTab.Tasks,
            NavigationTab.Money,
            NavigationTab.Learning,
            NavigationTab.Journal,
            NavigationTab.Settings
        )

        Scaffold(
            bottomBar = {
                NavigationBar(
                    modifier = Modifier.testTag("bottom_nav_bar")
                ) {
                    tabs.forEach { tab ->
                        val isSelected = currentRoute == tab.route
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = {
                                if (currentRoute != tab.route) {
                                    navController.navigate(tab.route) {
                                        // Pop up to the start destination of the graph to
                                        // avoid building up a large stack of destinations
                                        popUpTo(NavigationTab.Home.route) {
                                            saveState = true
                                        }
                                        // Avoid multiple copies of the same destination when
                                        // reselecting the same item
                                        launchSingleTop = true
                                        // Restore state when reselecting a previously selected item
                                        restoreState = true
                                    }
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (isSelected) tab.filledIcon else tab.outlinedIcon,
                                    contentDescription = tab.title
                                )
                            },
                            label = {
                                Text(tab.title)
                            },
                            modifier = Modifier.testTag("nav_item_${tab.route}")
                        )
                    }
                }
            },
            modifier = Modifier.fillMaxSize()
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                NavHost(
                    navController = navController,
                    startDestination = NavigationTab.Home.route,
                    modifier = Modifier.fillMaxSize()
                ) {
                    composable(NavigationTab.Home.route) {
                        HomeScreen(
                            viewModel = viewModel,
                            onNavigateToTasks = { navController.navigate(NavigationTab.Tasks.route) },
                            onNavigateToJournal = { navController.navigate(NavigationTab.Journal.route) },
                            onNavigateToSettings = { navController.navigate(NavigationTab.Settings.route) },
                            onNavigateToWeeklyReview = { navController.navigate("weekly_review") },
                            onNavigateToMonthlyReview = { navController.navigate("monthly_review") }
                        )
                    }
                    composable("weekly_review") {
                        WeeklyReviewScreen(
                            viewModel = viewModel,
                            onNavigateBack = { navController.popBackStack() }
                        )
                    }
                    composable("monthly_review") {
                        MonthlyReviewScreen(
                            viewModel = viewModel,
                            onNavigateBack = { navController.popBackStack() }
                        )
                    }
                    composable(NavigationTab.Tasks.route) {
                        TasksScreen(viewModel = viewModel)
                    }
                    composable(NavigationTab.Money.route) {
                        MoneyScreen(viewModel = viewModel)
                    }
                    composable(NavigationTab.Learning.route) {
                        LearningScreen(viewModel = viewModel)
                    }
                    composable(NavigationTab.Journal.route) {
                        JournalScreen(viewModel = viewModel)
                    }
                    composable(NavigationTab.Settings.route) {
                        SettingsScreen(viewModel = viewModel)
                    }
                }
                
                ScreenshotModeIndicator(
                    viewModel = viewModel,
                    modifier = Modifier.align(Alignment.BottomEnd)
                )
            }
        }
    }
}
