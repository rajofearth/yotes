import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export const DonationCard = ({ setDialogs }) => (
  <Card className="bg-overlay/5 border-overlay/10">
    <CardHeader>
      <CardTitle>Support Yotes</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-text-primary/80">
        If you find Yotes helpful, consider supporting its development.
      </p>
      <div className="flex flex-col space-y-4">
        {/* Buy Me a Coffee Link */}
        <div className="flex justify-center">
          <a href="https://www.buymeacoffee.com/yashrajmaher">
            <img
              src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=yashrajmaher&button_colour=1b1b1b&font_colour=ffffff&font_family=Cookie&outline_colour=ffffff&coffee_colour=FFDD00"
              alt="Buy Me a Coffee"
            />
          </a>
        </div>
        {/* UPI Donation Button */}
        <Button
          onClick={() => setDialogs(prev => ({ ...prev, upiDonation: true }))}
          className="bg-overlay/10 hover:bg-overlay/20"
        >
          Donate via UPI
        </Button>
      </div>
    </CardContent>
  </Card>
);