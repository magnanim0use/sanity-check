import { useState } from 'react';
import { MessageInput } from '../components/MessageInput';
import { ContextInput } from '../components/ContextInput';
import { SanityResults } from '../components/SanityResults';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SanityResult } from '../types';

export default function Home() {
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [platform, setPlatform] = useState('');
  const [result, setResult] = useState<SanityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!message.trim()) {
      setError('Please enter a message to check');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/sanity-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          context: context.trim(),
          platform: platform.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check message');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to analyze message. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Sanity Check: The AI-Powered Message Editor</h1>
        <p>Check yourself before you hit send</p>
      </header>

      <main className="main">
        <MessageInput
          value={message}
          onChange={setMessage}
          placeholder="Paste your message here..."
        />

        <ContextInput
          context={context}
          onContextChange={setContext}
          platform={platform}
          onPlatformChange={setPlatform}
        />

        <button
          onClick={handleCheck}
          disabled={loading || !message.trim()}
          className="check-button"
        >
          {loading ? 'Checking...' : 'Sanity Check'}
        </button>

        {error && <div className="error">{error}</div>}

        {loading && <LoadingSpinner />}

        {result && <SanityResults result={result} />}
      </main>
    </div>
  );
}
