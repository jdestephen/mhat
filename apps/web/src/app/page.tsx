import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="text-center space-y-6 max-w-lg px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          MHAT Medical
        </h1>
        <p className="text-lg text-slate-600">
          Your personal medical history, secure and accessible.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/login">
            <Button size="lg" className="w-32">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline" className="w-32">Register</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
