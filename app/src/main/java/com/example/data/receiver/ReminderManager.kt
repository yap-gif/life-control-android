package com.example.data.receiver

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

object ReminderManager {

    fun scheduleAll(context: Context) {
        val prefs = context.getSharedPreferences("life_control_prefs", Context.MODE_PRIVATE)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        // Reminder 1: Daily task check-in
        val tasksEnabled = prefs.getBoolean("reminder_tasks_enabled", false)
        val tasksTime = prefs.getString("reminder_tasks_time", "09:00") ?: "09:00"
        scheduleDailyAlarm(context, alarmManager, 1, tasksEnabled, tasksTime, "Daily Task Check-in", "Review your ProjectForge AI tasks for today.")

        // Reminder 2: Daily journal reflection
        val journalEnabled = prefs.getBoolean("reminder_journal_enabled", false)
        val journalTime = prefs.getString("reminder_journal_time", "21:00") ?: "21:00"
        scheduleDailyAlarm(context, alarmManager, 2, journalEnabled, journalTime, "Daily Journal Reflection", "Write one short reflection before the day ends.")

        // Reminder 3: Daily study target reminder
        val studyEnabled = prefs.getBoolean("reminder_study_enabled", false)
        val studyTime = prefs.getString("reminder_study_time", "17:00") ?: "17:00"
        scheduleDailyAlarm(context, alarmManager, 3, studyEnabled, studyTime, "Study Target Reminder", "Study target reminder: stay consistent today.")

        // Reminder 4: Weekly review reminder
        val weeklyEnabled = prefs.getBoolean("reminder_weekly_enabled", false)
        val weeklyTime = prefs.getString("reminder_weekly_time", "10:00") ?: "10:00"
        scheduleWeeklyAlarm(context, alarmManager, 4, weeklyEnabled, weeklyTime, "Weekly Review Reminder", "Weekly review is ready. Check your progress.")
    }

    private fun scheduleDailyAlarm(
        context: Context,
        alarmManager: AlarmManager,
        id: Int,
        enabled: Boolean,
        time: String,
        title: String,
        message: String
    ) {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("message", message)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        alarmManager.cancel(pendingIntent)

        if (!enabled) return

        val parts = time.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: 9
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0

        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1)
        }

        try {
            alarmManager.setRepeating(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                AlarmManager.INTERVAL_DAY,
                pendingIntent
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun scheduleWeeklyAlarm(
        context: Context,
        alarmManager: AlarmManager,
        id: Int,
        enabled: Boolean,
        time: String,
        title: String,
        message: String
    ) {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("message", message)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        alarmManager.cancel(pendingIntent)

        if (!enabled) return

        val parts = time.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: 10
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0

        val calendar = Calendar.getInstance().apply {
            set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY)
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.WEEK_OF_YEAR, 1)
        }

        try {
            alarmManager.setRepeating(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                AlarmManager.INTERVAL_DAY * 7,
                pendingIntent
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
