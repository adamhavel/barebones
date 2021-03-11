import { UserError } from '../models/error.js';

export function render(view) {
    return (req, res) => {
        res.render(view);
    };
};

export function redirect(route) {
    return (req, res) => {
        res.redirect(route);
    };
};

export function renderUserError(view) {
    return (err, req, res, next) => {
        if (err instanceof UserError) {
            res.flash('error', err.message).status(err.statusCode).render(view);
        } else {
            next(err);
        }
    }
}
