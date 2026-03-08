# Requirements Document

## Introduction

Система оцінки обсягу БА робіт за допомогою ШІ — це інструмент для автоматизованого розрахунку годин бізнес-аналізу на основі артефактів Discovery. Система аналізує вхідні документи (BV, ShRD та інші), декомпонує вимоги на атомарні роботи, застосовує коефіцієнти складності та генерує детальний звіт з оцінкою та RAID-контекстом.

## Glossary

- **BA_Estimation_System**: Система оцінки БА робіт — основна система для розрахунку годин бізнес-аналізу
- **Discovery_Artifacts**: Артефакти Discovery — набір документів з фази дослідження (BV, ShRD, HLA, NFR, RAID)
- **BV**: Business Vision — документ бізнес-бачення з цілями та контекстом ініціативи (файл: `business-vision.md`)
- **ShRD**: Stakeholder Requirements Document — документ вимог стейкхолдерів (файл: `stakeholder-requirements.md`)
- **HLA**: High-Level Architecture — високорівнева архітектура системи (файл: `high-level-architecture.md`)
- **NFR**: Non-Functional Requirements — нефункціональні вимоги (файл: `non-functional-requirements.md`)
- **RAID**: Risks, Assumptions, Issues, Dependencies — контекст ризиків, припущень, проблем та залежностей (файл: `raid.md`)
- **Atomic_Work**: Атомарна робота — конкретна практична дія БА (наприклад: написати user story, створити діаграму, провести інтерв'ю, узгодити вимоги зі стейкхолдером)
- **BA_Process_35**: 35 стандартних БА-процесів — академічна класифікація з BABOK для категоризації та агрегації атомарних робіт у звітності
- **Process_Mapping**: Маппінг процесів — зв'язок між атомарними роботами та 35 БА-процесами для класифікації
- **PERT_Estimate**: PERT-оцінка — оцінка з трьома значеннями (оптимістична O, найімовірніша M, песимістична P)
- **Coefficient**: Коефіцієнт — множник для коригування базової оцінки залежно від контексту
- **Estimation_Report**: Звіт оцінки — markdown-документ з результатами розрахунків та поясненнями
- **CSV_Breakdown**: CSV-розшифровка — детальна таблиця всіх розрахунків
- **Agent**: Агент — спеціалізований компонент системи для виконання конкретної задачі
- **Agent_Prompt**: Промпт агента — інструкції для агента, збережені в окремому markdown файлі
- **Observability**: Спостережуваність — можливість відстежувати стан, метрики та поведінку агентів під час виконання
- **Observability_Dashboard**: Дашборд спостережуваності — структурований файл з метриками та трасуванням виконання агентів
- **Middle_BA**: Мідл БА — бізнес-аналітик середнього рівня (2-4 роки досвіду)
- **Descoping**: Дископінг — процес виключення або зменшення обсягу вимог
- **Test_Mode**: Тестовий режим — режим роботи системи з економною моделлю для розробки та налагодження
- **Production_Mode**: Продуктивний режим — режим роботи системи з потужною моделлю для реальних оцінок
- **GLM_5**: GLM-5 — модель ZhipuAI для складних задач бізнес-аналізу (продуктивний режим)
- **ZhipuAI**: ZhipuAI — провайдер LLM з OpenAI-сумісним API (використовується для оцінювання)

## Requirements

### Requirement 1: Читання вхідних артефактів з папки

**User Story:** Як користувач, я хочу вказати папку з артефактами Discovery, щоб система автоматично зчитала всі необхідні документи для оцінки.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL accept a folder path as input parameter
2. THE BA_Estimation_System SHALL read files in TXT format from the specified folder
3. THE BA_Estimation_System SHALL read files in MD (Markdown) format from the specified folder
4. THE BA_Estimation_System SHALL read files in CSV format from the specified folder
5. THE BA_Estimation_System SHALL NOT process files in DOCX, XLSX, or PPTX formats
6. WHEN the specified folder does not exist, THE BA_Estimation_System SHALL return an error message
7. THE BA_Estimation_System SHALL look for BV document with exact filename: `business-vision.md`
8. THE BA_Estimation_System SHALL look for ShRD document with exact filename: `stakeholder-requirements.md`
9. THE BA_Estimation_System SHALL look for HLA document with exact filename: `high-level-architecture.md`
10. THE BA_Estimation_System SHALL look for NFR document with exact filename: `non-functional-requirements.md`
11. THE BA_Estimation_System SHALL look for RAID document with exact filename: `raid.md`

### Requirement 2: Валідація достатності вхідних даних

**User Story:** Як користувач, я хочу отримати чітке повідомлення про недостатність даних, щоб не отримувати неточну оцінку через брак контексту.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL verify presence of `business-vision.md` file
2. THE BA_Estimation_System SHALL verify presence of `stakeholder-requirements.md` file
3. IF `business-vision.md` is missing, THEN THE BA_Estimation_System SHALL return "insufficient data" message without performing estimation
4. IF `stakeholder-requirements.md` is missing, THEN THE BA_Estimation_System SHALL return "insufficient data" message without performing estimation
5. THE BA_Estimation_System SHALL check that BV contains initiative description
6. THE BA_Estimation_System SHALL check that ShRD contains at least one requirement
7. WHEN data is insufficient, THE BA_Estimation_System SHALL list which required artifacts are missing
8. THE BA_Estimation_System SHALL optionally accept `high-level-architecture.md`, `non-functional-requirements.md`, and `raid.md` to improve estimation accuracy
9. THE BA_Estimation_System SHALL log which optional files were found and used

### Requirement 3: Витяг та нормалізація вимог зі ShRD

**User Story:** Як система, я хочу витягти всі вимоги зі ShRD та привести їх до єдиного формату, щоб забезпечити коректну декомпозицію.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL extract all requirements from ShRD document
2. THE BA_Estimation_System SHALL assign unique identifier to each extracted requirement
3. THE BA_Estimation_System SHALL normalize requirement text to remove formatting inconsistencies
4. THE BA_Estimation_System SHALL detect functional requirements
5. THE BA_Estimation_System SHALL detect non-functional requirements
6. THE BA_Estimation_System SHALL save extracted requirements to intermediate markdown file
7. WHEN a requirement is ambiguous or incomplete, THE BA_Estimation_System SHALL flag it in the intermediate results
8. THE BA_Estimation_System SHALL preserve original requirement text for traceability

### Requirement 4: Декомпозиція вимог на атомарні роботи

**User Story:** Як система, я хочу розбити кожну вимогу на атомарні БА-роботи, щоб забезпечити детальну оцінку.

#### Acceptance Criteria

1. FOR EACH requirement, THE BA_Estimation_System SHALL identify applicable atomic works from the reference catalog
2. THE BA_Estimation_System SHALL use a reference catalog of atomic BA works (concrete actions like: write user story, create diagram, conduct interview, align requirements with stakeholder)
3. THE BA_Estimation_System SHALL map requirements to atomic works based on requirement type and complexity
4. FOR EACH atomic work, THE BA_Estimation_System SHALL assign mapping to one or more of 35 BA processes for classification
5. THE BA_Estimation_System SHALL use process mapping to categorize atomic works into 6 BABOK categories:
   - Оцінка потреб (4.1-4.7): 7 процесів
   - Залучення зацікавлених сторін (5.1-5.7): 7 процесів
   - Виявлення (6.1-6.4): 4 процеси
   - Аналіз (7.1-7.9): 9 процесів
   - Відстежуваність і моніторинг (8.1-8.4): 4 процеси
   - Оцінка рішення (9.1-9.4): 4 процеси
6. THE BA_Estimation_System SHALL save decomposition results to intermediate markdown file
7. THE BA_Estimation_System SHALL link each atomic work back to its source requirement for traceability
8. WHEN decomposition is complete, THE BA_Estimation_System SHALL list all atomic works with their process mappings

### Requirement 5: Застосування коефіцієнтів складності

**User Story:** Як система, я хочу застосувати коефіцієнти складності до атомарних робіт, щоб врахувати контекстуальні фактори.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL use a reference catalog of coefficients
2. THE BA_Estimation_System SHALL detect legacy system integration factors from HLA or BV
3. THE BA_Estimation_System SHALL detect reverse engineering needs from context
4. THE BA_Estimation_System SHALL detect integration complexity from HLA
5. THE BA_Estimation_System SHALL apply coefficients to base atomic work estimates
6. THE BA_Estimation_System SHALL document which coefficients were applied and why
7. IF NFR indicates high risks, THEN THE BA_Estimation_System SHALL apply risk coefficient
8. THE BA_Estimation_System SHALL save coefficient application logic to intermediate markdown file
9. THE BA_Estimation_System SHALL support coefficient values from 0.5 to 3.0

### Requirement 6: Розрахунок PERT-оцінок

**User Story:** Як система, я хочу розрахувати PERT-оцінки для кожної атомарної роботи, щоб врахувати невизначеність.

#### Acceptance Criteria

1. FOR EACH atomic work, THE BA_Estimation_System SHALL calculate optimistic estimate (O)
2. FOR EACH atomic work, THE BA_Estimation_System SHALL calculate most likely estimate (M)
3. FOR EACH atomic work, THE BA_Estimation_System SHALL calculate pessimistic estimate (P)
4. THE BA_Estimation_System SHALL calculate expected estimate using formula: (O + 4M + P) / 6
5. THE BA_Estimation_System SHALL aggregate estimates by atomic work type
6. THE BA_Estimation_System SHALL aggregate estimates by requirement
7. THE BA_Estimation_System SHALL aggregate estimates by 35 BA processes using process mapping
8. THE BA_Estimation_System SHALL calculate total BA hours for the initiative
9. THE BA_Estimation_System SHALL assume Middle BA qualification level for all calculations
10. THE BA_Estimation_System SHALL round final hours to 0.5 hour precision

### Requirement 7: Генерація markdown-звіту

**User Story:** Як користувач, я хочу отримати структурований markdown-звіт з оцінкою, щоб зрозуміти результати та обґрунтування.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL generate estimation report in Markdown format
2. THE Estimation_Report SHALL include estimation date
3. THE Estimation_Report SHALL include initiative name from BV
4. THE Estimation_Report SHALL list all input artifacts and their versions/dates
5. THE Estimation_Report SHALL include total BA hours estimate
6. THE Estimation_Report SHALL include breakdown by atomic work types with hours per type
7. THE Estimation_Report SHALL include breakdown by 35 standard BA processes with hours per process (aggregated from atomic works)
8. THE Estimation_Report SHALL include breakdown by requirements (for descoping support)
9. THE Estimation_Report SHALL include explanatory notes with factors and RAID context
10. THE Estimation_Report SHALL include detailed explanations for each requirement showing atomic work decomposition
11. THE Estimation_Report SHALL save to the input folder or specified output location
12. THE Estimation_Report SHALL use clear section headers and formatting for readability

### Requirement 8: Генерація CSV-розшифровки

**User Story:** Як користувач, я хочу отримати детальну CSV-таблицю з усіма розрахунками, щоб мати можливість аналізувати дані в Excel або інших інструментах.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL generate detailed breakdown in CSV format
2. THE CSV_Breakdown SHALL include columns: requirement_id, requirement_text, atomic_work, atomic_work_type, ba_process_mapping, coefficients, O_estimate, M_estimate, P_estimate, expected_hours
3. THE CSV_Breakdown SHALL include one row per atomic work instance
4. THE CSV_Breakdown SHALL be compatible with Excel and Google Sheets
5. THE CSV_Breakdown SHALL use UTF-8 encoding with BOM to support Ukrainian text
6. THE CSV_Breakdown SHALL save to the same location as the markdown report
7. THE CSV_Breakdown SHALL include header row with column names

### Requirement 9: Збереження проміжних результатів агентів

**User Story:** Як користувач або розробник, я хочу бачити проміжні результати роботи кожного агента, щоб розуміти логіку системи та налагоджувати проблеми.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL create a subfolder named `intermediate-results` in the input directory
2. THE BA_Estimation_System SHALL save validation agent output to `01-validation.md`
3. THE BA_Estimation_System SHALL save requirements extraction agent output to `02-extraction.md`
4. THE BA_Estimation_System SHALL save decomposition agent output to `03-decomposition.md`
5. THE BA_Estimation_System SHALL save estimation agent output to `04-estimation.md`
6. THE BA_Estimation_System SHALL save report generation agent output to `05-report-generation.md`
7. EACH intermediate file SHALL include header with:
   - Timestamp (start and end)
   - Agent name and version
   - Execution duration
   - Input data summary
   - Output data summary
   - Status (success/failure)
8. THE BA_Estimation_System SHALL preserve intermediate files after completion for traceability
9. EACH intermediate file SHALL include observability metadata section with metrics
10. THE intermediate files SHALL support linking to observability dashboard for detailed metrics

### Requirement 10: Підтримка дископінгу через розріз по вимогах

**User Story:** Як користувач, я хочу бачити внесок кожної вимоги у загальну оцінку, щоб приймати рішення про виключення або зміну вимог для оптимізації бюджету.

#### Acceptance Criteria

1. THE Estimation_Report SHALL include a section with per-requirement breakdown
2. FOR EACH requirement, THE Estimation_Report SHALL show total hours contribution
3. FOR EACH requirement, THE Estimation_Report SHALL show list of atomic works
4. FOR EACH requirement, THE Estimation_Report SHALL show applied coefficients
5. THE Estimation_Report SHALL sort requirements by hours contribution (descending)
6. WHEN a requirement is removed, THE user SHALL be able to recalculate estimate by excluding that requirement's hours
7. THE CSV_Breakdown SHALL support filtering by requirement ID for descoping analysis
8. THE Estimation_Report SHALL show percentage contribution of each requirement to total hours

### Requirement 11: Мультиагентна архітектура з послідовним виконанням

**User Story:** Як система, я хочу використовувати спеціалізованих агентів для різних етапів оцінювання, щоб забезпечити модульність та прозорість процесу.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL implement validation agent as first step
2. THE BA_Estimation_System SHALL implement requirements extraction agent as second step
3. THE BA_Estimation_System SHALL implement decomposition agent as third step
4. THE BA_Estimation_System SHALL implement estimation agent as fourth step
5. THE BA_Estimation_System SHALL implement report generation agent as fifth step
6. EACH agent SHALL receive output from previous agent as input
7. EACH agent SHALL save its output to markdown file before passing to next agent
8. IF any agent fails, THE BA_Estimation_System SHALL stop execution and report which agent failed
9. EACH agent SHALL load its instructions from a separate markdown prompt file
10. THE prompt files SHALL be stored in `prompts/` subfolder with names: `validation-agent.md`, `extraction-agent.md`, `decomposition-agent.md`, `estimation-agent.md`, `report-agent.md`
11. THE prompt files SHALL be editable by developers without code changes
12. THE BA_Estimation_System SHALL validate that all prompt files exist before starting execution

### Requirement 12: Командний рядок як інтерфейс

**User Story:** Як користувач, я хочу запускати систему через командний рядок, щоб інтегрувати її в свій робочий процес без необхідності GUI.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL provide command-line interface
2. THE BA_Estimation_System SHALL accept folder path as command-line argument
3. THE BA_Estimation_System SHALL accept optional output path as command-line argument
4. THE BA_Estimation_System SHALL display progress messages during execution
5. THE BA_Estimation_System SHALL display success message with output file locations upon completion
6. THE BA_Estimation_System SHALL display error messages to stderr
7. THE BA_Estimation_System SHALL return exit code 0 on success and non-zero on failure
8. THE BA_Estimation_System SHALL support `--help` flag to display usage information
9. THE BA_Estimation_System SHALL support `--version` flag to display system version

### Requirement 13: RAID-контекст у звіті

**User Story:** Як користувач, я хочу бачити RAID-контекст в оцінці, щоб розуміти ризики, припущення, проблеми та залежності, які вплинули на результат.

#### Acceptance Criteria

1. THE Estimation_Report SHALL include RAID section
2. IF `raid.md` document is provided, THE BA_Estimation_System SHALL extract risks, assumptions, issues, and dependencies
3. IF `raid.md` document is not provided, THE BA_Estimation_System SHALL infer RAID context from other artifacts
4. THE Estimation_Report SHALL list key risks that increase estimation uncertainty
5. THE Estimation_Report SHALL list key assumptions made during estimation
6. THE Estimation_Report SHALL list issues that may affect estimation accuracy
7. THE Estimation_Report SHALL list dependencies that may impact BA work scope
8. THE Estimation_Report SHALL explain how RAID factors influenced the estimate
9. THE Estimation_Report SHALL highlight high-impact RAID items

### Requirement 14: Трасованість оцінки

**User Story:** Як користувач, я хочу бачити, які вхідні дані та версії вплинули на оцінку, щоб розуміти контекст результату.

#### Acceptance Criteria

1. THE Estimation_Report SHALL list all input files used
2. THE Estimation_Report SHALL include file modification dates or version numbers if available
3. THE Estimation_Report SHALL include system version or commit hash
4. THE Estimation_Report SHALL include timestamp of estimation
5. THE Estimation_Report SHALL include reference to intermediate results folder
6. WHEN input artifacts change, THE user SHALL be able to re-run estimation and compare results
7. THE BA_Estimation_System SHALL preserve previous estimation reports with timestamps in filenames
8. THE Estimation_Report SHALL include catalog versions used (atomic works and coefficients)

### Requirement 15: Обробка помилок та відмовостійкість

**User Story:** Як користувач, я хочу отримувати зрозумілі повідомлення про помилки, щоб швидко виправити проблеми з вхідними даними.

#### Acceptance Criteria

1. IF file cannot be read, THE BA_Estimation_System SHALL report which file and why
2. IF file encoding is not UTF-8, THE BA_Estimation_System SHALL attempt to detect encoding or report error
3. IF AI service returns error, THE BA_Estimation_System SHALL log error details and suggest retry
4. IF parsing fails, THE BA_Estimation_System SHALL indicate which document and which section caused the issue
5. THE BA_Estimation_System SHALL validate that generated files are not corrupted before reporting success
6. IF disk space is insufficient, THE BA_Estimation_System SHALL report error before attempting to write files
7. THE BA_Estimation_System SHALL implement timeout for AI agent calls (120 seconds per agent)
8. IF timeout occurs, THE BA_Estimation_System SHALL save partial results and report timeout
9. THE BA_Estimation_System SHALL provide actionable error messages with suggestions for resolution

### Requirement 16: Довідники атомарних робіт та коефіцієнтів

**User Story:** Як система, я хочу використовувати довідники атомарних робіт та коефіцієнтів, щоб забезпечити консистентність оцінок.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL maintain reference catalog of atomic BA works (concrete actions)
2. THE atomic work catalog SHALL include practical BA activities such as:
   - Write user story
   - Create use case diagram
   - Conduct stakeholder interview
   - Facilitate requirements workshop
   - Document business process
   - Create data model
   - Define acceptance criteria
   - Review and align requirements with stakeholders
3. FOR EACH atomic work, THE catalog SHALL include base time estimate (O/M/P in hours)
4. FOR EACH atomic work, THE catalog SHALL include description and applicability conditions
5. FOR EACH atomic work, THE catalog SHALL include mapping to one or more of 35 BA processes
6. THE BA_Estimation_System SHALL maintain separate reference of 35 BA processes organized in 6 categories:
   - Оцінка потреб: 4.1-4.7 (7 процесів)
   - Залучення зацікавлених сторін: 5.1-5.7 (7 процесів)
   - Виявлення: 6.1-6.4 (4 процеси)
   - Аналіз: 7.1-7.9 (9 процесів)
   - Відстежуваність і моніторинг: 8.1-8.4 (4 процеси)
   - Оцінка рішення: 9.1-9.4 (4 процеси)
7. THE BA_Estimation_System SHALL maintain reference catalog of coefficients
8. FOR EACH coefficient, THE catalog SHALL include multiplier value and applicability conditions
9. THE catalogs SHALL be stored in structured format (JSON or YAML)
10. THE catalogs SHALL be versioned and included in traceability information
11. THE catalogs SHALL be evolvable based on pilot project feedback
12. THE catalogs SHALL be stored in `catalogs/` subfolder with separate files: `atomic-works.yaml`, `ba-processes.yaml`, `coefficients.yaml`

### Requirement 17: Підтримка еволюції довідників

**User Story:** Як адміністратор системи, я хочу мати можливість уточнювати довідники на основі досвіду, щоб покращувати точність оцінок з часом.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL allow updating atomic work catalog without code changes
2. THE BA_Estimation_System SHALL allow updating coefficient catalog without code changes
3. WHEN catalogs are updated, THE BA_Estimation_System SHALL use new version for subsequent estimations
4. THE BA_Estimation_System SHALL preserve previous catalog versions for reproducibility
5. THE BA_Estimation_System SHALL validate catalog structure on startup
6. IF catalog is invalid, THE BA_Estimation_System SHALL report specific validation errors
7. THE BA_Estimation_System SHALL document catalog update process in user guide
8. THE BA_Estimation_System SHALL support catalog versioning with semantic version numbers

### Requirement 18: Мінімізація часу виконання

**User Story:** Як користувач, я хочу отримувати оцінку швидко, щоб не витрачати багато часу на очікування результату.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL complete estimation for typical project (20-30 requirements) within 5 minutes
2. THE BA_Estimation_System SHALL display progress indicators during execution
3. THE BA_Estimation_System SHALL optimize AI prompts to minimize token usage
4. THE BA_Estimation_System SHALL cache intermediate results to avoid re-computation on retry
5. IF estimation takes longer than expected, THE BA_Estimation_System SHALL display warning
6. THE BA_Estimation_System SHALL provide option to skip intermediate file generation for faster execution
7. THE BA_Estimation_System SHALL measure and log execution time for each agent
8. THE BA_Estimation_System SHALL display estimated time remaining during execution

### Requirement 19: Структура проєкту та організація файлів

**User Story:** Як розробник, я хочу мати чітку структуру проєкту, щоб легко орієнтуватися в коді та конфігураціях.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL organize files in following structure:
   - `prompts/` - agent prompt files
   - `catalogs/` - atomic works and coefficients catalogs
   - `observability/` - observability data and metrics
   - `logs/` - execution logs
   - `src/` - source code
   - `docs/` - documentation
   - `tests/` - test files (if applicable)
2. THE BA_Estimation_System SHALL include README.md with usage instructions
3. THE BA_Estimation_System SHALL include CHANGELOG.md with version history
4. THE BA_Estimation_System SHALL include requirements.txt or equivalent for dependencies
5. THE BA_Estimation_System SHALL include configuration file for system settings
6. THE BA_Estimation_System SHALL document file structure in README.md

### Requirement 20: Логування та діагностика

**User Story:** Як розробник або користувач, я хочу мати детальні логи виконання, щоб діагностувати проблеми та розуміти поведінку системи.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL create log file for each execution
2. THE log file SHALL include timestamp, agent name, and action for each step
3. THE log file SHALL include warnings and errors with full context
4. THE log file SHALL include execution time for each agent
5. THE log file SHALL be saved in `logs/` subfolder with timestamp in filename
6. THE BA_Estimation_System SHALL support log levels: DEBUG, INFO, WARNING, ERROR
7. THE BA_Estimation_System SHALL allow configuring log level via command-line argument
8. THE log file SHALL use UTF-8 encoding
9. THE BA_Estimation_System SHALL rotate log files to prevent disk space issues
10. THE log file SHALL include correlation ID for tracing requests across agents
11. THE log file SHALL include structured logging format (JSON) for machine parsing
12. THE log file SHALL include observability metrics inline with log entries
13. THE BA_Estimation_System SHALL support log streaming to external monitoring systems
14. THE log file SHALL include AI prompt and response summaries (truncated for large content)
15. THE BA_Estimation_System SHALL log resource usage (CPU, memory) at key checkpoints

### Requirement 21: Документація для користувачів

**User Story:** Як користувач, я хочу мати зрозумілу документацію, щоб швидко почати працювати з системою.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL include user guide in `docs/user-guide.md`
2. THE user guide SHALL explain how to prepare input artifacts
3. THE user guide SHALL provide examples of command-line usage
4. THE user guide SHALL explain output files and their structure
5. THE user guide SHALL include troubleshooting section
6. THE user guide SHALL explain how to interpret estimation results
7. THE user guide SHALL include FAQ section
8. THE user guide SHALL be written in Ukrainian language
9. THE BA_Estimation_System SHALL include quick start guide in README.md

### Requirement 22: Розширюваність системи

**User Story:** Як розробник, я хочу мати можливість розширювати систему новими агентами та функціями, щоб адаптувати її під нові потреби.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL use modular architecture for agents
2. THE BA_Estimation_System SHALL define clear interface for agent communication
3. THE BA_Estimation_System SHALL allow adding new agents without modifying existing code
4. THE BA_Estimation_System SHALL support plugin architecture for custom coefficients
5. THE BA_Estimation_System SHALL document extension points in developer guide
6. THE BA_Estimation_System SHALL provide example of custom agent implementation
7. THE BA_Estimation_System SHALL validate agent outputs against expected schema

### Requirement 23: Підтримка різних мов у вхідних документах

**User Story:** Як користувач, я хочу мати можливість використовувати документи українською або англійською мовою, щоб працювати з різними проєктами.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL detect language of input documents
2. THE BA_Estimation_System SHALL support Ukrainian language in input documents
3. THE BA_Estimation_System SHALL support English language in input documents
4. THE BA_Estimation_System SHALL generate reports in the same language as input documents
5. THE BA_Estimation_System SHALL use language-appropriate prompts for AI agents
6. IF mixed languages are detected, THE BA_Estimation_System SHALL use primary language from BV
7. THE BA_Estimation_System SHALL document language support in user guide

### Requirement 24: Observability агентів

**User Story:** Як користувач або розробник, я хочу мати повну видимість роботи агентів, щоб розуміти процес оцінювання, діагностувати проблеми та оптимізувати продуктивність.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL track execution metrics for each agent:
   - Start time and end time
   - Duration in seconds
   - AI tokens used (input and output)
   - Memory usage
   - Success/failure status
2. THE BA_Estimation_System SHALL create observability dashboard file `observability.json` with structured metrics
3. THE observability dashboard SHALL include agent execution timeline showing sequence and overlaps
4. THE observability dashboard SHALL include token usage breakdown by agent
5. THE observability dashboard SHALL include error traces with stack information if agent fails
6. THE BA_Estimation_System SHALL display real-time progress indicator showing:
   - Current agent name
   - Percentage complete
   - Estimated time remaining
   - Current operation description
7. THE BA_Estimation_System SHALL support `--verbose` flag for detailed observability output to console
8. THE BA_Estimation_System SHALL generate observability summary at the end of execution showing:
   - Total execution time
   - Total tokens used
   - Number of successful/failed agents
   - Bottleneck identification (slowest agent)
9. THE observability data SHALL be stored in `observability/` subfolder with timestamp
10. THE BA_Estimation_System SHALL provide observability data in JSON format for integration with monitoring tools
11. THE BA_Estimation_System SHALL track data flow between agents:

- Input size (characters/tokens)
- Output size (characters/tokens)
- Data transformation summary

12. THE BA_Estimation_System SHALL detect and report anomalies:

- Agent taking significantly longer than expected
- Unusually high token usage
- Repeated failures or retries

13. THE BA_Estimation_System SHALL support exporting observability data to common formats (JSON, CSV)
14. THE observability system SHALL have minimal performance impact (< 5% overhead)

### Requirement 25: Тестовий та продуктивний режими роботи

**User Story:** Як розробник або користувач, я хочу мати можливість запускати систему в тестовому режимі з економною моделлю для розробки та налагодження, або в продуктивному режимі з потужною моделлю для реальних оцінок.

#### Acceptance Criteria

1. THE BA_Estimation_System SHALL support two execution modes: test mode and production mode
2. THE BA_Estimation_System SHALL use `glm-5` model by default (production mode)
3. THE BA_Estimation_System SHALL support `--test-mode` command-line flag to enable test mode
4. WHEN `--test-mode` flag is provided, THE BA_Estimation_System SHALL use a lighter model configuration
5. THE BA_Estimation_System SHALL allow model configuration via `LLM_MODEL` environment variable
6. THE BA_Estimation_System SHALL display which model is being used at the start of execution
7. THE BA_Estimation_System SHALL include model name in all intermediate files and final reports
8. THE BA_Estimation_System SHALL track token costs separately for test and production modes
9. THE observability dashboard SHALL include model name and estimated cost per execution
10. THE BA_Estimation_System SHALL document model selection in traceability section of reports
11. WHEN test mode is used, THE Estimation_Report SHALL include disclaimer: "Generated using test mode. For production estimates, run without --test-mode flag."
12. THE BA_Estimation_System SHALL validate that selected model is available via ZhipuAI API before starting estimation
13. IF selected model is not available, THE BA_Estimation_System SHALL return clear error message with available alternatives
14. THE BA_Estimation_System SHALL log model selection and reasoning in execution logs
15. THE user guide SHALL explain differences between test and production modes and when to use each
