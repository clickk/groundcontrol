import { TimeEntry } from './time-entry';
import { User } from './user';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  partner?: string;
  projectType?: string;
  budget?: number;
  milestone?: string;
  startDate?: Date;
  dueDate?: Date;
  assignees: User[];
  notes: ProjectNote[];
  timeEntries: TimeEntry[];
  totalTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectStatus {
  id: string;
  status: string;
  color: string;
  type: string;
}

export interface ProjectNote {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ProjectFilters {
  status?: string;
  partner?: string;
  projectType?: string;
  assigneeId?: string;
  search?: string;
}

export interface CreateProjectNoteInput {
  projectId: string;
  content: string;
  authorId: string;
}

export interface UpdateProjectStatusInput {
  projectId: string;
  status: string;
}

