import React, { useState } from 'react';
import ProjectSelectionView from './ProjectSelectionView';
import ProjectWorkspaceView from './ProjectWorkspaceView';

interface ProjectV3ViewProps {
  onBack: () => void;
  onProjectChange?: (project: any | null) => void;
  onSidebarDataChange?: (data: any) => void;
  onProjectBackClick?: () => void;
  triggerCreateProject?: number;
}

const ProjectV3View: React.FC<ProjectV3ViewProps> = ({ onBack, onProjectChange, onSidebarDataChange, onProjectBackClick, triggerCreateProject }) => {
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project);
    onProjectChange?.(project);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    onProjectChange?.(null);
    onProjectBackClick?.();
  };

  const handleBackToMain = () => {
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