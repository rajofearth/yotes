import {
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem
} from "../ui/dropdown-menu";
import { Button } from '../ui/button';
import { MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { cn } from "../../lib/utils";

// Function to calculate dynamic font size
const calculateFontSize = (text) => {
    if (!text) return 'text-base';
    const length = text.length;
    if (length > 200) return 'text-xs';
    if (length > 150) return 'text-sm';
    return 'text-base';
};

const renderNoteCard = (note) => {
    const descriptionLines = note.description.split('\n');
    const titleFontSize = calculateFontSize(note.title);
    const descriptionFontSize = calculateFontSize(note.description);
    
    return (
        <div 
            key={note.id} 
            className="flex-shrink-0 w-[280px] sm:w-[300px] group hover:bg-overlay/10 transition-colors rounded-lg border border-overlay/10 bg-overlay/5 p-3 sm:p-4 relative flex flex-col min-h-[180px] sm:min-h-[200px] cursor-pointer select-none"
        >
            <div className="flex-1 space-y-2 sm:space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <h3 className={cn(
                        "font-medium line-clamp-2 leading-tight",
                        titleFontSize
                    )}>
                        {note.title}
                    </h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-overlay/20 flex-shrink-0"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                            align="end" 
                            className="w-[280px] sm:w-48 bg-bg-primary border border-overlay/10 shadow-lg"
                        >
                            <DropdownMenuItem className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer">
                                <Pencil className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer">
                                <Share2 className="h-4 w-4" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-overlay/10" />
                            <DropdownMenuItem className="flex items-center gap-2 text-red-400 hover:bg-overlay/10 cursor-pointer">
                                <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className={cn(
                    "text-text-primary/70 line-clamp-4 leading-relaxed whitespace-pre-line",
                    descriptionFontSize
                )}>
                    {descriptionLines.map((line, index) => (
                        <span key={index} className="block">
                            {line}
                        </span>
                    ))}
                </div>
            </div>
            
            <div className="mt-3 sm:mt-4 pt-3 border-t border-overlay/10 flex items-center gap-2 sm:gap-3 text-xs text-text-primary/60">
                <span className="whitespace-nowrap">
                    {note.date.toLocaleTimeString('en-US', { 
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true 
                    }).toLowerCase()}
                </span>
                {note.tags?.length > 0 && (
                    <>
                        <span className="text-text-primary/20">|</span>
                        <div className="flex items-center gap-2 overflow-hidden">
                            {note.tags.map((tag, index) => (
                                <span 
                                    key={tag.id} 
                                    className={cn(
                                        "truncate",
                                        tag.color
                                    )}
                                >
                                    {tag.name}
                                    {index < note.tags.length - 1 && (
                                        <span className="text-text-primary/20 ml-2">|</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export { renderNoteCard };