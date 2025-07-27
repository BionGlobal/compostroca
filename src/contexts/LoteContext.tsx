import React, { createContext, useContext, useCallback } from 'react';

interface LoteContextType {
  notifyLoteUpdate: () => void;
  subscribeToLoteUpdates: (callback: () => void) => () => void;
}

const LoteContext = createContext<LoteContextType | undefined>(undefined);

export const LoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const subscribers = React.useRef<Set<() => void>>(new Set());

  const notifyLoteUpdate = useCallback(() => {
    subscribers.current.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in lote update callback:', error);
      }
    });
  }, []);

  const subscribeToLoteUpdates = useCallback((callback: () => void) => {
    subscribers.current.add(callback);
    
    return () => {
      subscribers.current.delete(callback);
    };
  }, []);

  return (
    <LoteContext.Provider value={{
      notifyLoteUpdate,
      subscribeToLoteUpdates,
    }}>
      {children}
    </LoteContext.Provider>
  );
};

export const useLoteUpdates = () => {
  const context = useContext(LoteContext);
  if (context === undefined) {
    throw new Error('useLoteUpdates must be used within a LoteProvider');
  }
  return context;
};