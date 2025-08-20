interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MessageInput({ value, onChange, placeholder }: MessageInputProps) {
  return (
    <div className="input-group">
      <label htmlFor="message">Message to Check</label>
      <textarea
        id="message"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="message-textarea"
      />
    </div>
  );
}