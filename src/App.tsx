import { useEffect, useState } from "react";
import type { Task } from "./db/database";
import {
  addTask,
  deleteTask,
  getTasksByDate,
  setDuration,
  toggleDone,
  todayStr,
} from "./db/tasks";

// Пресеты длительности (минуты).
const PRESETS = [15, 30, 60];

// Высота полосы времени: пикселей на минуту + минимум, чтоб 15 мин было читаемо.
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
  // id задачи с раскрытой панелью пресетов (в режиме списка).
  const [openId, setOpenId] = useState<number | null>(null);
  // Режим экрана: "now" — одна задача крупно (главный), "list" — весь список.
  const [mode, setMode] = useState<"now" | "list">("now");
  // id задачи, у которой крестик сейчас спрашивает подтверждение удаления.
  const [confirmId, setConfirmId] = useState<number | null>(null);

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

  function handleDelete(id: number) {
    // Первый тап — просим подтверждение и заводим авто-сброс через 2.5 сек.
    if (confirmId !== id) {
      setConfirmId(id);
      window.setTimeout(() => {
        setConfirmId((cur) => (cur === id ? null : cur));
      }, 2500);
      return;
    }
    // Второй тап по тому же крестику — реально удаляем.
    setConfirmId(null);
    if (openId === id) setOpenId(null);
    void deleteAndRefresh(id);
  }

  async function deleteAndRefresh(id: number) {
    await deleteTask(id);
    await refresh();
  }

  function handleExpand(id: number) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  // Итог дня: суммарная длительность всех задач.
  const totalMin = tasks.reduce((sum, t) => sum + t.durationMin, 0);

  // "Текущая" задача = первая невыполненная по порядку.
  const currentTask = tasks.find((t) => !t.done) ?? null;
  // Сколько ещё осталось невыполненных (для подсказки "ещё N").
  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="min-h-screen bg-bg text-text">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
        {mode === "now" ? (
          /* ============ РЕЖИМ «СЕЙЧАС»: одна задача крупно ============ */
          <NowScreen
            currentTask={currentTask}
            remaining={remaining}
            hasTasks={tasks.length > 0}
            title={title}
            setTitle={setTitle}
            onAdd={handleAdd}
            onToggle={handleToggle}
            onOpenList={() => setMode("list")}
          />
        ) : (
          /* ============ РЕЖИМ «СПИСОК»: таймлайн дня ============ */
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-bold tracking-[-0.02em]">
                Сегодня
              </h1>
              <button
                onClick={() => setMode("now")}
                className="rounded-btn border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text transition-colors active:bg-border"
              >
                Сейчас
              </button>
            </div>
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
                const barHeight = Math.max(
                  MIN_TILE_PX,
                  Math.round(task.durationMin * PX_PER_MIN),
                );
                const isOpen = openId === task.id;

                return (
                  <li key={task.id}>
                    <div
                      style={{ height: `${barHeight}px` }}
                      className="flex w-full items-center gap-4 overflow-hidden rounded-tile border border-border bg-surface px-4"
                    >
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

                      {/* Крестик: первый тап — "Удалить?", второй — удаляет. */}
                      <button
                        onClick={() => handleDelete(task.id!)}
                        aria-label="Удалить задачу"
                        className={
                          "shrink-0 transition-colors " +
                          (confirmId === task.id
                            ? "rounded-btn border border-border px-3 py-1.5 text-sm font-semibold text-text active:bg-border"
                            : "flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-border active:text-text")
                        }
                      >
                        {confirmId === task.id ? "Удалить?" : "✕"}
                      </button>
                    </div>

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
          </>
        )}
      </main>
    </div>
  );
}

/* ============================================================
   ЭКРАН «СЕЙЧАС» — крупно ОДНА текущая задача.
   ============================================================ */
function NowScreen({
  currentTask,
  remaining,
  hasTasks,
  title,
  setTitle,
  onAdd,
  onToggle,
  onOpenList,
}: {
  currentTask: Task | null;
  remaining: number;
  hasTasks: boolean;
  title: string;
  setTitle: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: number) => void;
  onOpenList: () => void;
}) {
  return (
    <>
      {/* Шапка: дата-слово + кнопка перехода к списку */}
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Сейчас</h1>
        <button
          onClick={onOpenList}
          className="rounded-btn border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text transition-colors active:bg-border"
        >
          Все задачи
        </button>
      </div>

      {/* Центральная зона: либо текущая задача, либо "всё сделано" */}
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        {currentTask ? (
          <div className="flex w-full flex-col items-center text-center">
            <p className="text-sm font-medium text-text-muted">Сейчас делаем</p>

            <h2 className="mt-4 text-[34px] font-bold leading-tight tracking-[-0.02em] text-text">
              {currentTask.title}
            </h2>

            <p className="mt-3 text-lg font-medium text-text-muted">
              {formatDuration(currentTask.durationMin)}
            </p>

            {/* Большая кнопка под палец: отметить выполненной */}
            <button
              onClick={() => onToggle(currentTask.id!)}
              className="mt-10 flex h-16 w-full items-center justify-center rounded-btn bg-surface-2 border border-border text-[19px] font-semibold text-text transition-colors active:bg-border"
            >
              Готово ✓
            </button>

            {remaining > 1 && (
              <p className="mt-5 text-sm font-medium text-text-muted">
                Дальше ещё {remaining - 1}
              </p>
            )}
          </div>
        ) : (
          /* Всё выполнено ИЛИ задач вообще нет — спокойный экран */
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl">✓</div>
            <h2 className="mt-5 text-[28px] font-bold tracking-[-0.02em] text-text">
              На сегодня всё
            </h2>
            <p className="mt-2 text-base font-medium text-text-muted">
              {hasTasks ? "Можно выдохнуть." : "Тихо и спокойно."}
            </p>
          </div>
        )}
      </div>

      {/* Низ экрана: быстрое добавление задачи (минимум трения) */}
      <div className="flex gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
          }}
          placeholder="Что нужно сделать?"
          className="h-14 min-w-0 flex-1 rounded-field border border-border bg-surface-2 px-4 text-[17px] font-medium text-text placeholder:text-text-muted outline-none transition-colors focus:border-text-muted"
        />
        <button
          onClick={onAdd}
          className="h-14 shrink-0 rounded-btn bg-surface-2 border border-border px-5 text-[17px] font-semibold text-text transition-colors active:bg-border"
        >
          Добавить
        </button>
      </div>
    </>
  );
}

export default App;
