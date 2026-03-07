import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { validateEmail } from "@/lib/contacts/validation";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const mappingStr = formData.get("mapping") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const { data } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  });

  const mapping: Record<string, string> = mappingStr ? JSON.parse(mappingStr) : {};

  const validRows: Array<{
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    jobTitle: string | null;
    phone: string | null;
    tags: string[];
    source: "import";
  }> = [];
  const importErrors: Array<{ row: number; email: string; reason: string }> = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as Record<string, string>;
    const mapped: Record<string, string> = {};

    for (const [csvCol, contactField] of Object.entries(mapping)) {
      if (row[csvCol] !== undefined) {
        mapped[contactField] = row[csvCol].trim();
      }
    }

    if (!mapped.email || !validateEmail(mapped.email)) {
      importErrors.push({ row: i + 2, email: mapped.email || "", reason: "Invalid email" });
      continue;
    }

    validRows.push({
      userId: session.user.id,
      email: mapped.email.toLowerCase(),
      firstName: mapped.firstName || null,
      lastName: mapped.lastName || null,
      company: mapped.company || null,
      jobTitle: mapped.jobTitle || null,
      phone: mapped.phone || null,
      tags: mapped.tags ? mapped.tags.split(",").map((t: string) => t.trim()) : [],
      source: "import",
    });
  }

  let imported = 0;
  if (validRows.length > 0) {
    for (let i = 0; i < validRows.length; i += 100) {
      const chunk = validRows.slice(i, i + 100);
      const result = await db.insert(contacts).values(chunk)
        .onConflictDoNothing()
        .returning({ id: contacts.id });
      imported += result.length;
    }
  }

  return NextResponse.json({
    imported,
    skipped: validRows.length - imported,
    errors: importErrors,
  });
}
