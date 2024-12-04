import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Plus, Settings, Search, FileText, ListTodo, FileImage, Upload, Menu } from 'lucide-react'
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
            title: "Design System Updates",
            description: "Updated color palette, typography scale, and component library. Added new interactive states and improved accessibility across all components.", 
            date: new Date(),
            tags: [
                { id: 1, name: 'Work', color: 'text-blue-500' },
                { id: 4, name: 'Design', color: 'text-purple-500' }
            ]
        },
        { 
            id: 3, 
            title: "User Research Findings",
            description: "Key insights from user interviews: 1. Navigation needs simplification 2. Search functionality is crucial 3. Users want better organization tools", 
            date: new Date(),
            tags: [
                { id: 1, name: 'Work', color: 'text-blue-500' },
                { id: 5, name: 'Research', color: 'text-yellow-500' }
            ]
        },
        { 
            id: 4, 
            title: "Project Dependencies Update",
            description: "Updated all major dependencies. React 18.2, TypeScript 5.0, TailwindCSS 3.3. Testing needed for potential breaking changes.", 
            date: new Date(),
            tags: [
                { id: 1, name: 'Work', color: 'text-blue-500' },
                { id: 6, name: 'Technical', color: 'text-green-500' }
            ]
        },
        { 
            id: 5, 
            title: "Marketing Campaign Ideas",
            description: "Brainstormed Q4 marketing initiatives: social media strategy, content calendar, and partnership opportunities. Focus on developer community.", 
            date: new Date(),
            tags: [
                { id: 1, name: 'Work', color: 'text-blue-500' },
                { id: 7, name: 'Marketing', color: 'text-pink-500' }
            ]
        },
        { 
            id: 6, 
            title: "Performance Optimization Tasks",
            description: "Areas to improve: 1. Bundle size reduction 2. Image optimization 3. Code splitting 4. Server-side caching 5. API response times", 
            date: new Date(),
            tags: [
                { id: 1, name: 'Work', color: 'text-blue-500' },
                { id: 8, name: 'Technical', color: 'text-orange-500' }
            ]
        },
        { 
            id: 7, 
            title: "Shopping List for Weekend Party",
            description: "Groceries: organic milk, free-range eggs, whole wheat bread, fresh vegetables (carrots, tomatoes, lettuce), snacks, drinks, paper towels, and decorations for the party.", 
            date: new Date(Date.now() - 86400000),
            tags: [
                { id: 2, name: 'Personal', color: 'text-purple-500' },
                { id: 9, name: 'Shopping', color: 'text-yellow-500' }
            ]
        },
        { 
            id: 8, 
            title: "Book Summary: Atomic Habits by James Clear",
            description: "Key insights: 1) Small habits compound over time, 2) Focus on systems instead of goals, 3) Identity-based habits are more effective, 4) Environment design is crucial for behavior change.", 
            date: new Date(Date.now() - 86400000),
            tags: [
                { id: 2, name: 'Personal', color: 'text-purple-500' },
                { id: 5, name: 'Learning', color: 'text-pink-500' }
            ]
        },
        { 
            id: 9, 
            title: "New Feature Ideas for Q1 2024",
            description: "1. Dark mode implementation with custom theming\n2. Real-time collaboration features\n3. Advanced search with filters\n4. Mobile app notifications\n5. Integration with popular third-party tools", 
            date: new Date(Date.now() - 172800000),
            tags: [
                { id: 1, name: 'Work', color: 'text-blue-500' },
                { id: 3, name: 'Ideas', color: 'text-green-500' }
            ]
        },
        { 
            id: 10, 
            title: "Personal Learning Goals - Web Development",
            description: "Topics to master: Advanced React patterns, TypeScript best practices, Next.js 13 features, TailwindCSS architecture, Testing strategies, Performance optimization, and Accessibility standards.", 
            date: new Date(Date.now() - 172800000),
            tags: [
                { id: 2, name: 'Personal', color: 'text-purple-500' },
                { id: 5, name: 'Learning', color: 'text-pink-500' }
            ]
        },
    ]);

    const groupedNotes = groupNotesByDate(notes);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 border-b border-overlay/10 bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/80">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between gap-4">
                        {/* Logo/Title */}
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                            Your Notes
                        </h1>

                        {/* Search - Mobile */}
                        <div className="flex-1 lg:hidden">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-primary" />
                                <Input 
                                    type="text" 
                                    placeholder="Search..." 
                                    className="w-full pl-9 h-10 bg-overlay/5 border-overlay/10 rounded-full text-sm focus-visible:ring-1 focus-visible:ring-overlay/20" 
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            {/* Search - Desktop */}
                            <div className="hidden lg:block relative">
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
                                    className="w-[280px] sm:w-48 bg-bg-primary border border-overlay/10 shadow-lg"
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
            <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 space-y-6 sm:space-y-8">
                <TagFilters />
                {renderSection("Today", groupedNotes.Today)}
                {renderSection("Yesterday", groupedNotes.Yesterday)}
                {Object.entries(groupedNotes.Earlier).map(([date, notes]) => 
                    renderSection(date, notes)
                )}
            </main>
        </div>
    );
}