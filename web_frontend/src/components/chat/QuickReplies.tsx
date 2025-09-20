'use client';

interface QuickRepliesProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export function QuickReplies({ prompts, onSelect }: QuickRepliesProps) {
  if (prompts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary hover:text-white active:scale-95"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
