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
  IconMoon,
  IconMore,
  IconSun,
  IconTrash,
} from "./components/Icons";


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

  // Тема: "dark" (по умолчанию) или "light". Храним в localStorage, чтобы пережила перезагрузку.
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("adhd-theme") === "light" ? "light" : "dark"),
  );

  // При смене темы: класс .light на <html>, сохранение выбора
  // И ГЛАВНОЕ — перекрашиваем theme-color, чтобы системная панель Android
  // (нижние кнопки) совпадала с фоном приложения, а не торчала серым «бельмом».
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("adhd-theme", theme);

    // Цвета должны совпадать с --bg каждой темы из index.css:
    //   dark:  222 20% 8%   → #0c0f14
    //   light: 214 32% 93%  → #e3e8f0
    const barColor = theme === "light" ? "#e3e8f0" : "#0c0f14";
    const meta = document.getElementById("theme-color-meta");
    if (meta) meta.setAttribute("content", barColor);
  }, [theme]);

  function toggleTheme() {
    setTheme((cur) => (cur === "light" ? "dark" : "light"));
  }

  async function refresh() {
    const list = await getAllTasks();
    setTasks(list);
    const meta = await getMeta();
    setStreak(meta.streakCount);
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
    // Узнаём состояние ДО переключения: засчитываем серию только при отметке "выполнено".
    const before = tasks.find((t) => t.id === id);
    const becomingDone = before ? !before.done : false;

    await toggleDone(id);

    if (becomingDone) {
      // Задачу отметили выполненной → засчитываем в серию и играем награду.
      const result = await registerDone();
      setReward(result);
      // Награда живёт ~1.8 сек (под длину анимации плашки), потом убираем.
      window.setTimeout(() => setReward(null), 1800);
    }

    await refresh();
  }

  // Сдвинуть АКТУАЛЬНУЮ задачу на одну позицию вверх (-1) или вниз (+1).
  // index — позиция в activeTasks (выполненные не двигаем — у них своя сортировка по времени).
  async function handleMove(index: number, delta: number) {
    const neighbor = index + delta;
    if (neighbor < 0 || neighbor >= activeTasks.length) return; // края списка
    const a = activeTasks[index];
    const b = activeTasks[neighbor];
    await swapOrder(a.id!, b.id!);
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
    await deleteDoneTasks();
    await refresh();
  }

  // ЭКСПОРТ: собрать все данные и скачать одним .json-файлом.
  async function handleExport() {
    const data = await exportAll();
    // Превращаем объект в текст JSON (с отступами — файл читаемый глазами).
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Имя файла с датой: adhd-backup-2026-06-13.json
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // Создаём временную ссылку и "кликаем" по ней — браузер скачивает файл.
    const a = document.createElement("a");
    a.href = url;
    a.download = `adhd-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url); // освобождаем память

    setIoMsg("Файл сохранён ✓");
    window.setTimeout(() => setIoMsg(null), 3000);
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
    await renameTask(editId, editText);
    setEditId(null);
    setEditText("");
    await refresh();
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
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
        {mode === "now" ? (
          /* ============ РЕЖИМ «СЕЙЧАС»: одна задача крупно ============ */
          <NowScreen
            currentTask={currentTask}
            remaining={remaining}
            hasTasks={tasks.length > 0}
            streak={streak}
            theme={theme}
            onToggleTheme={toggleTheme}
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
                  onClick={toggleTheme}
                  aria-label="Сменить тему"
                  className="flex items-center justify-center rounded-btn border border-border bg-surface-2 px-3 py-2 text-text transition-colors active:bg-border"
                >
                  {theme === "light"
                    ? <IconMoon className="h-5 w-5" />
                    : <IconSun className="h-5 w-5" />}
                </button>
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

                    {/* Панель снизу: только действия (длительность убрана). */}
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

/* ============================================================
   ЭКРАН «СЕЙЧАС» — крупно ОДНА текущая задача.
   ============================================================ */
function NowScreen({
  currentTask,
  remaining,
  hasTasks,
  streak,
  title,
  setTitle,
  onAdd,
  onToggle,
  onOpenList,
  theme,
  onToggleTheme,
}: {
  currentTask: Task | null;
  remaining: number;
  hasTasks: boolean;
  streak: number;
  title: string;
  setTitle: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: number) => void;
  onOpenList: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  // Короткий лайм-пульс кнопки "Готово" в момент выполнения (дофаминовый акцент).
  const [popNow, setPopNow] = useState(false);

  // Нажали "Готово": включаем пульс и сразу зовём onToggle.
  // Класс снимется сам по событию onAnimationEnd.
  function handleDonePress(id: number) {
    setPopNow(true);
    onToggle(id);
  }

  return (
    <>

      {/* Шапка: дата-слово + кнопка перехода к списку */}
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Сейчас</h1>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="flex items-center gap-1 rounded-btn border border-border bg-surface-2 px-3 py-2 text-sm font-bold text-reward">
              <IconFire className="h-4 w-4" /> {streak}
            </span>
          )}
          <button
            onClick={onToggleTheme}
            aria-label="Сменить тему"
            className="flex items-center justify-center rounded-btn border border-border bg-surface-2 px-3 py-2 text-text transition-colors active:bg-border"
          >
            {theme === "light"
              ? <IconMoon className="h-5 w-5" />
              : <IconSun className="h-5 w-5" />}
          </button>
          <button
            onClick={onOpenList}
            className="rounded-btn border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text transition-colors active:bg-border"
          >
            Все задачи
          </button>
        </div>
      </div>

      {/* Центральная зона: либо текущая задача, либо "всё сделано" */}
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        {currentTask ? (
          <div className="flex w-full flex-col items-center text-center">
            <p className="text-sm font-medium text-text-muted">Сейчас делаем</p>

            <h2 className="mt-4 text-[34px] font-bold leading-tight tracking-[-0.02em] text-text">
              {currentTask.title}
            </h2>

            {/* Большая кнопка под палец: отметить выполненной */}
            <button
              onClick={() => handleDonePress(currentTask.id!)}
              onAnimationEnd={() => setPopNow(false)}
              className={
                "mt-10 flex h-16 w-full items-center justify-center rounded-btn bg-surface-2 border border-border text-[19px] font-semibold text-text transition-colors active:bg-border " +
                (popNow ? "animate-reward-pop" : "")
              }
            >
              Готово <IconCheck className="ml-2 h-5 w-5" />
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
            <IconCheck className="h-14 w-14 text-reward" />
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
      <div className="sticky bottom-0 flex gap-3 bg-bg pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="relative min-w-0 flex-1">
          <input
            id="new-task-now"
            type="text"
            name="new-task-now"
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd();
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
          onClick={onAdd}
          className="h-14 shrink-0 rounded-btn bg-surface-2 border border-border px-5 text-[17px] font-semibold text-text transition-colors active:bg-border"
        >
          Добавить
        </button>
      </div>
    </>
  );
}

/* ============================================================
   НАГРАДА — оверлей с искрами + плашка "Серия N".
   Лайм-акцент (--reward) — ТОЛЬКО здесь, на успехе.
   ============================================================ */
function RewardBurst({ streak, firstToday }: { streak: number; firstToday: boolean }) {
  // flew=false → искры в центре; через мгновение flew=true → разлетаются (CSS transition).
  const [flew, setFlew] = useState(false);
  // gone=true → искры отыграли и убираются из DOM (чтобы не "замирали" точками).
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Двойной requestAnimationFrame — гарантируем, что старт (центр) отрисовался,
    // и только потом меняем transform, чтобы transition реально проиграл.
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setFlew(true)),
    );
    // Полёт искр длится 0.7 сек — сразу после убираем их из DOM.
    const t = window.setTimeout(() => setGone(true), 750);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, []);

  // 6 искорок, разлетающихся в разные стороны (углы по кругу).
  const sparks = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 6;
    const dist = 70; // на сколько px улетает искра
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
    };
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {/* Искры (убираются из DOM после полёта, чтобы не замирали точками) */}
      <div className="relative">
        {!gone && sparks.map((s, i) => (
          <span
            key={i}
            className="animate-spark absolute h-2.5 w-2.5 rounded-full bg-reward"
            style={{
              left: "-5px",
              top: "-5px",
              transform: flew
                ? `translate(${s.tx}px, ${s.ty}px) scale(0.4)`
                : "translate(0px, 0px) scale(1)",
            }}
          />
        ))}
      </div>

      {/* Плашка "Серия N" — только при первом выполнении за день */}
      {firstToday && (
        <div className="animate-streak-rise absolute bottom-28 flex items-center gap-1.5 rounded-btn bg-reward px-5 py-3 text-[17px] font-bold text-bg shadow-lg">
          Серия: {streak} <IconFire className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}


export default App;
