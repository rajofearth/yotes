// src/components/settings/SettingsHeader.jsx
import React from 'react';
import { Button } from '../../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsHeader = ({ loading }) => {
  const navigate = useNavigate();
  return (
    <header className="border-b border-overlay/10">
      <div className="max-w-[1920px] mx-auto px-4 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          disabled={loading.logout || loading.delete}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
    </header>
  );
};