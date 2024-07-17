"use client";
import React, { useState } from 'react';

const FetchDelegates = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFetchDelegates = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/get-list');
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error('Error fetching delegates:', error);
      setMessage('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleFetchDelegates} disabled={loading}>
        {loading ? 'Processing...' : 'Fetch Delegates'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default FetchDelegates;
