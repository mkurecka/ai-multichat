import React, { useEffect, useState } from 'react';
import { getThreadCosts, ThreadCost } from '../services/api';
import { Layout } from './Layout';

const CostsPage = () => {
  const [threadCosts, setThreadCosts] = useState<ThreadCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'tokens'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchThreadCosts = async () => {
      try {
        setLoading(true);
        const data = await getThreadCosts();
        setThreadCosts(data);
      } catch (error) {
        console.error('Error fetching costs:', error);
        setError('Failed to load costs');
      } finally {
        setLoading(false);
      }
    };

    fetchThreadCosts();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const sortedThreads = [...threadCosts].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'date':
        return multiplier * (new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());
      case 'cost':
        return multiplier * (b.totalCost - a.totalCost);
      case 'tokens':
        return multiplier * (b.totalTokens - a.totalTokens);
      default:
        return 0;
    }
  });

  const totalCost = threadCosts.reduce((sum, thread) => sum + thread.totalCost, 0);
  const totalTokens = threadCosts.reduce((sum, thread) => sum + thread.totalTokens, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <Layout showSidebar={false}>
      <div className="p-6">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Costs Overview</h1>
            <div className="flex gap-4">
              <div className="text-sm text-gray-600">
                Total Cost: <span className="font-semibold text-green-600">{formatCurrency(totalCost)}</span>
              </div>
              <div className="text-sm text-gray-600">
                Total Tokens: <span className="font-semibold">{totalTokens.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'cost' | 'tokens')}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="cost">Cost</option>
                <option value="tokens">Tokens</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {threadCosts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No threads found</div>
          ) : (
            <div className="grid gap-4">
              {sortedThreads.map((thread) => (
                <div
                  key={thread.threadId}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {thread.title || 'Untitled Thread'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {thread.messageCount} messages
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(thread.lastMessageDate)}
                      </div>
                    </div>
                    <div className="text-green-600 font-semibold">
                      {formatCurrency(thread.totalCost)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {thread.totalTokens.toLocaleString()} tokens
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CostsPage;