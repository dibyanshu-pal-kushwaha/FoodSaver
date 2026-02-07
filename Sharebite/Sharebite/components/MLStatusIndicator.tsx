'use client';

import { checkMLAPIHealth } from '@/lib/ml-api';
import { useEffect, useState } from 'react';

export default function MLStatusIndicator() {
  const [mlAvailable, setMlAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkMLAPIHealth().then((available) => {
      setMlAvailable(available);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="flex items-center text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded-lg">
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2 animate-pulse"></div>
        Checking...
      </div>
    );
  }

  if (mlAvailable) {
    return (
      <div className="flex items-center text-xs font-semibold text-emerald-700 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
        ML Active
      </div>
    );
  }

  return (
    <div className="flex items-center text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded-lg" title="ML API not available. Start the Flask server to enable ML predictions.">
      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
      ML Offline
    </div>
  );
}

