import { useEffect, useState } from "react";
import type { Task } from "./db/database";
import {
  addTask,
  getTasksByDate,
  setDuration,
  toggleDone,
  todayStr,
} from "./db/tasks";

// Пресеты длительности (минуты).
const PRESETS = [15, 30, 60];

// Высота полосы времени: пикселей на минуту + минимум, чтоб 15 мин было читаемо.
// 15 мин ≈ 56px, 30 мин ≈ 84px, 60 мин ≈ 168px — час честно вдвое выше получаса.
const PX_PER_MIN = 2.8;
const MIN_TILE_PX = 56;

// Минуты → красивая подпись: 45 мин / 1 ч / 1 ч 30 мин.
function formatDuration(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  // id задачи, у которой сейчас раскрыта панель пресетов (или null — все свёрнуты).
  const [openId, setOpenId] = useState<number | null>(null);

  async function refresh() {
    const list = await getTasksByDate(todayStr());
    setTasks(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    const t = title.trim();
    if (!t) return;
    await addTask(t);
    setTitle("");
    await refresh();
  }

  async function handleToggle(id: number) {
    await toggleDone(id);
    await refresh();
  }

  async function handleDuration(id: number, min: number) {
    await setDuration(id, min);
    await refresh();
  }

  // Тап по плитке: раскрыть/свернуть её панель длительности.
  function handleExpand(id: number) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  // Итог дня: суммарная длительность всех задач.
  const totalMin = tasks.reduce((sum, t) => sum + t.durationMin, 0);

  return (
    <div className="min-h-screen bg-bg text-text">
      <main className="mx-auto w-full max-w-md px-5 py-6">
        {/* Заголовок экрана */}
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Сегодня</h1>
        <p className="mt-1 text-sm font-medium text-text-muted">
          {tasks.length === 0
            ? "Пока пусто. Добавь первую задачу 👇"
            : `Запланировано: ${formatDuration(totalMin)} · задач ${tasks.length}`}
        </p>

        {/* Зона добавления задачи: поле + кнопка */}
        <div className="mt-6 flex gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Что нужно сделать?"
            className="h-14 min-w-0 flex-1 rounded-field border border-border bg-surface-2 px-4 text-[17px] font-medium text-text placeholder:text-text-muted outline-none transition-colors focus:border-text-muted"
          />
          <button
            onClick={handleAdd}
            className="h-14 shrink-0 rounded-btn bg-surface-2 border border-border px-5 text-[17px] font-semibold text-text transition-colors active:bg-border"
          >
            Добавить
          </button>
        </div>

        {/* ТАЙМЛАЙН ДНЯ */}
        <ul className="mt-6 flex flex-col gap-3">
          {tasks.map((task) => {
            // Высота полосы = чисто от минут (контент не распирает её).
            const barHeight = Math.max(
              MIN_TILE_PX,
              Math.round(task.durationMin * PX_PER_MIN),
            );
            const isOpen = openId === task.id;

            return (
              <li key={task.id}>
                {/* ПОЛОСА ВРЕМЕНИ: высота зависит только от длительности. */}
                <div
                  style={{ height: `${barHeight}px` }}
                  className="flex w-full items-center gap-4 overflow-hidden rounded-tile border border-border bg-surface px-4"
                >
                  {/* Кружок-чекбокс: отдельный тап = выполнено. */}
                  <button
                    onClick={() => handleToggle(task.id!)}
                    aria-label="Отметить выполненной"
                    className={
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-90 " +
                      (task.done
                        ? "border-reward bg-reward text-bg"
                        : "border-border")
                    }
                  >
                    {task.done ? "✓" : ""}
                  </button>

                  {/* Тело: тап = раскрыть панель длительности. */}
                  <button
                    onClick={() => handleExpand(task.id!)}
                    className="flex min-w-0 flex-1 flex-col text-left active:opacity-70"
                  >
                    <span
                      className={
                        "truncate text-[17px] font-medium leading-snug " +
                        (task.done
                          ? "text-text-muted line-through"
                          : "text-text")
                      }
                    >
                      {task.title}
                    </span>
                    <span className="mt-0.5 text-sm font-medium text-text-muted">
                      {formatDuration(task.durationMin)}
                    </span>
                  </button>
                </div>

                {/* ПАНЕЛЬ ПРЕСЕТОВ: выезжает под плиткой только когда раскрыта. */}
                {isOpen && (
                  <div className="mt-2 flex gap-2 px-1">
                    {PRESETS.map((min) => {
                      const active = task.durationMin === min;
                      return (
                        <button
                          key={min}
                          onClick={() => handleDuration(task.id!, min)}
                          className={
                            "rounded-btn px-4 py-2 text-sm font-semibold transition-colors " +
                            (active
                              ? "bg-surface-2 text-text border border-text-muted"
                              : "bg-transparent text-text-muted border border-border active:bg-surface-2")
                          }
                        >
                          {formatDuration(min)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

export default App;
