package com.example.data.ai

import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class PortfolioAnalysisResult(
    val summary: String,
    val score: Int,
    val strengths: List<String>,
    val weaknesses: List<String>,
    val suggestions: List<String>,
    val priorities: List<String>,
    val riskToAvoid: String,
    val isLocalFallback: Boolean = false,
    val timestamp: Long = System.currentTimeMillis(),
    val fallbackReason: String? = null
)

interface PortfolioReviewService {
    suspend fun analyzeProjectActivity(
        whatIDid: String,
        whatWentWell: String,
        whatToImprove: String,
        tomorrowPriorities: String,
        metrics: Map<String, Any>,
        languageCode: String = "en"
    ): PortfolioAnalysisResult

    suspend fun reviewDocumentationQuality(
        metrics: Map<String, Any>,
        languageCode: String = "en"
    ): PortfolioAnalysisResult

    suspend fun generatePortfolioInsights(
        metrics: Map<String, Any>,
        languageCode: String = "en"
    ): PortfolioAnalysisResult

    suspend fun evaluateReleaseReadiness(
        metrics: Map<String, Any>,
        languageCode: String = "en"
    ): PortfolioAnalysisResult
}

class LocalPortfolioReviewService : PortfolioReviewService {
    override suspend fun analyzeProjectActivity(
        whatIDid: String,
        whatWentWell: String,
        whatToImprove: String,
        tomorrowPriorities: String,
        metrics: Map<String, Any>,
        languageCode: String
    ): PortfolioAnalysisResult = withContext(Dispatchers.Default) {
        val totalTasks = metrics["totalTasks"] as? Int ?: 0
        val completedTasks = metrics["completedTasks"] as? Int ?: 0
        val completionRate = if (totalTasks > 0) completedTasks.toDouble() / totalTasks else 1.0
        val costToday = metrics["spentToday"] as? Double ?: 0.0

        var calculatedScore = (completionRate * 6).toInt()
        if (costToday > 0.0 && costToday < 500.0) calculatedScore += 2 else if (costToday >= 500.0) calculatedScore += 1
        if (whatIDid.isNotBlank()) calculatedScore += 2
        val score = calculatedScore.coerceIn(1, 10)

        val summary = if (languageCode == "zh") {
            when {
                score >= 9 -> "项目活动表现出卓越的推进速度和清晰度。里程碑任务执行极其精准，开发周期管理非常完美。"
                score >= 7 -> "富有成效的一天！团队在各个开发周期中保持了强大的任务执行力和一致的进度控制。"
                score >= 5 -> "进度平稳。虽然项目取得了进展，但某些技术瓶颈或轻微的分心拖慢了交付速度。"
                else -> "今日项目活跃度较低。需要利用该分析重新评估开发计划，消除阻碍，并在明日恢复高效率交付。"
            }
        } else if (languageCode == "ms") {
            when {
                score >= 9 -> "Aktiviti projek menunjukkan kemajuan dan kejelasan yang luar biasa. Tugasan utama dilaksanakan dengan tepat, dan pengurusan kitaran pembangunan sangat mantap."
                score >= 7 -> "Hari yang sangat produktif! Pasukan mengekalkan traksi tugas yang kuat dan kawalan jadual yang konsisten dalam semua fasa pembangunan."
                score >= 5 -> "Kemajuan seimbang. Walaupun ada perkembangan, beberapa kekangan teknikal atau isu sampingan melambatkan kadar penghantaran."
                else -> "Aktiviti projek hari ini adalah rendah. Gunakan penilaian ini untuk menyusun semula rancangan pembangunan, membuang halangan, dan kembali fokus esok."
            }
        } else {
            when {
                score >= 9 -> "Project activity exhibits outstanding velocity and execution clarity. Key tasks were executed with high precision, and release cycles remain well-managed."
                score >= 7 -> "A highly productive day! The team maintained strong task traction and consistent schedule controls across all development phases."
                score >= 5 -> "Balanced progress. While development moved forward, technical bottlenecks or minor scope creep slowed down optimal delivery."
                else -> "Today experienced low project activity. Use this assessment to recalibrate development plans, remove blockers, and resume high-velocity delivery tomorrow."
            }
        }

        val strengthsList = mutableListOf<String>()
        if (whatWentWell.isNotBlank()) {
            whatWentWell.split("\n", "•").map { it.trim().removePrefix("-").trim() }.filter { it.isNotBlank() }.forEach {
                strengthsList.add(it)
            }
        }
        if (strengthsList.isEmpty()) {
            if (languageCode == "zh") {
                if (completionRate >= 0.7) strengthsList.add("高效推进既定开发任务（已完成 $completedTasks / $totalTasks）")
                strengthsList.add("完成项目文档质量评估，保持高交付标准")
            } else if (languageCode == "ms") {
                if (completionRate >= 0.7) strengthsList.add("Pelaksanaan mantap tugasan pembangunan berjadual ($completedTasks/$totalTasks selesai)")
                strengthsList.add("Menyelesaikan penilaian kualiti dokumentasi untuk mengekalkan standard kitaran pelepasan")
            } else {
                if (completionRate >= 0.7) strengthsList.add("Robust execution of scheduled development tasks ($completedTasks/$totalTasks completed)")
                strengthsList.add("Completed documentation quality assessment to sustain high release cycle standards")
            }
        }

        val weaknessesList = mutableListOf<String>()
        if (whatToImprove.isNotBlank()) {
            whatToImprove.split("\n", "•").map { it.trim().removePrefix("-").trim() }.filter { it.isNotBlank() }.forEach {
                weaknessesList.add(it)
            }
        }
        if (weaknessesList.isEmpty()) {
            val pending = totalTasks - completedTasks
            if (languageCode == "zh") {
                if (pending > 0) weaknessesList.add("留下了 $pending 个开发任务未完成")
                weaknessesList.add("检测到一些开发流程阻碍，可能导致细微的发布延迟")
            } else if (languageCode == "ms") {
                if (pending > 0) weaknessesList.add("Meninggalkan $pending tugasan pembangunan belum selesai")
                weaknessesList.add("Mengesan halangan aliran kerja yang berpotensi melambatkan pelepasan versi")
            } else {
                if (pending > 0) weaknessesList.add("Left $pending development tasks incomplete")
                weaknessesList.add("Detected workflow friction that leaves potential for minor release delays")
            }
        }

        val prioritiesList = mutableListOf<String>()
        if (tomorrowPriorities.isNotBlank()) {
            tomorrowPriorities.split("\n", "•").map { it.trim().removePrefix("-").trim() }.filter { it.isNotBlank() }.forEach {
                prioritiesList.add(it)
            }
        }
        if (prioritiesList.isEmpty()) {
            if (languageCode == "zh") {
                prioritiesList.add("落实核心重构模块或当日学习课程")
                prioritiesList.add("进行本地项目管理系统和交付路线图审核")
                prioritiesList.add("在清晨首先重新校准未完成的高优先级发布任务")
            } else if (languageCode == "ms") {
                prioritiesList.add("Laksanakan modul pemfaktoran semula teras atau pelajaran kajian harian")
                prioritiesList.add("Menjalankan lejar projek tempatan dan audit peta jalan penghantaran")
                prioritiesList.add("Menyelaras semula tugasan pelepasan berkeutamaan tinggi pada awal pagi")
            } else {
                prioritiesList.add("Execute core refactoring module or daily study lesson")
                prioritiesList.add("Maintain localized project ledger and delivery roadmap audit")
                prioritiesList.add("Recalibrate incomplete high-priority release tasks first thing in the morning")
            }
        }

        val suggestionsList = if (languageCode == "zh") {
            listOf(
                "在开启社交通知或会议前，首先集中精力处理最关键的代码重构任务（执行‘单任务’法则）。",
                "使用番茄工作法将研发文档审核划分为专注的25分钟模块，以攻克冷启动阻力。",
                "确保在密集的代码编写和版本测试周期之间分配至少15分钟的系统整理时间。"
            )
        } else if (languageCode == "ms") {
            listOf(
                "Mulakan kitaran kerja dengan menyelesaikan keutamaan paling mencabar (peraturan 'Satu Tugas') sebelum membuka peranti komunikasi.",
                "Bahagikan semakan dokumentasi kepada selang tumpuan 25 minit menggunakan teknik Pomodoro untuk mengurangkan rintangan permulaan.",
                "Sediakan sekurang-kurangnya 15 minit rehat antara sesi analisis kod skrin penuh untuk mengekalkan kejelasan kognitif."
            )
        } else {
            listOf(
                "Begin your development block by tackling the single most critical task (the 'One-Task' rule) before checking communication channels.",
                "Chunk document review sessions into focused 25-minute blocks using Pomodoro to beat starting friction.",
                "Ensure you allocate at least 15 minutes of downtime between high-intensity coding and testing blocks."
            )
        }

        val riskToAvoid = if (languageCode == "zh") {
            when {
                completionRate < 0.5 -> "任务积压风险：明天计划不超过3个核心任务，以防止未完成项目阻碍堆积。"
                else -> "研发倦怠风险：请勿为了追赶短期进度而牺牲必要的系统测试和代码审查。保持平稳输出。"
            }
        } else if (languageCode == "ms") {
            when {
                completionRate < 0.5 -> "Risiko backlog tugasan: Sediakan tidak lebih daripada 3 tugasan teras esok untuk mengelakkan tunggakan projek."
                else -> "Risiko keletihan pembangunan: Jangan abai fasa ujian sistem penting untuk mengejar tarikh siap pantas. Kekalkan keseimbangan."
            }
        } else {
            when {
                completionRate < 0.5 -> "Task backlog risk: Do not schedule more than 3 core tasks tomorrow to prevent piling up outstanding items."
                else -> "Developer burnout risk: Do not trade essential system testing and code review blocks for hyper-production. Keep it balanced."
            }
        }

        PortfolioAnalysisResult(
            summary = summary,
            score = score,
            strengths = strengthsList,
            weaknesses = weaknessesList,
            suggestions = suggestionsList,
            priorities = prioritiesList,
            riskToAvoid = riskToAvoid,
            isLocalFallback = true
        )
    }

    override suspend fun reviewDocumentationQuality(metrics: Map<String, Any>, languageCode: String): PortfolioAnalysisResult = withContext(Dispatchers.Default) {
        val totalTasks = metrics["totalTasks"] as? Int ?: 0
        val completedTasks = metrics["completedTasks"] as? Int ?: 0
        val completionRate = if (totalTasks > 0) completedTasks.toDouble() / totalTasks else 0.0
        val netSavings = metrics["netSavings"] as? Double ?: 0.0
        val journalCount = metrics["journalCount"] as? Int ?: 0
        val completedLessons = metrics["completedLessons"] as? Int ?: 0
        val bestCategory = metrics["bestCategory"] as? String ?: "None"
        val weakestArea = metrics["weakestArea"] as? String ?: "None"

        val score = ((completionRate * 5) + (if (netSavings >= 0) 3.0 else 1.0) + (if (journalCount >= 3) 2.0 else 1.0)).toInt().coerceIn(1, 10)

        val summary = if (languageCode == "zh") {
            "文档质量与项目进度审计显示，在 $totalTasks 个开发任务中完成率为 ${(completionRate * 100).toInt()}%，项目可用资金余额为 RM ${String.format(Locale.US, "%.2f", netSavings)}，且本周新增了 $journalCount 次技术文档与变更日志记录。"
        } else if (languageCode == "ms") {
            "Penilaian kualiti dokumen menunjukkan kadar penyelesaian ${(completionRate * 100).toInt()}% daripada $totalTasks tugasan, baki kewangan projek RM ${String.format(Locale.US, "%.2f", netSavings)}, dan $journalCount log dokumentasi aktif."
        } else {
            "Documentation quality and project progress audit shows a completion rate of ${(completionRate * 100).toInt()}% across $totalTasks tasks, with a project budget balance of RM ${String.format(Locale.US, "%.2f", netSavings)} and $journalCount active technical documentation logs."
        }

        val strengths = mutableListOf<String>()
        if (languageCode == "zh") {
            if (completionRate >= 0.7) strengths.add("强劲的开发任务执行速度：完成了 $completedTasks 个任务。")
            if (netSavings > 0) strengths.add("项目预算充裕，资金链非常稳健。")
            if (completedLessons > 0) strengths.add("高标准的专业能力拓展：本周通关了 $completedLessons 节技术课程。")
            if (journalCount >= 3) strengths.add("卓越的项目归档：保持了每日开发记录的一致性（本周 $journalCount 篇记录）。")
            if (strengths.isEmpty()) strengths.add("成功编译本周项目指标汇总，未发现严重缺陷。")
        } else if (languageCode == "ms") {
            if (completionRate >= 0.7) strengths.add("Kelajuan pembangunan yang tinggi: Menyelesaikan $completedTasks tugasan teras.")
            if (netSavings > 0) strengths.add("Keadaan kewangan projek mampan dengan RM ${String.format(Locale.US, "%.2f", netSavings)} baki positif.")
            if (completedLessons > 0) strengths.add("Peningkatan kompetensi pembangunan: Selesai $completedLessons unit modul.")
            if (journalCount >= 3) strengths.add("Pematuhan rekod projek: Dokumentasi harian yang konsisten ($journalCount log aktiviti).")
            if (strengths.isEmpty()) strengths.add("Berjaya menyusun metrik kualiti mingguan untuk semakan kitaran.")
        } else {
            if (completionRate >= 0.7) strengths.add("Strong development velocity: Completed $completedTasks core tasks.")
            if (netSavings > 0) strengths.add("Favorable financial standing, keeping project budget sound.")
            if (completedLessons > 0) strengths.add("Commitment to skill advancement: Cleared $completedLessons study lessons.")
            if (journalCount >= 3) strengths.add("Project compliance: Consistent end-of-day documentation updates ($journalCount entries).")
            if (strengths.isEmpty()) strengths.add("Successfully compiled weekly quality metrics for cycle review.")
        }

        val weaknesses = mutableListOf<String>()
        if (languageCode == "zh") {
            if (completionRate < 0.6) weaknesses.add("开发完成率偏低（${(completionRate * 100).toInt()}%）。建议缩小任务交付范围。")
            if (netSavings < 0) weaknesses.add("项目资金流赤字。开发和外包支出超出了预设财务底线。")
            if (journalCount < 3) weaknesses.add("技术归档更新不规律。本周仅追踪了 $journalCount 次记录。")
            if (completedLessons == 0) weaknesses.add("研发停滞：本周未完成任何学习课程或技术预研。")
            if (weaknesses.isEmpty()) weaknesses.add("在开发类别中发现了次要瓶颈：$weakestArea。")
        } else if (languageCode == "ms") {
            if (completionRate < 0.6) weaknesses.add("Kadar penyelesaian pembangunan rendah (${(completionRate * 100).toInt()}%). Sila kecilkan skop pelepasan.")
            if (netSavings < 0) weaknesses.add("Defisit kewangan projek minggu ini. Perbelanjaan pembangunan melebihi belanjawan.")
            if (journalCount < 3) weaknesses.add("Log aktiviti projek tidak konsisten. Hanya $journalCount rekod dikesan.")
            if (completedLessons == 0) weaknesses.add("Kelewatan kajian teknikal: Tiada unit pembelajaran yang diselesaikan.")
            if (weaknesses.isEmpty()) weaknesses.add("Bottleneck kecil dikenal pasti dalam kategori: $weakestArea.")
        } else {
            if (completionRate < 0.6) weaknesses.add("Low development completion rate (${(completionRate * 100).toInt()}%). Consider tightening the sprint scope.")
            if (netSavings < 0) weaknesses.add("Financial deficit this week. Development expenses exceeded incoming funding.")
            if (journalCount < 3) weaknesses.add("Irregular technical logging. Only $journalCount entries recorded.")
            if (completedLessons == 0) weaknesses.add("Technical stagnation: Zero study lessons completed.")
            if (weaknesses.isEmpty()) weaknesses.add("Minor bottlenecks identified in category: $weakestArea.")
        }

        val suggestions = if (languageCode == "zh") {
            listOf(
                "每周日晚专门花 10 分钟对照发布路线图，明确和细化下周高优先级任务。",
                "设置每日下午 5 点自动推送，提醒捕获当日的技术交付与变更点。",
                "实施每周‘零边际支出’日，精简云端算力和API接口调用开支。"
            )
        } else if (languageCode == "ms") {
            listOf(
                "Peruntukkan 10 minit setiap malam Ahad untuk memetakan item keutamaan tinggi berdasarkan pelan pelepasan mingguan.",
                "Sediakan peringatan automatik jam 5 petang untuk merakam penghantaran teknikal dan perubahan harian.",
                "Laksanakan hari 'Tanpa Belanja Tambahan' untuk mengurangkan kos overhed infrastruktur awan dan API."
            )
        } else {
            listOf(
                "Dedicate 10 minutes every Sunday night to map out high-priority tasks against the release roadmap.",
                "Establish a daily automated reminder at 5 PM to capture technical deliverables and daily changes.",
                "Implement a 'No Added Overhead' day mid-week to compress cloud computing and API service consumption."
            )
        }

        val priorities = if (languageCode == "zh") {
            listOf(
                "在表现最佳的项目领域（$bestCategory）强化高复用性模块封装",
                "重点攻坚最薄弱项目领域（$weakestArea）暴露的核心文档缺失",
                "重新评估项目运营开支，确保其处于合规正数水位"
            )
        } else if (languageCode == "ms") {
            listOf(
                "Kukuhkan amalan pengekodan modular dalam kawasan projek terbaik anda ($bestCategory)",
                "Tangani segera jurang dokumentasi yang ketara dalam bahagian terlemah ($weakestArea)",
                "Menyelaras semula perbelanjaan operasi projek untuk mengembalikan aliran tunai mampan"
            )
        } else {
            listOf(
                "Reinforce modular code encapsulation in your best-performing project area ($bestCategory)",
                "Address critical documentation gaps identified in the weakest area ($weakestArea)",
                "Re-evaluate project operating expenses to restore positive budget headroom"
            )
        }

        val riskToAvoid = if (languageCode == "zh") {
            "避免在下个周期盲目堆积技术债。过度承诺和过度规划是导致团队版本交付中断的主要诱因。"
        } else if (languageCode == "ms") {
            "Elakkan peningkatan hutang teknikal pada kitaran seterusnya. Perancangan berlebihan adalah punca utama kegagalan tarikh pelepasan."
        } else {
            "Avoid building up excessive technical debt. Over-scoping and hyper-planning are the primary causes of sprint schedule disruptions."
        }

        PortfolioAnalysisResult(
            summary = summary,
            score = score,
            strengths = strengths,
            weaknesses = weaknesses,
            suggestions = suggestions,
            priorities = priorities,
            riskToAvoid = riskToAvoid,
            isLocalFallback = true
        )
    }

    override suspend fun generatePortfolioInsights(metrics: Map<String, Any>, languageCode: String): PortfolioAnalysisResult = withContext(Dispatchers.Default) {
        val totalTasks = metrics["totalTasks"] as? Int ?: 0
        val completedTasks = metrics["completedTasks"] as? Int ?: 0
        val completionRate = if (totalTasks > 0) completedTasks.toDouble() / totalTasks else 0.0
        val netSavings = metrics["netSavings"] as? Double ?: 0.0
        val journalCount = metrics["journalCount"] as? Int ?: 0
        val completedLessons = metrics["completedLessons"] as? Int ?: 0
        val averageDailySpending = metrics["averageDailySpending"] as? Double ?: 0.0
        val mostExpensiveCategory = metrics["mostExpensiveCategory"] as? String ?: "None"
        val bestCategory = metrics["bestCategory"] as? String ?: "None"
        val weakestCategory = metrics["weakestCategory"] as? String ?: "None"

        val score = ((completionRate * 4) + (if (netSavings >= 0) 3.0 else 1.0) + (if (journalCount >= 12) 3.0 else 1.5)).toInt().coerceIn(1, 10)

        val summary = if (languageCode == "zh") {
            "月度综合项目洞察评估完成。任务执行率收于 ${(completionRate * 100).toInt()}%（已完成 $completedTasks / $totalTasks 个开发任务）。财务记录显示 RM ${String.format(Locale.US, "%.2f", netSavings)} 的资金余额，平均每日开销为 RM ${String.format(Locale.US, "%.2f", averageDailySpending)}。"
        } else if (languageCode == "ms") {
            "Analisis komprehensif 30 hari selesai. Kadar penyelesaian tugas ditutup pada ${(completionRate * 100).toInt()}% ($completedTasks/$totalTasks selesai). Aliran kewangan merekodkan RM ${String.format(Locale.US, "%.2f", netSavings)} baki simpanan dengan purata belanja harian RM ${String.format(Locale.US, "%.2f", averageDailySpending)}."
        } else {
            "30-day comprehensive project insights compiled. Task execution rate finished at ${(completionRate * 100).toInt()}% ($completedTasks/$totalTasks completed). Financial records show RM ${String.format(Locale.US, "%.2f", netSavings)} net surplus with an average daily development spend of RM ${String.format(Locale.US, "%.2f", averageDailySpending)}."
        }

        val strengths = mutableListOf<String>()
        if (languageCode == "zh") {
            if (completionRate >= 0.7) strengths.add("在 $bestCategory 核心开发包中展现出高度一致的版本交付力。")
            if (netSavings > 0) strengths.add("项目财务状况极为健康，沉淀资金达 RM ${String.format(Locale.US, "%.2f", netSavings)}。")
            if (completedLessons >= 5) strengths.add("核心研发能力实质性拓宽（本周期内功克 $completedLessons 个技术里程碑）。")
            if (journalCount >= 15) strengths.add("出色的开发行为归档，研发日志更新频率表现优异。")
            if (strengths.isEmpty()) strengths.add("在整个周期中保持对项目健康度、交付路线和关键指标的积极追踪。")
        } else if (languageCode == "ms") {
            if (completionRate >= 0.7) strengths.add("Konsistensi penghantaran yang sangat tinggi dalam pakej teras $bestCategory.")
            if (netSavings > 0) strengths.add("Kewangan projek stabil dengan RM ${String.format(Locale.US, "%.2f", netSavings)} dana dikekalkan.")
            if (completedLessons >= 5) strengths.add("Peningkatan kepakaran teras: Menyelesaikan $completedLessons fasa pembelajaran teknikal.")
            if (journalCount >= 15) strengths.add("Keupayaan pembalakan yang luar biasa, dengan frekuensi log pembangunan yang memuaskan.")
            if (strengths.isEmpty()) strengths.add("Mengekalkan pengesanan aktif petunjuk kualiti, hala tuju, dan metrik projek.")
        } else {
            if (completionRate >= 0.7) strengths.add("Highly consistent delivery velocity in the $bestCategory core package.")
            if (netSavings > 0) strengths.add("Robust project financial health with RM ${String.format(Locale.US, "%.2f", netSavings)} budget retained.")
            if (completedLessons >= 5) strengths.add("Substantial engineering capability expansion ($completedLessons research milestones cleared).")
            if (journalCount >= 15) strengths.add("Excellent development logging compliance with persistent repository updates.")
            if (strengths.isEmpty()) strengths.add("Maintained active tracking of project health, delivery direction, and core metrics.")
        }

        val weaknesses = mutableListOf<String>()
        if (languageCode == "zh") {
            if (completionRate < 0.6) weaknesses.add("存在交付阻力。核心子项目 $weakestCategory 推进极其缓慢。")
            if (netSavings < 0) weaknesses.add("月度预算透支。急需削减不必要的运营和研发外包开支。")
            if (averageDailySpending > 50.0) weaknesses.add("平均日开支偏高。最高耗资类别是 $mostExpensiveCategory。")
            if (journalCount < 10) weaknesses.add("技术交付日志记录频率不足（仅有 $journalCount / 30 篇有效归档）。")
            if (weaknesses.isEmpty()) weaknesses.add("在 $weakestCategory 任务排程和协作中发现轻微摩擦。")
        } else if (languageCode == "ms") {
            if (completionRate < 0.6) weaknesses.add("Friction dikesan. Kemajuan bagi subprojek teras $weakestCategory sangat lambat.")
            if (netSavings < 0) weaknesses.add("Defisit belanjawan bulanan. Sila kurangkan kos operasi dan kos luar yang tidak penting.")
            if (averageDailySpending > 50.0) weaknesses.add("Purata kos harian tinggi. Kategori perbelanjaan puncak adalah $mostExpensiveCategory.")
            if (journalCount < 10) weaknesses.add("Kekurangan log dokumentasi teknikal (hanya $journalCount daripada 30 rekod dikesan).")
            if (weaknesses.isEmpty()) weaknesses.add("Mengesan sedikit friction dalam penyelarasan tugasan $weakestCategory.")
        } else {
            if (completionRate < 0.6) weaknesses.add("Delivery blockages present. Core progress was exceptionally slow in $weakestCategory.")
            if (netSavings < 0) weaknesses.add("Negative monthly budget position. Urgent reduction of non-essential operations spending required.")
            if (averageDailySpending > 50.0) weaknesses.add("Elevated average daily spend. Peak expense category was $mostExpensiveCategory.")
            if (journalCount < 10) weaknesses.add("Deficit in technical logging consistency ($journalCount / 30 active logs).")
            if (weaknesses.isEmpty()) weaknesses.add("Minor alignment friction found in $weakestCategory tasks.")
        }

        val suggestions = if (languageCode == "zh") {
            listOf(
                "分析 $mostExpensiveCategory 类目研发耗资异常的根本原因，并在下一周期施加严格的硬性预算上限。",
                "重新精简您的预研路径，保证每 3 天至少有一篇有效技术文档成型。",
                "每 15 天专门设立一个‘代码与文档梳理日’，重组和废除历史冗余任务。"
            )
        } else if (languageCode == "ms") {
            listOf(
                "Kaji punca peningkatan perbelanjaan dalam $mostExpensiveCategory dan kuatkan had bajet yang ketat untuk kitaran seterusnya.",
                "Suaikan semula peta jalan penyelidikan untuk memastikan sekurang-kurangnya satu dokumen teknikal selesai setiap 3 hari.",
                "Khaskan satu 'Hari Refaktoring Kod & Dokumentasi' setiap 15 hari untuk membuang sejarah tugasan lama."
            )
        } else {
            listOf(
                "Analyze the root cause of budget expansion in $mostExpensiveCategory and enforce a strict hard cap for the next cycle.",
                "Streamline your technology pre-research roadmap to ensure at least 1 design doc is archived every 3 days.",
                "Allocate a single 'Code and Document Refactoring Day' every 15 days to trim and retire stale legacy tasks."
            )
        }

        val priorities = if (languageCode == "zh") {
            listOf(
                "在未来的开发周期中优先攻克 $weakestCategory 模块的关键缺陷",
                "对 $mostExpensiveCategory 类别的不必要云端或API开销引入精细化上限管理",
                "通过结构化的交付日志和质量检查表建立健全的归档体系"
            )
        } else if (languageCode == "ms") {
            listOf(
                "Berikan fokus keutamaan untuk menyelesaikan pepijat penting dalam modul $weakestCategory pada kitaran hadapan",
                "Kuatkuasakan kawalan had belanjawan ke atas infrastruktur awan dan API dalam $mostExpensiveCategory",
                "Wujudkan sistem arkib yang kukuh menerusi log aktiviti tersusun dan senarai semak kualiti"
            )
        } else {
            listOf(
                "Prioritize addressing critical defects in the $weakestCategory module in the next development cycle",
                "Enforce limit controls on non-critical cloud infrastructure or API spend in $mostExpensiveCategory",
                "Establish a robust archive system via structured release logs and documentation checklists"
            )
        }

        val riskToAvoid = if (languageCode == "zh") {
            "避免因贪图快捷而不断推迟高风险模块。月度审计显示，开发延期主要由于关键任务被不断延后。"
        } else if (languageCode == "ms") {
            "Elakkan daripada terus menangguhkan modul berisiko tinggi demi kelajuan jangka pendek. Kelewatan kitaran berpunca daripada penangguhan tugasan kritikal."
        } else {
            "Avoid perpetually delaying high-risk modules for short-term speed. The monthly audit reveals that release slips originate from deferred critical path items."
        }

        PortfolioAnalysisResult(
            summary = summary,
            score = score,
            strengths = strengths,
            weaknesses = weaknesses,
            suggestions = suggestions,
            priorities = priorities,
            riskToAvoid = riskToAvoid,
            isLocalFallback = true
        )
    }

    override suspend fun evaluateReleaseReadiness(metrics: Map<String, Any>, languageCode: String): PortfolioAnalysisResult = withContext(Dispatchers.Default) {
        val insights = generatePortfolioInsights(metrics, languageCode)
        val readyStatus = if (languageCode == "zh") {
            "发布准备状态评估：项目目前得分为 ${insights.score}/10。根据文档深度和任务完成率，项目处于健康发布轨道。"
        } else if (languageCode == "ms") {
            "Penilaian kesediaan pelepasan: Skor semasa projek adalah ${insights.score}/10. Berdasarkan kualiti dokumen, pelepasan sedia diteruskan."
        } else {
            "Release readiness evaluation: Current project score is ${insights.score}/10. Based on documentation density and task completion, the release is clear to proceed."
        }
        insights.copy(
            summary = readyStatus + " " + insights.summary
        )
    }
}

class GeminiPortfolioReviewService(
    private val localFallback: LocalPortfolioReviewService
) : PortfolioReviewService {

    private fun getApiKey(): String = com.example.BuildConfig.GEMINI_API_KEY

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val mediaType = "application/json; charset=utf-8".toMediaType()

    private fun isKeyInvalid(key: String): Boolean {
        return key.isBlank() || key == "YOUR_API_KEY" || key.contains("PLACEHOLDER")
    }

    private fun getFriendlyErrorMessage(e: Exception): String {
        return e.localizedMessage ?: e.message ?: "Unknown API Connection Failure."
    }

    private suspend fun callGeminiApi(prompt: String, systemInstruction: String): String = withContext(Dispatchers.IO) {
        val apiKey = getApiKey()
        if (isKeyInvalid(apiKey)) {
            throw IllegalStateException("Missing or default Gemini API key configuration.")
        }

        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey"

        val requestObj = JSONObject()
        
        val contentsArr = JSONArray()
        val contentObj = JSONObject()
        val partsArr = JSONArray()
        val partObj = JSONObject().apply {
            put("text", prompt)
        }
        partsArr.put(partObj)
        contentObj.put("parts", partsArr)
        contentsArr.put(contentObj)
        requestObj.put("contents", contentsArr)

        val systemInstructionObj = JSONObject().apply {
            val parts = JSONArray().put(JSONObject().put("text", systemInstruction))
            put("parts", parts)
        }
        requestObj.put("systemInstruction", systemInstructionObj)

        val configObj = JSONObject().apply {
            put("temperature", 0.3)
            put("responseMimeType", "application/json")
        }
        requestObj.put("generationConfig", configObj)

        val requestBody = requestObj.toString().toRequestBody(mediaType)
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val errorBody = response.body?.string() ?: "Empty body"
                throw IllegalStateException("API call failed with code ${response.code}: $errorBody")
            }
            val bodyString = response.body?.string() ?: throw IllegalStateException("Empty response body.")
            
            val responseObj = JSONObject(bodyString)
            val textResult = responseObj.getJSONArray("candidates")
                .getJSONObject(0)
                .getJSONObject("content")
                .getJSONArray("parts")
                .getJSONObject(0)
                .getString("text")
            
            textResult
        }
    }

    override suspend fun analyzeProjectActivity(
        whatIDid: String,
        whatWentWell: String,
        whatToImprove: String,
        tomorrowPriorities: String,
        metrics: Map<String, Any>,
        languageCode: String
    ): PortfolioAnalysisResult {
        return try {
            val languageName = when (languageCode) {
                "zh" -> "Chinese (中文)"
                "ms" -> "Malay (Bahasa Melayu)"
                else -> "English"
            }

            val systemInstruction = """
                You are ProjectForge AI's private, elite portfolio documentation and quality review assistant.
                Your task is to analyze the user's project development logs and technical activity metrics.
                Focus strictly on portfolio project progress, technical deliverables, and roadmap velocity. Avoid generic personal coaching, habits, or life guidance.
                You MUST return a JSON object with EXACTLY the following structure:
                {
                  "summary": "A concise, objective 2-3 sentence overview of their project performance and development velocity",
                  "score": Int (a number from 1 to 10 evaluating their development output),
                  "strengths": ["technical achievement 1", "technical achievement 2"],
                  "weaknesses": ["development bottleneck 1", "development bottleneck 2"],
                  "suggestions": ["specific practical development/refactoring advice 1", "specific practical development/refactoring advice 2"],
                  "priorities": ["clear technical priority tomorrow 1", "clear technical priority tomorrow 2"],
                  "risk_to_avoid": "A single specific technical block, integration trap, or scope creep risk they must avoid tomorrow"
                }
                Provide rigorous, constructive, and highly actionable analysis. Do not add any text before or after the JSON.
                DO NOT provide any medical, legal, financial, or emergency advice. Give practical technical and development suggestions only.
                Do not assume, include, or ask for any personal identifiers or private details.
                
                CRITICAL REQ: Write all textual output (every value in the JSON fields: summary, strengths, weaknesses, suggestions, priorities, risk_to_avoid) in the following output language: $languageName.
                The JSON keys (summary, score, strengths, weaknesses, suggestions, priorities, risk_to_avoid) MUST remain in English exactly as specified.
            """.trimIndent()

            val prompt = """
                Analyze the following project development data:
                Technical Logs:
                - Code Completed: $whatIDid
                - What Went Well (Milestones): $whatWentWell
                - technical areas needing improvement: $whatToImprove
                - Tomorrow's release priorities: $tomorrowPriorities
                
                Project Metrics Today:
                - Scheduled development Tasks: ${metrics["totalTasks"]}
                - Completed development Tasks: ${metrics["completedTasks"]}
                - Cloud/operational expenditures today: RM ${metrics["spentToday"]}
                - Study/research duration: ${metrics["studyMinutes"]} minutes (Target: ${metrics["studyTarget"]} min)
            """.trimIndent()

            val jsonResponse = callGeminiApi(prompt, systemInstruction)
            parseResult(jsonResponse)
        } catch (e: Exception) {
            Log.e("GeminiPortfolioReviewService", "Failed to generate project activity analysis, falling back to Local", e)
            val fallback = localFallback.analyzeProjectActivity(whatIDid, whatWentWell, whatToImprove, tomorrowPriorities, metrics, languageCode)
            fallback.copy(fallbackReason = getFriendlyErrorMessage(e))
        }
    }

    override suspend fun reviewDocumentationQuality(metrics: Map<String, Any>, languageCode: String): PortfolioAnalysisResult {
        return try {
            val languageName = when (languageCode) {
                "zh" -> "Chinese (中文)"
                "ms" -> "Malay (Bahasa Melayu)"
                else -> "English"
            }

            val systemInstruction = """
                You are ProjectForge AI's private, elite portfolio documentation and quality review assistant.
                Your task is to analyze the user's weekly project progress, technical logs, and documentation quality.
                Focus strictly on documentation quality, technical archives, and sprint progress. Avoid generic personal coaching or life review.
                You MUST return a JSON object with EXACTLY the following structure:
                {
                  "summary": "A high-level 2-3 sentence analysis of their project documentation quality and technical trajectory.",
                  "score": Int (a number from 1 to 10 representing overall documentation and schedule compliance),
                  "strengths": ["documentation strength 1", "documentation strength 2"],
                  "weaknesses": ["documentation/sprint bottleneck 1", "documentation/sprint bottleneck 2"],
                  "suggestions": ["strategic technical suggestion 1", "strategic technical suggestion 2"],
                  "priorities": ["focus release priority next sprint 1", "focus release priority next sprint 2"],
                  "risk_to_avoid": "A specific technical risk, code regression, or documentation lag they must actively prevent"
                }
                Provide rigorous, constructive, and highly actionable analysis. Do not add any text before or after the JSON.
                DO NOT provide any medical, legal, financial, or emergency advice. Give practical technical suggestions only.
                Do not assume, include, or ask for any personal identifiers or private details.
                
                CRITICAL REQ: Write all textual output (every value in the JSON fields: summary, strengths, weaknesses, suggestions, priorities, risk_to_avoid) in the following output language: $languageName.
                The JSON keys (summary, score, strengths, weaknesses, suggestions, priorities, risk_to_avoid) MUST remain in English exactly as specified.
            """.trimIndent()

            val prompt = """
                Analyze the following weekly aggregates (last 7 days):
                - Total release tasks scheduled: ${metrics["totalTasks"]}
                - Completed release tasks: ${metrics["completedTasks"]}
                - Weekly financial budget position: RM ${metrics["netSavings"]}
                - Completed learning modules: ${metrics["completedLessons"]}
                - Logged technical archives: ${metrics["journalCount"]}
                - Most active code package category: ${metrics["bestCategory"]}
                - Weakest code package/bottleneck area: ${metrics["weakestArea"]}
            """.trimIndent()

            val jsonResponse = callGeminiApi(prompt, systemInstruction)
            parseResult(jsonResponse)
        } catch (e: Exception) {
            Log.e("GeminiPortfolioReviewService", "Failed to review weekly documentation quality, falling back to Local", e)
            val fallback = localFallback.reviewDocumentationQuality(metrics, languageCode)
            fallback.copy(fallbackReason = getFriendlyErrorMessage(e))
        }
    }

    override suspend fun generatePortfolioInsights(metrics: Map<String, Any>, languageCode: String): PortfolioAnalysisResult {
        return try {
            val languageName = when (languageCode) {
                "zh" -> "Chinese (中文)"
                "ms" -> "Malay (Bahasa Melayu)"
                else -> "English"
            }

            val systemInstruction = """
                You are ProjectForge AI's private, elite portfolio documentation and quality review assistant.
                Your task is to analyze the user's monthly project progress, code commits, and project health metrics.
                Focus strictly on project health, release readiness, and repository quality. Avoid generic personal coaching, habits, or life review.
                You MUST return a JSON object with EXACTLY the following structure:
                {
                  "summary": "A definitive, high-impact 3-sentence project health audit and technical maturity assessment.",
                  "score": Int (a number from 1 to 10 evaluating monthly release velocity and code health),
                  "strengths": ["monthly technical achievement 1", "monthly technical achievement 2"],
                  "weaknesses": ["monthly technical bottleneck 1", "monthly technical bottleneck 2"],
                  "suggestions": ["high-level strategic engineering advice 1", "high-level strategic engineering advice 2"],
                  "priorities": ["transformational technical focus next cycle 1", "transformational technical focus next cycle 2"],
                  "risk_to_avoid": "A major technical trap, design pattern error, or code duplication bottleneck to actively avoid"
                }
                Provide rigorous, constructive, and highly actionable analysis. Do not add any text before or after the JSON.
                DO NOT provide any medical, legal, financial, or emergency advice. Give practical engineering suggestions only.
                Do not assume, include, or ask for any personal identifiers or private details.
                
                CRITICAL REQ: Write all textual output (every value in the JSON fields: summary, strengths, weaknesses, suggestions, priorities, risk_to_avoid) in the following output language: $languageName.
                The JSON keys (summary, score, strengths, weaknesses, suggestions, priorities, risk_to_avoid) MUST remain in English exactly as specified.
            """.trimIndent()

            val prompt = """
                Analyze the following monthly aggregates (last 30 days):
                - Total release tasks scheduled: ${metrics["totalTasks"]}
                - Completed release tasks: ${metrics["completedTasks"]}
                - Monthly project financial surplus: RM ${metrics["netSavings"]}
                - Average daily project expenditures: RM ${metrics["averageDailySpending"]}
                - Peak expense code category: ${metrics["mostExpensiveCategory"]}
                - Most consistent learning track: ${metrics["mostConsistentPath"]}
                - Completed study lessons: ${metrics["completedLessons"]}
                - Logged technical archives: ${metrics["journalCount"]}
                - Best performing code package: ${metrics["bestCategory"]}
                - Weakest code package: ${metrics["weakestCategory"]}
            """.trimIndent()

            val jsonResponse = callGeminiApi(prompt, systemInstruction)
            parseResult(jsonResponse)
        } catch (e: Exception) {
            Log.e("GeminiPortfolioReviewService", "Failed to generate monthly portfolio insights, falling back to Local", e)
            val fallback = localFallback.generatePortfolioInsights(metrics, languageCode)
            fallback.copy(fallbackReason = getFriendlyErrorMessage(e))
        }
    }

    override suspend fun evaluateReleaseReadiness(metrics: Map<String, Any>, languageCode: String): PortfolioAnalysisResult {
        return try {
            val languageName = when (languageCode) {
                "zh" -> "Chinese (中文)"
                "ms" -> "Malay (Bahasa Melayu)"
                else -> "English"
            }

            val systemInstruction = """
                You are ProjectForge AI's private, elite portfolio documentation and quality review assistant.
                Your task is to evaluate the release readiness of the project based on the supplied sprint and quality aggregates.
                Focus strictly on release readiness, software architecture safety, documentation completeness, and regression risk.
                You MUST return a JSON object with EXACTLY the following structure:
                {
                  "summary": "A high-impact 3-sentence release readiness report outlining security verification and deployment suitability.",
                  "score": Int (a number from 1 to 10 evaluating the technical preparedness for launch),
                  "strengths": ["readiness vector 1", "readiness vector 2"],
                  "weaknesses": ["deployment block/risk 1", "deployment block/risk 2"],
                  "suggestions": ["deployment/migration strategy advice 1", "deployment/migration strategy advice 2"],
                  "priorities": ["critical pre-launch tasks 1", "critical pre-launch tasks 2"],
                  "risk_to_avoid": "A critical release-blocker defect, deployment roll-back trigger, or security gap to actively prevent"
                }
                Provide rigorous, constructive, and highly actionable analysis. Do not add any text before or after the JSON.
                DO NOT provide any medical, legal, financial, or emergency advice. Give practical technical suggestions only.
                Do not assume, include, or ask for any personal identifiers or private details.
                
                CRITICAL REQ: Write all textual output (every value in the JSON fields: summary, strengths, weaknesses, suggestions, priorities, risk_to_avoid) in the following output language: $languageName.
                The JSON keys (summary, score, strengths, weaknesses, suggestions, priorities, risk_to_avoid) MUST remain in English exactly as specified.
            """.trimIndent()

            val prompt = """
                Evaluate the release readiness based on the following aggregates:
                - Total tasks scheduled: ${metrics["totalTasks"]}
                - Completed tasks: ${metrics["completedTasks"]}
                - Monthly project financial surplus: RM ${metrics["netSavings"]}
                - Average daily project expenditures: RM ${metrics["averageDailySpending"]}
                - Completed study lessons: ${metrics["completedLessons"]}
                - Logged technical archives: ${metrics["journalCount"]}
                - Best performing code package: ${metrics["bestCategory"]}
                - Weakest code package: ${metrics["weakestCategory"]}
            """.trimIndent()

            val jsonResponse = callGeminiApi(prompt, systemInstruction)
            parseResult(jsonResponse)
        } catch (e: Exception) {
            Log.e("GeminiPortfolioReviewService", "Failed to evaluate release readiness, falling back to Local", e)
            val fallback = localFallback.evaluateReleaseReadiness(metrics, languageCode)
            fallback.copy(fallbackReason = getFriendlyErrorMessage(e))
        }
    }

    private fun parseResult(jsonStr: String): PortfolioAnalysisResult {
        val root = JSONObject(jsonStr)
        val strengthsJson = root.optJSONArray("strengths")
        val strengths = mutableListOf<String>()
        if (strengthsJson != null) {
            for (i in 0 until strengthsJson.length()) {
                strengths.add(strengthsJson.getString(i))
            }
        }
        val weaknessesJson = root.optJSONArray("weaknesses")
        val weaknesses = mutableListOf<String>()
        if (weaknessesJson != null) {
            for (i in 0 until weaknessesJson.length()) {
                weaknesses.add(weaknessesJson.getString(i))
            }
        }
        val suggestionsJson = root.optJSONArray("suggestions")
        val suggestions = mutableListOf<String>()
        if (suggestionsJson != null) {
            for (i in 0 until suggestionsJson.length()) {
                suggestions.add(suggestionsJson.getString(i))
            }
        }
        val prioritiesJson = root.optJSONArray("priorities")
        val priorities = mutableListOf<String>()
        if (prioritiesJson != null) {
            for (i in 0 until prioritiesJson.length()) {
                priorities.add(prioritiesJson.getString(i))
            }
        }

        return PortfolioAnalysisResult(
            summary = root.optString("summary", ""),
            score = root.optInt("score", 5),
            strengths = strengths,
            weaknesses = weaknesses,
            suggestions = suggestions,
            priorities = priorities,
            riskToAvoid = root.optString("risk_to_avoid", ""),
            isLocalFallback = false
        )
    }
}
