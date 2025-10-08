'use client';

import * as React from 'react';
import {
	Workspaces,
	WorkspaceTrigger,
	WorkspaceContent,
	type Workspace,
} from '@/components/ui/workspaces';
import { Button } from '@/components/ui/button';
import { PlusIcon, StarIcon, SettingsIcon } from 'lucide-react';

// Extended workspace interface for this specific use case
interface MyWorkspace extends Workspace {
	logo: string;
	plan: string;
	slug: string;
	isFavorite?: boolean;
}

const workspaces: MyWorkspace[] = [
	{
		id: '1',
		name: 'Asme Inc.',
		logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop&crop=center',
		plan: 'Free',
		slug: 'asme',
		isFavorite: true,
	},
	{
		id: '2',
		name: 'Bilux Labs',
		logo: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=100&h=100&fit=crop&crop=center',
		plan: 'Pro',
		slug: 'bilux',
	},
	{
		id: '3',
		name: 'Zentra Ltd.',
		logo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=100&h=100&fit=crop&crop=center',
		plan: 'Team',
		slug: 'zentra',
		isFavorite: true,
	},
	{
		id: '4',
		name: 'Nuvex Group',
		logo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=100&h=100&fit=crop&crop=center',
		plan: 'Free',
		slug: 'nuvex',
	},
	{
		id: '5',
		name: 'Cortexia',
		logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=center',
		plan: 'Pro',
		slug: 'cortexia',
	},
];

export default function WorkspaceDemo() {
	const [activeWorkspaceId, setActiveWorkspaceId] = React.useState('1');
	const [open, setOpen] = React.useState(false);

	const handleWorkspaceChange = (workspace: MyWorkspace) => {
		setActiveWorkspaceId(workspace.id);
	};

	// Custom workspace renderer with additional info
	const renderWorkspace = (workspace: Workspace, isSelected: boolean) => {
		const ws = workspace as MyWorkspace;
		return (
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="relative">
					<img src={ws.logo} alt={ws.name} className="h-8 w-8 rounded-full" />
					{ws.isFavorite && (
						<StarIcon className="absolute -top-1 -right-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
					)}
				</div>
				<div className="flex min-w-0 flex-1 flex-col items-start">
					<span className="truncate text-sm font-medium">{ws.name}</span>
					<span className="text-muted-foreground text-xs">{ws.plan} Plan</span>
				</div>
				{isSelected && (
					<div className="flex items-center gap-1">
						<span className="text-xs font-medium text-green-600">Active</span>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="flex min-h-screen items-start justify-center gap-8 px-4 py-18">
			<Workspaces
				workspaces={workspaces}
				selectedWorkspaceId={activeWorkspaceId}
				onWorkspaceChange={handleWorkspaceChange}
				open={open}
				onOpenChange={setOpen}
			>
				<WorkspaceTrigger className="min-w-72 border-2 border-dashed" />
				<WorkspaceContent
					title="Choose Workspace"
					searchable
					renderWorkspace={renderWorkspace}
				>
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground w-full justify-start"
					>
						<PlusIcon className="mr-2 h-4 w-4" />
						Create new workspace
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground w-full justify-start"
					>
						<SettingsIcon className="mr-2 h-4 w-4" />
						Manage workspaces
					</Button>
				</WorkspaceContent>
			</Workspaces>
		</div>
	);
}
