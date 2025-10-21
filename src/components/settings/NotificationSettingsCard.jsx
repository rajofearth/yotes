import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { 
  checkPushNotificationSupport, 
  getNotificationPermission, 
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  showNotification
} from '../../utils/pushNotifications';

export default function NotificationSettingsCard() {
  const showToast = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check support and current status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const supported = checkPushNotificationSupport();
      setIsSupported(supported);

      if (supported) {
        const currentPermission = getNotificationPermission();
        setPermission(currentPermission);

        const subscription = await getCurrentSubscription();
        setIsSubscribed(!!subscription);
        setNotificationsEnabled(!!subscription && currentPermission === 'granted');
      }
    };

    checkStatus();
  }, []);

  const handlePermissionRequest = async () => {
    if (!isSupported) {
      showToast('Push notifications are not supported in this browser', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        showToast('Notification permission granted!', 'success');
      } else if (newPermission === 'denied') {
        showToast('Notification permission denied', 'error');
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      showToast('Failed to request notification permission', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async (enabled) => {
    if (!isSupported) {
      showToast('Push notifications are not supported in this browser', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (enabled) {
        // Subscribe to push notifications
        // Note: In a real app, you'd need the user ID from your auth context
        const userId = 'current-user-id'; // This should come from your auth context
        await subscribeToPush(userId);
        setIsSubscribed(true);
        setNotificationsEnabled(true);
        showToast('Push notifications enabled!', 'success');
      } else {
        // Unsubscribe from push notifications
        await unsubscribeFromPush();
        setIsSubscribed(false);
        setNotificationsEnabled(false);
        showToast('Push notifications disabled', 'info');
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      showToast('Failed to update notification settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      showToast('Please grant notification permission first', 'error');
      return;
    }

    try {
      const success = await showNotification('Test Notification', {
        body: 'This is a test notification from Yotes!',
        tag: 'test-notification'
      });

      if (success) {
        showToast('Test notification sent!', 'success');
      } else {
        showToast('Failed to send test notification', 'error');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      showToast('Failed to send test notification', 'error');
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Granted', variant: 'success', icon: CheckCircle };
      case 'denied':
        return { text: 'Denied', variant: 'destructive', icon: XCircle };
      case 'default':
        return { text: 'Not Requested', variant: 'secondary', icon: AlertCircle };
      default:
        return { text: 'Unknown', variant: 'secondary', icon: AlertCircle };
    }
  };

  const permissionStatus = getPermissionStatus();
  const StatusIcon = permissionStatus.icon;

  if (!isSupported) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Push Notifications</h3>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser.
          </p>
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <AlertCircle className="h-3 w-3" />
            Not Supported
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Push Notifications</h3>
      </div>
      
      <div className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Permission Status</p>
            <p className="text-xs text-muted-foreground">
              Current notification permission status
            </p>
          </div>
          <Badge variant={permissionStatus.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {permissionStatus.text}
          </Badge>
        </div>

        {/* Request Permission Button */}
        {permission === 'default' && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Grant Permission</p>
              <p className="text-xs text-muted-foreground">
                Allow Yotes to send you notifications
              </p>
            </div>
            <Button 
              onClick={handlePermissionRequest}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? 'Requesting...' : 'Grant Permission'}
            </Button>
          </div>
        )}

        {/* Enable/Disable Notifications */}
        {permission === 'granted' && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive notifications for backups, sync events, and updates
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Test Notification */}
        {permission === 'granted' && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Test Notification</p>
              <p className="text-xs text-muted-foreground">
                Send a test notification to verify everything works
              </p>
            </div>
            <Button 
              onClick={handleTestNotification}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Send Test
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Notifications will alert you about backup completions, sync events, 
            and important updates. You can change these settings anytime.
          </p>
        </div>
      </div>
    </Card>
  );
}

