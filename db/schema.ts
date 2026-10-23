import {
  sqliteTable,
  text,
  integer,
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
    created: text("created").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [index("company_employees_company").on(t.companyId, t.status)],
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
