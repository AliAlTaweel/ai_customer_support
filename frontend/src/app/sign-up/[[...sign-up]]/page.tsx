import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="container flex-center" style={{ padding: '6rem 0' }}>
      <SignUp />
    </div>
  );
}
