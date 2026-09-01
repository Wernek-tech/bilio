import crypto from 'node:crypto';

export function createDonutRewards(total = 5000, count = 20) {
  if (!Number.isInteger(total) || !Number.isInteger(count) || total < count * 50 || count < 1) throw Error('Geçersiz donut paketi.');
  let remaining = total;
  const rewards = [];
  for (let index = 0; index < count - 1; index += 1) {
    const slots = count - index;
    const minimumLeft = (slots - 1) * 50;
    const maximum = Math.min(1000, remaining - minimumLeft);
    const average = Math.floor(remaining / slots);
    const amount = Math.max(50, Math.min(maximum, Math.floor(average * (.55 + Math.random() * .9) / 10) * 10));
    rewards.push(amount);
    remaining -= amount;
  }
  rewards.push(remaining);
  for (let index = rewards.length - 1; index > 0; index -= 1) {
    const target = crypto.randomInt(0, index + 1);
    [rewards[index], rewards[target]] = [rewards[target], rewards[index]];
  }
  return rewards;
}
