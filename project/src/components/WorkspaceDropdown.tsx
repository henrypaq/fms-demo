import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Button } from './ui/button';
import { useWorkspace } from '../contexts/WorkspaceContext';

interface WorkspaceDropdownProps {
  isCollapsed: boolean;
}

const WorkspaceDropdown: React.FC<WorkspaceDropdownProps> = ({ isCollapsed }) => {
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  const handleWorkspaceChange = (workspaceId: string) => {
    if (switchWorkspace && workspaceId !== currentWorkspace?.id) {
      switchWorkspace(workspaceId);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-8 justify-between px-3 py-1 hover:bg-accent gap-2 rounded-md"
          style={{ height: '32px' }}
        >
          <span className="text-sm font-medium truncate text-left">
            {currentWorkspace?.name || 'Workspace'}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-0"
        align="start"
        side="bottom"
      >
        <div className="py-2">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => handleWorkspaceChange(workspace.id)}
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent w-full text-left"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {workspace.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {workspace.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {workspace.isPersonal ? 'Personal' : 'Team'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WorkspaceDropdown;
