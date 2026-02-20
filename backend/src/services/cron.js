const cron = require('node-cron');
const db = require('../db');

function startCronJobs() {
  // Daily check: Overdue debts (runs at 9am every day)
  cron.schedule('0 9 * * *', async () => {
    try {
      const overdueDebts = await db.query(
        `SELECT d.user_id, d.contact_name, d.remaining_amount, d.direction
         FROM debts d
         WHERE d.status='OPEN' AND d.due_date < CURRENT_DATE
           AND d.due_date IS NOT NULL`
      );

      for (const debt of overdueDebts.rows) {
        const direction = debt.direction === 'lent' ? `${debt.contact_name} owes you` : `You owe ${debt.contact_name}`;
        await db.query(
          `INSERT INTO notifications(user_id, title, message, type)
           VALUES($1,$2,$3,$4)
           ON CONFLICT DO NOTHING`,
          [debt.user_id, '⏰ Overdue Debt', `${direction} $${debt.remaining_amount} — overdue!`, 'danger']
        );
      }
    } catch (err) {
      console.error('Cron debt check error:', err.message);
    }
  });

  // Monthly budget summary (1st of each month at 8am)
  cron.schedule('0 8 1 * *', async () => {
    try {
      const users = await db.query('SELECT id FROM users');
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      for (const user of users.rows) {
        const stats = await db.query(
          `SELECT 
            SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
           FROM transactions
           WHERE user_id=$1
             AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`,
          [user.id, lastMonth.getMonth() + 1, lastMonth.getFullYear()]
        );

        const s = stats.rows[0];
        if (s.income > 0 || s.expense > 0) {
          const saved = parseFloat(s.income || 0) - parseFloat(s.expense || 0);
          await db.query(
            `INSERT INTO notifications(user_id, title, message, type) VALUES($1,$2,$3,$4)`,
            [user.id, '📊 Monthly Summary',
             `Last month: Income $${parseFloat(s.income||0).toFixed(0)}, Expenses $${parseFloat(s.expense||0).toFixed(0)}, Saved $${saved.toFixed(0)}`,
             'info']
          );
        }
      }
    } catch (err) {
      console.error('Cron monthly summary error:', err.message);
    }
  });

  console.log('✅ Cron jobs started');
}

module.exports = { startCronJobs };
