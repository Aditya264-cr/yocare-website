import React from 'react';
import { Calendar, Clock, Tv, Info } from 'lucide-react';
import { Channel } from '../types';

interface ProgramScheduleProps {
  channels: Channel[];
  onSelectChannel: (channel: Channel) => void;
}

export const ProgramSchedule: React.FC<ProgramScheduleProps> = ({
  channels,
  onSelectChannel
}) => {
  const currentPrograms = channels.slice(0, 6).map((ch, idx) => {
    const times = [
      { start: '10:00 AM', end: '11:30 AM', show: 'Global World News Hour' },
      { start: '11:30 AM', end: '01:00 PM', show: 'Live Sports Central' },
      { start: '01:00 PM', end: '02:30 PM', show: 'Documentary Special' },
      { start: '02:30 PM', end: '04:00 PM', show: 'Chart Hits & Music Live' },
      { start: '04:00 PM', end: '05:30 PM', show: 'Regional Focus Today' },
      { start: '05:30 PM', end: '07:00 PM', show: 'Evening Prime Edition' }
    ];
    const program = times[idx % times.length];
    return {
      channel: ch,
      showTitle: `${ch.name}: ${program.show}`,
      startTime: program.start,
      endTime: program.end
    };
  });

  return (
    <section className="program-section page-section border-t border-white/10" id="on-now" aria-labelledby="program-title">
      <div className="section-intro program-intro flex items-end justify-between mb-6">
        <div>
          <p className="eyebrow"><span className="eyebrow-line"></span> THE LIVE SCHEDULE</p>
          <h2 id="program-title" className="text-3xl font-bold text-white">
            On now, <em>around the world.</em>
          </h2>
        </div>
        <p className="text-xs text-[#85978b] flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-[#d5f477]" /> Estimated live program timeline
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentPrograms.map(({ channel, showTitle, startTime, endTime }) => (
          <div
            key={channel.id}
            className="p-4 rounded-xl border border-white/10 bg-[#101715] hover:border-[#d5f477]/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-[#85978b] mb-2">
                <span className="flex items-center gap-1 text-[#d5f477] font-semibold">
                  <Clock className="w-3.5 h-3.5" /> {startTime} – {endTime}
                </span>
                <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-white/10">
                  {channel.category}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white m-0 mb-1">{showTitle}</h3>
              <p className="text-xs text-[#85978b] m-0 flex items-center gap-1">
                <Tv className="w-3 h-3 text-[#c8f28a]" /> Channel: {channel.name}
              </p>
            </div>

            <button
              type="button"
              className="mt-4 pt-3 border-t border-white/10 text-xs font-semibold text-[#d5f477] flex items-center justify-between bg-transparent border-0 cursor-pointer w-full text-left hover:text-white"
              onClick={() => onSelectChannel(channel)}
            >
              <span>Tune into live broadcast</span>
              <span>▶</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
