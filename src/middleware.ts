export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|verify|api/auth|api/webhooks|unsubscribe|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
