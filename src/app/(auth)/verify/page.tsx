import { Mail } from "lucide-react";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-[340px] space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight">Check your email</h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          We sent you a sign-in link. Click the link in your email to continue.
        </p>
        <p className="text-[11px] text-muted-foreground/60">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </div>
    </div>
  );
}
