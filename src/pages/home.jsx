import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Plus, Settings, Search, FileText, ListTodo, FileImage, Upload } from 'lucide-react'
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "../components/ui/dropdown-menu"
import { useState } from 'react'
import { groupNotesByDate } from '../components/home/grpNotesByDate'
import { renderSection } from '../components/home/renderSection'
import { TagFilters } from '../components/home/TagFilters'

export default function Home() {
    const [notes, setNotes] = useState([
        { 
            id: 1, 
            title: "Weekly Team Meeting Notes - Project Roadmap Discussion",
            description: "Discussed Q4 project timeline, feature prioritization, and resource allocation. Key points: mobile app launch in November, API refactoring due by December, new team members onboarding next week.", 
            date: new Date(),
            tags: [
                { id: 1, name: 'Work', color: 'text-blue-500' },
                { id: 3, name: 'Ideas', color: 'text-green-500' }
            ]
        },
        { 
            id: 2, 
            title: "Shopping List for Weekend Party",
            description: "Groceries: organic milk, free-range eggs, whole wheat bread, fresh vegetables (carrots, tomatoes, lettuce), snacks, drinks, paper towels, and decorations for the party.", 
            date: new Date(Date.now() - 86400000) 
        },
        { 
            id: 3, 
            title: "Book Summary: Atomic Habits by James Clear",
            description: "Key insights: 1) Small habits compound over time, 2) Focus on systems instead of goals, 3) Identity-based habits are more effective, 4) Environment design is crucial for behavior change.", 
            date: new Date(Date.now() - 86400000) 
        },
        { 
            id: 4, 
            title: "New Feature Ideas for Q1 2024",
            description: "1. Dark mode implementation with custom theming\n2. Real-time collaboration features\n3. Advanced search with filters\n4. Mobile app notifications\n5. Integration with popular third-party tools", 
            date: new Date(Date.now() - 172800000) 
        },
        { 
            id: 5, 
            title: "Personal Learning Goals - Web Development",
            description: "Topics to master: Advanced React patterns, TypeScript best practices, Next.js 13 features, TailwindCSS architecture, Testing strategies, Performance optimization, and Accessibility standards.", 
            date: new Date(Date.now() - 172800000) 
        },
    ]);

    const groupedNotes = groupNotesByDate(notes);

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 border-b border-overlay/10 bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/80">
                <div className="max-w-[1920px] mx-auto px-6">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo/Title */}
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Your Notes
                        </h1>

                        {/* Search and Actions */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-primary" />
                                <Input 
                                    type="text" 
                                    placeholder="Search notes..." 
                                    className="w-[300px] pl-9 h-10 bg-overlay/5 border-overlay/10 rounded-full text-sm focus-visible:ring-1 focus-visible:ring-overlay/20" 
                                />
                            </div>

                            {/* Create Note Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10 transition-colors group"
                                    >
                                        <Plus className="h-5 w-5 text-icon-primary group-hover:text-white transition-colors" />
                                        <span className="sr-only">Create new</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                    align="end"
                                    className="w-48 bg-bg-primary border border-overlay/10 shadow-lg"
                                >
                                    <DropdownMenuItem className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer">
                                        <FileText className="h-4 w-4" />
                                        <div className="flex flex-col">
                                            <span className="text-sm">Note</span>
                                            <span className="text-xs text-text-primary/60">Create a new note</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer">
                                        <ListTodo className="h-4 w-4" />
                                        <div className="flex flex-col">
                                            <span className="text-sm">Todo List</span>
                                            <span className="text-xs text-text-primary/60">Create a todo list</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-overlay/10" />
                                    <DropdownMenuItem className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer">
                                        <FileImage className="h-4 w-4" />
                                        <div className="flex flex-col">
                                            <span className="text-sm">Image Note</span>
                                            <span className="text-xs text-text-primary/60">Create with image</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer">
                                        <Upload className="h-4 w-4" />
                                        <div className="flex flex-col">
                                            <span className="text-sm">Import</span>
                                            <span className="text-xs text-text-primary/60">Import from file</span>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10 transition-colors group"
                            >
                                <Settings className="h-5 w-5 text-icon-primary group-hover:text-white transition-colors" />
                                <span className="sr-only">Settings</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-[1920px] mx-auto px-6 pt-6 pb-8 space-y-8">
                {/* Tag Filters */}
                <TagFilters />
                
                {/* Notes Sections */}
                {renderSection("Today", groupedNotes.Today)}
                {renderSection("Yesterday", groupedNotes.Yesterday)}
                {Object.entries(groupedNotes.Earlier).map(([date, notes]) => 
                    renderSection(date, notes)
                )}
            </main>
        </div>
    );
}