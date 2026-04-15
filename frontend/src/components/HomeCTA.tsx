'use client';

import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function HomeCTA() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return <div className="h-12" />;

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
      {!isSignedIn ? (
        <SignInButton mode="modal">
          <Button size="lg" className="px-8 py-6 text-base font-semibold">
            Join the Portal
          </Button>
        </SignInButton>
      ) : (
        <Link href="/orders">
          <Button size="lg" className="px-8 py-6 text-base font-semibold">
            View My Orders
          </Button>
        </Link>
      )}
      <Button variant="outline" size="lg" className="px-8 py-6 text-base font-semibold">
        Learn More
      </Button>
    </div>
  );
}
