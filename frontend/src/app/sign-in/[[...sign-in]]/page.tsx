import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="container flex-center" style={{ padding: '6rem 0' }}>
      <SignIn />
    </div>
  );
}
