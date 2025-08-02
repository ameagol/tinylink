import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [shortUrl, setShortUrl] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        const data = await res.json();
        setIsLoggedIn(data.authenticated);
      } catch (err) {
        console.error('Auth check failed:', err);
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch("/api/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url,
          customSlug: slug.trim()
         }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(errorData.error);
        return;
      }
      
      const data = await response.json();
      setShortUrl(`${window.location.origin}/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to shorten URL');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Login failed');
      }

      setIsLoggedIn(true);
      setLoginData({ username: '', password: '' });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setIsLoggedIn(false);
      setShortUrl('');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const isValidSlug = (value: string) => /^[a-zA-Z0-9]{0,8}$/.test(value);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tiny my URL</h1>

        {isLoggedIn && (
          <div className="user-controls">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        )}

        {isLoggedIn ? (
          <>
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
                placeholder="Custom slug (optional, max 8 chars)"
                className={`slug-input ${shortUrl ? 'visible' : ''}`}
              />
              <button type="submit" className="shorten-button" disabled={!url}>
                Shorten URL
              </button>
            </form>

            {shortUrl && (
              <div className="result-container">
                <div className="success">Success! Here is your tiny URL:</div>
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
          </>
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            <h2>Login to Shorten URLs</h2>
            <div className="form-group">
              <input
                type="text"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
                placeholder="Username"
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                placeholder="Password"
                required
                className="form-input"
              />
            </div>
            <button type="submit" className="login-button">
              Login
            </button>
          </form>
        )}

        {error && <div className="error-message">{error}</div>}
      </header>
    </div>
  );
}

export default App;
