// Material-иконки как SVG-компоненты (офлайн, без внешних шрифтов).
// Контуры — Material Symbols (Google). Цвет наследуется от текста (currentColor).
// Размер задаётся через className (напр. "h-5 w-5") или пропом size.

type IconProps = {
  className?: string;
  size?: number;
};

// Базовая обёртка: единый viewBox и заливка текущим цветом.
function Svg({
  className,
  size,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

// Галочка (выполнено).
export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
    </Svg>
  );
}

// Крестик (закрыть / очистить поле).
export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
    </Svg>
  );
}

// Корзина (удалить задачу).
export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
    </Svg>
  );
}

// Карандаш (редактировать).
export function IconEdit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T846-647L319-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
    </Svg>
  );
}

// Стрелка вверх (сдвинуть выше).
export function IconArrowUp(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z" />
    </Svg>
  );
}

// Стрелка вниз (сдвинуть ниже).
export function IconArrowDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z" />
    </Svg>
  );
}

// Огонь (серия / streak).
export function IconFire(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M240-400q0 60 25 110t68 84q-4-11-6.5-23t-2.5-25q0-31 11.5-58.5T370-360l110-108 110 108q22 22 33.5 49.5T635-252q0 13-2.5 25t-6.5 23q43-34 68-84t25-110q0-78-37-145.5T480-800q-15 53-44 96t-66 81q-21 24-37.5 51.5T240-400Zm240-40-54 53q-11 11-17 25t-6 30q0 32 23 54.5t54 22.5q31 0 54-22.5t23-54.5q0-16-6-30t-17-25l-54-53ZM480-880q133 48 206.5 153T760-480q0 117-81.5 198.5T480-200q-117 0-198.5-81.5T200-480q0-104 56-189.5T480-880Z" />
    </Svg>
  );
}

// Солнце (светлая тема).
export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Z" />
    </Svg>
  );
}

// Луна (тёмная тема).
export function IconMoon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-656q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z" />
    </Svg>
  );
}

// Три точки (меню действий).
export function IconMore(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
    </Svg>
  );
}
