import { Button } from '../ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator
} from "../ui/dropdown-menu";
import { Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '../../hooks/useNotes';

export const TagFilters = ({ tags, onFilterChange, loadInitialData }) => {
    const { createTag } = useNotes();
    const [selectedTags, setSelectedTags] = useState(['all']);
    const navigate = useNavigate();
    // Sync selectedTags with onFilterChange and default to 'all' if empty
    useEffect(() => {
        const finalTags = selectedTags.length === 0 ? ['all'] : selectedTags;
        onFilterChange(finalTags);
    }, [selectedTags, onFilterChange]);
    const handleCheckboxChange = (tagId) => {
        setSelectedTags(prev => {
            if (tagId === 'all') {
                return ['all']; // Selecting "All" resets to just 'all'
            }
            const newTags = prev.includes('all') ? [] : prev; // Clear 'all' if another tag is selected
            const updatedTags = newTags.includes(tagId) 
                ? newTags.filter(t => t !== tagId) 
                : [...newTags, tagId];
            return updatedTags.length === 0 ? ['all'] : updatedTags; // Default to 'all' if no tags remain
        });
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
                        className={`
                            h-7 rounded-full px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap
                            ${tag.color || 'bg-gray-500/20 text-gray-500'}
                            ${selectedTags.includes(tag.id) ? '' : 'opacity-50'}
                        `}
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
                <DropdownMenuContent align="end" className="w-fit bg-bg-primary border border-overlay/10 shadow-lg">
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
                            <span className={tag.color?.split(' ').find(c => c.startsWith('text-')) || 'text-gray-500'}>
                                <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                            </span>
                            {tag.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator className="bg-overlay/10" />
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                        Manage tags...
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};