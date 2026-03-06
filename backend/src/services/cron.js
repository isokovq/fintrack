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

  // Daily recurring transaction auto-creation (runs at 2am)
  cron.schedule('0 2 * * *', async () => {
    try {
      // Find all recurring transactions where next payment is due
      const recurring = await db.query(`
        SELECT DISTINCT ON (description, category_id, amount, recurring_interval)
          id, user_id, account_id, category_id, type, amount, description,
          recurring_interval, date
        FROM transactions
        WHERE is_recurring = true
        ORDER BY description, category_id, amount, recurring_interval, date DESC
      `);

      const today = new Date().toISOString().split('T')[0];
      let created = 0;

      for (const tx of recurring.rows) {
        const lastDate = new Date(tx.date);
        let nextDate = new Date(lastDate);

        switch (tx.recurring_interval) {
          case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
          case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
          default: nextDate.setMonth(nextDate.getMonth() + 1);
        }

        const nextStr = nextDate.toISOString().split('T')[0];
        if (nextStr <= today) {
          // Create the new transaction
          await db.query(
            `INSERT INTO transactions(user_id, account_id, category_id, type, amount, description, date, is_recurring, recurring_interval)
             VALUES($1,$2,$3,$4,$5,$6,$7,true,$8)`,
            [tx.user_id, tx.account_id, tx.category_id, tx.type, tx.amount, tx.description, nextStr, tx.recurring_interval]
          );

          // Update account balance
          if (tx.account_id) {
            const change = tx.type === 'income' ? tx.amount : -tx.amount;
            await db.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [change, tx.account_id]);
          }

          created++;
        }
      }

      if (created > 0) console.log(`Cron: Created ${created} recurring transactions`);
    } catch (err) {
      console.error('Cron recurring error:', err.message);
    }
  });

  console.log('✅ Cron jobs started');
}

module.exports = { startCronJobs };
