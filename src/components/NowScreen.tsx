import { useState } from "react";
import type { Task } from "../db/database";
import {
  IconCheck,
  IconClose,
  IconFire,  
} from "./Icons";

type NowScreenProps = {
  currentTask: Task | null;
  remaining: number;
  hasTasks: boolean;
  streak: number;
  title: string;
  setTitle: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: number) => void;
  onOpenList: () => void;
};

export function NowScreen({
  currentTask,
  remaining,
  hasTasks,
  streak,
  title,
  setTitle,
  onAdd,
  onToggle,
  onOpenList,
}: NowScreenProps) {
  // Короткий лайм-пульс кнопки "Готово" в момент выполнения (дофаминовый акцент).
  const [popNow, setPopNow] = useState(false);

  // Нажали "Готово": включаем пульс и сразу зовём onToggle.
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