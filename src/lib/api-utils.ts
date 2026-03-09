import { NextRequest, NextResponse } from "next/server";

/**
 * Safely parse JSON from a request body.
 * Returns the parsed body or a 400 response if invalid.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseJsonBody<T = Record<string, any>>(
  request: Request | NextRequest
): Promise<T | NextResponse> {
  try {
    return await request.json() as T;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }
}

/** Type guard to check if parseJsonBody returned an error response */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
