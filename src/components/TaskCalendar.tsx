import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task } from '../types';

interface Props {
  projectStartDate: number;
  tasks: Task[];
}

export const TaskCalendar: React.FC<Props> = ({ projectStartDate, tasks }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart); // ロケール指定なしだと日曜始まり
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const getDayTasks = (day: Date) => {
     return tasks.filter(t => {
        if (t.isDeleted || t.deadlineOffset === undefined) return false;
        // projectStartDate(ms) にオフセット日数を加算して日付を計算
        const deadline = addDays(projectStartDate, t.deadlineOffset);
        return isSameDay(day, deadline);
     });
  };

  return (
    <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', padding: '15px', fontSize: '0.8rem', height: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ padding: '4px 8px', minWidth: 'auto' }}>&lt;</button>
            <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{format(currentMonth, 'yyyy年 M月', { locale: ja })}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ padding: '4px 8px', minWidth: 'auto' }}>&gt;</button>
        </div>

        {/* Weekdays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '5px', textAlign: 'center', color: '#888', fontWeight: 'bold' }}>
            {weekDays.map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Days */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '4px',
            width: '100%' // 幅を親に合わせる
        }}>
            {calendarDays.map((day, kq) => {
                const dayTasks = getDayTasks(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                
                return (
                    <div key={kq} style={{ 
                        minHeight: '80px', 
                        minWidth: 0, // グリッド内で中身に引っ張られないようにする
                        backgroundColor: isCurrentMonth ? '#333' : '#222', 
                        padding: '4px',
                        border: isToday ? '1px solid #646cff' : '1px solid transparent',
                        borderRadius: '4px',
                        opacity: isCurrentMonth ? 1 : 0.4,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden' // セルからはみ出さないようにする
                    }}>
                        <div style={{ textAlign: 'right', fontSize: '0.9em', color: isToday ? '#646cff' : '#aaa', marginBottom: '4px', fontWeight: isToday ? 'bold' : 'normal' }}>
                            {format(day, 'd')}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {dayTasks.map(t => (
                                <div key={t.id} style={{ 
                                    fontSize: '0.7em', 
                                    backgroundColor: t.status === 2 ? '#28a745' : t.status === 3 ? '#6f42c1' : '#007bff', 
                                    color: '#fff', 
                                    borderRadius: '2px', 
                                    padding: '2px 4px',
                                    // 以下、タスク名の表示制限設定
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    textDecoration: t.status === 2 ? 'line-through' : 'none',
                                    opacity: (t.status === 2 || t.status === 3) ? 0.7 : 1
                                }} title={t.name}>
                                    {t.name}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};