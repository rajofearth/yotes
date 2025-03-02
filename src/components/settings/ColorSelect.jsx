import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Define color options with both background (for tags) and text (for dots) classes
export const colorOptions = [
  { value: 'bg-red-500/20 text-red-500', label: 'Red' },
  { value: 'bg-blue-500/20 text-blue-500', label: 'Blue' },
  { value: 'bg-green-500/20 text-green-500', label: 'Green' },
  { value: 'bg-yellow-500/20 text-yellow-500', label: 'Yellow' },
  { value: 'bg-purple-600/20 text-purple-600', label: 'Purple' },
  { value: 'bg-gray-600/20 text-gray-600', label: 'Gray' },
  { value: 'bg-violet-500/20 text-violet-500', label: 'Violet' },
];

export const ColorSelect = ({ value, onValueChange, placeholder = "Select a color" }) => {
  // Helper function to extract the text color class (e.g., "text-red-500")
  const getTextColorClass = (colorValue) => {
    const textClass = colorValue.split(' ').find(c => c.startsWith('text-'));
    return textClass || 'text-gray-500'; // Fallback to gray if no text class found
  };

  return (
    <Select value={value || colorOptions[0].value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full bg-overlay/5 border-overlay/10">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-bg-primary border-overlay/10">
        {colorOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="bg-bg-primary text-text-primary hover:bg-overlay/10 focus:bg-overlay/10"
          >
            <div className="flex items-center gap-2">
              {/* Parent span sets the text color */}
              <span className={getTextColorClass(option.value)}>
                {/* Dot inherits the text color with bg-current */}
                <div className="w-4 h-4 rounded-full bg-current" />
              </span>
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};