// src/components/TaskCalendar.tsx
import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, startOfWeek, addDays, eachDayOfInterval, isSameMonth, isSameDay, differenceInCalendarDays } from 'date-fns';
import { ja, enUS } from 'date-fns/locale'; 
import { useTranslation } from 'react-i18next'; 
import { useResponsive } from '../hooks/useResponsive';
import { useUserSettings } from '../hooks/useUserSettings';
import type { Task, AppData } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { IconChevronLeft, IconChevronRight } from './Icons';

interface Props {
  tasks: Task[];
  activeTasks: Task[];
  projects?: AppData[];
  activeProjectId?: string;
  onStatusChange: (id: string, status: 0 | 1 | 2 | 3) => void;
  onParentStatusChange: (id: string, status: 0 | 1 | 2 | 3) => void;
  onAddTask: (name: string, dateStr: string, parentId?: string, projectId?: string) => void; 
}

export const TaskCalendar: React.FC<Props> = ({ tasks, activeTasks, projects, activeProjectId, onStatusChange, onParentStatusChange, onAddTask }) => {
  const { isMobile } = useResponsive();
  const { t, i18n } = useTranslation(); 
  const { settings } = useUserSettings();
  const timeZone = settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo';

  const getZonedDate = (date: Date | number, tz: string) => {
    try {
      return new Date(new Date(date).toLocaleString('en-US', { timeZone: tz }));
    } catch (e) {
      return new Date(date);
    }
  };

  const [currentMonth, setCurrentMonth] = useState(() => getZonedDate(new Date(), timeZone));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = addDays(startDate, 41);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  const isEnglish = i18n.language === 'en';
  const dateLocale = isEnglish ? enUS : ja;
  const monthYearFormat = isEnglish ? 'MMMM yyyy' : 'yyyy年 M月';
  const weekDays = isEnglish 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['日', '月', '火', '水', '木', '金', '土'];

  const getDayTasks = (day: Date) => {
     return tasks.filter(t => {
        if (t.isDeleted || t.deadline === undefined) return false;
        const deadlineZoned = getZonedDate(t.deadline, timeZone);
        return isSameDay(day, deadlineZoned);
     });
  };

  const MAX_DISPLAY_TASKS = 5;
  const todayZoned = getZonedDate(new Date(), timeZone);
  todayZoned.setHours(0, 0, 0, 0);

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', padding: isMobile ? '8px' : '15px', paddingTop: isMobile ? '8px' : '17px', fontSize: '0.8rem', minHeight: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' , border: '1px solid var(--border-color)'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', color: 'var(--text-primary)', flexShrink: 0 }}>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', minWidth: 'auto', backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)' }}>
                <IconChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{format(currentMonth, monthYearFormat, { locale: dateLocale })}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', minWidth: 'auto', backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)' }}>
                <IconChevronRight size={16} />
            </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '5px', textAlign: 'center', color: 'var(--text-placeholder)', fontWeight: 'bold', flexShrink: 0 }}>
            {weekDays.map(d => <div key={d}>{d}</div>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '2px':'4px', flex: 1 }}>
            {calendarDays.map((day, kq) => {
                const dayTasks = getDayTasks(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, todayZoned);
                
                return (
                    <div 
                        key={kq} 
                        onClick={() => setSelectedDate(day)} 
                        style={{ 
                            minHeight: '130px', minWidth: 0,
                            backgroundColor: isCurrentMonth ? 'var(--bg-calendar-day)' : 'var(--bg-calendar-day-other)', 
                            padding: '4px',
                            border: isToday ? '1px solid var(--color-primary)' : '1px solid transparent',
                            borderRadius: '4px',
                            opacity: isCurrentMonth ? 1 : 0.4,
                            display: 'flex', flexDirection: 'column',
                            cursor: 'pointer', overflow: 'hidden'
                        }}
                    >
                        <div style={{ textAlign: 'right', fontSize: '0.9em', color: isToday ? 'var(--color-primary)' : 'var(--text-secondary)', marginBottom: '4px' }}>
                            {format(day, 'd')}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {dayTasks.slice(0, MAX_DISPLAY_TASKS).map(t => {
                                const deadlineZoned = getZonedDate(t.deadline!, timeZone);
                                const diffDays = differenceInCalendarDays(deadlineZoned, todayZoned);
                                const isUrgent = t.status !== 2 && diffDays <= 1;

                                let bgColor = 'var(--color-info)'; 
                                if (t.status === 0) bgColor = 'var(--text-placeholder)';
                                else if (t.status === 2) bgColor = 'var(--color-success)';
                                else if (t.status === 3) bgColor = 'var(--color-suspend)';
                                
                                if (isUrgent) {
                                    bgColor = 'var(--color-danger)';
                                }

                                return (
                                    <div key={t.id} style={{ 
                                        fontSize: '0.9em', 
                                        backgroundColor: bgColor, 
                                        color: '#fff', 
                                        borderRadius: '2px', 
                                        padding: '1px 3px',
                                        whiteSpace: 'nowrap', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis',
                                        textDecoration: t.status === 2 ? 'line-through' : 'none'
                                    }}>
                                        {t.name}
                                    </div>
                                );
                            })}
                            {dayTasks.length > MAX_DISPLAY_TASKS && (
                                <div style={{ fontSize: '0.75em', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    {t('others_count', { count: dayTasks.length - MAX_DISPLAY_TASKS })}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {selectedDate && (
            <TaskDetailModal 
                date={selectedDate} 
                tasks={getDayTasks(selectedDate)} 
                activeTasks={activeTasks}
                projects={projects}
                activeProjectId={activeProjectId}
                onStatusChange={onStatusChange}
                onParentStatusChange={onParentStatusChange}
                onAddTask={onAddTask}
                onClose={() => setSelectedDate(null)} 
            />
        )}
    </div>
  );
};