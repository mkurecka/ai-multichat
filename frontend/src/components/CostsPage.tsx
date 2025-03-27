import React, { useEffect, useState } from 'react';
import { getThreadCosts, ThreadCost } from '../services/api';

const CostsPage: React.FC = () => {
  const [threadCosts, setThreadCosts] = useState<ThreadCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (threadCosts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-gray-500">No threads found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Costs Overview</h1>
      <div className="grid gap-4">
        {threadCosts.map((thread) => (
          <div
            key={thread.threadId}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-900">
                  {thread.title}
                </div>
                <div className="text-sm text-gray-500">
                  {thread.messageCount} messages
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(thread.lastMessageDate).toLocaleString()}
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
    </div>
  );
};

export default CostsPage;