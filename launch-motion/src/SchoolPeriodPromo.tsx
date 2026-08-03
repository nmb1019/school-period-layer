import React, {type CSSProperties} from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from 'remotion';

export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_DURATION_IN_FRAMES = VIDEO_FPS * 24;

type Day = {
  day: string;
  date: string;
};

type Period = {
  label: string;
  start: string;
  end: string;
};

type CalendarSurfaceProps = {
  frame: number;
  revealStart?: number;
  selected?: {day: number; period: number} | null;
  compact?: boolean;
};

type CursorProps = {
  frame: number;
  sceneStart: number;
};

const DISPLAY_FONT = '"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic UI", sans-serif';
const UI_FONT = '"Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif';
const MONO = '"SFMono-Regular", "Roboto Mono", "Menlo", monospace';

const COLORS = {
  ink: '#1d2b35',
  navy: '#162b39',
  blue: '#4d7698',
  sky: '#b9d6e3',
  pale: '#eef3f4',
  paper: '#f6f8f7',
  white: '#ffffff',
  coral: '#ef8f76',
  line: '#dce5e8',
  muted: '#71818b',
};

const DAYS: Day[] = [
  {day: '月', date: '8'},
  {day: '火', date: '9'},
  {day: '水', date: '10'},
  {day: '木', date: '11'},
  {day: '金', date: '12'},
  {day: '土', date: '13'},
  {day: '日', date: '14'},
];

const PERIODS: Period[] = [
  {label: '1限', start: '08:40', end: '09:30'},
  {label: '2限', start: '09:40', end: '10:30'},
  {label: '3限', start: '10:40', end: '11:30'},
  {label: '4限', start: '11:40', end: '12:30'},
  {label: '5限', start: '13:20', end: '14:10'},
  {label: '6限', start: '14:20', end: '15:10'},
  {label: '7限', start: '15:20', end: '16:10'},
];

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
const easeSoft = Easing.bezier(0.33, 1, 0.68, 1);

const clampProgress = (frame: number, start: number, end: number, easing = easeOut) =>
  interpolate(frame, [start, end], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const fadeIn = (frame: number, start: number, end: number) =>
  clampProgress(frame, start, end, easeSoft);

const parseMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const calendarMetrics = {
  width: 1120,
  height: 650,
  gridLeft: 86,
  gridTop: 178,
  gridHeight: 420,
  dayWidth: 140,
  startMinute: 8 * 60,
  endMinute: 16 * 60 + 30,
};

const timeToY = (time: string) => {
  const ratio =
    (parseMinutes(time) - calendarMetrics.startMinute) /
    (calendarMetrics.endMinute - calendarMetrics.startMinute);
  return calendarMetrics.gridTop + ratio * calendarMetrics.gridHeight;
};

const css = (values: CSSProperties): CSSProperties => values;

const Wordmark = ({light = false}: {light?: boolean}) => {
  const foreground = light ? COLORS.white : COLORS.ink;
  const secondary = light ? COLORS.sky : COLORS.blue;
  return (
    <div style={css({display: 'flex', alignItems: 'center', gap: 14})}>
      <div
        style={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 8px)',
          alignItems: 'end',
          gap: 4,
          width: 40,
          height: 40,
          padding: '8px 7px',
          borderRadius: '11px 11px 7px 7px',
          backgroundColor: foreground,
        })}
      >
        <i style={css({height: 10, borderRadius: 3, backgroundColor: secondary})} />
        <i style={css({height: 17, borderRadius: 3, backgroundColor: light ? '#e3eef2' : '#9ec0d4'})} />
        <i style={css({height: 23, borderRadius: 3, backgroundColor: light ? '#7eaec6' : '#5d86a3'})} />
      </div>
      <div>
        <div
          style={css({
            color: secondary,
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.17em',
          })}
        >
          SCHOOL PERIOD LAYER
        </div>
        <div style={css({marginTop: 3, color: foreground, fontFamily: UI_FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-0.04em'})}>
          校時レイヤー
        </div>
      </div>
    </div>
  );
};

const Grain = ({light = false}: {light?: boolean}) => (
  <div
    style={css({
      position: 'absolute',
      inset: 0,
      opacity: 0.19,
      pointerEvents: 'none',
      backgroundImage: light
        ? 'radial-gradient(rgba(25, 52, 65, 0.16) 0.65px, transparent 0.65px)'
        : 'radial-gradient(rgba(232, 246, 247, 0.15) 0.65px, transparent 0.65px)',
      backgroundSize: '5px 5px',
      mixBlendMode: light ? 'multiply' : 'screen',
    })}
  />
);

const RailLines = ({light = false}: {light?: boolean}) => (
  <div style={css({position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: light ? 0.45 : 0.2})}>
    <div
      style={css({
        position: 'absolute',
        top: -80,
        left: -180,
        width: 2540,
        height: 1,
        backgroundColor: light ? '#b9cbd2' : '#9cc7d6',
        transform: 'rotate(-11deg)',
        transformOrigin: 'left center',
      })}
    />
    <div
      style={css({
        position: 'absolute',
        top: 740,
        left: -300,
        width: 2550,
        height: 1,
        backgroundColor: light ? '#c7d6db' : '#7db5c7',
        transform: 'rotate(-11deg)',
        transformOrigin: 'left center',
      })}
    />
    <div
      style={css({
        position: 'absolute',
        top: -250,
        right: 270,
        width: 1,
        height: 1700,
        backgroundColor: light ? '#ccdade' : '#8ab8c8',
        transform: 'rotate(21deg)',
      })}
    />
  </div>
);

const BrowserChrome = () => (
  <div style={css({display: 'flex', alignItems: 'center', height: 55, padding: '0 21px', borderBottom: `1px solid ${COLORS.line}`, backgroundColor: '#f8fafb'})}>
    <div style={css({display: 'flex', gap: 7})}>
      <span style={css({width: 9, height: 9, borderRadius: '50%', backgroundColor: '#d9a59a'})} />
      <span style={css({width: 9, height: 9, borderRadius: '50%', backgroundColor: '#d6c590'})} />
      <span style={css({width: 9, height: 9, borderRadius: '50%', backgroundColor: '#a9c9b7'})} />
    </div>
    <div style={css({marginLeft: 21, color: '#83939c', fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em'})}>
      calendar.google.com / week
    </div>
    <div style={css({marginLeft: 'auto', width: 230, height: 25, border: `1px solid ${COLORS.line}`, borderRadius: 7, backgroundColor: '#fff'})} />
  </div>
);

const CalendarSurface = ({frame, revealStart = 28, selected = null, compact = false}: CalendarSurfaceProps) => {
  const intro = clampProgress(frame, 0, 36);
  const calendarScale = compact ? 0.86 : 1;
  const selectedPeriod = selected ? PERIODS[selected.period] : null;
  const draftProgress = selected ? clampProgress(frame, 108, 138, easeSoft) : 0;

  return (
    <div
      style={css({
        position: 'relative',
        fontFamily: UI_FONT,
        width: calendarMetrics.width,
        height: calendarMetrics.height,
        overflow: 'hidden',
        border: `1px solid ${COLORS.line}`,
        borderRadius: 25,
        backgroundColor: '#fff',
        boxShadow: '0 30px 70px rgba(22, 48, 63, 0.19)',
        transform: `scale(${calendarScale}) translateY(${(1 - intro) * 26}px)`,
        transformOrigin: 'center bottom',
      })}
    >
      <BrowserChrome />
      <div style={css({display: 'flex', alignItems: 'center', height: 60, padding: '0 23px', borderBottom: `1px solid ${COLORS.line}`})}>
        <div style={css({display: 'flex', alignItems: 'center', gap: 14})}>
          <button style={css({width: 34, height: 28, border: `1px solid ${COLORS.line}`, borderRadius: 7, color: COLORS.muted, backgroundColor: '#fff', fontSize: 15})}>‹</button>
          <button style={css({width: 34, height: 28, border: `1px solid ${COLORS.line}`, borderRadius: 7, color: COLORS.muted, backgroundColor: '#fff', fontSize: 15})}>›</button>
          <span style={css({marginLeft: 6, color: COLORS.ink, fontSize: 19, fontWeight: 800, letterSpacing: '-0.07em'})}>2026年6月8日 — 14日</span>
        </div>
        <div style={css({display: 'flex', gap: 8, marginLeft: 'auto'})}>
          <span style={css({padding: '7px 12px', border: `1px solid ${COLORS.line}`, borderRadius: 7, color: COLORS.muted, fontSize: 10})}>今日</span>
          <span style={css({padding: '7px 12px', border: `1px solid ${COLORS.line}`, borderRadius: 7, color: COLORS.blue, backgroundColor: '#eef5f8', fontSize: 10, fontWeight: 800})}>週</span>
        </div>
      </div>

      <div style={css({position: 'absolute', top: 115, left: 0, right: 0, height: 63, backgroundColor: '#fbfcfc'})}>
        <div style={css({position: 'absolute', top: 20, left: 22, color: '#9aa8ae', fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em'})}>JUNE / WEEK 24</div>
        {DAYS.map((item, index) => (
          <div key={item.day} style={css({position: 'absolute', top: 13, left: calendarMetrics.gridLeft + index * calendarMetrics.dayWidth, width: calendarMetrics.dayWidth, textAlign: 'center'})}>
            <span style={css({display: 'block', color: index === 6 ? '#c68782' : '#84949b', fontFamily: MONO, fontSize: 9, fontWeight: 700})}>{item.day}</span>
            <span style={css({display: 'block', marginTop: 5, color: index === 6 ? '#ca7d73' : COLORS.ink, fontSize: 16, fontWeight: 800})}>{item.date}</span>
          </div>
        ))}
      </div>

      <div style={css({position: 'absolute', top: calendarMetrics.gridTop, left: calendarMetrics.gridLeft, width: calendarMetrics.dayWidth * DAYS.length, height: calendarMetrics.gridHeight, backgroundColor: '#fff'})}>
        {Array.from({length: 9}, (_, index) => (
          <div key={`hour-${index}`} style={css({position: 'absolute', top: index * 52, left: 0, right: 0, height: 1, backgroundColor: index === 0 ? '#d6e1e5' : '#edf1f2'})} />
        ))}
        {DAYS.map((item, index) => (
          <div key={`day-col-${item.day}`} style={css({position: 'absolute', top: 0, bottom: 0, left: index * calendarMetrics.dayWidth, width: 1, backgroundColor: '#edf1f2'})} />
        ))}
        <div style={css({position: 'absolute', top: 0, bottom: 0, right: 0, width: 1, backgroundColor: '#edf1f2'})} />
        {Array.from({length: 9}, (_, index) => (
          <span key={`hour-label-${index}`} style={css({position: 'absolute', top: index * 52 - 6, left: -45, color: '#97a5aa', fontFamily: MONO, fontSize: 10})}>
            {String(8 + index).padStart(2, '0')}:00
          </span>
        ))}

        <div style={css({position: 'absolute', top: timeToY('10:27') - calendarMetrics.gridTop, left: -1, width: calendarMetrics.dayWidth * DAYS.length + 1, height: 1, backgroundColor: COLORS.coral, opacity: 0.55 + Math.sin(frame / 17) * 0.08})}>
          <span style={css({position: 'absolute', top: -5, left: -5, width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.coral, boxShadow: `0 0 0 ${4 + Math.sin(frame / 17) * 2}px rgba(239, 143, 118, 0.14)`})} />
        </div>

        {DAYS.slice(0, 5).flatMap((day, dayIndex) =>
          PERIODS.map((period, periodIndex) => {
            const periodIn = clampProgress(frame, revealStart + periodIndex * 4 + dayIndex * 1.2, revealStart + 20 + periodIndex * 4 + dayIndex * 1.2, easeSoft);
            const top = timeToY(period.start) - calendarMetrics.gridTop;
            const bottom = timeToY(period.end) - calendarMetrics.gridTop;
            const isSelected = selected?.day === dayIndex && selected?.period === periodIndex;
            const hoverIn = isSelected ? clampProgress(frame, 68, 90, easeSoft) : 0;
            return (
              <div
                key={`${day.day}-${period.label}`}
                style={css({
                  position: 'absolute',
                  top,
                  left: dayIndex * calendarMetrics.dayWidth + 7,
                  width: calendarMetrics.dayWidth - 14,
                  height: Math.max(20, bottom - top),
                  overflow: 'visible',
                  border: '1px dashed rgba(82, 92, 105, 0.22)',
                  backgroundColor: 'rgba(106, 120, 136, 0.035)',
                  opacity: periodIn,
                  zIndex: isSelected ? 3 : 1,
                  transform: `translateY(${(1 - periodIn) * 8}px) scaleY(${0.98 + periodIn * 0.02})`,
                  transformOrigin: 'top left',
                })}
              >
                <div
                  style={css({
                    position: 'absolute',
                    top: 3,
                    left: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    minWidth: 26,
                    minHeight: 24,
                    padding: `2px ${5 + hoverIn * 2}px`,
                    borderRadius: 5,
                    color: isSelected ? 'rgba(42, 51, 63, 0.94)' : 'rgba(68, 78, 91, 0.7)',
                    backgroundColor: `rgba(89, 104, 121, ${hoverIn * 0.11})`,
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  })}
                >
                  <span>{period.label.replace(/限$/, '')}</span>
                  {isSelected && (
                    <>
                      <span style={css({fontSize: 10, fontWeight: 600, opacity: hoverIn})}>{period.start}–{period.end}</span>
                      <span style={css({fontSize: 15, fontWeight: 500, lineHeight: 1, opacity: hoverIn})}>＋</span>
                    </>
                  )}
                </div>
              </div>
            );
          }),
        )}
      </div>

      {selected && selectedPeriod && (
        <div
          style={css({
            position: 'absolute',
            top: 224,
            left: 664,
            zIndex: 8,
            width: 390,
            padding: '15px 17px 14px',
            border: '1px solid #dadce0',
            borderRadius: 9,
            backgroundColor: '#fff',
            boxShadow: '0 10px 34px rgba(60, 64, 67, 0.24)',
            opacity: draftProgress,
            transform: `translateY(${(1 - draftProgress) * 18}px) scale(${0.98 + draftProgress * 0.02})`,
            transformOrigin: 'top center',
          })}
        >
          <div style={css({display: 'flex', alignItems: 'center', gap: 12})}>
            <span style={css({display: 'grid', placeItems: 'center', width: 24, height: 24, color: '#5f6368', fontSize: 17})}>×</span>
            <span style={css({flex: 1, padding: '7px 2px 9px', borderBottom: '1px solid #80868b', color: '#3c4043', fontSize: 17})}>タイトルを追加</span>
          </div>
          <div style={css({display: 'grid', gridTemplateColumns: '24px 1fr', gap: 12, alignItems: 'start', marginTop: 16})}>
            <span style={css({display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 6, color: '#fff', backgroundColor: '#4f76a2', fontSize: 12})}>▦</span>
            <div>
              <div style={css({color: '#3c4043', fontSize: 12, fontWeight: 700})}>2026年6月10日（水）</div>
              <div style={css({marginTop: 5, color: '#5f6368', fontSize: 11, fontVariantNumeric: 'tabular-nums'})}>{selectedPeriod.start}–{selectedPeriod.end}</div>
            </div>
          </div>
          <div style={css({display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 18})}>
            <span style={css({padding: '8px 10px', color: '#4f76a2', fontSize: 11, fontWeight: 700})}>その他のオプション</span>
            <span style={css({padding: '8px 15px', borderRadius: 4, color: '#fff', backgroundColor: '#4f76a2', fontSize: 11, fontWeight: 700})}>保存</span>
          </div>
        </div>
      )}
    </div>
  );
};

const Cursor = ({frame, sceneStart}: CursorProps) => {
  const progress = clampProgress(frame, sceneStart + 25, sceneStart + 92, easeInOut);
  // Cursor is positioned inside the calendar surface, so these coordinates
  // stay local to that card instead of drifting off the composition.
  const x = interpolate(progress, [0, 1], [880, 410]);
  const y = interpolate(progress, [0, 1], [510, 329]);
  const click = clampProgress(frame, sceneStart + 97, sceneStart + 109, easeInOut);
  return (
    <div
      style={css({
        position: 'absolute',
        zIndex: 12,
        left: x,
        top: y,
        width: 27,
        height: 35,
        opacity: fadeIn(frame, sceneStart + 10, sceneStart + 27),
        transform: `rotate(-14deg) scale(${1 - click * 0.14})`,
        transformOrigin: '9px 7px',
      })}
    >
      <div style={css({position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderTop: '29px solid #172b38', borderRight: '12px solid transparent', filter: 'drop-shadow(1px 2px 0 rgba(255,255,255,0.9))'})} />
      <div style={css({position: 'absolute', top: 4, left: 3, width: 0, height: 0, borderTop: '20px solid #ffffff', borderRight: '8px solid transparent'})} />
      {click > 0 && <div style={css({position: 'absolute', top: -14, left: -11, width: 48, height: 48, border: '2px solid rgba(239, 143, 118, 0.65)', borderRadius: '50%', opacity: 1 - click, transform: `scale(${1 + click * 0.6})`})} />}
    </div>
  );
};

const ExtensionPopup = ({frame}: {frame: number}) => {
  const inProgress = clampProgress(frame, 0, 38);
  const toggleProgress = clampProgress(frame, 45, 66);
  const chipProgress = clampProgress(frame, 76, 101);
  return (
    <div
      style={css({
        position: 'relative',
        width: 365,
        minHeight: 478,
        padding: '25px 22px 17px',
        border: `1px solid ${COLORS.line}`,
        borderRadius: 18,
        background: 'linear-gradient(145deg, #fbfcfd, #f2f6f7)',
        boxShadow: '0 30px 80px rgba(33, 55, 66, 0.23)',
        opacity: inProgress,
        transform: `translateY(${(1 - inProgress) * 30}px) rotate(1.2deg)`,
      })}
    >
      <div style={css({display: 'grid', gridTemplateColumns: '37px 1fr auto', gap: 12, alignItems: 'center'})}>
        <div style={css({display: 'grid', gridTemplateColumns: 'repeat(3, 6px)', alignItems: 'end', gap: 3, width: 37, height: 37, padding: '8px 7px', borderRadius: '10px 10px 6px 6px', backgroundColor: COLORS.ink})}>
          <i style={css({height: 9, borderRadius: 2, backgroundColor: '#a9c4dc'})} />
          <i style={css({height: 14, borderRadius: 2, backgroundColor: '#d8e7f3'})} />
          <i style={css({height: 19, borderRadius: 2, backgroundColor: '#7297ba'})} />
        </div>
        <div>
          <div style={css({color: COLORS.blue, fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: '0.15em'})}>SCHOOL PERIOD LAYER</div>
          <div style={css({marginTop: 3, color: COLORS.ink, fontSize: 16, fontWeight: 800, letterSpacing: '-0.05em'})}>校時レイヤー</div>
        </div>
        <div style={css({position: 'relative', width: 40, height: 23, borderRadius: 99, backgroundColor: COLORS.blue})}>
          <div style={css({position: 'absolute', top: 3, left: 3 + toggleProgress * 16, width: 17, height: 17, borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(40,52,63,.2)'})} />
        </div>
      </div>
      <div style={css({margin: '25px 0 18px', padding: '17px 18px 16px', border: '1px solid rgba(128,157,181,.28)', borderRadius: 15, backgroundColor: 'rgba(255,255,255,.72)', boxShadow: '0 15px 42px rgba(34,53,69,.1)'})}>
        <div style={css({color: COLORS.blue, fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: '0.18em'})}>CURRENT WEEK</div>
        <div style={css({marginTop: 6, color: COLORS.ink, fontSize: 16, fontWeight: 800, letterSpacing: '-0.04em'})}>6月8日〜6月14日</div>
        <div style={css({marginTop: 7, color: COLORS.muted, fontSize: 10, lineHeight: 1.5})}>校時ラベルをクリックすると、日時入りの予定作成画面を開きます。</div>
      </div>
      <div style={css({display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10})}>
        <div style={css({color: COLORS.ink, fontSize: 13, fontWeight: 800})}>一時的に隠す</div>
        <div style={css({padding: '4px 8px', borderRadius: 999, color: COLORS.blue, backgroundColor: '#eaf1f7', fontSize: 9, fontWeight: 800, opacity: chipProgress})}>設定済み</div>
      </div>
      <div style={css({display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8})}>
        {[['◷', '今日だけ', '当日の校時を隠す'], ['▦', '今週だけ', '表示中の週を隠す']].map(([icon, title, sub]) => (
          <div key={title} style={css({display: 'flex', alignItems: 'center', gap: 9, minHeight: 62, padding: '11px 10px', border: `1px solid ${COLORS.line}`, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.72)'})}>
            <span style={css({display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 8, color: COLORS.blue, backgroundColor: '#eaf1f7', fontSize: 16})}>{icon}</span>
            <span><strong style={css({display: 'block', color: COLORS.ink, fontSize: 10})}>{title}</strong><small style={css({display: 'block', marginTop: 3, color: COLORS.muted, fontSize: 8})}>{sub}</small></span>
          </div>
        ))}
      </div>
      <div style={css({margin: '15px 0 12px', color: COLORS.muted, fontSize: 9})}>校時レイヤーは有効です。</div>
      <div style={css({display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${COLORS.line}`})}>
        <span style={css({color: COLORS.blue, fontSize: 10, fontWeight: 800})}>⚙ 設定を開く</span>
        <span style={css({color: '#8d98a2', fontSize: 8})}>予定の内容は読み取りません</span>
      </div>
    </div>
  );
};

const SettingsPanel = ({frame}: {frame: number}) => {
  const inProgress = clampProgress(frame, 0, 38, easeInOut);
  const weekdaysIn = fadeIn(frame, 35, 63);
  const timetableIn = fadeIn(frame, 55, 86);
  const densityIn = fadeIn(frame, 78, 108);
  const uiLine = '#dfe6eb';
  const uiMuted = '#73808c';
  const uiAccent = '#426a91';
  const uiAccentWash = '#eaf2f8';
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div
      style={css({
        position: 'relative',
        width: 850,
        height: 720,
        overflow: 'hidden',
        border: `1px solid ${uiLine}`,
        borderRadius: 18,
        color: '#1f2b37',
        backgroundColor: '#fbfcfd',
        boxShadow: '0 30px 80px rgba(20, 39, 51, 0.28)',
        fontFamily: UI_FONT,
        opacity: inProgress,
        transform: `translateY(${(1 - inProgress) * 34}px)`,
      })}
    >
      <div style={css({display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 65, padding: '0 27px', borderBottom: `1px solid ${uiLine}`, backgroundColor: 'rgba(255,255,255,.9)'})}>
        <Wordmark />
        <span style={css({maxWidth: 320, color: uiMuted, fontSize: 10, lineHeight: 1.4, textAlign: 'right'})}>Googleカレンダーに予定を作らず、画面上にだけ校時を重ねます。</span>
      </div>

      <div style={css({padding: '28px 31px 32px'})}>
        <div style={css({display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginBottom: 22})}>
          <div>
            <div style={css({color: uiAccent, fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em'})}>LOCAL SETTINGS</div>
            <div style={css({marginTop: 6, fontSize: 29, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 1.2})}>表示を整える</div>
          </div>
          <div style={css({display: 'flex', alignItems: 'center', gap: 8, color: uiMuted, fontSize: 10})}>
            <span style={css({width: 7, height: 7, borderRadius: '50%', backgroundColor: '#82a9c5', boxShadow: '0 0 0 4px #edf5fa'})} />
            保存しました。
          </div>
        </div>

        <section style={css({paddingTop: 16, borderTop: `1px solid ${uiLine}`, opacity: weekdaysIn, transform: `translateY(${(1 - weekdaysIn) * 10}px)`})}>
          <div style={css({display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12})}>
            <div><div style={css({color: '#91a4b4', fontFamily: MONO, fontSize: 8, letterSpacing: '0.13em'})}>01 / BASICS</div><div style={css({marginTop: 4, fontSize: 15, fontWeight: 800})}>基本設定</div></div>
            <div style={css({display: 'flex', alignItems: 'center', gap: 10, color: uiMuted, fontSize: 10})}>
              校時レイヤーを表示する
              <span style={css({position: 'relative', width: 42, height: 24, borderRadius: 99, backgroundColor: uiAccent})}><i style={css({position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(40,52,63,.2)'})} /></span>
            </div>
          </div>
          <div style={css({display: 'grid', gridTemplateColumns: '1.22fr .78fr', gap: 12})}>
            <div style={css({padding: 14, border: `1px solid ${uiLine}`, borderRadius: 12, backgroundColor: '#fff', boxShadow: '0 10px 28px rgba(35,55,72,.06)'})}>
              <div style={css({fontSize: 11, fontWeight: 800})}>表示する曜日</div>
              <div style={css({display: 'flex', gap: 7, marginTop: 10})}>
                {weekdays.map((day, index) => {
                  const active = index >= 1 && index <= 5;
                  return <span key={day} style={css({display: 'grid', placeItems: 'center', width: 36, height: 32, border: `1px solid ${active ? '#a9c5dc' : uiLine}`, borderRadius: 8, color: active ? '#2d506f' : uiMuted, backgroundColor: active ? uiAccentWash : '#f4f7f9', fontSize: 11, fontWeight: 700})}>{day}</span>;
                })}
              </div>
            </div>
            <div style={css({padding: 14, border: `1px solid ${uiLine}`, borderRadius: 12, backgroundColor: '#fff', boxShadow: '0 10px 28px rgba(35,55,72,.06)'})}>
              <div style={css({fontSize: 11, fontWeight: 800})}>タイムゾーン</div>
              <div style={css({marginTop: 10, padding: '9px 10px', border: `1px solid ${uiLine}`, borderRadius: 8, color: '#1f2b37', fontSize: 10})}>Asia/Tokyo（日本標準時）⌄</div>
            </div>
          </div>
        </section>

        <section style={css({marginTop: 18, paddingTop: 16, borderTop: `1px solid ${uiLine}`, opacity: timetableIn, transform: `translateY(${(1 - timetableIn) * 10}px)`})}>
          <div style={css({display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginBottom: 10})}>
            <div><div style={css({color: '#91a4b4', fontFamily: MONO, fontSize: 8, letterSpacing: '0.13em'})}>02 / TIMETABLE</div><div style={css({marginTop: 4, fontSize: 15, fontWeight: 800})}>通常校時</div></div>
            <span style={css({color: uiMuted, fontSize: 9})}>自動保存</span>
          </div>
          <div style={css({overflow: 'hidden', border: `1px solid ${uiLine}`, borderRadius: 12, backgroundColor: '#fff', boxShadow: '0 10px 28px rgba(35,55,72,.06)'})}>
            <div style={css({display: 'grid', gridTemplateColumns: '54px 72px 112px 112px 1fr', padding: '9px 12px', color: '#8c9aa6', backgroundColor: '#f8fafb', fontSize: 8, fontWeight: 800, letterSpacing: '0.05em'})}><span>使用</span><span>校時</span><span>開始</span><span>終了</span><span>時間</span></div>
            {PERIODS.slice(0, 3).map((period) => (
              <div key={period.label} style={css({display: 'grid', gridTemplateColumns: '54px 72px 112px 112px 1fr', alignItems: 'center', padding: '8px 12px', borderTop: `1px solid ${uiLine}`, fontSize: 10})}>
                <span style={css({width: 14, height: 14, borderRadius: 3, color: '#fff', backgroundColor: uiAccent, fontSize: 10, lineHeight: '14px', textAlign: 'center'})}>✓</span>
                <strong>{period.label}</strong>
                <span style={css({width: 90, padding: '6px 8px', border: `1px solid ${uiLine}`, borderRadius: 7, fontVariantNumeric: 'tabular-nums'})}>{period.start}</span>
                <span style={css({width: 90, padding: '6px 8px', border: `1px solid ${uiLine}`, borderRadius: 7, fontVariantNumeric: 'tabular-nums'})}>{period.end}</span>
                <span style={css({color: uiMuted, fontVariantNumeric: 'tabular-nums'})}>50分</span>
              </div>
            ))}
          </div>
        </section>

        <section style={css({marginTop: 18, paddingTop: 16, borderTop: `1px solid ${uiLine}`, opacity: densityIn, transform: `translateY(${(1 - densityIn) * 10}px)`})}>
          <div style={css({color: '#91a4b4', fontFamily: MONO, fontSize: 8, letterSpacing: '0.13em'})}>04 / APPEARANCE</div>
          <div style={css({display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4})}>
            <div style={css({fontSize: 15, fontWeight: 800})}>表示設定</div>
            <div style={css({display: 'grid', gridTemplateColumns: 'repeat(3, 152px)', gap: 8})}>
              {[
                ['控えめ', '数字と薄い境界だけ'],
                ['標準', '薄い背景＋数字'],
                ['はっきり', '少し濃い背景＋1限表記'],
              ].map(([title, description], index) => (
                <div key={title} style={css({minHeight: 58, padding: '10px 11px', border: `1px solid ${index === 1 ? '#a9c5dc' : uiLine}`, borderRadius: 10, backgroundColor: index === 1 ? uiAccentWash : '#fff'})}>
                  <strong style={css({display: 'block', fontSize: 10})}>{title}</strong>
                  <small style={css({display: 'block', marginTop: 5, color: uiMuted, fontSize: 8, lineHeight: 1.4})}>{description}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const SceneTitle = ({
  eyebrow,
  title,
  copy,
  light = false,
  frame,
  start = 0,
  fontSize = 54,
  copyFontSize = 26,
  copyWidth = 470,
}: {
  eyebrow: string;
  title: React.ReactNode;
  copy: readonly string[];
  light?: boolean;
  frame: number;
  start?: number;
  fontSize?: number;
  copyFontSize?: number;
  copyWidth?: number;
}) => {
  const visible = fadeIn(frame, start, start + 34);
  const foreground = light ? COLORS.white : COLORS.ink;
  const muted = light ? '#b6ced6' : COLORS.muted;
  return (
    <div style={css({opacity: visible, transform: `translateY(${(1 - visible) * 24}px)`})}>
      <div style={css({color: light ? COLORS.sky : COLORS.blue, fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: '0.18em'})}>{eyebrow}</div>
      <div lang="ja" style={css({marginTop: 17, color: foreground, fontFamily: DISPLAY_FONT, fontSize, fontWeight: 700, fontKerning: 'normal', letterSpacing: '-0.035em', lineBreak: 'strict', lineHeight: 1.4, whiteSpace: 'nowrap', wordBreak: 'keep-all'})}>{title}</div>
      <div lang="ja" style={css({maxWidth: copyWidth, marginTop: 20, color: muted, fontFamily: DISPLAY_FONT, fontSize: copyFontSize, fontWeight: 500, letterSpacing: '0', lineBreak: 'strict', lineHeight: 1.4, wordBreak: 'keep-all'})}>
        {copy.map((line) => (
          <span key={line} style={css({display: 'block', whiteSpace: 'nowrap'})}>{line}</span>
        ))}
      </div>
    </div>
  );
};

const HookScene = () => {
  const frame = useCurrentFrame();
  const surfaceIn = clampProgress(frame, 27, 78, easeInOut);
  const surfaceX = interpolate(surfaceIn, [0, 1], [580, 0]);
  const float = Math.sin(frame / 30) * 7;
  const exit = clampProgress(frame, 150, 180, easeInOut);
  return (
    <AbsoluteFill style={css({overflow: 'hidden', backgroundColor: COLORS.navy})}>
      <RailLines />
      <Grain />
      <div style={css({position: 'absolute', top: 62, left: 84, opacity: fadeIn(frame, 0, 27)})}><Wordmark light /></div>
      <div style={css({position: 'absolute', top: 176, left: 128, width: 760, opacity: 1 - exit, transform: `translateX(${exit * -65}px)`})}>
        <SceneTitle
          eyebrow="GOOGLE CALENDAR / CHROME EXTENSION"
          title={<>Googleカレンダーに<br /><span style={css({color: COLORS.sky})}>校時表を表示する</span></>}
          copy={[
            'Googleカレンダーの週表示に、',
            '1〜7限の時間帯を半透明のガイドとして重ねます。',
          ]}
          light
          frame={frame}
          fontSize={68}
          copyWidth={650}
        />
      </div>
      <div style={css({position: 'absolute', top: 220, right: -78, transform: `translateX(${surfaceX}px) translateY(${float}px) rotate(-2deg)`, opacity: 1 - exit * 0.7})}>
        <CalendarSurface frame={frame} revealStart={62} compact />
      </div>
      <div style={css({position: 'absolute', left: 130, bottom: 76, display: 'flex', alignItems: 'center', gap: 13, color: '#9abac5', fontFamily: MONO, fontSize: 10, letterSpacing: '0.11em', opacity: fadeIn(frame, 96, 126)})}>
        <span style={css({display: 'inline-block', width: 28, height: 1, backgroundColor: COLORS.coral})} />
        WEEK VIEW / 01
      </div>
    </AbsoluteFill>
  );
};

const RhythmScene = () => {
  const frame = useCurrentFrame();
  const exit = clampProgress(frame, 156, 180, easeInOut);
  const badgeProgress = fadeIn(frame, 105, 135);
  return (
    <AbsoluteFill style={css({overflow: 'hidden', backgroundColor: COLORS.paper})}>
      <RailLines light />
      <Grain light />
      <div style={css({position: 'absolute', top: 56, left: 88, opacity: 1 - exit})}><Wordmark /></div>
      <div style={css({position: 'absolute', top: 163, left: 108, width: 550, opacity: 1 - exit, transform: `translateX(${exit * -40}px)`})}>
        <SceneTitle
          eyebrow="A QUIET OVERLAY"
          title={<>校時表は<br /><span style={css({color: COLORS.blue})}>シンプルに表示</span></>}
          copy={[
            '予定を邪魔せず、必要な時間帯だけを',
            '薄い破線と小さな番号で表示します。',
          ]}
          frame={frame}
          start={5}
          fontSize={68}
          copyWidth={520}
        />
      </div>
      <div style={css({position: 'absolute', top: 196, left: 660, transform: `translateX(${exit * 70}px) rotate(${exit * 1.6}deg)`, opacity: 1 - exit * 0.85})}>
        <CalendarSurface frame={frame} revealStart={25} />
      </div>
      <div style={css({position: 'absolute', left: 108, bottom: 83, display: 'flex', gap: 8, opacity: badgeProgress, transform: `translateY(${(1 - badgeProgress) * 14}px)`})}>
        {['月 — 金', '1 — 7限', '予定は読み取りません'].map((label, index) => (
          <span key={label} style={css({padding: '9px 12px', border: `1px solid ${index === 2 ? '#e5c5bd' : '#c9dce2'}`, borderRadius: 999, color: index === 2 ? '#a46558' : COLORS.blue, backgroundColor: index === 2 ? '#fff7f4' : '#f1f7f8', fontSize: 10, fontWeight: 800})}>{label}</span>
        ))}
      </div>
      <div style={css({position: 'absolute', top: 74, right: 114, color: '#9aabb0', fontFamily: MONO, fontSize: 10, letterSpacing: '0.17em', opacity: fadeIn(frame, 15, 43)})}>02 / RHYTHM</div>
    </AbsoluteFill>
  );
};

const ClickScene = () => {
  const frame = useCurrentFrame();
  const exit = clampProgress(frame, 183, 210, easeInOut);
  return (
    <AbsoluteFill style={css({overflow: 'hidden', backgroundColor: '#e9f0f1'})}>
      <RailLines light />
      <Grain light />
      <div style={css({position: 'absolute', top: 60, left: 88, opacity: 1 - exit})}><Wordmark /></div>
      <div style={css({position: 'absolute', top: 163, left: 107, width: 620, opacity: 1 - exit, transform: `translateX(${exit * -55}px)`})}>
        <SceneTitle
          eyebrow="FROM OVERLAY TO ACTION"
          title={<>校時表の枠から<br /><span style={css({color: '#c86f60'})}>そのまま予定を追加</span></>}
          copy={[
            '校時番号、またはホバー時の「＋」から、',
            '日時入りの予定作成画面を',
            'Googleカレンダーで開きます。',
          ]}
          frame={frame}
          start={4}
          fontSize={64}
          copyWidth={600}
        />
      </div>
      <div style={css({position: 'absolute', top: 219, left: 730, transform: `translateX(${exit * 94}px) rotate(${exit * 1.7}deg)`, opacity: 1 - exit * 0.85})}>
        <CalendarSurface frame={frame} revealStart={4} selected={{day: 2, period: 2}} />
        <Cursor frame={frame} sceneStart={0} />
      </div>
      <div style={css({position: 'absolute', right: 113, bottom: 87, color: '#9b7b73', fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', opacity: fadeIn(frame, 111, 140)})}>NO AUTO-SAVE / YOUR CALL</div>
    </AbsoluteFill>
  );
};

const SettingsScene = () => {
  const frame = useCurrentFrame();
  const exit = clampProgress(frame, 180, 210, easeInOut);
  const ctaProgress = fadeIn(frame, 97, 130);
  const checkProgress = fadeIn(frame, 51, 75);
  return (
    <AbsoluteFill style={css({overflow: 'hidden', backgroundColor: COLORS.navy})}>
      <RailLines />
      <Grain />
      <div style={css({position: 'absolute', top: 60, left: 88, opacity: 1 - exit})}><Wordmark light /></div>
      <div style={css({position: 'absolute', top: 158, left: 128, width: 820, opacity: 1 - exit, transform: `translateX(${exit * -60}px)`})}>
        <SceneTitle
          eyebrow="MAKE IT YOURS"
          title={<>校時・曜日・罫線の濃さを<br /><span style={css({color: COLORS.sky})}>設定できる</span></>}
          copy={[
            '校時の開始・終了時刻、',
            '表示する曜日、罫線の濃さを',
            '設定画面から調整できます。',
          ]}
          light
          frame={frame}
          start={5}
          fontSize={62}
          copyWidth={650}
        />
        <div style={css({display: 'flex', alignItems: 'center', gap: 9, marginTop: 34, color: '#b4d1d9', fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', opacity: checkProgress})}>
          <span style={css({display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', color: COLORS.navy, backgroundColor: COLORS.sky, fontSize: 12, fontWeight: 900})}>✓</span>
          LOCAL SETTINGS / MANIFEST V3
        </div>
      </div>
      <div style={css({position: 'absolute', top: 145, right: 68, transform: `translateX(${exit * 95}px) translateY(${Math.sin(frame / 30) * 5}px) rotate(0.7deg)`, opacity: 1 - exit * 0.85})}>
        <SettingsPanel frame={frame} />
      </div>
      <div style={css({position: 'absolute', left: 128, bottom: 78, opacity: ctaProgress, transform: `translateY(${(1 - ctaProgress) * 24}px)`})}>
        <div style={css({color: COLORS.sky, fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: '0.18em'})}>SCHOOL PERIOD LAYER / 2026</div>
        <div style={css({marginTop: 10, color: COLORS.white, fontFamily: DISPLAY_FONT, fontSize: 25, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.4})}>Googleカレンダーで、授業の時間を見失わない。</div>
      </div>
    </AbsoluteFill>
  );
};

const SceneWipe = () => {
  const frame = useCurrentFrame();
  const boundaries = [174, 354, 534];
  return (
    <>
      {boundaries.map((boundary) => {
        const progress = clampProgress(frame, boundary - 13, boundary + 21, easeInOut);
        return (
          <div
            key={boundary}
            style={css({
              position: 'absolute',
              zIndex: 50,
              inset: -160,
              backgroundColor: COLORS.coral,
              opacity: progress > 0 && progress < 1 ? 0.99 : 0,
              transform: `translateX(${interpolate(progress, [0, 1], [-2450, 2450])}px) rotate(-10deg)`,
              transformOrigin: 'center',
              pointerEvents: 'none',
            })}
          />
        );
      })}
    </>
  );
};

export const SchoolPeriodPromo = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={css({fontFamily: DISPLAY_FONT, backgroundColor: COLORS.paper, WebkitFontSmoothing: 'antialiased', textRendering: 'geometricPrecision'})}>
      <Sequence from={0} durationInFrames={180}><HookScene /></Sequence>
      <Sequence from={180} durationInFrames={180}><RhythmScene /></Sequence>
      <Sequence from={360} durationInFrames={180}><ClickScene /></Sequence>
      <Sequence from={540} durationInFrames={180}><SettingsScene /></Sequence>
      <SceneWipe />
      <div style={css({position: 'absolute', right: 72, bottom: 43, zIndex: 60, color: 'rgba(223,243,245,.55)', fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em'})}>
        SILENT MOTION STUDY / {String(Math.floor(frame / VIDEO_FPS) + 1).padStart(2, '0')} — 24
      </div>
    </AbsoluteFill>
  );
};
