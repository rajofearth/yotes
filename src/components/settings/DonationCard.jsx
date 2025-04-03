import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Heart, Coffee, Send } from 'lucide-react';

export const DonationCard = ({ setDialogs }) => {
  return (
    <Card className="bg-overlay/5 border-overlay/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Support Development
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-text-primary/80">
          Yotes is free and open-source software. Your donations help fund ongoing development and improvements.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-overlay/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-500/20 mx-auto">
              <Coffee className="h-5 w-5 text-amber-500" />
            </div>
            <h3 className="text-sm font-medium text-center">Buy me a coffee</h3>
            <p className="text-xs text-text-primary/60 text-center">
              Support with a small one-time donation
            </p>
            <Button 
              variant="outline" 
              className="w-full mt-2 bg-overlay/5 hover:bg-overlay/10"
              onClick={() => window.open('https://www.buymeacoffee.com', '_blank')}
            >
              Donate
            </Button>
          </div>
          
          <div className="bg-overlay/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-500/20 mx-auto">
              <Send className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="text-sm font-medium text-center">UPI Transfer</h3>
            <p className="text-xs text-text-primary/60 text-center">
              Send support directly via UPI
            </p>
            <Button 
              variant="outline" 
              className="w-full mt-2 bg-overlay/5 hover:bg-overlay/10"
              onClick={() => setDialogs(prev => ({ ...prev, upiDonation: true }))}
            >
              Send UPI
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-text-primary/60 text-center pt-2">
          Thank you for your support! ❤️
        </p>
      </CardContent>
    </Card>
  );
};