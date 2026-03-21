import { useCallback } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ContextInput({ value, onChange, disabled = false }: Props) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="context-input">
      <div className="panel-header">Session Context</div>
      <textarea
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Add context, corrections, or notes for the AI..."
      />
    </div>
  );
}
