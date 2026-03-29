'use client';

export interface BlindLevel {
  small_blind: number | '';
  big_blind: number | '';
  ante: number | '';
  duration_minutes: number | '';
  is_break: boolean;
}

interface Props {
  levels: BlindLevel[];
  onChange: (levels: BlindLevel[]) => void;
}

export default function BlindStructureBuilder({ levels, onChange }: Props) {
  function update<K extends keyof BlindLevel>(idx: number, key: K, value: BlindLevel[K]) {
    onChange(levels.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  }

  function addLevel() {
    onChange([...levels, { small_blind: '', big_blind: '', ante: 0, duration_minutes: 20, is_break: false }]);
  }

  function addBreak() {
    onChange([...levels, { small_blind: 0, big_blind: 0, ante: 0, duration_minutes: 15, is_break: true }]);
  }

  function remove(idx: number) {
    onChange(levels.filter((_, i) => i !== idx));
  }

  const cell =
    'w-20 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500';

  let blindLevelCounter = 0;

  const totalMinutes = levels.reduce(
    (s, l) => s + (typeof l.duration_minutes === 'number' ? l.duration_minutes : 0),
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">
          {levels.filter((l) => !l.is_break).length} levels ·{' '}
          {levels.filter((l) => l.is_break).length} breaks · {totalMinutes} min total
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addBreak}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition"
          >
            + Break
          </button>
          <button
            type="button"
            onClick={addLevel}
            className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition"
          >
            + Level
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
              <th className="text-left pb-2 pr-3 w-8">#</th>
              <th className="text-left pb-2 pr-3">Small</th>
              <th className="text-left pb-2 pr-3">Big</th>
              <th className="text-left pb-2 pr-3">Ante</th>
              <th className="text-left pb-2 pr-3">Min</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {levels.map((level, idx) => {
              if (!level.is_break) blindLevelCounter++;
              const levelNum = blindLevelCounter;
              return (
                <tr
                  key={idx}
                  className={`border-b border-gray-800/50 last:border-0 ${level.is_break ? 'bg-blue-900/10' : ''}`}
                >
                  <td className="py-1.5 pr-3 text-gray-500 text-xs">
                    {level.is_break ? '—' : levelNum}
                  </td>
                  {level.is_break ? (
                    <td colSpan={3} className="py-1.5 pr-3 text-blue-400 text-xs italic">
                      Break
                    </td>
                  ) : (
                    <>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number" min="0"
                          value={level.small_blind}
                          onChange={(e) =>
                            update(idx, 'small_blind', e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className={cell}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number" min="0"
                          value={level.big_blind}
                          onChange={(e) =>
                            update(idx, 'big_blind', e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className={cell}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number" min="0"
                          value={level.ante}
                          onChange={(e) =>
                            update(idx, 'ante', e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className="w-16 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                    </>
                  )}
                  <td className="py-1.5 pr-3">
                    <input
                      type="number" min="1"
                      value={level.duration_minutes}
                      onChange={(e) =>
                        update(idx, 'duration_minutes', e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-14 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-gray-600 hover:text-red-400 text-xs transition px-1"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
