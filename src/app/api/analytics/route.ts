import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, campaigns, sequences, sequenceEnrollments, analyticsEvents, lists } from "@/lib/db/schema";
import { eq, sql, count, and, gte, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── Overview metrics ──
  const [contactStats] = await db
    .select({
      total: count(),
      subscribed: count(sql`CASE WHEN ${contacts.subscribed} = true THEN 1 END`),
    })
    .from(contacts)
    .where(eq(contacts.userId, userId));

  const [contactsPrev] = await db
    .select({ total: count() })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), gte(contacts.createdAt, thirtyDaysAgo)));

  const [contactsPrevPrev] = await db
    .select({ total: count() })
    .from(contacts)
    .where(and(
      eq(contacts.userId, userId),
      gte(contacts.createdAt, sixtyDaysAgo),
      sql`${contacts.createdAt} < ${thirtyDaysAgo}`
    ));

  // ── Campaign metrics (aggregated) ──
  const [campaignAgg] = await db
    .select({
      totalCampaigns: count(),
      totalSent: sql<number>`COALESCE(SUM(${campaigns.totalSent}), 0)`,
      totalDelivered: sql<number>`COALESCE(SUM(${campaigns.totalDelivered}), 0)`,
      totalOpened: sql<number>`COALESCE(SUM(${campaigns.totalOpened}), 0)`,
      totalClicked: sql<number>`COALESCE(SUM(${campaigns.totalClicked}), 0)`,
      totalBounced: sql<number>`COALESCE(SUM(${campaigns.totalBounced}), 0)`,
      totalRecipients: sql<number>`COALESCE(SUM(${campaigns.totalRecipients}), 0)`,
    })
    .from(campaigns)
    .where(eq(campaigns.userId, userId));

  // ── Sequence metrics ──
  const [sequenceAgg] = await db
    .select({
      totalSequences: count(),
      activeSequences: count(sql`CASE WHEN ${sequences.status} = 'active' THEN 1 END`),
      totalEnrolled: sql<number>`COALESCE(SUM(${sequences.totalEnrolled}), 0)`,
      totalCompleted: sql<number>`COALESCE(SUM(${sequences.totalCompleted}), 0)`,
    })
    .from(sequences)
    .where(eq(sequences.userId, userId));

  // ── List metrics ──
  const [listAgg] = await db
    .select({
      totalLists: count(),
      totalMembers: sql<number>`COALESCE(SUM(${lists.contactCount}), 0)`,
    })
    .from(lists)
    .where(eq(lists.userId, userId));

  // ── Top campaigns by performance ──
  const topCampaigns = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      totalSent: campaigns.totalSent,
      totalOpened: campaigns.totalOpened,
      totalClicked: campaigns.totalClicked,
      totalBounced: campaigns.totalBounced,
      sentAt: campaigns.sentAt,
    })
    .from(campaigns)
    .where(and(eq(campaigns.userId, userId), eq(campaigns.status, "sent")))
    .orderBy(desc(campaigns.sentAt))
    .limit(10);

  // ── Top sequences by enrollment ──
  const topSequences = await db
    .select({
      id: sequences.id,
      name: sequences.name,
      status: sequences.status,
      totalEnrolled: sequences.totalEnrolled,
      totalCompleted: sequences.totalCompleted,
    })
    .from(sequences)
    .where(eq(sequences.userId, userId))
    .orderBy(desc(sequences.totalEnrolled))
    .limit(10);

  // ── Events over last 30 days (daily aggregation) ──
  const dailyEvents = await db
    .select({
      date: sql<string>`DATE(${analyticsEvents.occurredAt})`,
      eventType: analyticsEvents.eventType,
      eventCount: count(),
    })
    .from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.userId, userId),
      gte(analyticsEvents.occurredAt, thirtyDaysAgo),
    ))
    .groupBy(sql`DATE(${analyticsEvents.occurredAt})`, analyticsEvents.eventType)
    .orderBy(sql`DATE(${analyticsEvents.occurredAt})`);

  // ── Recent events (last 7 days by type) ──
  const recentEventCounts = await db
    .select({
      eventType: analyticsEvents.eventType,
      eventCount: count(),
    })
    .from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.userId, userId),
      gte(analyticsEvents.occurredAt, sevenDaysAgo),
    ))
    .groupBy(analyticsEvents.eventType);

  // ── Contact growth (last 30 days daily) ──
  const contactGrowth = await db
    .select({
      date: sql<string>`DATE(${contacts.createdAt})`,
      newContacts: count(),
    })
    .from(contacts)
    .where(and(
      eq(contacts.userId, userId),
      gte(contacts.createdAt, thirtyDaysAgo),
    ))
    .groupBy(sql`DATE(${contacts.createdAt})`)
    .orderBy(sql`DATE(${contacts.createdAt})`);

  // ── Enrollment status distribution ──
  const enrollmentStatuses = await db
    .select({
      status: sequenceEnrollments.status,
      statusCount: count(),
    })
    .from(sequenceEnrollments)
    .innerJoin(sequences, eq(sequenceEnrollments.sequenceId, sequences.id))
    .where(eq(sequences.userId, userId))
    .groupBy(sequenceEnrollments.status);

  // Build response
  const totalSent = Number(campaignAgg.totalSent);
  const totalOpened = Number(campaignAgg.totalOpened);
  const totalClicked = Number(campaignAgg.totalClicked);
  const totalBounced = Number(campaignAgg.totalBounced);
  const totalDelivered = Number(campaignAgg.totalDelivered);
  const totalRecipients = Number(campaignAgg.totalRecipients);

  return NextResponse.json({
    overview: {
      contacts: {
        total: contactStats.total,
        subscribed: contactStats.subscribed,
        newLast30d: contactsPrev.total,
        newPrev30d: contactsPrevPrev.total,
      },
      emails: {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalRecipients,
        openRate: totalSent > 0 ? totalOpened / totalSent : 0,
        clickRate: totalSent > 0 ? totalClicked / totalSent : 0,
        bounceRate: totalSent > 0 ? totalBounced / totalSent : 0,
        deliveryRate: totalSent > 0 ? totalDelivered / totalSent : 0,
      },
      campaigns: {
        total: campaignAgg.totalCampaigns,
      },
      sequences: {
        total: sequenceAgg.totalSequences,
        active: sequenceAgg.activeSequences,
        totalEnrolled: Number(sequenceAgg.totalEnrolled),
        totalCompleted: Number(sequenceAgg.totalCompleted),
        completionRate: Number(sequenceAgg.totalEnrolled) > 0
          ? Number(sequenceAgg.totalCompleted) / Number(sequenceAgg.totalEnrolled)
          : 0,
      },
      lists: {
        total: listAgg.totalLists,
        totalMembers: Number(listAgg.totalMembers),
      },
    },
    topCampaigns,
    topSequences,
    dailyEvents,
    contactGrowth,
    recentEventCounts,
    enrollmentStatuses,
  });
}
