import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const profiles = sqliteTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    data: text("data").notNull(),
    active: text("active").notNull().default("0"),
    updated: text("updated").notNull(),
  },
  (t) => [index("profiles_active").on(t.active)],
);
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("candidate"),
  status: text("status").notNull().default("active"),
  created: text("created").notNull(),
});
export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    details: text("details").notNull().default("{}"),
    created: text("created").notNull(),
  },
  (t) => [
    index("admin_audit_created").on(t.created),
    index("admin_audit_admin").on(t.adminId),
  ],
);
export const billingInvoices = sqliteTable(
  "billing_invoices",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    remindedAt: text("reminded_at").notNull().default(""),
    currency: text("currency").notNull().default("AZN"),
    vatPercent: integer("vat_percent").notNull().default(0),
    dueDate: text("due_date").notNull(),
    status: text("status").notNull().default("open"),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    index("billing_invoices_account").on(t.accountId),
    index("billing_invoices_due").on(t.dueDate),
    index("billing_invoices_status").on(t.status),
  ],
);
export const billingPayments = sqliteTable(
  "billing_payments",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id").notNull(),
    accountId: text("account_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("AZN"),
    method: text("method").notNull(),
    reference: text("reference").notNull().default(""),
    note: text("note").notNull().default(""),
    paidAt: text("paid_at").notNull(),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [
    index("billing_payments_invoice").on(t.invoiceId),
    index("billing_payments_account").on(t.accountId),
    index("billing_payments_paid_at").on(t.paidAt),
  ],
);
export const customSkills = sqliteTable(
  "custom_skills",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    labelEn: text("label_en").notNull(),
    category: text("category").notNull(),
    categoryEn: text("category_en").notNull(),
    aliases: text("aliases").notNull().default("[]"),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [
    uniqueIndex("custom_skills_label").on(t.label),
    uniqueIndex("custom_skills_label_en").on(t.labelEn),
    index("custom_skills_category").on(t.category),
  ],
);
export const escoSkills = sqliteTable(
  "esco_skills",
  {
    uri: text("uri").primaryKey(),
    labelEn: text("label_en").notNull(),
    normalizedLabel: text("normalized_label").notNull(),
    alternativeLabels: text("alternative_labels").notNull().default("[]"),
    normalizedAlternatives: text("normalized_alternatives").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    skillType: text("skill_type").notNull().default(""),
    reuseLevel: text("reuse_level").notNull().default(""),
    sourceVersion: text("source_version").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    index("esco_skills_normalized_label").on(t.normalizedLabel),
    index("esco_skills_label_en").on(t.labelEn),
  ],
);
export const passwordAccounts = sqliteTable(
  "password_accounts",
  {
    email: text("email").primaryKey(),
    userId: text("user_id").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    verified: integer("verified").notNull().default(0),
  },
  (t) => [uniqueIndex("password_accounts_user").on(t.userId)],
);
export const passkeys = sqliteTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull(),
    transports: text("transports").notNull(),
  },
  (t) => [index("passkeys_user").on(t.userId)],
);
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    expires: integer("expires").notNull(),
    created: integer("created").notNull().default(0),
    agent: text("agent").notNull().default(""),
  },
  (t) => [index("sessions_expiry").on(t.expires)],
);
// Earlier states of a candidate's profile (at most 10), so a bad edit or rewrite can be undone.
export const profileVersions = sqliteTable(
  "profile_versions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    data: text("data").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("profile_versions_user").on(t.userId, t.created)],
);
// Photos on a company's public employer page (at most 6, each up to 300 KB).
export const companyImages = sqliteTable(
  "company_images",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    type: text("type").notNull(),
    data: text("data").notNull(),
    position: integer("position").notNull().default(0),
    created: text("created").notNull(),
  },
  (t) => [index("company_images_company").on(t.companyId, t.position)],
);
// Offers and salary changes that wait for a director's decision.
export const approvalRequests = sqliteTable(
  "approval_requests",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    kind: text("kind").notNull(),
    subject: text("subject").notNull(),
    payload: text("payload").notNull(),
    requestedBy: text("requested_by").notNull(),
    requestedByName: text("requested_by_name").notNull().default(""),
    status: text("status").notNull().default("pending"),
    decidedBy: text("decided_by").notNull().default(""),
    decidedByName: text("decided_by_name").notNull().default(""),
    note: text("note").notNull().default(""),
    created: text("created").notNull(),
    decided: text("decided").notNull().default(""),
    remindedAt: text("reminded_at").notNull().default(""),
    reminders: integer("reminders").notNull().default(0),
    reply: text("reply").notNull().default(""),
    escalatedAt: text("escalated_at").notNull().default(""),
  },
  (t) => [index("approval_requests_company").on(t.companyId, t.status, t.created)],
);
// A substitute who may decide in place of an approver until a date.
export const approvalDelegates = sqliteTable(
  "approval_delegates",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    fromUser: text("from_user").notNull(),
    toUser: text("to_user").notNull(),
    until: text("until").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("approval_delegates_company").on(t.companyId, t.until)],
);
// Checklist for a new employee: first day, documents, equipment, introductions.
export const employeeTasks = sqliteTable(
  "employee_tasks",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    title: text("title").notNull(),
    due: text("due").notNull().default(""),
    done: integer("done").notNull().default(0),
    doneAt: text("done_at").notNull().default(""),
    doneBy: text("done_by").notNull().default(""),
    position: integer("position").notNull().default(0),
    created: text("created").notNull(),
  },
  (t) => [index("employee_tasks_employee").on(t.companyId, t.employeeId, t.position)],
);
// An employer's verdict on an AI evaluation of a candidate: the raw material for
// measuring how often the AI is right (see lib/ai-eval.ts).
export const aiFeedback = sqliteTable(
  "ai_feedback",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    jobId: text("job_id").notNull(),
    candidateId: text("candidate_id").notNull(),
    aiScore: integer("ai_score").notNull().default(0),
    ruleScore: integer("rule_score").notNull().default(0),
    aiRecommendation: text("ai_recommendation").notNull().default(""),
    verdict: text("verdict").notNull(),
    hrDecision: text("hr_decision").notNull().default(""),
    hrScore: integer("hr_score"),
    note: text("note").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    uniqueIndex("ai_feedback_unique").on(t.userId, t.kind, t.jobId, t.candidateId),
    index("ai_feedback_company").on(t.companyId, t.jobId),
  ],
);
export const settingHistory = sqliteTable(
  "setting_history",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    summary: text("summary").notNull(),
    actorId: text("actor_id").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("setting_history_key").on(t.key, t.created)],
);
export const errorLog = sqliteTable(
  "error_log",
  {
    id: text("id").primaryKey(),
    created: text("created").notNull(),
    source: text("source").notNull(),
    message: text("message").notNull(),
    whereAt: text("where_at").notNull().default(""),
    fingerprint: text("fingerprint").notNull(),
  },
  (t) => [index("error_log_created").on(t.created), index("error_log_fingerprint").on(t.fingerprint, t.created)],
);
// Who asked for an export or deletion of their data: kind, role and date only, never the person.
export const privacyRequests = sqliteTable("privacy_requests", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  role: text("role").notNull(),
  created: text("created").notNull(),
});
export const aiUsage = sqliteTable(
  "ai_usage",
  {
    day: text("day").notNull(),
    feature: text("feature").notNull(),
    provider: text("provider").notNull(),
    userId: text("user_id").notNull().default(""),
    calls: integer("calls").notNull().default(0),
    charsIn: integer("chars_in").notNull().default(0),
    charsOut: integer("chars_out").notNull().default(0),
    errors: integer("errors").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.feature, t.provider, t.userId] })],
);
export const notificationPrefs = sqliteTable("notification_prefs", {
  userId: text("user_id").primaryKey(),
  emailOff: text("email_off").notNull().default("[]"),
  updated: text("updated").notNull(),
});
export const companyReviews = sqliteTable(
  "company_reviews",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    userId: text("user_id").notNull(),
    rating: integer("rating").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    adminNote: text("admin_note").notNull().default(""),
    created: text("created").notNull(),
    reviewedAt: text("reviewed_at").notNull().default(""),
  },
  (t) => [uniqueIndex("company_reviews_unique").on(t.companyId, t.userId), index("company_reviews_status").on(t.status, t.created)],
);
export const jobAlerts = sqliteTable(
  "job_alerts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    filters: text("filters").notNull(),
    lastCheck: text("last_check").notNull(),
    // Ids of vacancies already reported or present when the alert was made.
    seen: text("seen").notNull().default("[]"),
    created: text("created").notNull(),
  },
  (t) => [index("job_alerts_user").on(t.userId)],
);
export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    expires: integer("expires").notNull(),
  },
  (t) => [index("auth_tokens_user").on(t.userId, t.kind)],
);
export const totpSecrets = sqliteTable("totp_secrets", {
  userId: text("user_id").primaryKey(),
  secret: text("secret").notNull(),
  enabled: integer("enabled").notNull().default(0),
  backupCodes: text("backup_codes").notNull().default("[]"),
  created: text("created").notNull(),
});
export const challenges = sqliteTable(
  "auth_challenges",
  {
    id: text("id").primaryKey(),
    challenge: text("challenge").notNull(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    expires: integer("expires").notNull(),
  },
  (t) => [index("challenges_expiry").on(t.expires)],
);
export const authLimits = sqliteTable(
  "auth_limits",
  {
    id: text("id").primaryKey(),
    count: integer("count").notNull(),
    expires: integer("expires").notNull(),
  },
  (t) => [index("auth_limits_expiry").on(t.expires)],
);
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    data: text("data").notNull(),
    status: text("status").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("jobs_owner").on(t.owner)],
);
export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull(),
    candidateId: text("candidate_id").notNull(),
    data: text("data").notNull(),
    status: text("status").notNull(),
    created: text("created").notNull(),
    auto: integer("auto").notNull().default(0),
    stage: text("stage").notNull().default(""),
    updated: text("updated").notNull().default(""),
    // Where the application came from (see lib/sources.ts); empty on older rows.
    source: text("source").notNull().default(""),
  },
  (t) => [
    uniqueIndex("application_unique").on(t.jobId, t.candidateId),
    index("applications_candidate").on(t.candidateId),
  ],
);
export const saved = sqliteTable(
  "saved",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    jobId: text("job_id").notNull(),
  },
  (t) => [uniqueIndex("saved_unique").on(t.userId, t.jobId)],
);
export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  data: text("data").notNull(),
  status: text("status").notNull(),
});
export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  created: text("created").notNull(),
});
export const aiCache = sqliteTable(
  "ai_cache",
  {
    key: text("key").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    value: text("value").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("ai_cache_created").on(t.created), index("ai_cache_user").on(t.userId)],
);
export const customCertifications = sqliteTable(
  "custom_certifications",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    issuer: text("issuer").notNull(),
    category: text("category").notNull(),
    aliases: text("aliases").notNull().default("[]"),
    skills: text("skills").notNull().default("[]"),
    levels: text("levels").notNull().default("[]"),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [uniqueIndex("custom_certifications_name").on(t.name)],
);
export const customJobTitles = sqliteTable(
  "custom_job_titles",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    labelEn: text("label_en").notNull(),
    family: text("family").notNull(),
    aliases: text("aliases").notNull().default("[]"),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [uniqueIndex("custom_job_titles_label").on(t.label)],
);
export const supportThreads = sqliteTable(
  "support_threads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    userRole: text("user_role").notNull(),
    topic: text("topic").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull().default("new"),
    meta: text("meta").notNull().default("{}"),
    userRead: text("user_read").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("support_threads_user").on(t.userId, t.updated), index("support_threads_status").on(t.status, t.updated)],
);
export const supportMessages = sqliteTable(
  "support_messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id").notNull(),
    authorId: text("author_id").notNull(),
    authorRole: text("author_role").notNull(),
    body: text("body").notNull(),
    attachmentName: text("attachment_name").notNull().default(""),
    attachmentType: text("attachment_type").notNull().default(""),
    attachmentData: text("attachment_data").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("support_messages_thread").on(t.threadId, t.created)],
);
export const aiConversations = sqliteTable(
  "ai_conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    title: text("title").notNull(),
    contextType: text("context_type").notNull(),
    contextId: text("context_id").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("ai_conversations_user").on(t.userId, t.updated)],
);
export const aiMessages = sqliteTable(
  "ai_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    author: text("author").notNull(),
    content: text("content").notNull(),
    data: text("data").notNull().default("{}"),
    created: text("created").notNull(),
  },
  (t) => [index("ai_messages_conversation").on(t.conversationId, t.created)],
);
export const messageThreads = sqliteTable(
  "message_threads",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    candidateId: text("candidate_id").notNull(),
    jobId: text("job_id").notNull().default(""),
    companyRead: text("company_read").notNull().default(""),
    candidateRead: text("candidate_read").notNull().default(""),
    // Team member who handles this conversation (company side only).
    assigneeId: text("assignee_id").notNull().default(""),
    candidateArchived: integer("candidate_archived").notNull().default(0),
    companyArchived: integer("company_archived").notNull().default(0),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    uniqueIndex("message_threads_pair").on(t.companyId, t.candidateId, t.jobId),
    index("message_threads_candidate").on(t.candidateId, t.updated),
  ],
);
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id").notNull(),
    senderId: text("sender_id").notNull(),
    senderRole: text("sender_role").notNull(),
    body: text("body").notNull(),
    replyTo: text("reply_to").notNull().default(""),
    // The person who wrote it; senderId is the company for company messages.
    authorId: text("author_id").notNull().default(""),
    attachmentName: text("attachment_name").notNull().default(""),
    attachmentType: text("attachment_type").notNull().default(""),
    attachmentData: text("attachment_data").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("messages_thread").on(t.threadId, t.created)],
);
export const applicationEvents = sqliteTable(
  "application_events",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id").notNull(),
    actorId: text("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    type: text("type").notNull(),
    fromValue: text("from_value").notNull().default(""),
    toValue: text("to_value").notNull().default(""),
    note: text("note").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("application_events_application").on(t.applicationId, t.created)],
);
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    link: text("link").notNull().default(""),
    read: integer("read").notNull().default(0),
    created: text("created").notNull(),
  },
  (t) => [index("notifications_user").on(t.userId, t.created)],
);
export const offers = sqliteTable(
  "offers",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id").notNull(),
    jobId: text("job_id").notNull(),
    companyId: text("company_id").notNull(),
    candidateId: text("candidate_id").notNull(),
    data: text("data").notNull(),
    status: text("status").notNull().default("sent"),
    signatureName: text("signature_name").notNull().default(""),
    signedAt: text("signed_at").notNull().default(""),
    signedIp: text("signed_ip").notNull().default(""),
    responseNote: text("response_note").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    index("offers_application").on(t.applicationId),
    index("offers_candidate").on(t.candidateId, t.created),
    index("offers_company").on(t.companyId, t.created),
  ],
);
export const relations = sqliteTable(
  "relations",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    targetId: text("target_id").notNull(),
    targetRole: text("target_role").notNull(),
    kind: text("kind").notNull(),
    note: text("note").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [uniqueIndex("relations_unique").on(t.actorId, t.targetId, t.kind), index("relations_target").on(t.targetId, t.kind)],
);
export const assessments = sqliteTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    jobId: text("job_id").notNull().default(""),
    title: text("title").notNull(),
    instructions: text("instructions").notNull().default(""),
    durationMin: integer("duration_min").notNull().default(30),
    passingScore: integer("passing_score").notNull().default(0),
    showResult: integer("show_result").notNull().default(0),
    onPass: text("on_pass").notNull().default(""),
    onFail: text("on_fail").notNull().default(""),
    questions: text("questions").notNull().default("[]"),
    attachmentName: text("attachment_name").notNull().default(""),
    attachmentType: text("attachment_type").notNull().default(""),
    attachmentData: text("attachment_data").notNull().default(""),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("assessments_company").on(t.companyId, t.updated)],
);
export const questionBank = sqliteTable(
  "question_bank",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    question: text("question").notNull(),
    tag: text("tag").notNull().default(""),
    textKey: text("text_key").notNull(),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("question_bank_company").on(t.companyId, t.created), uniqueIndex("question_bank_unique").on(t.companyId, t.textKey)],
);
export const assessmentRevisions = sqliteTable(
  "assessment_revisions",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    reason: text("reason").notNull().default(""),
    summary: text("summary").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("assessment_revisions_assessment").on(t.assessmentId, t.created)],
);
export const assessmentAssignments = sqliteTable(
  "assessment_assignments",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id").notNull(),
    applicationId: text("application_id").notNull(),
    candidateId: text("candidate_id").notNull(),
    companyId: text("company_id").notNull(),
    status: text("status").notNull().default("assigned"),
    assignedAt: text("assigned_at").notNull(),
    startedAt: text("started_at").notNull().default(""),
    deadlineAt: text("deadline_at").notNull().default(""),
    submittedAt: text("submitted_at").notNull().default(""),
    answers: text("answers").notNull().default("{}"),
    score: integer("score").notNull().default(0),
    maxScore: integer("max_score").notNull().default(0),
    violations: text("violations").notNull().default("[]"),
    late: integer("late").notNull().default(0),
    // Copy of the test at the moment it was sent, so later edits cannot change it.
    snapshot: text("snapshot").notNull().default(""),
    manualScores: text("manual_scores").notNull().default("{}"),
    reviewStatus: text("review_status").notNull().default(""),
    reviewedBy: text("reviewed_by").notNull().default(""),
    reviewedAt: text("reviewed_at").notNull().default(""),
    autosavedAt: text("autosaved_at").notNull().default(""),
    outcomeApplied: integer("outcome_applied").notNull().default(0),
    remindedAt: text("reminded_at").notNull().default(""),
  },
  (t) => [
    index("assessment_assignments_candidate").on(t.candidateId, t.assignedAt),
    index("assessment_assignments_company").on(t.companyId, t.assignedAt),
  ],
);
export const companyMembers = sqliteTable(
  "company_members",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    userId: text("user_id").notNull().default(""),
    email: text("email").notNull(),
    role: text("role").notNull(),
    department: text("department").notNull().default(""),
    status: text("status").notNull().default("invited"),
    // Extra permissions granted to this person on top of the role (JSON array).
    grants: text("grants").notNull().default("[]"),
    invitedBy: text("invited_by").notNull(),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    uniqueIndex("company_members_company_email").on(t.companyId, t.email),
    index("company_members_user").on(t.userId, t.status),
    index("company_members_email").on(t.email, t.status),
  ],
);
export const companyProfiles = sqliteTable(
  "company_profiles",
  {
    companyId: text("company_id").primaryKey(),
    data: text("data").notNull().default("{}"),
    docName: text("doc_name").notNull().default(""),
    docType: text("doc_type").notNull().default(""),
    docData: text("doc_data").notNull().default(""),
    logoType: text("logo_type").notNull().default(""),
    logoData: text("logo_data").notNull().default(""),
    approvalRules: text("approval_rules").notNull().default("{}"),
    verificationStatus: text("verification_status").notNull().default("none"),
    verificationNote: text("verification_note").notNull().default(""),
    submittedAt: text("submitted_at").notNull().default(""),
    reviewedAt: text("reviewed_at").notNull().default(""),
    reviewedBy: text("reviewed_by").notNull().default(""),
    // Result of the official taxpayer search (e-taxes), recorded by an admin.
    taxCheck: text("tax_check").notNull().default(""),
    updated: text("updated").notNull(),
  },
  (t) => [index("company_profiles_verification").on(t.verificationStatus, t.submittedAt)],
);
export const companyEmployees = sqliteTable(
  "company_employees",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    name: text("name").notNull(),
    position: text("position").notNull().default(""),
    department: text("department").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    startDate: text("start_date").notNull().default(""),
    salaryCents: integer("salary_cents").notNull().default(0),
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("manual"),
    applicationId: text("application_id").notNull().default(""),
    endDate: text("end_date").notNull().default(""),
    exitType: text("exit_type").notNull().default(""),
    exitReason: text("exit_reason").notNull().default(""),
    exitNote: text("exit_note").notNull().default(""),
    jobId: text("job_id").notNull().default(""),
    probationEnd: text("probation_end").notNull().default(""),
    probationReminded: integer("probation_reminded").notNull().default(0),
    // Department > section > employee. The salary is in `salaryType` terms (gross or net).
    section: text("section").notNull().default(""),
    salaryType: text("salary_type").notNull().default("gross"),
    sector: text("sector").notNull().default("private"),
    vacationDays: integer("vacation_days").notNull().default(21),
    vacationUsed: integer("vacation_used").notNull().default(0),
    // Identity card, birth, address, family and bank data as JSON (see lib/employee-profile.ts).
    profile: text("profile").notNull().default("{}"),
    // The employee's own account, once linked with a code the company gave; the code is kept only as a hash.
    userId: text("user_id").notNull().default(""),
    linkHash: text("link_hash").notNull().default(""),
    linkExpires: text("link_expires").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("company_employees_company").on(t.companyId, t.status)],
);
// Department and section names of a company, one spelling per name.
export const orgNames = sqliteTable(
  "org_names",
  {
    companyId: text("company_id").notNull(),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    // A section belongs to a department; empty for departments, positions and older sections.
    parent: text("parent").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.kind, t.key] })],
);
// An employee's application for leave or a change, recorded by HR; the order is drawn up from it.
export const employeeRequests = sqliteTable(
  "employee_requests",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    kind: text("kind").notNull(),
    data: text("data").notNull().default("{}"),
    status: text("status").notNull().default("new"),
    orderId: text("order_id").notNull().default(""),
    decision: text("decision").notNull().default(""),
    // "hr" when HR recorded it, "employee" when the employee wrote it in their own profile.
    source: text("source").notNull().default("hr"),
    createdBy: text("created_by").notNull().default(""),
    createdByName: text("created_by_name").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("employee_requests_company").on(t.companyId, t.status, t.created)],
);
// Wrong link codes an account tried, so guessing is slowed down.
export const employeeLinkAttempts = sqliteTable(
  "employee_link_attempts",
  { userId: text("user_id").notNull(), created: text("created").notNull() },
  (t) => [index("employee_link_attempts_user").on(t.userId, t.created)],
);
// Payroll: one-off additions and deductions of a month, advances and salary payments, the frozen result of an approved month.
export const payrollInputs = sqliteTable(
  "payroll_inputs",
  {
    companyId: text("company_id").notNull(),
    month: text("month").notNull(),
    employeeId: text("employee_id").notNull(),
    data: text("data").notNull().default("{}"),
    updated: text("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.month, t.employeeId] })],
);
export const payrollPayments = sqliteTable(
  "payroll_payments",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    month: text("month").notNull(),
    kind: text("kind").notNull(), // advance, salary, vacation, benefit or extra
    amountCents: integer("amount_cents").notNull(),
    paidOn: text("paid_on").notNull(),
    method: text("method").notNull().default(""),
    note: text("note").notNull().default(""),
    title: text("title").notNull().default(""),
    batchId: text("batch_id").notNull().default(""),
    reversedAt: text("reversed_at").notNull().default(""),
    reversedByName: text("reversed_by_name").notNull().default(""),
    reverseReason: text("reverse_reason").notNull().default(""),
    createdBy: text("created_by").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("payroll_payments_month").on(t.companyId, t.month)],
);
export const payrollRuns = sqliteTable(
  "payroll_runs",
  {
    companyId: text("company_id").notNull(),
    month: text("month").notNull(),
    status: text("status").notNull().default("draft"),
    snapshot: text("snapshot").notNull().default(""),
    approvedBy: text("approved_by").notNull().default(""),
    approvedByName: text("approved_by_name").notNull().default(""),
    approvedAt: text("approved_at").notNull().default(""),
    updated: text("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.month] })],
);
export const payrollSettings = sqliteTable("payroll_settings", {
  companyId: text("company_id").primaryKey(),
  advanceDay: integer("advance_day").notNull().default(0),
  payDay: integer("pay_day").notNull().default(28),
  dualThreshold: integer("dual_threshold").notNull().default(0),
  updated: text("updated").notNull(),
});
export const payrollBankAccounts = sqliteTable("payroll_bank_accounts", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  label: text("label").notNull().default(""),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code").notNull().default(""),
  swift: text("swift").notNull().default(""),
  iban: text("iban").notNull(),
  accountNumber: text("account_number").notNull().default(""),
  voen: text("voen").notNull().default(""),
  holder: text("holder").notNull().default(""),
  currency: text("currency").notNull().default("AZN"),
  auto: text("auto").notNull().default("off"),
  isDefault: integer("is_default").notNull().default(0),
  created: text("created").notNull(),
});
// A transfer order of the salary or advance: draft, approved by the director, sent to the bank, paid.
export const payrollBatches = sqliteTable("payroll_batches", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  month: text("month").notNull(),
  kind: text("kind").notNull(),
  accountId: text("account_id").notNull(),
  status: text("status").notNull().default("draft"),
  source: text("source").notNull().default("manual"),
  totalCents: integer("total_cents").notNull().default(0),
  itemCount: integer("item_count").notNull().default(0),
  items: text("items").notNull().default("[]"),
  skipped: text("skipped").notNull().default("[]"),
  note: text("note").notNull().default(""),
  createdByName: text("created_by_name").notNull().default(""),
  approvedByName: text("approved_by_name").notNull().default(""),
  approvedAt: text("approved_at").notNull().default(""),
  approvedBy: text("approved_by").notNull().default(""),
  firstApprovedBy: text("first_approved_by").notNull().default(""),
  firstApprovedName: text("first_approved_name").notNull().default(""),
  sentAt: text("sent_at").notNull().default(""),
  paidAt: text("paid_at").notNull().default(""),
  created: text("created").notNull(),
});
// Pay of an employee from a date on; the first change also keeps the earlier pay, so past months keep their pay.
export const employeeSalaryHistory = sqliteTable(
  "employee_salary_history",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    salaryCents: integer("salary_cents").notNull(),
    salaryType: text("salary_type").notNull().default("gross"),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [uniqueIndex("employee_salary_history_day").on(t.employeeId, t.effectiveFrom), index("employee_salary_history_company").on(t.companyId)],
);
// Additions and deductions that repeat every month between two months (a loan, an alimony, a standing allowance).
export const payrollRecurring = sqliteTable(
  "payroll_recurring",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    type: text("type").notNull(), // "addition" or "deduction"
    label: text("label").notNull(),
    amountCents: integer("amount_cents").notNull(),
    deductionKind: text("deduction_kind").notNull().default("general"),
    fromMonth: text("from_month").notNull(),
    toMonth: text("to_month").notNull().default(""),
    createdBy: text("created_by").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("payroll_recurring_company").on(t.companyId, t.employeeId)],
);
// What a month's deductions could not take because of the legal limit, carried to the next month.
export const payrollCarry = sqliteTable(
  "payroll_carry",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    month: text("month").notNull(),
    label: text("label").notNull(),
    amountCents: integer("amount_cents").notNull(),
    deductionKind: text("deduction_kind").notNull().default("general"),
    fromMonth: text("from_month").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("payroll_carry_month").on(t.companyId, t.month)],
);
// One row per reminder already sent to a company, so the daily job tells it once.
export const payrollReminders = sqliteTable(
  "payroll_reminders",
  {
    companyId: text("company_id").notNull(),
    key: text("key").notNull(),
    created: text("created").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.key] })],
);
// Hours worked on a day (and of them at night): overtime, rest-day and night pay come from here.
export const attendanceHours = sqliteTable(
  "attendance_hours",
  {
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    day: text("day").notNull(),
    hours: real("hours").notNull().default(0),
    nightHours: real("night_hours").notNull().default(0),
    note: text("note").notNull().default(""),
    updated: text("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.employeeId, t.day] }), index("attendance_hours_day").on(t.companyId, t.day)],
);
// Draft until the director approves the staff plan; after that changes need the director.
export const staffPlanState = sqliteTable("staff_plan_state", {
  companyId: text("company_id").primaryKey(),
  status: text("status").notNull().default("draft"),
  updated: text("updated").notNull(),
});
// Staff table: places per department, section and position.
export const staffUnits = sqliteTable(
  "staff_units",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    department: text("department").notNull().default(""),
    section: text("section").notNull().default(""),
    position: text("position").notNull().default(""),
    planned: integer("planned").notNull().default(1),
    // Share of a full place (1, 0.75, 0.5, 0.25) and the pay band in gross cents; max 0 = same as the minimum.
    rate: real("rate").notNull().default(1),
    salaryCents: integer("salary_cents").notNull().default(0),
    salaryMaxCents: integer("salary_max_cents").notNull().default(0),
    note: text("note").notNull().default(""),
    updated: text("updated").notNull(),
  },
  (t) => [index("staff_units_company").on(t.companyId, t.department)],
);
export const interviewTemplates = sqliteTable(
  "interview_templates",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    name: text("name").notNull(),
    questions: text("questions").notNull().default("[]"),
    createdBy: text("created_by").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("interview_templates_company").on(t.companyId, t.updated)],
);
export const savedSearches = sqliteTable(
  "saved_searches",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    name: text("name").notNull(),
    filters: text("filters").notNull(),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("saved_searches_company").on(t.companyId, t.created)],
);
export const messageTemplates = sqliteTable(
  "message_templates",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    body: text("body").notNull(),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("message_templates_company").on(t.companyId, t.created)],
);
export const offerTemplates = sqliteTable(
  "offer_templates",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    name: text("name").notNull(),
    data: text("data").notNull(),
    createdBy: text("created_by").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("offer_templates_company").on(t.companyId, t.updated)],
);
export const headcountPlan = sqliteTable(
  "headcount_plan",
  {
    companyId: text("company_id").notNull(),
    department: text("department").notNull(),
    planned: integer("planned").notNull().default(0),
    updated: text("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.department] })],
);
export const employeeDocuments = sqliteTable(
  "employee_documents",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    category: text("category").notNull().default("other"),
    // Which contract, order or certificate it is, its number and date.
    subtype: text("subtype").notNull().default(""),
    docNumber: text("doc_number").notNull().default(""),
    docDate: text("doc_date").notNull().default(""),
    name: text("name").notNull(),
    type: text("type").notNull(),
    data: text("data").notNull(),
    size: integer("size").notNull().default(0),
    uploadedBy: text("uploaded_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("employee_documents_employee").on(t.companyId, t.employeeId)],
);
export const employeeEvents = sqliteTable(
  "employee_events",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    type: text("type").notNull(),
    fromValue: text("from_value").notNull().default(""),
    toValue: text("to_value").notNull().default(""),
    note: text("note").notNull().default(""),
    actorId: text("actor_id").notNull().default(""),
    eventDate: text("event_date").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("employee_events_employee").on(t.employeeId, t.eventDate), index("employee_events_company").on(t.companyId, t.eventDate)],
);
export const companyAudit = sqliteTable(
  "company_audit",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    target: text("target").notNull().default(""),
    detail: text("detail").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("company_audit_company").on(t.companyId, t.created)],
);
export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    itemKey: text("item_key").notNull(),
    itemLabel: text("item_label").notNull().default(""),
    docName: text("doc_name").notNull().default(""),
    docType: text("doc_type").notNull().default(""),
    docData: text("doc_data").notNull().default(""),
    status: text("status").notNull().default("pending"),
    aiResult: text("ai_result").notNull().default(""),
    adminNote: text("admin_note").notNull().default(""),
    reviewedBy: text("reviewed_by").notNull().default(""),
    reviewedAt: text("reviewed_at").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    uniqueIndex("verifications_item").on(t.userId, t.kind, t.itemKey),
    index("verifications_status").on(t.status, t.updated),
  ],
);

export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    brand: text("brand").notNull(),
    last4: text("last4").notNull(),
    expMonth: integer("exp_month").notNull(),
    expYear: integer("exp_year").notNull(),
    holder: text("holder").notNull().default(""),
    token: text("token").notNull(),
    provider: text("provider").notNull().default("mock"),
    isDefault: integer("is_default").notNull().default(0),
    created: text("created").notNull(),
  },
  (t) => [index("payment_methods_account").on(t.accountId)],
);
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    planId: text("plan_id").notNull(),
    status: text("status").notNull().default("active"),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    autoRenew: integer("auto_renew").notNull().default(0),
    methodId: text("method_id").notNull().default(""),
    cancelledAt: text("cancelled_at").notNull().default(""),
    renewalReminded: integer("renewal_reminded").notNull().default(0),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("subscriptions_account").on(t.accountId, t.created)],
);
export const planPayments = sqliteTable(
  "plan_payments",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    subscriptionId: text("subscription_id").notNull(),
    planId: text("plan_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("AZN"),
    status: text("status").notNull(),
    methodLabel: text("method_label").notNull().default(""),
    provider: text("provider").notNull().default("mock"),
    providerRef: text("provider_ref").notNull().default(""),
    periodStart: text("period_start").notNull().default(""),
    periodEnd: text("period_end").notNull().default(""),
    error: text("error").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("plan_payments_account").on(t.accountId, t.created)],
);
export const usageCounters = sqliteTable(
  "usage_counters",
  {
    accountId: text("account_id").notNull(),
    day: text("day").notNull(),
    feature: text("feature").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.day, t.feature] })],
);
export const contracts = sqliteTable(
  "contracts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    subscriptionId: text("subscription_id").notNull(),
    planId: text("plan_id").notNull(),
    number: text("number").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("contracts_account").on(t.accountId, t.created)],
);

export const customEducationItems = sqliteTable(
  "custom_education_items",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    labelEn: text("label_en").notNull().default(""),
    labelRu: text("label_ru").notNull().default(""),
    extra: text("extra").notNull().default(""),
    aliases: text("aliases").notNull().default("[]"),
    createdBy: text("created_by").notNull(),
    created: text("created").notNull(),
  },
  (t) => [uniqueIndex("custom_education_items_label").on(t.kind, t.label)],
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated: text("updated").notNull(),
});

// One AI fit rating per candidate and vacancy; it is reused until the CV or the vacancy changes.
export const aiJobRatings = sqliteTable(
  "ai_job_ratings",
  {
    userId: text("user_id").notNull(),
    jobId: text("job_id").notNull(),
    inputHash: text("input_hash").notNull(),
    score: integer("score").notNull(),
    reason: text("reason").notNull(),
    flagged: integer("flagged").notNull().default(0),
    created: text("created").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] }), index("ai_job_ratings_created").on(t.created)],
);

// Scheduled summary e-mails for company members (weekly or monthly).
export const digestSubscriptions = sqliteTable(
  "digest_subscriptions",
  {
    userId: text("user_id").primaryKey(),
    companyId: text("company_id").notNull(),
    frequency: text("frequency").notNull(),
    lastSent: text("last_sent").notNull().default(""),
    created: text("created").notNull(),
  },
  (t) => [index("digest_subscriptions_company").on(t.companyId)],
);

// Interviews scheduled by the company for an application; the candidate confirms or declines.
export const interviews = sqliteTable(
  "interviews",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id").notNull(),
    jobId: text("job_id").notNull(),
    companyId: text("company_id").notNull(),
    candidateId: text("candidate_id").notNull(),
    scheduledAt: text("scheduled_at").notNull(),
    durationMin: integer("duration_min").notNull().default(45),
    kind: text("kind").notNull().default("online"),
    location: text("location").notNull().default(""),
    note: text("note").notNull().default(""),
    status: text("status").notNull().default("scheduled"),
    candidateNote: text("candidate_note").notNull().default(""),
    createdBy: text("created_by").notNull().default(""),
    rating: integer("rating").notNull().default(0),
    feedback: text("feedback").notNull().default(""),
    decision: text("decision").notNull().default(""),
    remindedAt: text("reminded_at").notNull().default(""),
    panel: text("panel").notNull().default(""),
    slots: text("slots").notNull().default("[]"),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    index("interviews_company").on(t.companyId, t.scheduledAt),
    index("interviews_candidate").on(t.candidateId, t.scheduledAt),
    index("interviews_application").on(t.applicationId),
  ],
);

// The company's saved candidates with tags and a private note.
export const talentPool = sqliteTable(
  "talent_pool",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    candidateId: text("candidate_id").notNull(),
    tags: text("tags").notNull().default("[]"),
    note: text("note").notNull().default(""),
    sourceJobId: text("source_job_id").notNull().default(""),
    addedBy: text("added_by").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [uniqueIndex("talent_pool_unique").on(t.companyId, t.candidateId), index("talent_pool_candidate").on(t.candidateId)],
);

// Reusable vacancy content a company saves to start new openings quickly.
export const jobTemplates = sqliteTable(
  "job_templates",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    name: text("name").notNull(),
    data: text("data").notNull(),
    createdBy: text("created_by").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [uniqueIndex("job_templates_name").on(t.companyId, t.name)],
);

// One row per vacancy, viewer (one-way hash) and day; purged after 180 days.
export const jobViews = sqliteTable(
  "job_views",
  {
    jobId: text("job_id").notNull(),
    viewer: text("viewer").notNull(),
    day: text("day").notNull(),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.viewer, t.day] }), index("job_views_day").on(t.day)],
);

// Orders about an employee, with the people who have to approve (sign) them.
export const employeeOrders = sqliteTable(
  "employee_orders",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    kind: text("kind").notNull(),
    number: text("number").notNull().default(""),
    orderDate: text("order_date").notNull().default(""),
    input: text("input").notNull().default("{}"),
    signers: text("signers").notNull().default("[]"),
    status: text("status").notNull().default("pending"),
    // Who has to act now (creator, head or director) and what has happened to the order.
    holder: text("holder").notNull().default(""),
    history: text("history").notNull().default("[]"),
    createdBy: text("created_by").notNull().default(""),
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("employee_orders_employee").on(t.companyId, t.employeeId, t.created)],
);

// Attendance: how each day of an employee is marked (worked, leave of a kind, absent).
export const attendanceMarks = sqliteTable(
  "attendance_marks",
  {
    companyId: text("company_id").notNull(),
    employeeId: text("employee_id").notNull(),
    day: text("day").notNull(),
    code: text("code").notNull(),
    note: text("note").notNull().default(""),
    updated: text("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.employeeId, t.day] }), index("attendance_marks_day").on(t.companyId, t.day)],
);
// The company's own days off and working days (for example a working Saturday), over the state calendar.
export const companyCalendar = sqliteTable(
  "company_calendar",
  {
    companyId: text("company_id").notNull(),
    day: text("day").notNull(),
    kind: text("kind").notNull(),
    label: text("label").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.day] })],
);
