interface Props {
  onPromptClick: (text: string) => void;
}

const EXAMPLE_PROMPTS = [
  'Review my last commit for security issues',
  'Help me write a weekly status report',
  'Search the web for Spring AI 2.0 release notes',
];

export function WelcomeBanner({ onPromptClick }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Welcome to EnterpriseClaw</h2>
        <p className="text-muted-foreground max-w-md">
          I'm your AI agent powered by Spring AI. I can review code, search the web, analyse data, draft emails, and more.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-md">
        <p className="text-sm text-muted-foreground font-medium">Try these prompts:</p>
        {EXAMPLE_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="text-left rounded-lg border px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
