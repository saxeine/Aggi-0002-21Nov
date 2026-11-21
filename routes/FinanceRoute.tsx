import React from 'react';
import { useApp } from '../contexts/AppContext';
import { FinanceView } from '../components/FinanceView';

/** Finance route (/finance). Loaded on demand. */
const FinanceRoute: React.FC = () => {
  const {
    go,
  } = useApp();

  return <FinanceView onBack={() => go('library')} />;
};

export default FinanceRoute;
