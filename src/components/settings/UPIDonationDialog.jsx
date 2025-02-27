// src/components/settings/UPIDonationDialog.jsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../../contexts/ToastContext';
import qrcode from 'qrcode-generator';

export const UPIDonationDialog = ({ open, onOpenChange }) => {
  const [amount, setAmount] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const upiId = import.meta.env.VITE_UPI_ID;
  const showToast = useToast();

  // Detect if the device is desktop based on screen width
  useEffect(() => {
    const checkDevice = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Generate QR code or redirect to UPI app
  const handlePay = () => {
    if (!upiId) {
      showToast('UPI ID is not configured.', 'error');
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }

    const paymentLink = `upi://pay?pa=${upiId}&am=${amount}&cu=INR`;

    if (isDesktop) {
      // Generate QR code for desktop
      const qr = qrcode(0, 'L'); // Type 0 (auto), Error correction level 'L'
      qr.addData(paymentLink);
      qr.make();
      setQrCodeSvg(qr.createSvgTag({ scalable: true })); // Generate SVG
    } else {
      // Redirect to UPI app on mobile
      window.location.href = paymentLink;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-text-primary">
            Donate via UPI
          </DialogTitle>
          <DialogDescription className="text-text-primary/60">
            Enter the amount you wish to donate.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="number"
            placeholder="Amount in INR"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-overlay/5 border-overlay/10"
          />
        </div>
        {isDesktop && qrCodeSvg && (
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-text-primary/80 text-center">
              Scan the QR code with your UPI app to complete the payment.
            </p>
            <div
              className="w-32 h-32"
              dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
            />
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row justify-end gap-4">
          <Button
            onClick={handlePay}
            className="bg-overlay/10 hover:bg-overlay/20"
          >
            {isDesktop ? 'Generate QR Code' : 'Pay'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setQrCodeSvg(''); // Reset QR code on cancel
              onOpenChange(false);
            }}
            className="bg-overlay/5 hover:bg-overlay/10"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};