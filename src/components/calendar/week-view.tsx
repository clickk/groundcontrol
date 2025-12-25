'use client';

import { Project } from '@/types/project';
import moment from 'moment-timezone';
import { useCallback, useMemo, useState } from 'react';
import { Calendar, Event, momentLocalizer, SlotInfo, View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment.tz.setDefault('Australia/Sydney'));

interface CalendarEvent extends Event {
  resource?: {
    project: Project;
  };
}

interface WeekViewProps {
  projects: Project[];
  onEventDrop?: (projectId: string, newDate: Date, assigneeId?: string) => Promise<void>;
  onEventResize?: (projectId: string, newStart: Date, newEnd: Date) => Promise<void>;
  onSelectSlot?: (slotInfo: SlotInfo) => void;
}

export function WeekView({
  projects,
  onEventDrop,
  onEventResize,
  onSelectSlot,
}: WeekViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('week');

  const events: CalendarEvent[] = useMemo(() => {
    return projects
      .filter((project) => project.startDate)
      .map((project) => {
        const start = project.startDate || new Date();
        const end = project.dueDate || start;

        return {
          id: project.id,
          title: project.name,
          start,
          end,
          resource: {
            project,
          },
        };
      });
  }, [projects]);

  const handleEventDrop = useCallback(
    async ({ event, start, end }: any) => {
      const calendarEvent = event as CalendarEvent;
      if (onEventDrop && calendarEvent.resource?.project) {
        try {
          await onEventDrop(
            calendarEvent.resource.project.id,
            start,
            calendarEvent.resource.project.assignees[0]?.id
          );
        } catch (error) {
          console.error('Failed to update project:', error);
        }
      }
    },
    [onEventDrop]
  );

  const handleEventResize = useCallback(
    async ({ event, start, end }: any) => {
      const calendarEvent = event as CalendarEvent;
      if (onEventResize && calendarEvent.resource?.project) {
        try {
          await onEventResize(
            calendarEvent.resource.project.id,
            start,
            end
          );
        } catch (error) {
          console.error('Failed to resize project:', error);
        }
      }
    },
    [onEventResize]
  );

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  return (
    <div style={{ height: '800px', padding: '20px' }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="week"
        view={view}
        onView={handleViewChange}
        date={currentDate}
        onNavigate={handleNavigate}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        onSelectSlot={onSelectSlot}
        selectable
        resizable
        draggableAccessor={() => true}
        step={60}
        timeslots={1}
        min={new Date(2024, 0, 1, 9, 0)}
        max={new Date(2024, 0, 1, 17, 0)}
        defaultDate={currentDate}
        formats={{
          dayHeaderFormat: (date: Date) => moment(date).format('ddd D/M'),
          dayFormat: (date: Date) => moment(date).format('D'),
          timeGutterFormat: (date: Date) => moment(date).format('ha'),
        }}
        messages={{
          next: 'Next',
          previous: 'Previous',
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Time',
          event: 'Project',
        }}
      />
    </div>
  );
}

