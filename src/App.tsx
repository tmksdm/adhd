import { useEffect, useState } from "react";
import type { Task } from "./db/database";
import { addTask, getTasksByDate, toggleDone, todayStr } from "./db/tasks";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  // Загружаем задачи на сегодня из IndexedDB.
  async function refresh() {
    const list = await getTasksByDate(todayStr());
    setTasks(list);
  }

  // Один раз при открытии экрана — подтягиваем сохранённые задачи.
  useEffect(() => {
    refresh();
  }, []);

  // Добавление задачи. Обязателен только title.
  async function handleAdd() {
    const t = title.trim();
    if (!t) return; // пустое не добавляем
    await addTask(t); // длительность по умолчанию 30 мин
    setTitle(""); // очищаем поле
    await refresh(); // перечитываем список
  }

  // Переключить "выполнено" по тапу.
  async function handleToggle(id: number) {
    await toggleDone(id);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <main className="mx-auto w-full max-w-md px-5 py-6">
        {/* Заголовок экрана: 28px / 700 / плотный трекинг — по DESIGN.md */}
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Сегодня</h1>
        <p className="mt-1 text-sm font-medium text-text-muted">
          {tasks.length === 0
            ? "Пока пусто. Добавь первую задачу 👇"
            : `Задач на сегодня: ${tasks.length}`}
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

        {/* Список задач на сегодня (bento-плитки) */}
        <ul className="mt-6 flex flex-col gap-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                onClick={() => handleToggle(task.id!)}
                className="flex w-full items-center gap-4 rounded-tile border border-border bg-surface p-5 text-left transition-colors active:bg-surface-2"
              >
                {/* Кружок-чекбокс */}
                <span
                  className={
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors " +
                    (task.done
                      ? "border-reward bg-reward text-bg"
                      : "border-border")
                  }
                >
                  {task.done ? "✓" : ""}
                </span>

                {/* Текст задачи + длительность */}
                <span className="flex min-w-0 flex-col">
                  <span
                    className={
                      "truncate text-[17px] font-medium " +
                      (task.done ? "text-text-muted line-through" : "text-text")
                    }
                  >
                    {task.title}
                  </span>
                  <span className="text-sm font-medium text-text-muted">
                    {task.durationMin} мин
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default App;
