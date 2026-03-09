import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Enums ──

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft", "scheduled", "sending", "sent", "cancelled",
]);

export const sequenceStatusEnum = pgEnum("sequence_status", [
  "draft", "active", "paused", "archived",
]);

export const mcStatusEnum = pgEnum("mc_status", [
  "draft", "active", "completed", "archived",
]);

export const mcItemTypeEnum = pgEnum("mc_item_type", [
  "transactional", "sequence", "audience",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active", "completed", "paused", "unsubscribed", "bounced",
]);

export const emailEventTypeEnum = pgEnum("email_event_type", [
  "sent", "delivered", "opened", "clicked", "bounced", "complained", "unsubscribed",
]);

export const listTypeEnum = pgEnum("list_type", [
  "static", "dynamic",
]);

export const contactSourceEnum = pgEnum("contact_source", [
  "manual", "import", "api",
]);

// ── NextAuth tables ──

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  senderName: text("sender_name"),
  senderEmail: text("sender_email"),
  sesDomainVerified: boolean("ses_domain_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => [
  primaryKey({ columns: [table.provider, table.providerAccountId] }),
]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);

// ── Contacts ──

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  company: text("company"),
  jobTitle: text("job_title"),
  phone: text("phone"),
  tags: text("tags").array(),
  properties: text("properties"),
  subscribed: boolean("subscribed").default(true).notNull(),
  source: contactSourceEnum("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("contacts_user_email_idx").on(table.userId, table.email),
]);

// ── Lists / Segments ──

export const lists = pgTable("lists", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: listTypeEnum("type").notNull().default("static"),
  filterRules: text("filter_rules"),
  contactCount: integer("contact_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const listMemberships = pgTable("list_memberships", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  listId: text("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("list_membership_idx").on(table.listId, table.contactId),
]);

// ── Emails (templates) ──

export const emails = pgTable("emails", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  preheaderText: text("preheader_text"),
  editorContent: text("editor_content").notNull(),
  htmlContent: text("html_content"),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Campaigns ──

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emailId: text("email_id").references(() => emails.id),
  subject: text("subject"),
  editorContent: text("editor_content"),
  htmlContent: text("html_content"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  listId: text("list_id").references(() => lists.id),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  totalRecipients: integer("total_recipients").default(0),
  totalSent: integer("total_sent").default(0),
  totalDelivered: integer("total_delivered").default(0),
  totalOpened: integer("total_opened").default(0),
  totalClicked: integer("total_clicked").default(0),
  totalBounced: integer("total_bounced").default(0),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Sequences ──

export const sequences = pgTable("sequences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: sequenceStatusEnum("status").notNull().default("draft"),
  triggerType: text("trigger_type").default("manual"),
  triggerListId: text("trigger_list_id").references(() => lists.id),
  workflowData: text("workflow_data"),
  totalEnrolled: integer("total_enrolled").default(0),
  totalCompleted: integer("total_completed").default(0),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sequenceSteps = pgTable("sequence_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sequenceId: text("sequence_id").notNull().references(() => sequences.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  emailId: text("email_id").references(() => emails.id),
  subject: text("subject"),
  editorContent: text("editor_content"),
  htmlContent: text("html_content"),
  delayDuration: integer("delay_duration").notNull(),
  delayUnit: text("delay_unit").notNull().default("days"),
  totalSent: integer("total_sent").default(0),
  totalOpened: integer("total_opened").default(0),
  totalClicked: integer("total_clicked").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("steps_sequence_idx").on(table.sequenceId, table.position),
]);

export const sequenceEnrollments = pgTable("sequence_enrollments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sequenceId: text("sequence_id").notNull().references(() => sequences.id, { onDelete: "cascade" }),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  currentStepPosition: integer("current_step_position").default(0).notNull(),
  status: enrollmentStatusEnum("status").notNull().default("active"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  lastStepSentAt: timestamp("last_step_sent_at"),
  nextStepScheduledAt: timestamp("next_step_scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("enrollment_unique_idx").on(table.sequenceId, table.contactId),
  index("enrollment_next_step_idx").on(table.status, table.nextStepScheduledAt),
]);

// ── Folders ──

export const folders = pgTable("folders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(), // 'transactional' | 'sequence' | 'email'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("folders_user_type_idx").on(table.userId, table.entityType),
]);

// ── Marketing Campaigns ──

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: mcStatusEnum("status").notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketingCampaignItems = pgTable("marketing_campaign_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: text("campaign_id").notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
  itemType: mcItemTypeEnum("item_type").notNull(),
  itemId: text("item_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("mc_item_unique_idx").on(table.campaignId, table.itemType, table.itemId),
  index("mc_item_campaign_idx").on(table.campaignId),
]);

// ── Analytics Events ──

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: text("contact_id").references(() => contacts.id),
  campaignId: text("campaign_id").references(() => campaigns.id),
  sequenceId: text("sequence_id").references(() => sequences.id),
  sequenceStepId: text("sequence_step_id").references(() => sequenceSteps.id),
  sesMessageId: text("ses_message_id"),
  eventType: emailEventTypeEnum("event_type").notNull(),
  metadata: text("metadata"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
}, (table) => [
  index("events_campaign_idx").on(table.campaignId, table.eventType),
  index("events_sequence_idx").on(table.sequenceId, table.eventType),
  index("events_contact_idx").on(table.contactId),
  index("events_occurred_idx").on(table.occurredAt),
]);
