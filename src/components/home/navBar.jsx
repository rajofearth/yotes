import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Plus, Settings, Search, FileText, ListTodo, FileImage, Upload, Menu } from 'lucide-react'
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "../ui/dropdown-menu"
import { useNavigate } from 'react-router-dom';

export default function NavBar() {
    const navigate = useNavigate();

    return (
        <>
        {/* Navbar */}
        <nav className="sticky top-0 z-50 border-b border-overlay/10 bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/80">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between gap-4">
                            {/* Logo/Title */}
                            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                                Yotes
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
                                            onClick={() => navigate('/create')}
                                        >
                                            <Plus className="h-5 w-5 text-icon-primary group-hover:text-white transition-colors" />
                                            <span className="sr-only">Create new</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent 
                                        align="end"
                                        className="w-[280px] sm:w-48 bg-bg-primary border border-overlay/10 shadow-lg"
                                    >
                                        <DropdownMenuItem className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer" onClick={() => navigate('/create')}>
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
    
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10 transition-colors group" >
                                    <Settings className="h-5 w-5 text-icon-primary group-hover:text-white transition-colors" />
                                    <span className="sr-only">Settings</span>
                                </Button>
                            </div>
                        </div>
                </div>
        </nav> 
        </>
    )
}