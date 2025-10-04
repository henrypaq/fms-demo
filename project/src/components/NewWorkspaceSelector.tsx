import React, { useState } from 'react';
import { PlusIcon, SettingsIcon, StarIcon } from 'lucide-react';
import {
  Workspaces,
  WorkspaceTrigger,
  WorkspaceContent,
  type Workspace,
} from '@/components/ui/workspaces';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '../contexts/WorkspaceContext';

// Extended workspace interface for this specific use case
interface MyWorkspace extends Workspace {
  logo: string;
  color: string;
  plan: string;
  slug: string;
  isFavorite?: boolean;
}

const NewWorkspaceSelector: React.FC = () => {
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  // Transform existing workspaces to match the new interface
  const transformedWorkspaces: MyWorkspace[] = workspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    logo: ws.name.charAt(0).toUpperCase(), // First letter instead of image
    color: ws.color, // Use workspace color
    slug: ws.name.toLowerCase().replace(/\s+/g, '-'),
    isFavorite: ws.isPersonal,
  }));

  const handleWorkspaceChange = (workspace: MyWorkspace) => {
    // Switch to the workspace using its ID
    if (switchWorkspace) {
      switchWorkspace(workspace.id);
    }
    setOpen(false);
  };

  // Custom workspace renderer with additional info
  const renderWorkspace = (workspace: Workspace, isSelected: boolean) => {
    const ws = workspace as MyWorkspace;
    return (
      <div className={`flex min-w-0 flex-1 items-center gap-3 transition-all duration-300 p-2 rounded ${
        isSelected ? 'bg-[#262626]' : 'hover:bg-[#262626]'
      }`}>
        <div className="relative">
          <div 
            className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-300"
            style={{ backgroundColor: ws.color }}
          >
            {ws.logo}
          </div>
          {ws.isFavorite && (
            <StarIcon className="absolute -top-1 -right-1 h-3 w-3 fill-yellow-400 text-yellow-400 animate-pulse" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <span className="truncate text-sm font-medium text-white transition-all duration-300">{ws.name}</span>
        </div>
        {isSelected && (
          <div className="flex items-center gap-1 animate-in fade-in-0 slide-in-from-right-1 duration-300">
            <span className="text-xs font-medium text-green-400">Active</span>
          </div>
        )}
      </div>
    );
  };

  // Custom trigger with animations
  const renderTrigger = (workspace: Workspace, isOpen: boolean) => {
    const ws = workspace as MyWorkspace;
    return (
      <div className="flex items-center justify-between w-full p-3">
        <div className="flex items-center gap-3">
          <div 
            className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-200"
            style={{ backgroundColor: ws.color }}
          >
            {ws.logo}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-white truncate max-w-32">
              {ws.name}
            </span>
          </div>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <Workspaces
      workspaces={transformedWorkspaces}
      selectedWorkspaceId={currentWorkspace?.id}
      onWorkspaceChange={handleWorkspaceChange}
      open={open}
      onOpenChange={setOpen}
    >
      <WorkspaceTrigger 
        className="w-full bg-[#171717] hover:bg-[#262626] border-2 border-dashed border-gray-600 text-white hover:text-white transition-all duration-200 rounded-lg"
        renderTrigger={renderTrigger}
      />
      <WorkspaceContent
        title="Choose Workspace"
        searchable
        renderWorkspace={renderWorkspace}
        className="bg-[#171717] border-gray-600 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-[#262626] w-full justify-start transition-colors duration-200"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Create new workspace
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-[#262626] w-full justify-start transition-colors duration-200"
        >
          <SettingsIcon className="mr-2 h-4 w-4" />
          Manage workspaces
        </Button>
      </WorkspaceContent>
    </Workspaces>
  );
};

export default NewWorkspaceSelector;
