import React, { useState } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {

      const res = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    
      
      if (!res.ok) {
        throw new Error(`Failed to shorten URL: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('[App.tsx] Response from backend:', data);
      
      // Construct full short URL using current host
      setShortUrl(
        data.slug
        ? `${window.location.origin}/${data.slug}`
        : (data.shortUrl.startsWith('http') ? data.shortUrl : `http://${data.shortUrl}`)
      );
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to shorten URL');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>URL Shortener</h1>
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
          <button 
            type="submit" 
            className="shorten-button"
            disabled={!url}
          >
            Shorten
          </button>
        </form>
        
        {shortUrl && (
          <div className="result-container">
            <div className="short-url-container">
              <a 
                href={shortUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="short-url"
              >
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
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;