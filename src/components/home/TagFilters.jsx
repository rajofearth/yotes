import { Button } from '../ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem
} from "../ui/dropdown-menu";
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { useNotes } from '../../hooks/useNotes';

export const TagFilters = ({ onFilterChange }) => {
    const { tags, createTag } = useNotes();
    const [selectedTags, setSelectedTags] = useState(['all']);

    const handleCheckboxChange = (tagId) => {
        setSelectedTags(prev => {
            if (tagId === 'all') return ['all'];
            const newTags = prev.includes('all') ? [] : prev;
            return newTags.includes(tagId) ? newTags.filter(t => t !== tagId) : [...newTags, tagId];
        });
        const newSelected = tagId === 'all' ? ['all'] : selectedTags.includes('all') ? [] : selectedTags;
        const updatedTags = newSelected.includes(tagId) ? newSelected.filter(t => t !== tagId) : [...newSelected, tagId];
        onFilterChange(updatedTags);
    };

    const handleManageTags = async () => {
        const newTagName = prompt('Enter new tag name:');
        if (newTagName) {
            try {
                await createTag({ name: newTagName });
            } catch (error) {
                console.error('Failed to create tag:', error);
            }
        }
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
                {[{ id: 'all', name: 'All', color: 'bg-overlay/20 text-text-primary' }, ...tags].map((tag) => (
                    <Button
                        key={tag.id}
                        variant="ghost"
                        className={`h-7 rounded-full px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap hover:bg-overlay/10 ${selectedTags.includes(tag.id) ? 'bg-overlay/10' : ''}`}
                        onClick={() => handleCheckboxChange(tag.id)}
                    >
                        {tag.name}
                    </Button>
                ))}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-overlay/5 hover:bg-overlay/10 ml-1.5">
                        <Filter className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-bg-primary border border-overlay/10 shadow-lg">
                    <DropdownMenuCheckboxItem
                        checked={selectedTags.includes('all')}
                        onCheckedChange={() => handleCheckboxChange('all')}
                    >
                        All
                    </DropdownMenuCheckboxItem>
                    {tags.map((tag) => (
                        <DropdownMenuCheckboxItem
                            key={tag.id}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={() => handleCheckboxChange(tag.id)}
                        >
                            <div className={`w-2 h-2 rounded-full bg-blue-500 mr-2`}></div>
                            {tag.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuItem onClick={handleManageTags}>
                        Manage tags...
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};