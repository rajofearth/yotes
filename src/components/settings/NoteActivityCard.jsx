import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import CalendarHeatmap from 'react-calendar-heatmap';
import '../../styles/heatmap.css';

export const NoteActivityCard = ({ notes, noteActivity }) => (
  <Card className="bg-overlay/5 border-overlay/10 lg:col-span-2">
    <CardHeader>
      <CardTitle>Note Activity</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-text-primary/80">{notes.length} notes in the last 12 months</p>
          <p className="text-sm text-text-primary/80">{new Date().getFullYear()}</p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <CalendarHeatmap
              startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
              endDate={new Date()}
              values={noteActivity}
              classForValue={value => !value || value.count === 0 ? 'color-empty' : `color-scale-${Math.min(value.count, 4)}`}
              tooltipDataAttrs={value => ({
                'data-tooltip': value ? `${value.date}: ${value.count} note${value.count === 1 ? '' : 's'}` : 'No notes'
              })}
              showWeekdayLabels
              showMonthLabels
              horizontal
              gutterSize={2}
              monthLabels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
              weekdayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
              className="w-full heatmap-container"
            />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-text-primary/60">Note activity over the past year</p>
          <div className="flex items-center gap-1">
            <span className="text-sm text-text-primary/60">Less</span>
            <div className="flex gap-1">
              {['#d6e685', '#8cc665', '#44a340', '#1e6823'].map(color => (
                <span key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></span>
              ))}
            </div>
            <span className="text-sm text-text-primary/60">More</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);