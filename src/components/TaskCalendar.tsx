import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, differenceInCalendarDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task } from '../types';
import { TaskDetailModal } from './TaskDetailModal';

interface Props {
  tasks: Task[];
  onStatusChange: (id: string, status: 0 | 1 | 2 | 3) => void;
  onParentStatusChange: (id: string, status: 0 | 1 | 2 | 3) => void;
}

export const TaskCalendar: React.FC<Props> = ({ tasks, onStatusChange, onParentStatusChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const getDayTasks = (day: Date) => {
     return tasks.filter(t => {
        if (t.isDeleted || t.deadline === undefined) return false;
        return isSameDay(day, t.deadline);
     });
  };

  const MAX_DISPLAY_TASKS = 5;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', padding: '15px', fontSize: '0.8rem', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', color: 'var(--text-primary)' }}>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ padding: '4px 8px', minWidth: 'auto', backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)' }}>&lt;</button>
            <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{format(currentMonth, 'yyyy年 M月', { locale: ja })}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ padding: '4px 8px', minWidth: 'auto', backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)' }}>&gt;</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '5px', textAlign: 'center', color: 'var(--text-placeholder)', fontWeight: 'bold' }}>
            {weekDays.map(d => <div key={d}>{d}</div>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarDays.map((day, kq) => {
                const dayTasks = getDayTasks(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                
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
                                const diffDays = differenceInCalendarDays(t.deadline!, today);
                                const isUrgent = t.status !== 2 && diffDays <= 1;

                                // デフォルト(進行中など)は青
                                let bgColor = 'var(--color-info)'; 
                                // 未着手はグレー
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
                                        color: '#fff', /* バッジ内は白文字固定が見やすい */
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
                                    他{dayTasks.length - MAX_DISPLAY_TASKS}件...
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
                onStatusChange={onStatusChange}
                onParentStatusChange={onParentStatusChange}
                onClose={() => setSelectedDate(null)} 
            />
        )}
    </div>
  );
};