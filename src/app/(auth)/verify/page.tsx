import { Mail } from "lucide-react";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[320px] space-y-5 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Mail className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h1 className="text-[15px] font-medium text-foreground">Check your email</h1>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            We sent you a sign-in link. Click the link in your email to continue.
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground/50">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </div>
    </div>
  );
}
