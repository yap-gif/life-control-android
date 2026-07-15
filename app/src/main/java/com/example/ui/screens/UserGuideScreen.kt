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

private class GuideTexts(
    val hubTitle: String,
    val hubSubtitle: String,
    val setupFlowTitle: String,
    val setupProgressTitle: String,
    val checklistLabels: Map<String, String>,
    val systemGuidesTitle: String,
    val guides: List<GuideItemData>,
    val backDescription: String,
    val collapseText: String,
    val expandText: String
)

private data class GuideItemData(
    val title: String,
    val subtitle: String,
    val description: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)

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

    // Determine target language code
    val appLang by viewModel.appLanguage.collectAsState()
    val activeLang = if (appLang == "system") {
        val sysLang = java.util.Locale.getDefault().language
        if (sysLang == "zh" || sysLang == "ms") sysLang else "en"
    } else {
        appLang
    }

    // Dynamic localized content mapping
    val localizedTexts = remember(activeLang) {
        when (activeLang) {
            "zh" -> GuideTexts(
                hubTitle = "用户指南中心",
                hubSubtitle = "首周设置与学习",
                setupFlowTitle = "首周设置流程",
                setupProgressTitle = "设置进度",
                checklistLabels = mapOf(
                    "setup_profile_goal" to "设置个人档案和核心人生目标",
                    "connect_ai_coach" to "连接可选的 Gemini AI 评估工具（或使用本地备用分析）",
                    "custom_learning_path" to "建立至少包含 1 节课的自定义学习路径",
                    "daily_reflection" to "记录每日正念反思",
                    "first_transaction" to "创建您的首笔财务交易",
                    "trigger_reminder" to "触发本地提醒",
                    "export_backup" to "导出安全备份"
                ),
                systemGuidesTitle = "系统指南与知识库",
                backDescription = "返回",
                collapseText = "收起",
                expandText = "展开",
                guides = listOf(
                    GuideItemData(
                        title = "A. 核心人生目标",
                        subtitle = "定义您的道路并锚定焦点",
                        icon = Icons.Default.Adjust,
                        description = "在设置中设定核心人生目标是您个人独立之旅的基础支柱。设定此基准后，它会自动作为您的主要关注指标显示在主仪表板上，在您每次打开应用时提醒您的终极目标。"
                    ),
                    GuideItemData(
                        title = "B. 连接可选的 Gemini AI 评估工具",
                        subtitle = "本地优先的隐私与智能",
                        icon = Icons.Default.AutoAwesome,
                        description = "Gemini AI 评估工具是一个 100% 可选且默认禁用的组件。绝不会发生后台遥测或自动数据库同步。AI 请求仅在手动调用时执行（例如点击‘分析今天’）。激活时，日记反思分析仅传输您的文本内容，而每周和每月分析仅发送聚合的数字指标（绝不发送您的完整数据库）。如果您处于离线状态，一个完全隐私的本地备用分析器会立即作为替代方案运行，以确保零外部网络暴露。"
                    ),
                    GuideItemData(
                        title = "C. 自定义学习路径",
                        subtitle = "持续建立宝贵的专业知识",
                        icon = Icons.Default.School,
                        description = "建立结构化的学习路径使您能够系统地获取网络安全或系统管理等领域的技能。追踪每日学习时间块，管理单节课程清单，并保持学习连击。如果您的学习路线图为空，您可以随时添加自定义条目或恢复预置的技术学习路径。"
                    ),
                    GuideItemData(
                        title = "D. 每日正念反思",
                        subtitle = "追踪每日自律与心态",
                        icon = Icons.Default.EditNote,
                        description = "每日反思能帮您回顾成就、瓶颈、自豪时刻和首要任务。使用集成的分析工具来审查定性模式。您的反思完全保存在设备本地，私密、安全，处于您的绝对控制之下。"
                    ),
                    GuideItemData(
                        title = "E. 首笔财务交易",
                        subtitle = "释放职业与收入目标",
                        icon = Icons.Default.AccountBalanceWallet,
                        description = "实现职业独立需要健康的现金流和预算自律。记录收入和每日开支，对照您的月度储蓄目标追踪净余额进度，并监控分类指标。所有记录都存储在高度安全的离线 Room 数据库中。"
                    ),
                    GuideItemData(
                        title = "F. 本地提醒",
                        subtitle = "建立强大的习惯回路",
                        icon = Icons.Default.NotificationsActive,
                        description = "在设置中配置自定义的任务、学习、写日记和每周回顾提醒频率。这些提醒完全通过标准的 Android 闹钟计划在您的设备本地运行，无需任何远程通知或云端服务器触发。"
                    ),
                    GuideItemData(
                        title = "G. 安全备份",
                        subtitle = "明文与加密的本地存储",
                        icon = Icons.Default.Backup,
                        description = "通过两种不同的离线备份格式保护您的数据免受硬件损坏：明文 JSON 备份（将记录保存为可读 JSON）和加密备份（在导出前使用密码-基于加密的备份、AES-GCM 验证加密和 PBKDF2-HMAC-SHA256 密钥派生对数据进行本地加密。SHA-256 完整性验证确保备份内容未被篡改。文件通过 FileProvider 支持的共享进行安全传输）。请务必妥善保存您的自定义密码，因为丢失密码无法通过云端检索恢复。"
                    )
                )
            )
            "ms" -> GuideTexts(
                hubTitle = "Hab Panduan Pengguna",
                hubSubtitle = "Persediaan & Pembelajaran Minggu Pertama",
                setupFlowTitle = "Aliran Persediaan Minggu Pertama",
                setupProgressTitle = "Kemajuan Persediaan",
                checklistLabels = mapOf(
                    "setup_profile_goal" to "Sediakan Profil & Matlamat Hidup Teras",
                    "connect_ai_coach" to "Sambungkan Alat Penilaian AI Gemini pilihan (atau akui fallback)",
                    "custom_learning_path" to "Sediakan Laluan Pembelajaran tersuai dengan sekurang-kurangnya 1 pelajaran",
                    "daily_reflection" to "Log entri refleksi harian",
                    "first_transaction" to "Cipta transaksi kewangan pertama anda",
                    "trigger_reminder" to "Cetuskan peringatan tempatan",
                    "export_backup" to "Eksport sandaran selamat"
                ),
                systemGuidesTitle = "Panduan Sistem & Hab Pengetahuan",
                backDescription = "Kembali",
                collapseText = "Tutup",
                expandText = "Kembang",
                guides = listOf(
                    GuideItemData(
                        title = "A. Matlamat Hidup Teras",
                        subtitle = "Tentukan laluan & sauh tumpuan anda",
                        icon = Icons.Default.Adjust,
                        description = "Menetapkan Matlamat Hidup teras dalam Tetapan berfungsi sebagai asas utama perjalanan kebebasan peribadi anda. Apabila anda menetapkan penanda aras ini, ia akan dipaparkan secara automatik sebagai penunjuk tumpuan utama anda di Papan Pemuka Utama, mengingatkan anda tentang sasaran utama anda setiap kali anda membuka aplikasi."
                    ),
                    GuideItemData(
                        title = "B. Menyambung Alat Penilaian AI Gemini pilihan",
                        subtitle = "Privasi & kecerdasan diutamakan tempatan",
                        icon = Icons.Default.AutoAwesome,
                        description = "Alat Penilaian AI Gemini ialah komponen 100% pilihan yang dinyahaktifkan secara lalai. Tiada telemetri latar belakang atau penyegerakan database automatik berlaku. Permintaan AI hanya dilaksanakan atas panggilan manual (cth., mengklik 'Analisis Hari'). Apabila aktif, analisis jurnal hanya menghantar teks naratif anda, manakala analisis mingguan dan bulanan menghantar metrik angka agregat (tidak pernah database penuh anda). Jika anda berada di luar talian, Penganalisis Fallback Tempatan yang peribadi segera bertindak sebagai alternatif untuk memastikan sifar pendedahan rangkaian luaran."
                    ),
                    GuideItemData(
                        title = "C. Laluan Pembelajaran Tersuai",
                        subtitle = "Bina kepakaran berharga secara konsisten",
                        icon = Icons.Default.School,
                        description = "Mewujudkan laluan pembelajaran berstruktur membolehkan anda memperoleh kemahiran secara sistematik dalam bidang seperti keselamatan siber atau pentadbiran sistem. Jejaki blok kajian harian, uruskan senarai semak pelajaran individu, dan kekalkan rentetan kajian. Jika pelan hala tuju pembelajaran anda kosong, anda boleh menambah entri tersuai atau memulihkan laluan kajian teknikal yang dipra-isi pada bila-bila masa."
                    ),
                    GuideItemData(
                        title = "D. Entri refleksi harian",
                        subtitle = "Jejaki disiplin harian dan minda",
                        icon = Icons.Default.EditNote,
                        description = "Refleksi jurnal harian membantu anda menyemak pencapaian, kekangan, detik bangga, dan keutamaan utama. Gunakan alat analisis bersepadu untuk menyemak corak kualitatif. Refleksi anda kekal di luar talian sepenuhnya pada peranti anda, peribadi, selamat, dan di bawah kawalan mutlak anda."
                    ),
                    GuideItemData(
                        title = "E. Transaksi kewangan pertama",
                        subtitle = "Bebaskan sasaran kerjaya dan pendapatan",
                        icon = Icons.Default.AccountBalanceWallet,
                        description = "Mencapai kebebasan kerjaya memerlukan aliran tunai yang sihat dan disiplin belanjawan. Log pendapatan dan perbelanjaan harian, jejaki kemajuan baki bersih berbanding sasaran simpanan bulanan anda, dan pantau metrik pengkategorian. Setiap rekod disimpan di dalam database Room luar talian yang sangat selamat."
                    ),
                    GuideItemData(
                        title = "F. Peringatan tempatan",
                        subtitle = "Bina gelung konsistensi yang kuat",
                        icon = Icons.Default.NotificationsActive,
                        description = "Konfigurasikan kekerapan peringatan tersuai untuk tugasan, sesi belajar, penulisan jurnal, dan semakan prestasi mingguan dalam Tetapan. Peringatan ini berjalan secara tempatan pada peranti anda melalui jadual penggera standard Android, memerlukan sifar pemberitahuan jauh atau pencetus pelayan awan."
                    ),
                    GuideItemData(
                        title = "G. Sandaran selamat",
                        subtitle = "Penyimpanan tempatan biasa dan tersandar",
                        icon = Icons.Default.Backup,
                        description = "Lindungi data anda daripada kegagalan perkakasan dengan dua format sandaran luar talian: Sandaran JSON Biasa (yang menyimpan koleksi rekod dalam JSON yang boleh dibaca) dan Sandaran Tersandar (yang menyandarkan data secara tempatan dengan sandaran tersandar berasaskan kata laluan menggunakan enkripsi disahkan AES-GCM dan derivasi kunci PBKDF2-HMAC-SHA256 sebelum mengeksportnya. Pengesahan integriti SHA-256 memastikan kandungan sandaran tidak diubah. Fail dikongsi dengan selamat menggunakan perkongsian disokong FileProvider). Sentiasa simpan kata laluan tersuai anda dengan selamat, kerana tiada kaedah pengambilan awan untuk kata laluan yang hilang."
                    )
                )
            )
            else -> GuideTexts(
                hubTitle = "User Guide Hub",
                hubSubtitle = "First Week Setup & Learning",
                setupFlowTitle = "First Week Setup Flow",
                setupProgressTitle = "Setup Progress",
                checklistLabels = mapOf(
                    "setup_profile_goal" to "Setup a Profile & core Life Goal",
                    "connect_ai_coach" to "Connect optional Gemini AI Portfolio Reviewer (or acknowledge fallback)",
                    "custom_learning_path" to "Set up a custom Learning Path with at least 1 lesson",
                    "daily_reflection" to "Log a daily reflection entry",
                    "first_transaction" to "Create your first financial transaction",
                    "trigger_reminder" to "Trigger a local reminder",
                    "export_backup" to "Export a secure backup"
                ),
                systemGuidesTitle = "System Guides & Knowledge Hub",
                backDescription = "Back",
                collapseText = "Collapse",
                expandText = "Expand",
                guides = listOf(
                    GuideItemData(
                        title = "A. Core Life Goal",
                        subtitle = "Define your path & anchor focus",
                        icon = Icons.Default.Adjust,
                        description = "Setting a core Life Goal in Settings serves as the foundational anchor of your personal independence journey. When you set this benchmark, it automatically populates as your primary focus indicator on the Home Dashboard, reminding you of your ultimate target every time you open the application."
                    ),
                    GuideItemData(
                        title = "B. Connected optional Gemini AI Portfolio Reviewer",
                        subtitle = "Local-first privacy & intelligence",
                        icon = Icons.Default.AutoAwesome,
                        description = "The Gemini AI Portfolio Reviewer is a 100% optional, disabled-by-default component. No background telemetry or automated database synchronization occurs. AI requests only execute upon manual invocation (e.g., clicking 'Analyze Day'). When active, the journal analysis transmits only your narrative text, while weekly and monthly analysis send aggregated numeric metrics (never your full database). If you run offline, a completely private Local Fallback Analyst immediately acts as an alternative to ensure zero external network exposure."
                    ),
                    GuideItemData(
                        title = "C. Custom Learning Path",
                        subtitle = "Consistently build valuable expertise",
                        icon = Icons.Default.School,
                        description = "Establishing structured learning paths allows you to systematically acquire skills in areas like cybersecurity or system administration. Keep track of daily study blocks, manage checklists of individual lessons, and maintain study streaks. If your learning roadmap is empty, you can add custom entries or restore the prepopulated technical study paths at any time."
                    ),
                    GuideItemData(
                        title = "D. Daily reflection entry",
                        subtitle = "Track daily discipline and mindset",
                        icon = Icons.Default.EditNote,
                        description = "Daily journal reflections help you review accomplishments, bottlenecks, proud moments, and top priorities. Use the integrated analysis tool to review qualitative patterns. Your reflections remain completely offline on your device, private, secure, and under your absolute control."
                    ),
                    GuideItemData(
                        title = "E. First financial transaction",
                        subtitle = "Unshackle career and income targets",
                        icon = Icons.Default.AccountBalanceWallet,
                        description = "Achieving career independence requires healthy cash flow and budget discipline. Log income and daily expenses, track net balance progress against your monthly savings target, and monitor categorization metrics. Every record is stored inside a highly secure offline Room Database."
                    ),
                    GuideItemData(
                        title = "F. Local reminder",
                        subtitle = "Build powerful consistency loops",
                        icon = Icons.Default.NotificationsActive,
                        description = "Configure custom reminder frequencies for tasks, study sessions, journal writing, and weekly performance reviews in Settings. These reminders run purely locally on your device via standard Android alarm schedules, requiring zero remote notifications or cloud server triggers."
                    ),
                    GuideItemData(
                        title = "G. Secure backup",
                        subtitle = "Plain and encrypted local storage",
                        icon = Icons.Default.Backup,
                        description = "Protect your data against hardware failure with two distinct offline backup formats: Plain JSON Backup (which saves your record collections in readable JSON) and Encrypted Backup (which encrypts the data locally with password-based encrypted backup using AES-GCM authenticated encryption and PBKDF2-HMAC-SHA256 key derivation before exporting it. SHA-256 integrity validation ensures that backup contents have not been altered. Files are shared securely using FileProvider-backed sharing). Always store your custom passwords safely, as there are no cloud retrieval methods for lost passwords."
                    )
                )
            )
        }
    }

    val checklistItems = remember(setupProfileGoal, connectAiCoach, customLearningPath, dailyReflection, firstTransaction, triggerReminder, exportBackup, localizedTexts) {
        listOf(
            Triple("setup_profile_goal", localizedTexts.checklistLabels["setup_profile_goal"] ?: "", setupProfileGoal),
            Triple("connect_ai_coach", localizedTexts.checklistLabels["connect_ai_coach"] ?: "", connectAiCoach),
            Triple("custom_learning_path", localizedTexts.checklistLabels["custom_learning_path"] ?: "", customLearningPath),
            Triple("daily_reflection", localizedTexts.checklistLabels["daily_reflection"] ?: "", dailyReflection),
            Triple("first_transaction", localizedTexts.checklistLabels["first_transaction"] ?: "", firstTransaction),
            Triple("trigger_reminder", localizedTexts.checklistLabels["trigger_reminder"] ?: "", triggerReminder),
            Triple("export_backup", localizedTexts.checklistLabels["export_backup"] ?: "", exportBackup)
        )
    }

    val completedCount = checklistItems.count { it.third }
    val progress = if (checklistItems.isNotEmpty()) completedCount.toFloat() / checklistItems.size else 0f
    val percentProgress = (progress * 100).toInt()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = localizedTexts.hubTitle,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = localizedTexts.hubSubtitle,
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
                            contentDescription = localizedTexts.backDescription
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
                            text = localizedTexts.setupFlowTitle,
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
                                text = localizedTexts.setupProgressTitle,
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

                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

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
                text = localizedTexts.systemGuidesTitle,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(top = 8.dp)
            )

            // Dynamic Guides List
            localizedTexts.guides.forEach { guide ->
                GuideItem(
                    title = guide.title,
                    subtitle = guide.subtitle,
                    icon = guide.icon,
                    description = guide.description,
                    collapseText = localizedTexts.collapseText,
                    expandText = localizedTexts.expandText
                )
            }

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
    collapseText: String,
    expandText: String,
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
                    contentDescription = if (isExpanded) collapseText else expandText,
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
