'use client';

import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hardcoded for prototype. In production, grab this from the logged-in user's session.
  const tenantId = 'school-org-123'; 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('http://localhost:3001/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenantId,
          queryText: query,
        }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('Error fetching RAG response:', error);
      setResponse({ answer: 'Failed to connect to the Classory backend.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 flex flex-col items-center font-sans">
      <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-md mt-10">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Classory AI Assistant</h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about the course materials..."
            className="w-full p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] text-gray-800"
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {loading ? 'Searching Course Materials...' : 'Ask Assistant'}
          </button>
        </form>

        {response && (
          <div className="mt-8 p-4 bg-gray-100 rounded-md border border-gray-200">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Answer</h2>
            <p className="text-gray-800 whitespace-pre-wrap">{response.answer}</p>
            
            {response.sourcesRetrieved !== undefined && (
              <p className="text-xs text-gray-400 mt-4 text-right">
                Synthesized from {response.sourcesRetrieved} retrieved chunks.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}