// src/components/settings/SettingsHeader.jsx
import React from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, Settings, User, Tag, BarChart, Heart, Shield } from 'lucide-react';

export const SettingsHeader = ({ loading, navigate, activeTab = "account" }) => {
  // Map tabs to their icons and titles
  const tabInfo = {
    account: { icon: User, title: "Account" },
    tags: { icon: Tag, title: "Tags" },
    statistics: { icon: BarChart, title: "Statistics" },
    support: { icon: Heart, title: "Support" },
    security: { icon: Shield, title: "Security" }
  };
  
  // Get current tab info
  const CurrentIcon = tabInfo[activeTab]?.icon || Settings;
  const currentTitle = tabInfo[activeTab]?.title || "Settings";
  
  return (
    <header className="border-b border-overlay/10 bg-bg-primary/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            disabled={loading?.logout || loading?.delete}
            className="rounded-full h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-5 w-5 text-primary" />
            <h1 className="text-lg sm:text-xl font-semibold">{currentTitle}</h1>
          </div>
        </div>
        
        <div className="flex items-center">
          <Settings className="h-5 w-5 text-text-primary/50 sm:hidden" />
        </div>
      </div>
    </header>
  );
};