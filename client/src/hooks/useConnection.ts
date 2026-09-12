import { useEffect, useRef } from 'react';
import { ConnectionManager } from '../collaboration/ConnectionManager';

export const useConnection = () => {
  const managerRef = useRef<ConnectionManager | null>(null);

  useEffect(() => {
    managerRef.current = new ConnectionManager();
  }, []);

  return managerRef;
};
