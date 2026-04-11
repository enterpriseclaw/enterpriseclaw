import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/http';
import { config } from '@/lib/config';

export interface AvailableModel {
  id: string;
  displayName: string;
  provider: string;
  available: boolean;
}

export function useModels() {
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<AvailableModel[]>(config.api.endpoints.models)
      .then(setModels)
      .catch(() => {
        setModels([{ id: 'gpt-4.1', displayName: 'GPT-4.1', provider: 'openai', available: true }]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { models, loading };
}
