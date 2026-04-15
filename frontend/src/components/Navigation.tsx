'use client';

import {
  SignInButton,
  UserButton,
  useUser
} from '@clerk/nextjs'
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return <div className="w-[100px]" />;

  return (
    <nav className="flex items-center gap-4">
      {!isSignedIn ? (
        <SignInButton mode="modal">
          <Button variant="default">Sign In</Button>
        </SignInButton>
      ) : (
        <UserButton 
          showName 
          appearance={{
            elements: {
              userButtonBox: "hover:opacity-80 transition-opacity"
            }
          }}
        />
      )}
    </nav>
  );
}
