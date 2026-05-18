export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
            Groovelog
          </h1>
          <p className="text-text-tertiary text-sm mt-1">
            Your music, rated. Your taste, shared.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
