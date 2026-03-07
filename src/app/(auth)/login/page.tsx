"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, callbackUrl: "/" });
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[320px] space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-3">
          <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">
            nurturly
          </span>
          <div className="space-y-1 text-center">
            <h1 className="text-[15px] font-medium text-foreground">Sign in</h1>
            <p className="text-[12px] text-muted-foreground">
              Email nurturing & newsletters, simplified.
            </p>
          </div>
        </div>

        {/* Magic link */}
        <form onSubmit={handleMagicLink} className="space-y-3">
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9 text-[13px]"
          />
          <Button type="submit" className="h-9 w-full text-[12px]" disabled={loading}>
            {loading ? "Sending link..." : "Continue with email"}
          </Button>
        </form>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          We&apos;ll send you a magic link to sign in.
          <br />
          No password needed.
        </p>
      </div>
    </div>
  );
}
