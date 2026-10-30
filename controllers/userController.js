const User = require('../models/userModel');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body, partial = false) {
    const errors = [];

    if (!partial || body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim().length < 2) {
            errors.push('name must be a string of at least 2 characters');
        }
    }

    if (!partial || body.email !== undefined) {
        if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
            errors.push('email must be a valid email address');
        }
    }

    if (body.age !== undefined && body.age !== null) {
        if (!Number.isInteger(body.age) || body.age < 0 || body.age > 150) {
            errors.push('age must be an integer between 0 and 150');
        }
    }

    return errors;
}

exports.getAll = (req, res) => {
    res.json(User.getAll());
};

exports.getOne = (req, res) => {
    const user = User.getById(Number(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
};

exports.create = (req, res) => {
    //  const errors = validate(req.body);
    // if (errors.length) return res.status(400).json({ errors });

    if (User.getByEmail(req.body.email)) {
        return res.status(409).json({ error: 'Email already exists' });
    }

    const user = User.create(req.body);
    res.status(201).json(user);
};

exports.update = (req, res) => {
    const id = Number(req.params.id);
    if (!User.getById(id)) return res.status(404).json({ error: 'User not found' });

    // const errors = validate(req.body, true);
    // if (errors.length) return res.status(400).json({ errors });

    if (req.body.email) {
        const clash = User.getByEmail(req.body.email);
        if (clash && clash.id !== id) {
            return res.status(409).json({ error: 'Email already exists' });
        }
    }

    res.json(User.update(id, req.body));
};

exports.remove = (req, res) => {
    const deleted = User.remove(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.status(204).end();
};

exports.test = (req, res) => {
    //res.json(User.getAll());
    return res.status(404).json({ error: 'الله اكبر' });
}