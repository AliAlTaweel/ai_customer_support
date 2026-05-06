"use server";

import { currentUser } from "@clerk/nextjs/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function isAdmin() {
  try {
    const user = await currentUser();
    if (user) {
      const email = user.emailAddresses[0]?.emailAddress;
      return email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase();
    }
  } catch (error) {
    console.error("Error checking Clerk user in isAdmin:", error);
  }

  return false;
}
