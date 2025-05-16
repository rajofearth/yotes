import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Info, CheckCircle, AlertTriangle, Brain } from 'lucide-react';
import { useOnlineStatus } from '../../contexts/OnlineStatusContext';

// Custom Switch with more visible enabled/disabled state
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <div className="relative inline-block">
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      className={`h-6 w-11 ${
        checked 
          ? "bg-primary border-primary" 
          : "bg-neutral-800 border-neutral-700"
      } border-2 transition-colors duration-200`}
    />
    {/* Override the default Thumb styling to make it more visible */}
    <div 
      className={`
        absolute top-[4px] left-[4px] h-4 w-4 rounded-full 
        transform transition-transform duration-200
        ${checked ? "translate-x-5 bg-white" : "translate-x-0 bg-gray-300"}
        ${disabled ? "opacity-50" : ""}
      `}
      style={{pointerEvents: 'none'}}
    />
    <div 
      className={`absolute -bottom-4 left-0 right-0 text-[10px] text-center ${
        checked ? "text-primary" : "text-neutral-500"
      }`}
    >
      {checked ? "ON" : "OFF"}
    </div>
  </div>
);

export const AIFeaturesCard = ({ aiSettings, onSaveApiKey, onToggleAiFeatures }) => {
  const [apiKey, setApiKey] = useState(aiSettings?.apiKey || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const isOnline = useOnlineStatus();

  // Reset form when settings change
  useEffect(() => {
    setApiKey(aiSettings?.apiKey || '');
    setIsEditing(false);
  }, [aiSettings]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setStatus({ type: 'error', message: 'API key cannot be empty' });
      return;
    }
    
    setIsSaving(true);
    try {
      await onSaveApiKey(apiKey.trim());
      setStatus({ type: 'success', message: 'API key saved successfully' });
      setIsEditing(false);
      
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save API key' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-overlay/10 border border-overlay/20 rounded-2xl shadow-sm h-full">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Features
          </CardTitle>
          <ToggleSwitch
            checked={aiSettings?.enabled || false}
            onChange={onToggleAiFeatures}
            disabled={!isOnline}
          />
        </div>
        <div className="mt-2">
          <Label htmlFor="ai-features-toggle" className="text-sm font-normal text-text-primary/60 block">
            Enable AI-powered features
          </Label>
          {!isOnline && (
            <div className="flex items-center gap-2 text-xs text-amber-500 mt-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>AI features are only available when you're online</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-6">
        <div className="border-t border-overlay/10 pt-6">
          <h3 className="text-sm font-medium mb-3 text-text-primary/90">Google Gemini API Key</h3>
          
          {aiSettings?.enabled ? (
            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      id="gemini-api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Gemini API Key"
                      disabled={isSaving}
                      className="bg-overlay/5 border-overlay/20 focus:border-primary/50"
                    />
                    <p className="text-xs text-text-primary/50">
                      Your API key will be securely stored in Google Drive, not locally.
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setApiKey(aiSettings?.apiKey || '');
                        setStatus(null);
                      }}
                      disabled={isSaving}
                      className="border-overlay/20 hover:bg-overlay/10"
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveApiKey}
                      disabled={isSaving || !isOnline}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSaving ? 'Saving...' : 'Save Key'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-overlay/10 rounded-xl p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-text-primary/60 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm text-text-primary/80">
                        {aiSettings?.apiKey 
                          ? 'Your Gemini API key is set up and ready to use.'
                          : 'Add your Gemini API key to enable AI-powered features.'
                        }
                      </p>
                      <p className="text-xs text-text-primary/60">
                        You can get a Gemini API key from the <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant={aiSettings?.apiKey ? "outline" : "default"}
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    disabled={!isOnline}
                    className={aiSettings?.apiKey ? "border-overlay/20 hover:bg-overlay/10" : "bg-primary hover:bg-primary/90"}
                  >
                    {aiSettings?.apiKey ? 'Change API Key' : 'Add API Key'}
                  </Button>
                </div>
              )}
              
              {status && (
                <div className={`flex items-center gap-2 text-sm ${status.type === 'success' ? 'text-green-500' : 'text-red-500'} mt-2`}>
                  {status.type === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span>{status.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-overlay/10 rounded-xl p-4">
              <p className="text-sm text-text-primary/60">
                Enable AI Features to configure your Gemini API key.
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-overlay/5 rounded-xl p-4 mt-2 border border-overlay/10">
          <h3 className="text-sm font-medium mb-2 text-text-primary/80">About AI Features</h3>
          <p className="text-xs text-text-primary/60">
            With AI features enabled, you'll get AI-powered summaries for your search results.
            These features require a valid Gemini API key and an internet connection.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}; 