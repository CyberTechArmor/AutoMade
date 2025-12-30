import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { api } from '../../services/api';
import type { CalendarEvent } from '../../types';

interface Props {
  projectId?: string;
}

const EVENT_COLORS: Record<string, string> = {
  session: '#8B5CF6',      // purple
  milestone: '#10B981',    // green
  deadline: '#EF4444',     // red
  meeting: '#3B82F6',      // blue
  other: '#6B7280',        // gray
};

export default function CalendarView({ projectId }: Props) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });

  useEffect(() => {
    loadEvents();
  }, [currentRange, projectId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await api.getCalendarEvents(
        currentRange.start.toISOString(),
        currentRange.end.toISOString(),
        projectId
      );
      setEvents(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (arg: DateClickArg) => {
    console.log('Date clicked:', arg.dateStr);
    // Could open a modal to create a new event
  };

  const handleEventClick = (arg: EventClickArg) => {
    const event = arg.event.extendedProps.calendarEvent as CalendarEvent;

    // Navigate based on event type
    if (event.sessionId) {
      navigate(`/sessions/${event.sessionId}`);
    } else if (event.projectId && event.milestoneId) {
      navigate(`/projects/${event.projectId}`);
    } else if (event.projectId) {
      navigate(`/projects/${event.projectId}`);
    }
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    setCurrentRange({ start: arg.start, end: arg.end });
  };

  // Transform events to FullCalendar format
  const calendarEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end || undefined,
    allDay: event.allDay,
    backgroundColor: EVENT_COLORS[event.type] || EVENT_COLORS.other,
    borderColor: EVENT_COLORS[event.type] || EVENT_COLORS.other,
    extendedProps: {
      calendarEvent: event,
    },
  }));

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          {Object.entries(EVENT_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="capitalize text-gray-600">{type}</span>
            </div>
          ))}
        </div>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          editable={false}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          weekends={true}
          height="auto"
          eventDisplay="block"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
          }}
        />
      </div>
    </div>
  );
}
