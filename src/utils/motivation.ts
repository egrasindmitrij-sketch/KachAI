export function getMotivationMessage(
  caloriesCurrent: number,
  caloriesGoal: number,
  mealsCount: number
): { title: string; subtitle: string } {
  const left = Math.max(caloriesGoal - caloriesCurrent, 0);
  const progress = caloriesGoal > 0 ? caloriesCurrent / caloriesGoal : 0;

  if (mealsCount === 0) {
    return {
      title: "Пора в бой",
      subtitle: "Сфоткай первый приём — ИИ посчитает Ккал и БЖУ."
    };
  }

  if (progress >= 1) {
    return {
      title: "Ты сегодня зверь",
      subtitle: "Дневная цель по калориям закрыта. Мощная работа."
    };
  }

  if (progress >= 0.75) {
    return {
      title: "Ты сегодня молодец",
      subtitle: `Осталось ${left} ккал до цели — финишная прямая.`
    };
  }

  if (progress >= 0.4) {
    return {
      title: "Хороший темп",
      subtitle: `Ещё ${left} ккал до цели. Держи ритм.`
    };
  }

  return {
    title: "Вперёд, бро",
    subtitle: `Нужно ещё ${left} ккал сегодня. Каждый приём — шаг к цели.`
  };
}
