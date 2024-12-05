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

const TagFilters = ({ tags }) => {
    const [activeTag, setActiveTag] = useState('all');
    const [selectedTags, setSelectedTags] = useState(['all']);

    // Show fewer tags on mobile
    const visibleTags = [
        { id: 'all', name: 'All', color: 'bg-overlay/20 text-text-primary' },
        ...tags.slice(0, 2)
    ];
    const dropdownTags = tags.slice(2);

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
        <div className="flex items-center justify-between">
            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
                {visibleTags.map((tag) => (
                    <Button
                        key={tag.id}
                        variant="ghost"
                        className={`h-7 rounded-full px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap hover:bg-overlay/10 ${tag.color}`}
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
                        className="h-7 w-7 rounded-full bg-overlay/5 hover:bg-overlay/10 ml-1.5 flex-shrink-0"
                    >
                        <Filter className="h-4 w-4" />
                        <span className="sr-only">Filter tags</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                    align="end"
                    className="w-[280px] sm:w-56 bg-bg-primary border border-overlay/10 shadow-lg"
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
                    {tags.slice(1).map((tag) => (
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