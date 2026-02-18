import { useState, useEffect } from 'react';

interface ComplaintsAwareConversionData {
  date: string;
  totalProspects: number;
  totalConversions: number;
  totalCleanConversions: number;
  
  services: {
    oec: {
      prospects: number;
      conversions: number;
      cleanConversions: number;
      withComplaints: number;
      conversionRate: number;
      cleanConversionRate: number;
    };
    owwa: {
      prospects: number;
      conversions: number;
      cleanConversions: number;
      withComplaints: number;
      conversionRate: number;
      cleanConversionRate: number;
    };
    travelVisa: {
      prospects: number;
      conversions: number;
      cleanConversions: number;
      withComplaints: number;
      conversionRate: number;
      cleanConversionRate: number;
    };
    filipinaPassportRenewal: {
      prospects: number;
      conversions: number;
      cleanConversions: number;
      withComplaints: number;
      conversionRate: number;
      cleanConversionRate: number;
    };
    ethiopianPassportRenewal: {
      prospects: number;
      conversions: number;
      cleanConversions: number;
      withComplaints: number;
      conversionRate: number;
      cleanConversionRate: number;
    };
  };
  
  conversions: any[]; // Detailed conversion records
}

interface UseComplaintsAwareConversionsResult {
  data: ComplaintsAwareConversionData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useComplaintsAwareConversions(date: string | null): UseComplaintsAwareConversionsResult {
  const [data, setData] = useState<ComplaintsAwareConversionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!date) {
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversions-with-complaints/${date}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch complaints-aware conversions: ${response.statusText}`);
      }

      const result: ComplaintsAwareConversionData = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching complaints-aware conversions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const refetch = () => {
    fetchData();
  };

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
