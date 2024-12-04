import { Button } from '../ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem
} from "../ui/dropdown-menu";
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { cn } from "../../lib/utils";

// Sample tags data with colors
const SAMPLE_TAGS = [
    { id: 'all', name: 'All', color: 'bg-overlay/20 text-text-primary' },
    { id: 1, name: 'Work', color: 'bg-blue-500/20 text-blue-500' },
    { id: 2, name: 'Personal', color: 'bg-purple-500/20 text-purple-500' },
    { id: 3, name: 'Ideas', color: 'bg-green-500/20 text-green-500' },
    { id: 4, name: 'Tasks', color: 'bg-yellow-500/20 text-yellow-500' },
    { id: 5, name: 'Learning', color: 'bg-pink-500/20 text-pink-500' },
    { id: 6, name: 'Projects', color: 'bg-orange-500/20 text-orange-500' },
];

const TagFilters = () => {
    const [activeTag, setActiveTag] = useState('all');
    const [selectedTags, setSelectedTags] = useState(['all']);

    // Show first 5 tags in pills (including All)
    const visibleTags = SAMPLE_TAGS.slice(0, 5);
    // Remaining tags for dropdown
    const dropdownTags = SAMPLE_TAGS.slice(5);

    const handleTagClick = (tagId) => {
        setActiveTag(tagId);
        // Here you can implement the filtering logic
    };

    const handleCheckboxChange = (tagId) => {
        setSelectedTags(prev => {
            if (tagId === 'all') {
                return ['all'];
            }
            const newTags = prev.filter(t => t !== 'all');
            if (prev.includes(tagId)) {
                return newTags.filter(t => t !== tagId);
            }
            return [...newTags, tagId];
        });
    };

    return (
        <div className="flex items-center justify-between h-12 -mt-2 mb-6">
            {/* Tag Pills */}
            <div className="flex items-center gap-2">
                {visibleTags.map((tag) => (
                    <Button
                        key={tag.id}
                        variant="ghost"
                        onClick={() => handleTagClick(tag.id)}
                        className={cn(
                            "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                            tag.color,
                            activeTag === tag.id 
                                ? "bg-opacity-100 ring-1 ring-inset ring-overlay/20" 
                                : "opacity-60 hover:opacity-100"
                        )}
                    >
                        {tag.name}
                    </Button>
                ))}
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon"
                        className={cn(
                            "h-7 w-7 rounded-full bg-overlay/5 hover:bg-overlay/10",
                            selectedTags.length > 1 && "ring-1 ring-overlay/20"
                        )}
                    >
                        <Filter className="h-4 w-4" />
                        <span className="sr-only">Filter tags</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                    align="end"
                    className="w-56 bg-bg-primary border border-overlay/10 shadow-lg"
                >
                    <div className="px-2 py-1.5 text-xs font-medium text-text-primary/50">
                        Filter by tags
                    </div>
                    <DropdownMenuSeparator className="bg-overlay/10" />
                    <DropdownMenuCheckboxItem
                        checked={selectedTags.includes('all')}
                        onCheckedChange={() => handleCheckboxChange('all')}
                        className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer"
                    >
                        <div className="w-2 h-2 rounded-full bg-overlay/20" />
                        All
                    </DropdownMenuCheckboxItem>
                    {SAMPLE_TAGS.slice(1).map((tag) => (
                        <DropdownMenuCheckboxItem
                            key={tag.id}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={() => handleCheckboxChange(tag.id)}
                            className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer"
                        >
                            <div className={`w-2 h-2 rounded-full ${tag.color.split(' ')[0]}`} />
                            {tag.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator className="bg-overlay/10" />
                    <DropdownMenuItem className="text-text-primary hover:bg-overlay/10 cursor-pointer text-xs">
                        Manage tags...
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export { TagFilters }; 