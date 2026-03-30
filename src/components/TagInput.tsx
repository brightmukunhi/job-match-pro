import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = "Type and press Enter..." }: TagInputProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim())) {
        onChange([...value, input.trim()]);
      }
      setInput("");
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2 min-h-[42px]">
      {value.map((tag, i) => (
        <Badge key={i} variant="secondary" className="gap-1 text-xs">
          {tag}
          <button type="button" onClick={() => removeTag(i)} className="hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="border-0 p-0 h-6 text-sm shadow-none focus-visible:ring-0 flex-1 min-w-[120px]"
      />
    </div>
  );
}
