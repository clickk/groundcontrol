export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  hours: number;
  date: Date;
  description?: string;
  clickupTimeEntryId?: string;
  synced: boolean;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTimeEntryInput {
  userId: string;
  projectId: string;
  hours: number;
  date: Date;
  description?: string;
}

export interface UpdateTimeEntryInput {
  id: string;
  hours?: number;
  date?: Date;
  description?: string;
}

export interface TimeEntrySummary {
  projectId: string;
  projectName: string;
  totalHours: number;
  entryCount: number;
}

