import { useEffect, useRef, useState } from "react";
import type { Task } from "./db/database";
import {
  addTask,
  deleteDoneTasks,
  deleteTask,
  exportAll,
  getAllTasks,
  getMeta,
  importAll,
  registerDone,
  renameTask,
  swapOrder,
  toggleDone,
} from "./db/tasks";

import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconClose,
  IconEdit,
  IconFire,
  IconMore,
  IconTrash,
} from "./components/Icons";

import { NowScreen } from "./components/NowScreen";
import { RewardBurst } from "./components/RewardBurst";

function App() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  // id задачи с раскрытой панелью пресетов (в режиме списка).
  const [openId, setOpenId] = useState<number | null>(null);
  // id задачи, которую сейчас редактируем (название в режиме инлайн-ввода).
  const [editId, setEditId] = useState<number | null>(null);
  // Текущий текст в поле редактирования.
  const [editText, setEditText] = useState("");
  // Режим экрана: "now" — одна задача крупно (главный), "list" — весь список.
  const [mode, setMode] = useState<"now" | "list">("now");
  // id задачи, у которой крестик сейчас спрашивает подтверждение удаления.
  const [confirmId, setConfirmId] = useState<number | null>(null);
  // true → кнопка "Очистить выполненные" ждёт подтверждения (как у крестика).
  const [confirmClear, setConfirmClear] = useState(false);
  // true → кнопка "Импорт" ждёт подтверждения (импорт затирает всё локальное).
  const [confirmImport, setConfirmImport] = useState(false);
  // Короткое сообщение под кнопками (успех/ошибка экспорта-импорта).
  const [ioMsg, setIoMsg] = useState<string | null>(null);
  // Текущая длина серии (дней подряд) — показываем в шапке.
  const [streak, setStreak] = useState(0);
  // Когда != null — на экране играет награда (число = серия в плашке).
  // Если firstToday=false, плашку "Серия N" не показываем, только искры.
  const [reward, setReward] = useState<{ streak: number; firstToday: boolean } | null>(null);

async function refresh() {
  try {
    const list = await getAllTasks();
    setTasks(list);
    const meta = await getMeta();
    setStreak(meta.streakCount);
  } catch (err) {
    console.error("Ошибка при загрузке задач:", err);
    setIoMsg("Не удалось загрузить задачи. Попробуй перезагрузить страницу.");
    window.setTimeout(() => setIoMsg(null), 5000);
  }
}

  useEffect(() => {
    refresh();
  }, []);

async function handleAdd() {
  const t = title.trim();
  if (!t) return;
  try {
    await addTask(t);
    setTitle("");
    await refresh();
  } catch (err) {
    console.error(err);
    setIoMsg("Не удалось добавить задачу");
    window.setTimeout(() => setIoMsg(null), 3000);
  }
}

async function handleToggle(id: number) {
  const before = tasks.find((t) => t.id === id);
  const becomingDone = before ? !before.done : false;

  try {
    await toggleDone(id);

    if (becomingDone) {
      const result = await registerDone();
      setReward(result);
      window.setTimeout(() => setReward(null), 1800);
    }

    await refresh();
  } catch (err) {
    console.error(err);
    setIoMsg("Не удалось отметить задачу");
    window.setTimeout(() => setIoMsg(null), 3000);
  }
}

async function handleMove(index: number, delta: number) {
  const neighbor = index + delta;
  if (neighbor < 0 || neighbor >= activeTasks.length) return;

  const a = activeTasks[index];
  const b = activeTasks[neighbor];

  try {
    await swapOrder(a.id!, b.id!);
    await refresh();
  } catch (err) {
    console.error(err);
    setIoMsg("Не удалось поменять порядок задач");
    window.setTimeout(() => setIoMsg(null), 3000);
  }
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
    try {
      await deleteTask(id);
      await refresh();
    } catch (err) {
      console.error(err);
      setIoMsg("Не удалось удалить задачу");
      window.setTimeout(() => setIoMsg(null), 3000);
    }
  }

  function handleClearDone() {
    // Первый тап — просим подтверждение, авто-сброс через 2.5 сек.
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 2500);
      return;
    }
    // Второй тап — реально чистим.
    setConfirmClear(false);
    void clearAndRefresh();
  }

  async function clearAndRefresh() {
    try {
      await deleteDoneTasks();
      await refresh();
    } catch (err) {
      console.error(err);
      setIoMsg("Не удалось очистить выполненные задачи");
      window.setTimeout(() => setIoMsg(null), 3000);
    }
  }

async function handleExport() {
  try {
    const data = await exportAll();
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const a = document.createElement("a");
    a.href = url;
    a.download = `adhd-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setIoMsg("Файл сохранён ✓");
    window.setTimeout(() => setIoMsg(null), 3000);
  } catch (err) {
    console.error(err);
    setIoMsg("Не удалось сохранить файл");
    window.setTimeout(() => setIoMsg(null), 3000);
  }
}

  // ИМПОРТ, шаг 1 — первый тап по кнопке: просим подтверждение (затирание!).
  function handleImportClick() {
    if (!confirmImport) {
      setConfirmImport(true);
      window.setTimeout(() => setConfirmImport(false), 2500);
      return;
    }
    // Второй тап — подтверждено, открываем выбор файла.
    setConfirmImport(false);
    importInputRef.current?.click();
  }

  // ИМПОРТ, шаг 2 — пользователь выбрал файл в системном окне.
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // сбрасываем input, чтобы тот же файл можно было выбрать снова
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAll(data); // заменяет ВСЁ (с проверкой формата внутри)
      await refresh();
      setIoMsg("Данные загружены ✓");
    } catch (err) {
      setIoMsg(err instanceof Error ? err.message : "Не удалось прочитать файл.");
    }
    window.setTimeout(() => setIoMsg(null), 4000);
  }

  function handleExpand(id: number) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  // Начать редактирование названия задачи: запоминаем id и текущий текст.
  function startEdit(task: Task) {
    setOpenId(null); // закрываем панель длительности, чтоб не мешала
    setEditId(task.id!);
    setEditText(task.title);
  }

  // Сохранить отредактированное название и выйти из режима правки.
async function commitEdit() {
  if (editId == null) return;
  try {
    await renameTask(editId, editText);
    setEditId(null);
    setEditText("");
    await refresh();
  } catch (err) {
    console.error(err);
    setIoMsg("Не удалось сохранить название");
    window.setTimeout(() => setIoMsg(null), 3000);
  }
}

  // Отменить редактирование без сохранения.
  function cancelEdit() {
    setEditId(null);
    setEditText("");
  }


  // Актуальные задачи (невыполненные) — по порядку добавления.
  const activeTasks = [...tasks]
    .filter((t) => !t.done)
    .sort((a, b) => a.order - b.order);

  // Выполненные — отдельной группой, свежевыполненная сверху (по doneAt убыв.).
  const doneTasks = [...tasks]
    .filter((t) => t.done)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  // "Текущая" задача = первая невыполненная по порядку.
  const currentTask = tasks.find((t) => !t.done) ?? null;
  // Сколько ещё осталось невыполненных (для подсказки "ещё N").
  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="min-h-dvh select-none bg-bg text-text">
      {reward && <RewardBurst streak={reward.streak} firstToday={reward.firstToday} />}
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        {mode === "now" ? (
          /* ============ РЕЖИМ «СЕЙЧАС»: одна задача крупно ============ */
          <NowScreen
            currentTask={currentTask}
            remaining={remaining}
            hasTasks={tasks.length > 0}
            streak={streak}
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
              <div className="flex items-center gap-2">
                {streak > 0 && (
                  <span className="flex items-center gap-1 rounded-btn border border-border bg-surface-2 px-3 py-2 text-sm font-bold text-reward">
                    <IconFire className="h-4 w-4" /> {streak}
                  </span>
                )}
                <button
                  onClick={() => setMode("now")}
                  className="rounded-btn border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text transition-colors active:bg-border"
                >
                  Сейчас
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm font-medium text-text-muted">
              {tasks.length === 0
                ? "Пока пусто. Добавь первую задачу ниже"
                : activeTasks.length === 0
                  ? "Всё сделано"
                  : `Осталось: ${activeTasks.length}`}
            </p>

            {/* Зона добавления задачи: поле + кнопка */}
            <div className="mt-6 flex gap-3">
              <div className="relative min-w-0 flex-1">
                <input
                  id="new-task-list"
                  type="text"
                  name="new-task-list"
                  autoComplete="off"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  placeholder="Что нужно сделать?"
                  className="h-14 w-full rounded-field border border-border bg-surface-2 pl-4 pr-11 text-[17px] font-medium text-text placeholder:text-[15px] placeholder:text-text-muted outline-none transition-colors focus:border-text-muted"
                />
                {title && (
                  <button
                    type="button"
                    onClick={() => setTitle("")}
                    aria-label="Очистить поле"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-muted active:bg-border active:text-text"
                  >
                    <IconClose className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handleAdd}
                className="h-14 shrink-0 rounded-btn bg-surface-2 border border-border px-5 text-[17px] font-semibold text-text transition-colors active:bg-border"
              >
                Добавить
              </button>
            </div>

            {/* ===== АКТУАЛЬНЫЕ ЗАДАЧИ ===== */}
            <ul className="mt-6 flex flex-col gap-2.5">
              {activeTasks.map((task, index) => {
                const isOpen = openId === task.id;
                const canUp = index > 0;
                const canDown = index < activeTasks.length - 1;

                return (
                  <li key={task.id}>
                    <div className="flex w-full items-center gap-3 rounded-tile border border-border bg-surface px-4 py-3 shadow-tile">
                      <button
                        onClick={() => handleToggle(task.id!)}
                        aria-label="Отметить выполненной"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border transition-colors active:scale-90"
                      />

                      {editId === task.id ? (
                        /* Режим правки названия: поле + сохранить/отменить */
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <input
                            id={`edit-task-${task.id}`}
                            name={`edit-task-${task.id}`}
                            type="text"
                            autoComplete="off"
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="h-10 min-w-0 flex-1 rounded-field border border-text-muted bg-surface-2 px-3 text-[17px] font-medium text-text outline-none"
                          />
                          <button
                            onClick={commitEdit}
                            aria-label="Сохранить"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-reward text-reward active:bg-border"
                          >
                            <IconCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            aria-label="Отменить"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted active:bg-border active:text-text"
                          >
                            <IconClose className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleExpand(task.id!)}
                            className="min-w-0 flex-1 text-left active:opacity-70"
                          >
                            <span className="block text-[17px] font-medium leading-snug text-text wrap-anywhere">
                              {task.title}
                            </span>
                          </button>

                          {/* Одна кнопка ⋮ — открывает панель действий снизу. */}
                          <button
                            onClick={() => handleExpand(task.id!)}
                            aria-label="Действия"
                            className={
                              "flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full transition-colors " +
                              (isOpen
                                ? "bg-surface-2 text-text"
                                : "text-text-muted active:bg-border active:text-text")
                            }
                          >
                            <IconMore className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Панель действий */}
                    {isOpen && editId !== task.id && (
                      <div className="mt-2 flex gap-2 px-1">
                        <button
                          onClick={() => startEdit(task)}
                          className="flex items-center gap-1.5 rounded-btn border border-border px-3 py-2 text-sm font-semibold text-text-muted transition-colors active:bg-surface-2 active:text-text"
                        >
                          <IconEdit className="h-4 w-4" /> Изменить
                        </button>
                        <button
                          onClick={() => handleMove(index, -1)}
                          disabled={!canUp}
                          aria-label="Выше"
                          className={
                            "flex h-9 w-10 items-center justify-center rounded-btn border transition-colors " +
                            (canUp
                              ? "border-border text-text-muted active:bg-surface-2 active:text-text"
                              : "border-border text-border")
                          }
                        >
                          <IconArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMove(index, 1)}
                          disabled={!canDown}
                          aria-label="Ниже"
                          className={
                            "flex h-9 w-10 items-center justify-center rounded-btn border transition-colors " +
                            (canDown
                              ? "border-border text-text-muted active:bg-surface-2 active:text-text"
                              : "border-border text-border")
                          }
                        >
                          <IconArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id!)}
                          aria-label="Удалить задачу"
                          className={
                            "ml-auto flex items-center gap-1.5 rounded-btn border px-3 py-2 text-sm font-semibold transition-colors " +
                            (confirmId === task.id
                              ? "border-reward text-reward active:bg-border"
                              : "border-border text-text-muted active:bg-surface-2 active:text-text")
                          }
                        >
                          <IconTrash className="h-4 w-4" />
                          {confirmId === task.id ? "Точно?" : ""}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* ===== ВЫПОЛНЕННЫЕ — отдельная фоновая зона ===== */}
            {doneTasks.length > 0 && (
              <div className="mt-8 rounded-tile bg-surface-2 p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-text-muted">
                    <IconCheck className="h-4 w-4 text-reward" />
                    Выполнено · {doneTasks.length}
                  </span>
                  <button
                    onClick={handleClearDone}
                    className={
                      "rounded-btn px-3 py-1.5 text-xs font-semibold transition-colors " +
                      (confirmClear
                        ? "text-reward active:bg-border"
                        : "text-text-muted active:bg-surface active:text-text")
                    }
                  >
                    {confirmClear ? "Удалить всё?" : "Очистить"}
                  </button>
                </div>

                <ul className="flex flex-col gap-2">
                  {doneTasks.map((task) => (
                    <li key={task.id}>
                      <div className="flex w-full items-center gap-3 rounded-tile bg-surface/60 px-4 py-2.5">
                        <button
                          onClick={() => handleToggle(task.id!)}
                          aria-label="Вернуть в актуальные"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-reward bg-reward text-bg transition-colors active:scale-90"
                        >
                          <IconCheck className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-text-muted line-through wrap-anywhere">
                          {task.title}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* ===== ПЕРЕНОС ДАННЫХ: экспорт / импорт одним файлом ===== */}
            <div className="mt-10 border-t border-border pt-6">
              <p className="text-sm font-medium text-text-muted">
                Перенос на другое устройство
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={handleExport}
                  className="h-12 flex-1 rounded-btn border border-border bg-surface-2 text-sm font-semibold text-text transition-colors active:bg-border"
                >
                  Экспорт
                </button>
                <button
                  onClick={handleImportClick}
                  className={
                    "h-12 flex-1 rounded-btn border text-sm font-semibold transition-colors " +
                    (confirmImport
                      ? "border-border bg-surface-2 text-text active:bg-border"
                      : "border-border text-text-muted active:bg-surface-2")
                  }
                >
                  {confirmImport ? "Заменит всё. Точно?" : "Импорт"}
                </button>
              </div>
              {/* Скрытый input — открывается программно из handleImportClick */}
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
              {ioMsg && (
                <p className="mt-3 text-sm font-medium text-text-muted">{ioMsg}</p>
              )}
            </div>

          </>
        )}
      </main>
    </div>
  );
}

export default App;
