import { UserError } from '../models/error.js';

export function render(view) {
    return (req, res) => {
        const { query, body } = req;

        res.render(view, { query, body });
    };
};

export function renderUserError(view) {
    return (err, req, res, next) => {
        if (err instanceof UserError) {
            const { query, body } = req;

            return res.status(err.statusCode).render(view, {
                msg: err.message,
                query,
                body
            });
        }

        next(err);
    }
}

export function redirect(route) {
    return (req, res) => {
        res.redirect(route);
    };
};
