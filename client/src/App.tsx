import React, { useState } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, customSlug: slug.trim() || undefined })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to shorten URL');
      }

      const data = await res.json();
      setShortUrl(
        data.slug
          ? `${window.location.origin}/${data.slug}`
          : data.shortUrl.startsWith('http')
          ? data.shortUrl
          : `http://${data.shortUrl}`
      );
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to shorten URL');
    }
  };

  const isValidSlug = (value: string) => /^[a-zA-Z0-9]{0,8}$/.test(value);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tiny my URL</h1>
        <form onSubmit={handleSubmit} className="url-form">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to shorten"
            required
            className="url-input"
            pattern="https?://.+"
            title="Include http:// or https://"
          />
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              if (isValidSlug(e.target.value)) setSlug(e.target.value);
            }}
            placeholder="Edit your slug (max 8 chars)"
            className={`slug-input ${shortUrl ? 'visible' : ''}`}
          />
          
          <button type="submit" className="shorten-button" disabled={!url}>
            Tiny my URL
          </button>
        </form>

        {shortUrl && (
          <div className="result-container">
          <div className='success'>
            Success, here is your tiny URL;
          </div>
            <div className="short-url-container">
              <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="short-url">
                {shortUrl.replace(/^https?:\/\//, '')}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shortUrl);
                  alert('Copied to clipboard!');
                }}
                className="copy-button"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </header>
    </div>
  );
}

export default App;
