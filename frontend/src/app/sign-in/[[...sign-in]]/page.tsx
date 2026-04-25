import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "bg-primary hover:bg-primary/90 text-sm",
            card: "bg-secondary/30 backdrop-blur-md border-none shadow-2xl",
            headerTitle: "text-2xl font-bold font-outfit",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "bg-secondary hover:bg-secondary/80 border-none",
            socialButtonsBlockButtonText: "text-foreground",
            dividerLine: "bg-border",
            dividerText: "text-muted-foreground",
            formFieldLabel: "text-foreground",
            formFieldInput: "bg-background border-border",
            footerActionText: "text-muted-foreground",
            footerActionLink: "text-primary hover:text-primary/90"
          }
        }}
      />
    </div>
  );
}
