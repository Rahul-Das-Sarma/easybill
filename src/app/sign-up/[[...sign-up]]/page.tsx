import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Receipt } from "lucide-react";

export const metadata = {
  title: "Create account — EasyBill",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-section/50 px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Receipt className="size-6 text-brand" aria-hidden />
        EasyBill
      </div>
      <SignUp />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Back to home
        </Link>
      </p>
    </div>
  );
}
