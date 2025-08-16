import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Shield, Eye, EyeOff, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const PassphraseModal = ({ 
  isOpen, 
  onConfirm, 
  isFirstTime = false,
  onCancel 
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassphrase('');
      setConfirmPassphrase('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isFirstTime) {
      if (passphrase.length < 8) {
        setError('Passphrase must be at least 8 characters long');
        return;
      }
      if (passphrase !== confirmPassphrase) {
        setError('Passphrases do not match');
        return;
      }
    } else {
      if (passphrase.length === 0) {
        setError('Please enter your passphrase');
        return;
      }
    }

    setIsLoading(true);
    try {
      await onConfirm(passphrase);
    } catch (err) {
      setError(err.message || 'Failed to unlock notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      window.location.href = '/login';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-md mx-4"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <Card className="bg-bg-primary border-overlay/20 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl font-semibold text-text-primary">
                {isFirstTime ? 'Set Up Encryption' : 'Unlock Your Notes'}
              </CardTitle>
              <p className="text-sm text-text-primary/70 mt-2">
                {isFirstTime 
                  ? 'Create a passphrase to encrypt your notes'
                  : 'Enter your passphrase to decrypt your notes'
                }
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Security Info */}
              <div className="bg-overlay/5 rounded-lg p-4 border border-overlay/10">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-text-primary">End-to-End Encryption</h4>
                    <ul className="text-xs text-text-primary/70 space-y-1">
                      <li>• Your notes are encrypted on your device before being saved</li>
                      <li>• Only you can decrypt them with your passphrase</li>
                      <li>• We cannot access your note contents</li>
                      <li>• Keep your passphrase safe - it cannot be recovered</li>
                    </ul>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Passphrase Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">
                    {isFirstTime ? 'Create Passphrase' : 'Enter Passphrase'}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder={isFirstTime ? 'Enter a strong passphrase' : 'Enter your passphrase'}
                      className="pr-10 bg-overlay/5 border-overlay/20"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary/50 hover:text-text-primary"
                      disabled={isLoading}
                    >
                      {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Passphrase (First Time Only) */}
                {isFirstTime && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">
                      Confirm Passphrase
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassphrase}
                        onChange={(e) => setConfirmPassphrase(e.target.value)}
                        placeholder="Confirm your passphrase"
                        className="pr-10 bg-overlay/5 border-overlay/20"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary/50 hover:text-text-primary"
                        disabled={isLoading}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Success Message (First Time) */}
                {isFirstTime && passphrase.length >= 8 && confirmPassphrase === passphrase && (
                  <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Passphrases match and meet requirements</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 bg-overlay/5 hover:bg-overlay/10"
                  >
                    {isFirstTime ? 'Cancel' : 'Logout'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || (isFirstTime && (passphrase.length < 8 || passphrase !== confirmPassphrase))}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isFirstTime ? 'Setting up...' : 'Unlocking...'}
                      </div>
                    ) : (
                      <span>{isFirstTime ? 'Set Passphrase' : 'Unlock Notes'}</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
