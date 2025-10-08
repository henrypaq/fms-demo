import React, { useState, useEffect } from 'react';
import ProjectSelectionView from './ProjectSelectionView';
import ProjectWorkspaceView from './ProjectWorkspaceView';

interface ProjectV3ViewProps {
  onBack: () => void;
  onProjectChange?: (project: any | null) => void;
  onSidebarDataChange?: (data: any) => void;
  onProjectBackClick?: () => void;
  triggerCreateProject?: number;
  selectedProject?: any | null; // NEW: Receive selected project from parent
}

const ProjectV3View: React.FC<ProjectV3ViewProps> = ({ 
  onBack, 
  onProjectChange, 
  onSidebarDataChange, 
  onProjectBackClick, 
  triggerCreateProject,
  selectedProject: parentSelectedProject // NEW: Use parent state
}) => {
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // NEW: Sync local state with parent state
  useEffect(() => {
    console.log('🔄 Syncing selectedProject from parent:', parentSelectedProject?.name || 'null');
    setSelectedProject(parentSelectedProject);
  }, [parentSelectedProject]);

  const handleProjectSelect = (project: any) => {
    console.log('🎯 ProjectV3View: Project selected:', project?.name);
    console.log('🎯 Setting local state and notifying parent...');
    setSelectedProject(project);
    if (onProjectChange) {
      onProjectChange(project);
      console.log('✅ Parent notified of project selection');
    } else {
      console.warn('⚠️ onProjectChange callback not provided!');
    }
  };

  const handleBackToProjects = () => {
    console.log('🔙 Back to projects list clicked');
    setSelectedProject(null);
    if (onProjectChange) {
      onProjectChange(null);
    }
    if (onProjectBackClick) {
      onProjectBackClick();
    }
  };

  const handleBackToMain = () => {
    console.log('Back to main dashboard');
    setSelectedProject(null);
    onProjectChange?.(null);
    onBack();
  };

  if (selectedProject) {
    return (
      <ProjectWorkspaceView 
        project={selectedProject} 
        onBack={handleBackToProjects}
        renderSidebar={false}
        onSidebarDataChange={onSidebarDataChange}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Project Selection */}
      <ProjectSelectionView 
        onProjectSelect={handleProjectSelect}
        triggerCreateProject={triggerCreateProject}
      />
    </div>
  );
};

export default ProjectV3View;