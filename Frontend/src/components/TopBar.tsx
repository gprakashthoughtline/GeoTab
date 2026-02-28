import { Bell, Search, User, Pin } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TopBar = () => (
  <header className="h-12 flex items-center justify-between border-b border-border bg-card px-4">
    <div className="flex items-center gap-2">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      {/* <div className="flex items-center gap-2 bg-secondary rounded-md px-3 py-1.5 ml-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-40"
        />
        <kbd className="text-[10px] text-muted-foreground bg-background rounded px-1.5 py-0.5 border border-border font-mono">⌘F</kbd>
      </div> */}
    </div>

    <div className="flex items-center gap-2">
      {/* <button className="p-2 rounded-md hover:bg-secondary transition-colors">
        <Pin className="w-4 h-4 text-muted-foreground" />
      </button>
      <button className="relative p-2 rounded-md hover:bg-secondary transition-colors">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-drift-critical pulse-dot" />
      </button>
      <button className="p-2 rounded-md hover:bg-secondary transition-colors">
        <User className="w-4 h-4 text-muted-foreground" />
      </button> */}
    </div>
  </header>
);

export default TopBar;
