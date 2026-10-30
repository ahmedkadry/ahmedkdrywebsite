const db = require('../db');

const User = {
    checkConnection: (err) => {
        if (err) {
            return console.log('Allah error  not connect')
        } else {
            return console.log('Allah akber connect')
        }
    },
    getAll: () => db.prepare('SELECT * FROM users ORDER BY id DESC').all(),

    getById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),

    getByEmail: (email) =>
        db.prepare('SELECT * FROM users WHERE email = ?').get(email),

    create: (user) => {
        const info = db
            .prepare('INSERT INTO users (name, email, age) VALUES (@name, @email, @age)')
            .run({ name: user.name, email: user.email, age: user.age ?? null });
        return User.getById(info.lastInsertRowid);
    },

    update: (id, data) => {
        const existing = User.getById(id);
        if (!existing)
            return null;
        const merged = { ...existing, ...data };
        db.prepare(
            `UPDATE users  SET name = @name, email = @email, age = @age, updated_at = CURRENT_TIMESTAMP  WHERE id = @id`
        ).run({ id, name: merged.name, email: merged.email, age: merged.age });

        return User.getById(id);
    },

    remove: (id) => db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0,
};

module.exports = User;